import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Receipt,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HardHatSpinner } from "@/components/ui/loading-states";

interface Stage8TopBarProps {
  liveNow: Date;
  topBarCountdown: { days: number; hours: number; minutes: number; seconds: number } | null;
  isCheckedIn: boolean;
  isCheckingIn: boolean;
  isSaving: boolean;
  canGenerateReports: boolean;
  canFinishProject: boolean;
  handleGenerateInvoice: () => void;
  handleSiteCheckin: () => void;
  requestFinishWithLock: () => void;
  onOpenProjectMessa: () => void;
}

export function Stage8TopBar({
  liveNow,
  topBarCountdown,
  isCheckedIn,
  isCheckingIn,
  isSaving,
  canGenerateReports,
  canFinishProject,
  handleGenerateInvoice,
  handleSiteCheckin,
  requestFinishWithLock,
  onOpenProjectMessa,
}: Stage8TopBarProps) {
  return (
    <div className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-4 py-1.5 bg-[#0d1117]/90 border-b border-white/5 gap-2">
      {/* Left: Invoice (Owner only) + Ask MESSA (all) */}
      <div className="flex items-center gap-1.5 justify-self-start min-w-0">
        {canGenerateReports && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateInvoice}
                  className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Receipt className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[10px] font-medium hidden sm:inline">Invoice</span>
                </Button>
              </TooltipTrigger>
              <Tooltip>
                <TooltipContent side="bottom" className="text-xs">Generate Invoice</TooltipContent>
              </Tooltip>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenProjectMessa}
                className="h-7 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                <span className="text-[10px] font-medium hidden sm:inline">M.E.S.S.A.</span>
              </Button>
            </TooltipTrigger>
            <Tooltip>
              <TooltipContent side="bottom" className="text-xs">Ask M.E.S.S.A.</TooltipContent>
            </Tooltip>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Center: Live Clock + Active Countdown */}
      <div className="justify-self-center flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/40 border border-white/10">
        <div className="flex items-center gap-1 text-cyan-400">
          <Clock className="h-3 w-3" />
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider">
            {liveNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
        <span className="text-white/20">•</span>
        <div className="flex items-center gap-1 text-purple-300">
          <Timer className="h-3 w-3" />
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider whitespace-nowrap">
            {topBarCountdown
              ? `${topBarCountdown.days > 0 ? `${topBarCountdown.days}d ` : ''}${String(topBarCountdown.hours).padStart(2, '0')}:${String(topBarCountdown.minutes).padStart(2, '0')}:${String(topBarCountdown.seconds).padStart(2, '0')}`
              : 'No END_DATE'}
          </span>
        </div>
      </div>

      {/* Right: Check-in + Finish */}
      <div className="flex items-center gap-1.5 justify-self-end min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSiteCheckin}
                disabled={isCheckingIn}
                className={cn(
                  "h-7 px-2",
                  isCheckedIn
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                )}
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                <span className="text-[10px] font-medium hidden sm:inline">{isCheckedIn ? 'Check Out' : 'Check In'}</span>
              </Button>
            </TooltipTrigger>
            <Tooltip>
              <TooltipContent side="bottom" className="text-xs">{isCheckedIn ? 'Site Check-Out' : 'Site Check-In'}</TooltipContent>
            </Tooltip>
          </Tooltip>
        </TooltipProvider>
        {canFinishProject && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={requestFinishWithLock}
                  disabled={isSaving}
                  className="h-7 px-2 text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[10px] font-medium hidden sm:inline">Finish</span>
                </Button>
              </TooltipTrigger>
              <Tooltip>
                <TooltipContent side="bottom" className="text-xs">Finish Project</TooltipContent>
              </Tooltip>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
