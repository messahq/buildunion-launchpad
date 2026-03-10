// ============================================
// PANEL 7: Site Log & Weather (Extracted)
// ============================================

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MapPin, Thermometer, Cloud, CheckCircle2, X, Users, Loader2,
  RefreshCw, Maximize2, Truck, Package, Hammer, Zap,
} from "lucide-react";
import { WeatherWidget } from "@/components/WeatherWidget";
import type { Citation } from "@/types/citation";
import type { TaskWithChecklist } from "./types";

// ============================================
// PROPS
// ============================================
export interface Panel7Props {
  citations: Citation[];
  tasks: TaskWithChecklist[];
  projectData: { address?: string | null } | null;
  weatherData: { temp?: number | null; condition?: string | null } | null;
  isCheckedIn: boolean;
  isCheckingIn: boolean;
  activeTeamCheckins: { user_id: string; full_name: string; checked_in_at: string; avatar_url?: string | null }[];
  deliveryLogs: any[];
  panelCitations: Citation[];

  // Callbacks
  handleSiteCheckin: () => void;
  openWeatherMapModal: (tab: string) => void;
  renderCitationValue: (citation: Citation) => React.ReactNode;
}

// ============================================
// COMPONENT
// ============================================
export const Panel7Weather: React.FC<Panel7Props> = React.memo(({
  citations, tasks, projectData, weatherData,
  isCheckedIn, isCheckingIn, activeTeamCheckins, deliveryLogs,
  panelCitations, handleSiteCheckin, openWeatherMapModal, renderCitationValue,
}) => {
  const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
  const weatherAddress = locationCitation?.answer || projectData?.address || null;
  const mapLat = (locationCitation?.metadata?.coordinates as any)?.lat;
  const mapLon = (locationCitation?.metadata?.coordinates as any)?.lng;

  // Task progress
  const { completed, total, pct } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  }, [tasks]);

  return (
    <div className="space-y-3" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderRadius: 16, padding: '14px 12px' }}>

      {/* ─── Premium Title ─── */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-light tracking-wide" style={{ color: '#ffffff', textShadow: '0 0 20px rgba(255,149,0,0.15)' }}>
          Site Log <span className="text-amber-400/80">&</span> Location
        </h3>
        <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
      </div>

      {/* ─── Location Badges ─── */}
      <div className="flex flex-wrap gap-1.5">
        {weatherAddress && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border border-amber-500/30 bg-slate-900/80 text-amber-300/90">
            <MapPin className="h-2.5 w-2.5" /> {typeof weatherAddress === 'string' && weatherAddress.length > 40 ? weatherAddress.slice(0, 40) + '…' : weatherAddress}
          </span>
        )}
        {mapLat && mapLon && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border border-amber-500/30 bg-slate-900/80 text-sky-400/80">
            {Number(mapLat).toFixed(4)}°N, {Number(mapLon).toFixed(4)}°W
          </span>
        )}
      </div>

      {/* ─── Check-In / Check-Out ─── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4 border-2 border-dashed border-primary/30 bg-primary/5"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {isCheckedIn ? "📍 You are on site" : "📌 Not on site"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isCheckedIn
                ? "Weather & time are being recorded"
                : "Check in to log your site presence"}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSiteCheckin}
            disabled={isCheckingIn}
            variant={isCheckedIn ? "destructive" : "default"}
            className="gap-2"
          >
            {isCheckingIn ? <Loader2 className="h-3 w-3 animate-spin" /> : isCheckedIn ? <X className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {isCheckedIn ? 'Check Out' : 'Check In'}
          </Button>
        </div>
      </motion.div>

      {/* ─── Currently On Site ─── */}
      {activeTeamCheckins.length > 0 && (
        <div className="rounded-xl p-3 border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Currently On Site ({activeTeamCheckins.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {activeTeamCheckins.map((tc, idx) => (
              <div key={`${tc.user_id}-${idx}`} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-background/70">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
                    {tc.avatar_url ? (
                      <img src={tc.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate text-foreground">{tc.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Checked in {new Date(tc.checked_in_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-emerald-400 text-emerald-600 dark:text-emerald-400">ACTIVE</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Task Progress ─── */}
      {total > 0 && (
        <div className="rounded-xl p-3 border border-slate-700/50" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Tasks Done</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground font-mono">{completed}/{total}</span>
              <span className={cn(
                "text-[9px] font-mono px-1 py-0.5 rounded",
                pct === 100 ? 'bg-green-500/20 text-green-300' : pct >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
              )}>
                {pct}%
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-slate-800 border border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full"
              style={{ background: pct === 100 ? '#22c55e' : 'linear-gradient(90deg, #f59e0b, #ff9500)' }}
            />
          </div>
        </div>
      )}

      {/* ─── Live Weather Card ─── */}
      {weatherAddress ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-sky-500/20 overflow-hidden group hover:border-amber-500/30 transition-all hover:shadow-[0_0_20px_rgba(255,149,0,0.08)]"
            style={{ background: 'rgba(15,23,42,0.8)' }}
          >
            <div className="px-3 py-2 border-b border-sky-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">Live Weather</span>
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div className="p-2">
              <WeatherWidget
                location={weatherAddress}
                showForecast={true}
                className="border-0 shadow-none bg-transparent [&_*]:!border-slate-700/30 [&_.text-3xl]:!text-[28px] [&_.text-3xl]:!text-white [&_.text-muted-foreground]:!text-slate-400 [&_.text-sm]:!text-slate-300"
              />
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-cyan-500/20 overflow-hidden group hover:border-amber-500/30 transition-all hover:shadow-[0_0_20px_rgba(255,149,0,0.08)]"
            style={{ background: 'rgba(15,23,42,0.8)' }}
          >
            <div className="px-3 py-2 border-b border-cyan-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold text-cyan-200 uppercase tracking-wider">Site Location</span>
              </div>
              <button
                onClick={() => openWeatherMapModal("location")}
                className="text-[10px] text-sky-400 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                <Maximize2 className="h-3 w-3" /> Expand
              </button>
            </div>
            {mapLat && mapLon ? (
              <div className="relative h-[280px] group-hover:scale-[1.01] transition-transform duration-300">
                <iframe
                  title="Project Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${mapLat},${mapLon}&z=16&output=embed`}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-8 w-8 rounded-full border-2 border-amber-400/60"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none" />
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center text-sky-500/60">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Coordinates not available</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border-2 border-dashed border-slate-700 text-center" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <Cloud className="h-10 w-10 text-sky-500/40 mx-auto mb-3" />
          <p className="text-sm text-sky-400/80 font-medium">No Location Data</p>
          <p className="text-xs text-slate-500 mt-1">Set a project address to enable weather & map</p>
        </div>
      )}

      {/* ─── Delivery History ─── */}
      {deliveryLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/20 overflow-hidden"
          style={{ background: 'rgba(15,23,42,0.8)' }}
        >
          <div className="px-3 py-2 border-b border-amber-500/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider">Delivery History</span>
            </div>
            <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/30">
              {deliveryLogs.length}
            </Badge>
          </div>
          <div className="p-2 space-y-1.5 max-h-[240px] overflow-y-auto">
            {deliveryLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/50 border border-amber-500/10 hover:border-amber-500/25 transition-all hover:shadow-[0_0_12px_rgba(255,149,0,0.06)]">
                <div className="h-7 w-7 rounded-md bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/90 truncate">{log.notes}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-amber-400/50 font-mono">{log.report_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Data Sources ─── */}
      {panelCitations.length > 0 && (
        <div className="pt-3 border-t border-slate-700/50 space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Data Sources</p>
          {panelCitations.map(c => {
            const isWeatherAlert = c.cite_type === 'WEATHER_ALERT';
            const isSiteCondition = c.cite_type === 'SITE_CONDITION';
            return (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-700/40 text-xs group hover:border-amber-500/25 hover:shadow-[0_0_12px_rgba(255,149,0,0.06)] transition-all hover:-translate-y-px"
                style={{ background: 'rgba(15,23,42,0.6)' }}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-5 w-5 rounded flex items-center justify-center",
                    isSiteCondition ? "bg-amber-500/15" : isWeatherAlert ? "bg-orange-500/15" : "bg-sky-500/15"
                  )}>
                    {isSiteCondition ? <Hammer className="h-2.5 w-2.5 text-amber-400" /> :
                     isWeatherAlert ? <Zap className="h-2.5 w-2.5 text-orange-400" /> :
                     <Cloud className="h-2.5 w-2.5 text-sky-400" />}
                  </div>
                  <span className="text-slate-300">{c.cite_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white/80">{renderCitationValue(c)}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-green-500/15 text-amber-300 border border-amber-500/20 cursor-help">
                          cite
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        Source: {c.id.slice(0, 12)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Mobile Refresh Button ─── */}
      <div className="md:hidden pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="w-full h-8 text-[10px] bg-slate-800/50 border-slate-700/50 text-slate-300 hover:text-amber-300 hover:border-amber-500/30"
        >
          <RefreshCw className="h-3 w-3 mr-1.5 animate-[spin_3s_linear_infinite]" /> Refresh Data
        </Button>
      </div>
    </div>
  );
});

Panel7Weather.displayName = 'Panel7Weather';
