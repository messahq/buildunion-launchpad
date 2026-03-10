// ============================================
// STAGE 8: Contract Preview Dialog (Extracted)
// Full professional contract wizard with member selection + preview + signature
// ============================================

import React from "react";
import {
  ChevronRight,
  Edit2,
  Loader2,
  FileCheck,
  Shield,
  Send,
  Download,
  CheckCircle2,
  User,
  Calendar,
  DollarSign,
  MapPin,
  Ruler,
  Users,
  Lock,
  Building2,
  Briefcase,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import {
  downloadContractPDF,
  buildContractHTML,
  type ContractTemplateData,
} from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Citation } from "@/types/citation";

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractStep: 'select_member' | 'preview';
  setContractStep: (step: 'select_member' | 'preview') => void;
  selectedContractMember: { id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string } | null;
  setSelectedContractMember: (member: any) => void;
  selectedContractType: string | null;
  setSelectedContractType: (type: string | null) => void;
  teamMembers: { id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string }[];
  generateContractPreviewData: {
    contractNumber: string;
    projectName: string;
    projectAddress: string;
    gfa: number;
    gfaUnit: string;
    trade: string;
    startDate: string | unknown;
    endDate: string | unknown;
    teamSize: number;
    taskCount: number;
    clientOwnerName: string;
    clientOwnerCompany: string;
    clientOwnerPhone: string;
    clientOwnerEmail: string;
    clientOwnerAddress: string;
    contractorName: string;
    contractorPhone: string;
    contractorEmail: string;
    contractorAddress: string;
  };
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientName: string;
  setClientName: (v: string) => void;
  contractClientPhone: string;
  setContractClientPhone: (v: string) => void;
  contractClientAddress: string;
  setContractClientAddress: (v: string) => void;
  contractScopeOfWork: string;
  setContractScopeOfWork: (v: string) => void;
  contractPaymentTerms: string;
  setContractPaymentTerms: (v: string) => void;
  contractAdditionalTerms: string;
  setContractAdditionalTerms: (v: string) => void;
  contractDeposit: string;
  setContractDeposit: (v: string) => void;
  contractorSignatureData: string | null;
  setContractorSignatureData: (v: string | null) => void;
  isGeneratingContract: boolean;
  setIsGeneratingContract: (v: boolean) => void;
  isSendingContract: boolean;
  setIsSendingContract: (v: boolean) => void;
  ownerProfile: { full_name: string | null; company_name: string | null; phone: string | null; email: string | null; service_area: string | null } | null;
  userProfile: { company_name: string | null; phone: string | null; email: string | null; service_area: string | null } | null;
  financialSummary: { material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null;
  projectId: string;
  userId: string;
  citations: Citation[];
  setCitations: (citations: Citation[]) => void;
  setContracts: (contracts: any[]) => void;
}

export function ContractPreviewDialog({
  open,
  onOpenChange,
  contractStep,
  setContractStep,
  selectedContractMember,
  setSelectedContractMember,
  selectedContractType,
  setSelectedContractType,
  teamMembers,
  generateContractPreviewData,
  clientEmail,
  setClientEmail,
  clientName,
  setClientName,
  contractClientPhone,
  setContractClientPhone,
  contractClientAddress,
  setContractClientAddress,
  contractScopeOfWork,
  setContractScopeOfWork,
  contractPaymentTerms,
  setContractPaymentTerms,
  contractAdditionalTerms,
  setContractAdditionalTerms,
  contractDeposit,
  setContractDeposit,
  contractorSignatureData,
  setContractorSignatureData,
  isGeneratingContract,
  setIsGeneratingContract,
  isSendingContract,
  setIsSendingContract,
  ownerProfile,
  userProfile,
  financialSummary,
  projectId,
  userId,
  citations,
  setCitations,
  setContracts,
}: ContractPreviewDialogProps) {

  const handleDownloadPDF = async () => {
    setIsGeneratingContract(true);
    try {
      const contractData: ContractTemplateData = {
        contractNumber: generateContractPreviewData.contractNumber,
        contractType: (selectedContractType as ContractTemplateData['contractType']) || 'residential',
        projectName: generateContractPreviewData.projectName,
        projectAddress: generateContractPreviewData.projectAddress,
        gfa: generateContractPreviewData.gfa,
        gfaUnit: generateContractPreviewData.gfaUnit,
        trade: generateContractPreviewData.trade,
        startDate: String(generateContractPreviewData.startDate),
        endDate: String(generateContractPreviewData.endDate),
        teamSize: generateContractPreviewData.teamSize,
        taskCount: generateContractPreviewData.taskCount,
        contractorName: selectedContractMember?.name || '',
        contractorPhone: '',
        contractorEmail: clientEmail || '',
        contractorAddress: '',
        contractorHstNumber: selectedContractMember?.hst_number || '',
        clientName: ownerProfile?.full_name || ownerProfile?.company_name || clientName || undefined,
        clientEmail: ownerProfile?.email || undefined,
        clientPhone: ownerProfile?.phone || undefined,
        clientAddress: ownerProfile?.service_area || undefined,
        totalAmount: Math.round((financialSummary?.total_cost || 0) * 100) / 100 || undefined,
      };
      await downloadContractPDF(contractData);
      toast.success('Professional contract PDF downloaded!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handleCreateAndSend = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!contractorSignatureData) {
      toast.error('Please sign the contract before sending');
      return;
    }

    setIsSendingContract(true);
    try {
      // Dynamic total from template_items
      let contractTotalAmount = Math.round((financialSummary?.total_cost || 0) * 100) / 100;
      try {
        const { data: latestSummary } = await supabase
          .from('project_summaries')
          .select('template_items, material_cost, labor_cost, total_cost')
          .eq('project_id', projectId)
          .maybeSingle();
        if (latestSummary) {
          if (Array.isArray(latestSummary.template_items) && latestSummary.template_items.length > 0) {
            const items = latestSummary.template_items as any[];
            const dynamicTotal = items.reduce((s: number, i: any) => s + (Number(i.totalPrice) || 0), 0);
            if (dynamicTotal > 0) contractTotalAmount = Math.round(dynamicTotal * 100) / 100;
          } else if ((latestSummary.total_cost || 0) > 0) {
            contractTotalAmount = Math.round((latestSummary.total_cost || 0) * 100) / 100;
          }
        }
      } catch (e) { console.warn('[Contract] Failed to fetch latest summary:', e); }

      // Fetch contractor profile
      let contractorPhone = '';
      let contractorAddress = '';
      if (selectedContractMember?.userId) {
        try {
          const { data: contractorBu } = await supabase
            .from('bu_profiles')
            .select('phone, service_area')
            .eq('user_id', selectedContractMember.userId)
            .maybeSingle();
          if (contractorBu) {
            contractorPhone = contractorBu.phone || '';
            contractorAddress = contractorBu.service_area || '';
          }
        } catch (e) { /* ignore */ }
      }

      const { data: newContract, error: contractError } = await supabase.from('contracts').insert({
        user_id: userId,
        project_id: projectId,
        contract_number: generateContractPreviewData.contractNumber,
        template_type: selectedContractType || 'subcontractor',
        project_name: generateContractPreviewData.projectName,
        project_address: generateContractPreviewData.projectAddress,
        client_name: ownerProfile?.full_name || ownerProfile?.company_name || clientName,
        client_email: ownerProfile?.email || '',
        client_phone: ownerProfile?.phone || contractClientPhone || null,
        client_address: ownerProfile?.service_area || contractClientAddress || null,
        contractor_name: selectedContractMember?.name || '',
        contractor_phone: contractorPhone,
        contractor_email: clientEmail,
        contractor_license: selectedContractMember?.hst_number || null,
        contractor_address: contractorAddress,
        total_amount: contractTotalAmount,
        deposit_percentage: Number(contractDeposit) || 50,
        deposit_amount: Math.round((contractTotalAmount * (Number(contractDeposit) || 50) / 100) * 100) / 100,
        scope_of_work: contractScopeOfWork || `Complete ${generateContractPreviewData.trade} work at ${generateContractPreviewData.projectAddress}. GFA: ${generateContractPreviewData.gfa} ${generateContractPreviewData.gfaUnit}.`,
        payment_schedule: contractPaymentTerms || null,
        additional_terms: contractAdditionalTerms || null,
        contractor_signature: { data: contractorSignatureData, signed_at: new Date().toISOString() } as any,
        start_date: typeof generateContractPreviewData.startDate === 'string' && generateContractPreviewData.startDate !== 'Not set'
          ? (() => { try { return new Date(generateContractPreviewData.startDate as string).toISOString().split('T')[0]; } catch { return null; } })()
          : null,
        estimated_end_date: typeof generateContractPreviewData.endDate === 'string' && generateContractPreviewData.endDate !== 'Not set'
          ? (() => { try { return new Date(generateContractPreviewData.endDate as string).toISOString().split('T')[0]; } catch { return null; } })()
          : null,
        status: 'pending_client',
      }).select().single();

      if (contractError) throw contractError;

      const baseUrl = window.location.origin;
      const contractUrl = `${baseUrl}/contract/sign?token=${newContract.share_token}`;

      const { error: emailError } = await supabase.functions.invoke('send-contract-email', {
        body: {
          clientEmail: clientEmail,
          clientName: selectedContractMember?.name || 'Contractor',
          contractorName: ownerProfile?.company_name || ownerProfile?.full_name || 'Project Owner',
          projectName: generateContractPreviewData.projectName,
          contractUrl,
          contractId: newContract.id,
        },
      });

      if (emailError) {
        toast.warning('Contract created but email failed to send. Share the link manually.');
      } else {
        await supabase.from('contracts').update({ sent_to_client_at: new Date().toISOString() }).eq('id', newContract.id);
        toast.success(`Contract signed & sent to ${selectedContractMember?.name}!`);
      }

      // Reset state
      onOpenChange(false);
      setClientEmail('');
      setClientName('');
      setContractClientPhone('');
      setContractClientAddress('');
      setContractScopeOfWork('');
      setContractPaymentTerms('');
      setContractAdditionalTerms('');
      setContractDeposit('50');
      setContractorSignatureData(null);
      setContractStep('select_member');
      setSelectedContractMember(null);

      // Refresh contracts list & add citation
      const { data: updatedContracts } = await supabase
        .from('contracts')
        .select('id, contract_number, status, total_amount, share_token, project_name, client_name, client_email, contractor_name, contractor_email, start_date, estimated_end_date, contractor_signature, client_signature, client_signed_at, sent_to_client_at, client_viewed_at')
        .eq('project_id', projectId)
        .is('archived_at', null);
      if (updatedContracts) setContracts(updatedContracts);

      // Add CONTRACT citation
      const newContractCitation: Citation = {
        id: `cite_contract_${newContract.id.slice(0, 8)}`,
        cite_type: 'CONTRACT' as any,
        question_key: `contract_new`,
        answer: `#${newContract.contract_number} — ${selectedContractMember?.name} (${selectedContractMember?.role}) — PENDING_CLIENT${financialSummary?.total_cost ? ` — $${financialSummary.total_cost.toLocaleString()}` : ''}`,
        value: 'pending_client',
        timestamp: new Date().toISOString(),
        metadata: {
          contract_id: newContract.id,
          contract_number: newContract.contract_number,
          status: 'pending_client',
          total_amount: financialSummary?.total_cost || 0,
          client_name: ownerProfile?.full_name || ownerProfile?.company_name || '',
          contractor_name: selectedContractMember?.name || '',
          team_member_role: selectedContractMember?.role,
          client_signed: false,
          contractor_signed: true,
          sent_at: new Date().toISOString(),
          source: 'contract_engine',
        },
      };
      const citationsWithContract = [...citations, newContractCitation];
      setCitations(citationsWithContract);
      await supabase.from('project_summaries')
        .update({ verified_facts: citationsWithContract as any })
        .eq('project_id', projectId);
    } catch (err) {
      console.error('[Contract] Creation failed:', err);
      toast.error('Failed to create contract');
    } finally {
      setIsSendingContract(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setContractStep('select_member'); setSelectedContractMember(null); } }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 z-[9999]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-50/80 to-sky-50/80 dark:from-violet-950/30 dark:to-sky-950/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-violet-700 dark:text-violet-300">
                {contractStep === 'select_member' ? 'Select Team Member' : `${(selectedContractType || 'subcontractor').charAt(0).toUpperCase() + (selectedContractType || 'subcontractor').slice(1)} Agreement`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {contractStep === 'select_member' ? 'Step 1 of 2 — Choose who to generate the contract for' : `Step 2 of 2 — Contract #${generateContractPreviewData.contractNumber}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-2.5 rounded-full", contractStep === 'select_member' ? "bg-violet-600" : "bg-violet-300 dark:bg-violet-700")} />
              <div className={cn("h-2.5 w-2.5 rounded-full", contractStep === 'preview' ? "bg-violet-600" : "bg-violet-300 dark:bg-violet-700")} />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {contractStep === 'select_member' ? (
            /* Step 1: Select Team Member */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select a team member to generate a professional contract:</p>
              <div className="grid gap-3">
                {teamMembers.filter(m => m.role !== 'owner').map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedContractMember(member)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                      selectedContractMember?.id === member.id
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-md"
                        : "border-muted hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-950/10"
                    )}
                  >
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold",
                      selectedContractMember?.id === member.id
                        ? "bg-violet-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] capitalize">{member.role}</Badge>
                        {member.primary_trade && (
                          <Badge variant="secondary" className="text-[10px]">{member.primary_trade}</Badge>
                        )}
                      </div>
                    </div>
                    {selectedContractMember?.id === member.id && (
                      <CheckCircle2 className="h-6 w-6 text-violet-600 shrink-0" />
                    )}
                  </button>
                ))}
                {teamMembers.filter(m => m.role !== 'owner').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No team members yet</p>
                    <p className="text-xs mt-1">Invite team members from the Team panel first</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Contract Preview & Edit */
            <div className="space-y-6">
              {/* Project Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Building2, label: 'Project', value: generateContractPreviewData.projectName, color: 'text-violet-600' },
                  { icon: MapPin, label: 'Location', value: generateContractPreviewData.projectAddress.split(',')[0], color: 'text-blue-600' },
                  { icon: Ruler, label: 'GFA', value: `${generateContractPreviewData.gfa.toLocaleString()} ${generateContractPreviewData.gfaUnit}`, color: 'text-emerald-600' },
                  { icon: DollarSign, label: 'Total', value: `$${Math.round(financialSummary?.total_cost || 0).toLocaleString()}`, color: 'text-amber-600' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Parties Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client = Project Owner */}
                <div className="p-4 rounded-lg border-2 border-sky-200/60 dark:border-sky-700/30 bg-sky-50/30 dark:bg-sky-950/10">
                  <h3 className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-bold">C</span>
                    Client (Project Owner)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-sky-500" /><span className="font-medium">{ownerProfile?.full_name || ownerProfile?.company_name || 'Not set'}</span></div>
                    {ownerProfile?.phone && <div className="flex items-center gap-2 text-muted-foreground"><span>📞 {ownerProfile.phone}</span></div>}
                    {ownerProfile?.email && <div className="flex items-center gap-2 text-muted-foreground"><span>✉️ {ownerProfile.email}</span></div>}
                    {ownerProfile?.service_area && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3" /><span>{ownerProfile.service_area}</span></div>}
                  </div>
                </div>
                {/* Contractor = Selected Member */}
                <div className="p-4 rounded-lg border-2 border-violet-200/60 dark:border-violet-700/30 bg-violet-50/30 dark:bg-violet-950/10">
                  <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">K</span>
                    Contractor (Team Member)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-violet-500" /><span className="font-medium">{selectedContractMember?.name || '—'}</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] capitalize">{selectedContractMember?.role || '—'}</Badge></div>
                    <div className="mt-3">
                      <label className="text-xs font-medium text-muted-foreground">Contractor Email *</label>
                      <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contractor@email.com" className="mt-1 h-9 text-sm" type="email" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope & Terms */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Scope of Work</label>
                  <textarea
                    value={contractScopeOfWork}
                    onChange={(e) => setContractScopeOfWork(e.target.value)}
                    placeholder={`Complete ${generateContractPreviewData.trade} work at ${generateContractPreviewData.projectAddress}...`}
                    className="w-full mt-1 min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Deposit %</label>
                    <Input type="number" min="0" max="100" value={contractDeposit} onChange={(e) => setContractDeposit(e.target.value)} className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Payment Terms</label>
                    <Input value={contractPaymentTerms} onChange={(e) => setContractPaymentTerms(e.target.value)} placeholder="e.g. Net 30" className="mt-1 h-9 text-sm" />
                  </div>
                </div>
              </div>

              {/* Legal Terms */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Standard Legal Terms</h3>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Insurance:</strong> Contractor shall maintain liability insurance ($2M min) and WSIB coverage.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Warranty:</strong> 1-year warranty on all workmanship from completion date.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Dispute Resolution:</strong> Mediation first, then binding arbitration under Ontario law.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Governing Law:</strong> This Agreement shall be governed by the laws of the Province of Ontario.</span></div>
                </div>
              </div>

              {/* Additional Terms */}
              <div>
                <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">+</span>
                  Additional Terms
                  <Badge variant="outline" className="text-[8px] ml-auto gap-1"><Edit2 className="h-2.5 w-2.5" /> EDITABLE</Badge>
                </h3>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <textarea
                    value={contractAdditionalTerms}
                    onChange={(e) => setContractAdditionalTerms(e.target.value)}
                    placeholder="Add any additional terms, special conditions, or project-specific requirements..."
                    className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Contractor Signature */}
              <div>
                <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">✍</span>
                  Contractor Signature
                </h3>
                <div className="p-4 rounded-lg border-2 border-emerald-200/60 dark:border-emerald-700/30 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <SignatureCanvas onSignatureChange={(data) => setContractorSignatureData(data)} height={120} />
                  <p className="text-[10px] text-muted-foreground mt-3 font-medium">
                    HST Reg. No.: {selectedContractMember?.hst_number || '________________________'}
                  </p>
                  <p className="text-[8px] text-muted-foreground/60 mt-0.5 italic">
                    (Business Number as registered with CRA)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center gap-2 flex-wrap">
          {contractStep === 'select_member' ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <div className="flex-1" />
              <Button
                className="gap-2 bg-violet-600 hover:bg-violet-700"
                disabled={!selectedContractMember}
                onClick={() => {
                  if (selectedContractMember) {
                    const roleToType: Record<string, string> = { foreman: 'foreman', subcontractor: 'subcontractor', inspector: 'inspector', worker: 'worker', member: 'subcontractor' };
                    setSelectedContractType(roleToType[selectedContractMember.role] || 'subcontractor');
                    setClientName(ownerProfile?.full_name || ownerProfile?.company_name || '');
                    setContractStep('preview');
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
                Continue with {selectedContractMember?.name || '...'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setContractStep('select_member')}>← Back</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                className="gap-2"
                disabled={isGeneratingContract}
                onClick={handleDownloadPDF}
              >
                {isGeneratingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button
                className="gap-2 bg-violet-600 hover:bg-violet-700"
                disabled={isSendingContract || !clientEmail || !clientName || !contractorSignatureData}
                onClick={handleCreateAndSend}
              >
                {isSendingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {!contractorSignatureData ? 'Sign First to Send' : clientEmail && clientName ? 'Create & Send' : 'Enter Email'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
