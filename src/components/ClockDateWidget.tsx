import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClockDateWidgetProps {
  className?: string;
}

const ClockDateWidget = ({ className }: ClockDateWidgetProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate rotation angles
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  return (
    <Card className={cn("border-slate-200 dark:border-slate-700 overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Compact Analog Clock */}
          <div className="relative w-16 h-16 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-inner border border-slate-200 dark:border-slate-600">
              {/* Hour markers - only main ones */}
              {[0, 3, 6, 9].map((i) => {
                const angle = i * 30;
                return (
                  <div
                    key={i}
                    className="absolute w-full h-full"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div className="absolute left-1/2 -translate-x-1/2 top-1 w-0.5 h-1 bg-amber-600 dark:bg-amber-500 rounded-full" />
                  </div>
                );
              })}
              
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500 z-20" />
              
              {/* Hour hand */}
              <div
                className="absolute top-1/2 left-1/2 origin-bottom z-10"
                style={{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)` }}
              >
                <div className="w-0.5 h-4 bg-slate-800 dark:bg-slate-200 rounded-full" />
              </div>
              
              {/* Minute hand */}
              <div
                className="absolute top-1/2 left-1/2 origin-bottom z-10"
                style={{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)` }}
              >
                <div className="w-px h-5 bg-slate-600 dark:bg-slate-300 rounded-full" />
              </div>
              
              {/* Second hand */}
              <div
                className="absolute top-1/2 left-1/2 origin-bottom z-10"
                style={{ transform: `translate(-50%, -100%) rotate(${secondAngle}deg)` }}
              >
                <div className="w-px h-6 bg-amber-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Time & Date */}
          <div className="flex-1 min-w-0">
            {/* Digital Time */}
            <div className="font-mono text-xl font-light tracking-wider text-slate-800 dark:text-slate-100">
              {format(time, "HH")}
              <span className="animate-pulse text-amber-600">:</span>
              {format(time, "mm")}
              <span className="text-sm text-slate-400 dark:text-slate-500 ml-0.5">
                {format(time, "ss")}
              </span>
            </div>
            
            {/* Date */}
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500 font-medium">
                {format(time, "EEE")}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {format(time, "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClockDateWidget;
