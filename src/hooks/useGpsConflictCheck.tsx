import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GpsConflictStatus = "OK" | "WARNING" | "CONFLICT_DETECTED" | "NO_ADDRESS" | "CHECKING" | "ERROR" | null;

interface GpsConflictResult {
  status: GpsConflictStatus;
  conflict: boolean;
  distance_meters: number;
  distance_label: string;
  project_name: string;
  source: string;
  checked_at: string;
}

interface UseGpsConflictCheckReturn {
  checkGpsConflict: (projectId: string, lat: number, lng: number, source?: string) => Promise<GpsConflictResult | null>;
  lastResult: GpsConflictResult | null;
  isChecking: boolean;
  status: GpsConflictStatus;
}

/**
 * Extracts GPS coordinates from an image file's EXIF data.
 * Returns null if no GPS data found.
 */
export function extractGpsFromExif(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target?.result as ArrayBuffer);
        // Quick check for JPEG
        if (view.getUint16(0) !== 0xFFD8) {
          resolve(null);
          return;
        }

        let offset = 2;
        while (offset < view.byteLength - 2) {
          const marker = view.getUint16(offset);
          offset += 2;

          if (marker === 0xFFE1) {
            // APP1 — EXIF
            const length = view.getUint16(offset);
            const exifData = parseExifGps(view, offset + 2, length - 2);
            resolve(exifData);
            return;
          } else if ((marker & 0xFF00) === 0xFF00) {
            offset += view.getUint16(offset);
          } else {
            break;
          }
        }
        resolve(null);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // First 128KB
  });
}

function parseExifGps(view: DataView, start: number, _length: number): { lat: number; lng: number } | null {
  try {
    // Check for "Exif\0\0"
    const exifHeader = String.fromCharCode(
      view.getUint8(start), view.getUint8(start + 1),
      view.getUint8(start + 2), view.getUint8(start + 3)
    );
    if (exifHeader !== "Exif") return null;

    const tiffStart = start + 6;
    const bigEndian = view.getUint16(tiffStart) === 0x4D4D;
    const getU16 = (o: number) => view.getUint16(o, !bigEndian);
    const getU32 = (o: number) => view.getUint32(o, !bigEndian);

    const ifdOffset = getU32(tiffStart + 4);
    const ifd0Start = tiffStart + ifdOffset;
    const ifd0Count = getU16(ifd0Start);

    let gpsIfdOffset: number | null = null;

    for (let i = 0; i < ifd0Count; i++) {
      const entryStart = ifd0Start + 2 + i * 12;
      const tag = getU16(entryStart);
      if (tag === 0x8825) {
        // GPSInfo
        gpsIfdOffset = getU32(entryStart + 8);
        break;
      }
    }

    if (gpsIfdOffset === null) return null;

    const gpsStart = tiffStart + gpsIfdOffset;
    const gpsCount = getU16(gpsStart);

    let latRef = "N", lngRef = "E";
    let latValues: number[] | null = null;
    let lngValues: number[] | null = null;

    for (let i = 0; i < gpsCount; i++) {
      const entryStart = gpsStart + 2 + i * 12;
      const tag = getU16(entryStart);
      const valueOffset = getU32(entryStart + 8);

      switch (tag) {
        case 1: // GPSLatitudeRef
          latRef = String.fromCharCode(view.getUint8(entryStart + 8));
          break;
        case 2: // GPSLatitude
          latValues = readRationals(view, tiffStart + valueOffset, 3, !bigEndian);
          break;
        case 3: // GPSLongitudeRef
          lngRef = String.fromCharCode(view.getUint8(entryStart + 8));
          break;
        case 4: // GPSLongitude
          lngValues = readRationals(view, tiffStart + valueOffset, 3, !bigEndian);
          break;
      }
    }

    if (!latValues || !lngValues) return null;

    let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
    let lng = lngValues[0] + lngValues[1] / 60 + lngValues[2] / 3600;
    if (latRef === "S") lat = -lat;
    if (lngRef === "W") lng = -lng;

    if (lat === 0 && lng === 0) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

function readRationals(view: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    values.push(den === 0 ? 0 : num / den);
  }
  return values;
}

export const useGpsConflictCheck = (): UseGpsConflictCheckReturn => {
  const [lastResult, setLastResult] = useState<GpsConflictResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<GpsConflictStatus>(null);

  const checkGpsConflict = useCallback(
    async (projectId: string, lat: number, lng: number, source = "site_photo") => {
      setIsChecking(true);
      setStatus("CHECKING");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus("ERROR");
          return null;
        }

        const { data, error } = await supabase.functions.invoke("gps-conflict-check", {
          body: {
            project_id: projectId,
            photo_lat: lat,
            photo_lng: lng,
            source,
          },
        });

        if (error) throw error;

        const result = data as GpsConflictResult;
        setLastResult(result);
        setStatus(result.status as GpsConflictStatus);

        // Show toast for conflicts
        if (result.status === "CONFLICT_DETECTED") {
          toast.error(`🔴 GPS Conflict: Photo taken ${result.distance_label} from project site`, {
            description: "This upload was flagged — the GPS location doesn't match the project address.",
            duration: 8000,
          });
        } else if (result.status === "WARNING") {
          toast.warning(`⚠️ GPS Warning: Photo taken ${result.distance_label} from site`, {
            duration: 5000,
          });
        }

        return result;
      } catch (err) {
        console.error("[useGpsConflictCheck] Error:", err);
        setStatus("ERROR");
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  return { checkGpsConflict, lastResult, isChecking, status };
};
