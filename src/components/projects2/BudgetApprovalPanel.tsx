 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { 
   AlertTriangle, 
   Check, 
   X, 
   DollarSign, 
   Clock, 
   User,
   ArrowRight,
   FileText,
   Loader2
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { format } from "date-fns";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface PendingBudgetChange {
   submittedBy: string;
   submittedByName?: string;
   submittedAt: string;
   proposedGrandTotal: number;
   previousGrandTotal: number;
   proposedLineItems?: {
     materials?: Array<{ item: string; totalPrice: number }>;
     labor?: Array<{ item: string; totalPrice: number }>;
     other?: Array<{ item: string; totalPrice: number }>;
   };
   reason?: string;
   status: 'pending' | 'approved' | 'declined';
 }
 
 interface BudgetApprovalPanelProps {
   projectId: string;
   pendingChange: PendingBudgetChange | null;
   onApprove?: () => void;
   onDecline?: () => void;
 }
 
 export function BudgetApprovalPanel({ 
   projectId, 
   pendingChange,
   onApprove,
   onDecline 
 }: BudgetApprovalPanelProps) {
   const [isProcessing, setIsProcessing] = useState(false);
   
   if (!pendingChange || pendingChange.status !== 'pending') {
     return null;
   }
   
   const formatCurrency = (amount: number) => {
     return new Intl.NumberFormat('en-CA', {
       style: 'currency',
       currency: 'CAD',
       minimumFractionDigits: 2
     }).format(amount);
   };
   
   const difference = pendingChange.proposedGrandTotal - pendingChange.previousGrandTotal;
   const percentChange = pendingChange.previousGrandTotal > 0 
     ? ((difference / pendingChange.previousGrandTotal) * 100).toFixed(1)
     : '0';
   const isIncrease = difference > 0;
   
   const handleApprove = async () => {
     setIsProcessing(true);
     try {
       // Update ai_workflow_config to mark as approved and set the new budget
       const { error } = await supabase
         .from("project_summaries")
         .update({
           ai_workflow_config: {
             grandTotal: pendingChange.proposedGrandTotal,
             budgetVersion: 'change_order',
             budgetUpdatedAt: new Date().toISOString(),
             pendingBudgetChange: {
               ...pendingChange,
               status: 'approved',
               approvedAt: new Date().toISOString()
             }
           },
           total_cost: pendingChange.proposedGrandTotal,
           line_items: pendingChange.proposedLineItems,
           updated_at: new Date().toISOString()
         })
         .eq("project_id", projectId);
       
       if (error) throw error;
       
       toast.success("Budget change approved! Dashboard updated.", { duration: 3000 });
       onApprove?.();
     } catch (error) {
       console.error("Failed to approve budget change:", error);
       toast.error("Failed to approve budget change");
     } finally {
       setIsProcessing(false);
     }
   };
   
   const handleDecline = async () => {
     setIsProcessing(true);
     try {
       // Update ai_workflow_config to mark as declined
       const { data: currentSummary } = await supabase
         .from("project_summaries")
         .select("ai_workflow_config")
         .eq("project_id", projectId)
         .single();
       
       const currentConfig = currentSummary?.ai_workflow_config as Record<string, unknown> || {};
       
       const { error } = await supabase
         .from("project_summaries")
         .update({
           ai_workflow_config: {
             ...currentConfig,
             pendingBudgetChange: {
               ...pendingChange,
               status: 'declined',
               declinedAt: new Date().toISOString()
             }
           },
           updated_at: new Date().toISOString()
         })
         .eq("project_id", projectId);
       
       if (error) throw error;
       
       toast.success("Budget change declined. Original budget maintained.");
       onDecline?.();
     } catch (error) {
       console.error("Failed to decline budget change:", error);
       toast.error("Failed to decline budget change");
     } finally {
       setIsProcessing(false);
     }
   };
   
   return (
     <AnimatePresence>
       <motion.div
         initial={{ opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, y: -20 }}
         className="relative overflow-hidden rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-900/90 backdrop-blur-xl"
       >
         {/* Pulsing warning indicator */}
         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-pulse" />
         
         <div className="p-4 space-y-4">
           {/* Header */}
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                 <AlertTriangle className="h-5 w-5 text-amber-400" />
               </div>
               <div>
                 <h3 className="text-sm font-semibold text-amber-300">Budget Change Request</h3>
                 <p className="text-xs text-slate-400">Pending your approval</p>
               </div>
             </div>
             <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 animate-pulse">
               <Clock className="h-3 w-3 mr-1" />
               Pending
             </Badge>
           </div>
           
           {/* Change Details */}
           <div className="grid grid-cols-2 gap-3">
             {/* Current Budget */}
             <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
               <p className="text-xs text-slate-400 mb-1">Current Budget</p>
               <p className="text-lg font-bold text-slate-300">
                 {formatCurrency(pendingChange.previousGrandTotal)}
               </p>
             </div>
             
             {/* Proposed Budget */}
             <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
               <p className="text-xs text-amber-400 mb-1">Proposed Budget</p>
               <p className="text-lg font-bold text-amber-300">
                 {formatCurrency(pendingChange.proposedGrandTotal)}
               </p>
             </div>
           </div>
           
           {/* Change Summary */}
           <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
             <div className="flex items-center gap-2">
               <ArrowRight className={cn(
                 "h-4 w-4",
                 isIncrease ? "text-red-400 rotate-[-45deg]" : "text-emerald-400 rotate-[45deg]"
               )} />
               <span className="text-sm text-slate-300">
                 {isIncrease ? "Increase" : "Decrease"} of{" "}
                 <span className={cn(
                   "font-semibold",
                   isIncrease ? "text-red-400" : "text-emerald-400"
                 )}>
                   {formatCurrency(Math.abs(difference))}
                 </span>
                 <span className="text-xs text-slate-500 ml-1">({percentChange}%)</span>
               </span>
             </div>
           </div>
           
           {/* Submitted By */}
           <div className="flex items-center gap-2 text-xs text-slate-400">
             <User className="h-3 w-3" />
             <span>
               Submitted by <span className="text-slate-300">{pendingChange.submittedByName || 'Team Member'}</span>
               {" "}on {format(new Date(pendingChange.submittedAt), 'MMM d, yyyy HH:mm')}
             </span>
           </div>
           
           {pendingChange.reason && (
             <div className="p-2 rounded bg-slate-800/30 text-xs text-slate-400">
               <FileText className="h-3 w-3 inline mr-1" />
               {pendingChange.reason}
             </div>
           )}
           
           {/* Action Buttons */}
           <div className="flex gap-2 pt-2">
             <Button
               onClick={handleApprove}
               disabled={isProcessing}
               className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
             >
               {isProcessing ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <Check className="h-4 w-4 mr-2" />
               )}
               Approve
             </Button>
             <Button
               onClick={handleDecline}
               disabled={isProcessing}
               variant="outline"
               className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
             >
               {isProcessing ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <X className="h-4 w-4 mr-2" />
               )}
               Decline
             </Button>
           </div>
         </div>
       </motion.div>
     </AnimatePresence>
   );
 }