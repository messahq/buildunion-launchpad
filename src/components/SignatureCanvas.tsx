import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureCanvasProps {
  onSignatureChange?: (signatureData: string | null) => void;
  initialSignature?: string | null;
  disabled?: boolean;
  className?: string;
  height?: number;
}

export function SignatureCanvas({
  onSignatureChange,
  initialSignature,
  disabled = false,
  className,
  height = 150,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas and load initial signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution for sharp lines
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Set drawing styles
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const getPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      
      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      
      const pos = getPosition(e);
      setIsDrawing(true);
      setLastPos(pos);
    },
    [disabled, getPosition]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPos) return;

      const currentPos = getPosition(e);

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();

      setLastPos(currentPos);
      setHasSignature(true);
    },
    [isDrawing, disabled, lastPos, getPosition]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPos(null);

      // Emit signature data
      const canvas = canvasRef.current;
      if (canvas && hasSignature && onSignatureChange) {
        const signatureData = canvas.toDataURL("image/png");
        onSignatureChange(signatureData);
      }
    }
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 rounded-lg bg-white dark:bg-slate-900 overflow-hidden",
          disabled
            ? "border-dashed border-muted cursor-not-allowed opacity-60"
            : "border-dashed border-slate-300 dark:border-slate-600 cursor-crosshair",
          hasSignature && "border-solid border-green-300 dark:border-green-700"
        )}
      >
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Signature line indicator */}
        <div className="absolute bottom-8 left-4 right-4 border-b border-slate-300 dark:border-slate-600" />
        
        {/* X marker */}
        <div className="absolute bottom-6 left-4 text-sm text-slate-400 font-medium">
          ✕
        </div>

        {/* Hint text */}
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">
              Sign here with your mouse or finger
            </p>
          </div>
        )}

        {/* Signed indicator */}
        {hasSignature && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
              <Check className="h-3 w-3" />
              Signed
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!disabled && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!hasSignature}
            className="gap-1"
          >
            <Eraser className="h-3 w-3" />
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            disabled={!hasSignature}
            className="gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Start Over
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">
            Your signature will be legally binding
          </p>
        </div>
      )}
    </div>
  );
}
