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
      <CardContent className="p-6">
        {/* Analog Clock */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          {/* Clock face */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-inner border border-slate-200 dark:border-slate-600">
            {/* Hour markers */}
            {[...Array(12)].map((_, i) => {
              const angle = i * 30;
              const isMain = i % 3 === 0;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div 
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 rounded-full",
                      isMain 
                        ? "top-2 w-1 h-2 bg-amber-600 dark:bg-amber-500" 
                        : "top-2.5 w-0.5 h-1.5 bg-slate-400 dark:bg-slate-500"
                    )}
                  />
                </div>
              );
            })}
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-600 dark:bg-amber-500 z-20 shadow-md" />
            
            {/* Hour hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom -translate-x-1/2 -translate-y-full z-10"
              style={{ transform: `translateX(-50%) translateY(-100%) rotate(${hourAngle}deg)` }}
            >
              <div className="w-1 h-8 bg-slate-800 dark:bg-slate-200 rounded-full shadow-md" />
            </div>
            
            {/* Minute hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom -translate-x-1/2 -translate-y-full z-10"
              style={{ transform: `translateX(-50%) translateY(-100%) rotate(${minuteAngle}deg)` }}
            >
              <div className="w-0.5 h-11 bg-slate-700 dark:bg-slate-300 rounded-full shadow-md" />
            </div>
            
            {/* Second hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom -translate-x-1/2 -translate-y-full z-10"
              style={{ transform: `translateX(-50%) translateY(-100%) rotate(${secondAngle}deg)` }}
            >
              <div className="w-px h-12 bg-amber-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Digital Time */}
        <div className="text-center">
          <div className="font-mono text-3xl font-light tracking-wider text-slate-800 dark:text-slate-100">
            {format(time, "HH")}
            <span className="animate-pulse text-amber-600">:</span>
            {format(time, "mm")}
            <span className="text-lg text-slate-400 dark:text-slate-500 ml-1">
              {format(time, "ss")}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-600 to-transparent" />

        {/* Date Display */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-500 font-medium">
            {format(time, "EEEE")}
          </p>
          <p className="text-2xl font-light text-slate-800 dark:text-slate-100">
            {format(time, "MMMM d")}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {format(time, "yyyy")}
          </p>
        </div>

        {/* Week indicator */}
        <div className="mt-4 flex justify-center gap-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => {
            const isToday = time.getDay() === i;
            return (
              <div
                key={i}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all",
                  isToday 
                    ? "bg-amber-600 text-white shadow-md scale-110" 
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClockDateWidget;
