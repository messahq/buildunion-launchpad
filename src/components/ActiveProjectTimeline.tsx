import { useEffect, useState } from "react";
import { Calendar, Loader2, FolderOpen, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Contract {
  id: string;
  contract_number: string;
  start_date: string | null;
  estimated_end_date: string | null;
  total_amount: number | null;
  status: string;
}

interface ActiveProjectTimelineProps {
  projectId: string | null;
  projectName?: string;
}

const ActiveProjectTimeline = ({ projectId, projectName }: ActiveProjectTimelineProps) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setContract(null);
      return;
    }

    const fetchContract = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select("id, contract_number, start_date, estimated_end_date, total_amount, status")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setContract(data);
        } else {
          setContract(null);
        }
      } catch (err) {
        console.error("Error fetching contract:", err);
        setContract(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Project Timeline</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a project to view its timeline
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!contract || (!contract.start_date && !contract.estimated_end_date)) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">Project Timeline</h3>
          {projectName && (
            <Badge variant="outline" className="text-xs">{projectName}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          No timeline data available. Add contract dates to see the project timeline.
        </p>
      </div>
    );
  }

  // Calculate timeline data
  const startDate = contract.start_date ? new Date(contract.start_date) : null;
  const endDate = contract.estimated_end_date ? new Date(contract.estimated_end_date) : null;
  const today = new Date();

  let progressPercent = 0;
  let todayPercent = 0;
  let totalDays = 0;
  let workingDays = 0;
  let daysRemaining = 0;
  let isOverdue = false;
  let hasStarted = false;

  if (startDate && endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    todayPercent = (elapsed / totalDuration) * 100;
    
    totalDays = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate working days
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    isOverdue = daysRemaining < 0;
    hasStarted = today >= startDate;
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">Project Timeline</h3>
        </div>
        {projectName && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
            {projectName}
          </Badge>
        )}
      </div>

      {/* Timeline Bar with Milestones */}
      <div className="relative pt-2">
        {/* Main Timeline Track */}
        <div className="relative h-3 bg-gray-200 rounded-full overflow-visible">
          {/* Progress Fill */}
          {startDate && endDate && (
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 via-amber-400 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          )}
          
          {/* Milestone Markers */}
          {startDate && endDate && (
            <>
              {/* Rough-in at 25% */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '25%' }}>
                <div className="relative group">
                  <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm cursor-pointer hover:scale-125 transition-transform" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-amber-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    Rough-in
                  </div>
                </div>
              </div>
              
              {/* Inspection at 50% */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '50%' }}>
                <div className="relative group">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm cursor-pointer hover:scale-125 transition-transform" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-blue-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    Inspection
                  </div>
                </div>
              </div>
              
              {/* Final Finish at 85% */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '85%' }}>
                <div className="relative group">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-white shadow-sm cursor-pointer hover:scale-125 transition-transform" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-cyan-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    Final Finish
                  </div>
                </div>
              </div>
              
              {/* Today Indicator */}
              {todayPercent >= 0 && todayPercent <= 100 && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 z-10" 
                  style={{ left: `${todayPercent}%` }}
                >
                  <div className="relative group">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg animate-pulse cursor-pointer" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      Today
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Start/End Labels */}
        <div className="flex justify-between mt-3">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-700">Start</span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">
              {contract.start_date ? formatDate(contract.start_date) : 'Not set'}
            </span>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-purple-700">End</span>
              <div className="w-3 h-3 rounded-full bg-purple-500" />
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">
              {contract.estimated_end_date ? formatDate(contract.estimated_end_date) : 'Not set'}
            </span>
          </div>
        </div>
        
        {/* Milestone Legend */}
        {startDate && endDate && (
          <div className="flex flex-wrap justify-center gap-3 mt-4 pt-3 border-t border-purple-100">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Rough-in (25%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">Inspection (50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="text-xs text-muted-foreground">Final Finish (85%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Duration Summary */}
      {startDate && endDate && (
        <div className="mt-4 pt-3 border-t border-purple-200">
          <div className="flex justify-center">
            <div className="text-center space-y-2">
              <div className="text-sm font-semibold text-purple-700">
                {totalDays} days
                <span className="text-muted-foreground font-normal"> (~{workingDays} working days)</span>
              </div>
              {hasStarted && (
                <div className={`text-xs font-medium flex items-center justify-center gap-1 ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                  {isOverdue ? (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      {Math.abs(daysRemaining)} days overdue
                    </>
                  ) : daysRemaining === 0 ? (
                    <>
                      <Clock className="h-3 w-3" />
                      Due today!
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      {daysRemaining} days remaining
                    </>
                  )}
                </div>
              )}
              {!hasStarted && startDate && (
                <div className="text-xs text-muted-foreground">
                  📅 Starts in {Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveProjectTimeline;
