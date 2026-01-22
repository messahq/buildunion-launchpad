import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import SignatureCapture, { SignatureData } from "@/components/SignatureCapture";
import { useAuth } from "@/hooks/useAuth";
import { useBuProfile } from "@/hooks/useBuProfile";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { toast } from "sonner";
import {
  FileText,
  Download,
  User,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  Info,
  Briefcase,
  PenLine,
  CheckCircle2,
  Clock,
  Send
} from "lucide-react";

// Types for collected data from Quick Mode synthesis
interface CollectedData {
  photoEstimate: {
    area?: number;
    areaUnit?: string;
    materials?: Array<{ name: string; quantity: string; unit: string }>;
    confidence?: string;
  } | null;
  calculatorResults: Array<{
    calculatorType?: string;
    area?: number;
    areaUnit?: string;
    materials?: Array<{ name: string; quantity: number; unit: string }>;
    totalCost?: number;
  }>;
  templateItems: Array<{
    name?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>;
}

interface ContractGeneratorProps {
  quoteData?: any;
  collectedData?: CollectedData | null;
  onContractGenerated?: (contractData: any) => void;
}

const ContractGenerator = ({ quoteData, collectedData, onContractGenerated }: ContractGeneratorProps) => {
  const { user } = useAuth();
  const { profile } = useBuProfile();
  const { formatCurrency, config } = useRegionSettings();
  
  const [contract, setContract] = useState({
    // Contract Info
    contractNumber: `C-${Date.now().toString().slice(-6)}`,
    contractDate: new Date().toISOString().split("T")[0],
    
    // Parties
    contractorName: "",
    contractorAddress: "",
    contractorPhone: "",
    contractorEmail: "",
    contractorLicense: "",
    
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    clientEmail: "",
    
    // Project Details
    projectName: "",
    projectAddress: "",
    projectDescription: "",
    
    // Financial Terms
    totalAmount: 0,
    depositAmount: 0,
    depositPercentage: 50,
    paymentSchedule: "50% deposit upon signing, 50% upon completion",
    
    // Timeline
    startDate: "",
    estimatedEndDate: "",
    workingDays: "Monday to Friday, 8:00 AM - 5:00 PM",
    
    // Terms & Conditions
    scopeOfWork: "",
    materialsIncluded: true,
    warrantyPeriod: "1 year",
    changeOrderPolicy: "Any changes to the scope of work must be agreed upon in writing and may result in additional charges.",
    cancellationPolicy: "Either party may cancel this contract with 14 days written notice. The client is responsible for payment of work completed up to the date of cancellation.",
    disputeResolution: "Any disputes arising from this contract shall be resolved through mediation before pursuing legal action.",
    
    // Insurance & Licensing
    hasLiabilityInsurance: true,
    hasWSIB: true,
    licenseNumber: "",
  });

  const [clientSignature, setClientSignature] = useState<SignatureData | null>(null);
  const [contractorSignature, setContractorSignature] = useState<SignatureData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setContract(prev => ({
        ...prev,
        contractorName: profile.company_name || "",
        contractorPhone: profile.phone || "",
        contractorEmail: user?.email || "",
      }));
    }
    
    // Pre-fill from quote data if available
    if (quoteData) {
      setContract(prev => ({
        ...prev,
        clientName: quoteData.clientName || "",
        clientAddress: quoteData.clientAddress || "",
        clientPhone: quoteData.clientPhone || "",
        clientEmail: quoteData.clientEmail || "",
        projectName: quoteData.projectName || "",
        projectAddress: quoteData.projectAddress || "",
        totalAmount: quoteData.lineItems?.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.unitPrice), 0) || 0,
      }));
    }
  }, [profile, user, quoteData]);

  // Pre-fill from collected synthesis data (dual-engine results)
  useEffect(() => {
    if (!collectedData) return;

    let scopeDescription = "";
    let totalFromSynthesis = 0;

    // Extract from photo estimate (AI analysis)
    if (collectedData.photoEstimate) {
      const pe = collectedData.photoEstimate;
      if (pe.area && pe.areaUnit) {
        scopeDescription += `Estimated Area: ${pe.area} ${pe.areaUnit}\n`;
      }
      if (pe.materials && pe.materials.length > 0) {
        scopeDescription += "\nMaterials from AI Analysis:\n";
        pe.materials.forEach(m => {
          scopeDescription += `• ${m.name}: ${m.quantity} ${m.unit}\n`;
        });
      }
    }

    // Extract from calculator results
    if (collectedData.calculatorResults && collectedData.calculatorResults.length > 0) {
      collectedData.calculatorResults.forEach((calc, idx) => {
        if (calc.calculatorType) {
          scopeDescription += `\n${calc.calculatorType} Calculation:\n`;
        }
        if (calc.area && calc.areaUnit) {
          scopeDescription += `• Area: ${calc.area} ${calc.areaUnit}\n`;
        }
        if (calc.materials && calc.materials.length > 0) {
          calc.materials.forEach(m => {
            scopeDescription += `• ${m.name}: ${m.quantity} ${m.unit}\n`;
          });
        }
        if (calc.totalCost) {
          totalFromSynthesis += calc.totalCost;
        }
      });
    }

    // Extract from templates
    if (collectedData.templateItems && collectedData.templateItems.length > 0) {
      collectedData.templateItems.forEach(template => {
        if (template.name) {
          scopeDescription += `\nTemplate: ${template.name}\n`;
        }
        if (template.lineItems && template.lineItems.length > 0) {
          template.lineItems.forEach(item => {
            scopeDescription += `• ${item.description}: ${item.quantity} × $${item.unitPrice}\n`;
            totalFromSynthesis += item.quantity * item.unitPrice;
          });
        }
      });
    }

    // Update contract with synthesis data
    if (scopeDescription || totalFromSynthesis > 0) {
      setContract(prev => ({
        ...prev,
        scopeOfWork: scopeDescription.trim() || prev.scopeOfWork,
        totalAmount: totalFromSynthesis > 0 ? totalFromSynthesis : prev.totalAmount,
      }));
    }
  }, [collectedData]);

  // Calculate deposit when total or percentage changes
  useEffect(() => {
    setContract(prev => ({
      ...prev,
      depositAmount: (prev.totalAmount * prev.depositPercentage) / 100
    }));
  }, [contract.totalAmount, contract.depositPercentage]);

  const updateContract = (field: string, value: any) => {
    setContract(prev => ({ ...prev, [field]: value }));
  };

  const generateContractPDF = () => {
    setIsGenerating(true);
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate PDF");
      setIsGenerating(false);
      return;
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "_______________";
      return new Date(dateStr).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Construction Contract - ${contract.contractNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            color: #1a1a1a; 
            line-height: 1.6;
            font-size: 11px;
          }
          .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 24px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header h1 { font-size: 24px; font-weight: 700; }
          .contract-badge {
            background: rgba(255,255,255,0.2);
            padding: 12px 20px;
            border-radius: 8px;
            text-align: right;
          }
          .content { padding: 24px 32px; }
          .section { margin-bottom: 24px; }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 8px;
            margin-bottom: 16px;
          }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          .party-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
          }
          .party-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .party-name { font-size: 16px; font-weight: 600; color: #1e293b; }
          .party-detail { font-size: 11px; color: #64748b; margin-top: 4px; }
          .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .terms-list { padding-left: 20px; }
          .terms-list li { margin-bottom: 8px; }
          .signature-section {
            margin-top: 48px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sig-box {
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fafafa;
          }
          .sig-line { border-top: 2px solid #1e293b; margin-top: 8px; padding-top: 8px; }
          .info-banner {
            background: #eff6ff;
            border: 1px solid #93c5fd;
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          }
          .info-banner h4 { color: #1e40af; font-size: 12px; margin-bottom: 8px; }
          .info-banner p { color: #1e40af; font-size: 11px; }
          .footer {
            background: #1e293b;
            color: white;
            padding: 16px 32px;
            text-align: center;
            font-size: 10px;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>📋 CONSTRUCTION CONTRACT</h1>
            <p style="opacity: 0.8; font-size: 12px; margin-top: 4px;">Professional Services Agreement</p>
          </div>
          <div class="contract-badge">
            <div style="font-size: 16px; font-weight: 700;">${contract.contractNumber}</div>
            <div style="font-size: 11px; opacity: 0.9;">Date: ${formatDate(contract.contractDate)}</div>
          </div>
        </div>

        <div class="content">
          <!-- Parties Section -->
          <div class="section">
            <div class="section-title">👥 PARTIES TO THIS AGREEMENT</div>
            <div class="grid-2">
              <div class="party-box">
                <div class="party-label">🔨 Contractor</div>
                <div class="party-name">${contract.contractorName || "_______________"}</div>
                <div class="party-detail">${contract.contractorAddress || "Address: _______________"}</div>
                <div class="party-detail">📞 ${contract.contractorPhone || "_______________"}</div>
                <div class="party-detail">✉️ ${contract.contractorEmail || "_______________"}</div>
                ${contract.licenseNumber ? `<div class="party-detail">License #: ${contract.licenseNumber}</div>` : ''}
              </div>
              <div class="party-box">
                <div class="party-label">👤 Client</div>
                <div class="party-name">${contract.clientName || "_______________"}</div>
                <div class="party-detail">${contract.clientAddress || "Address: _______________"}</div>
                <div class="party-detail">📞 ${contract.clientPhone || "_______________"}</div>
                <div class="party-detail">✉️ ${contract.clientEmail || "_______________"}</div>
              </div>
            </div>
          </div>

          <!-- Project Details -->
          <div class="section">
            <div class="section-title">📍 PROJECT DETAILS</div>
            <p><strong>Project Name:</strong> ${contract.projectName || "_______________"}</p>
            <p><strong>Project Location:</strong> ${contract.projectAddress || "_______________"}</p>
            ${contract.projectDescription ? `<p style="margin-top: 8px;"><strong>Description:</strong> ${contract.projectDescription}</p>` : ''}
          </div>

          <!-- Scope of Work -->
          ${contract.scopeOfWork ? `
          <div class="section">
            <div class="section-title">📋 SCOPE OF WORK</div>
            <p style="white-space: pre-line;">${contract.scopeOfWork}</p>
          </div>
          ` : ''}

          <!-- Financial Terms -->
          <div class="section">
            <div class="section-title">💰 FINANCIAL TERMS</div>
            <div class="highlight-box">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Total Contract Amount:</span>
                <strong style="font-size: 18px; color: #92400e;">${formatCurrency(contract.totalAmount)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Deposit Required (${contract.depositPercentage}%):</span>
                <strong>${formatCurrency(contract.depositAmount)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Balance Due Upon Completion:</span>
                <strong>${formatCurrency(contract.totalAmount - contract.depositAmount)}</strong>
              </div>
            </div>
            <p><strong>Payment Schedule:</strong> ${contract.paymentSchedule}</p>
          </div>

          <!-- Timeline -->
          <div class="section">
            <div class="section-title">📅 PROJECT TIMELINE</div>
            <div class="grid-2">
              <p><strong>Start Date:</strong> ${formatDate(contract.startDate)}</p>
              <p><strong>Estimated Completion:</strong> ${formatDate(contract.estimatedEndDate)}</p>
            </div>
            <p style="margin-top: 8px;"><strong>Working Hours:</strong> ${contract.workingDays}</p>
          </div>

          <!-- Terms & Conditions -->
          <div class="section">
            <div class="section-title">📜 TERMS & CONDITIONS</div>
            <ol class="terms-list">
              <li><strong>Warranty:</strong> The Contractor warrants all workmanship for a period of ${contract.warrantyPeriod} from the date of completion.</li>
              <li><strong>Materials:</strong> ${contract.materialsIncluded ? 'All materials are included in the contract price unless otherwise specified.' : 'Materials are NOT included and will be billed separately.'}</li>
              <li><strong>Change Orders:</strong> ${contract.changeOrderPolicy}</li>
              <li><strong>Cancellation:</strong> ${contract.cancellationPolicy}</li>
              <li><strong>Dispute Resolution:</strong> ${contract.disputeResolution}</li>
              ${contract.hasLiabilityInsurance ? '<li><strong>Insurance:</strong> Contractor maintains comprehensive general liability insurance.</li>' : ''}
              ${contract.hasWSIB ? '<li><strong>WSIB:</strong> Contractor maintains valid WSIB coverage for all workers.</li>' : ''}
            </ol>
          </div>

          <!-- Digital Signature Notice -->
          <div class="info-banner">
            <h4>ℹ️ ABOUT DIGITAL SIGNATURES</h4>
            <p>
              <strong>How this works:</strong> This contract uses digital signatures which are legally binding under Canadian law (PIPEDA and provincial e-commerce legislation).
            </p>
            <ul style="margin-top: 8px; padding-left: 20px; font-size: 11px; color: #1e40af;">
              <li><strong>Contractor signs first</strong> - The contractor creates and signs the contract</li>
              <li><strong>Client reviews & signs</strong> - The contract is shared with the client (via PDF, email, or in-person) who then signs their portion</li>
              <li><strong>Both signatures + dates</strong> - Each signature is timestamped to show when it was captured</li>
              <li><strong>Keep copies</strong> - Both parties should retain a signed copy for their records</li>
            </ul>
          </div>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="sig-box">
              <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">👤 CLIENT ACCEPTANCE</p>
              <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">By signing below, the Client agrees to all terms and conditions outlined in this contract.</p>
              ${clientSignature 
                ? clientSignature.type === 'drawn'
                  ? '<img src="' + clientSignature.data + '" alt="Client Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                  : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + clientSignature.data + '</p>'
                : '<div style="height: 50px; border-bottom: 2px solid #1e293b; margin: 8px 0;"></div>'}
              <div class="sig-line">
                <p style="font-size: 11px; color: #64748b;">
                  <strong>Print Name:</strong> ${contract.clientName || "_______________"}<br/>
                  <strong>Date:</strong> ${clientSignature?.signedAt ? new Date(clientSignature.signedAt).toLocaleDateString('en-CA') : "_______________"}
                </p>
              </div>
            </div>
            <div class="sig-box">
              <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">🔨 CONTRACTOR AUTHORIZATION</p>
              <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">By signing below, the Contractor agrees to perform all work as specified in this contract.</p>
              ${contractorSignature 
                ? contractorSignature.type === 'drawn'
                  ? '<img src="' + contractorSignature.data + '" alt="Contractor Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                  : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + contractorSignature.data + '</p>'
                : '<div style="height: 50px; border-bottom: 2px solid #1e293b; margin: 8px 0;"></div>'}
              <div class="sig-line">
                <p style="font-size: 11px; color: #64748b;">
                  <strong>Print Name:</strong> ${contract.contractorName || "_______________"}<br/>
                  <strong>Date:</strong> ${contractorSignature?.signedAt ? new Date(contractorSignature.signedAt).toLocaleDateString('en-CA') : "_______________"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This contract is governed by the laws of ${config.name}, Canada. • Generated with BuildUnion</p>
          <p style="margin-top: 4px;">Both parties acknowledge receipt of a copy of this signed contract.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setIsGenerating(false);
      toast.success("Contract generated!");
      
      if (onContractGenerated) {
        onContractGenerated({
          ...contract,
          clientSignature,
          contractorSignature
        });
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Digital Signature Info Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800">How does the digital contract work?</AlertTitle>
        <AlertDescription className="text-blue-700 mt-2 space-y-2">
          <p><strong>1. Contractor creates and signs</strong> - You fill out the contract and sign the contractor section</p>
          <p><strong>2. Share with client</strong> - Send as PDF via email, or show them in person</p>
          <p><strong>3. Client signs</strong> - The client can:</p>
          <ul className="list-disc list-inside ml-4 text-sm">
            <li>Sign in person on your device (phone/tablet)</li>
            <li>Print, sign, and return the document</li>
            <li>Digitally sign and return the PDF</li>
          </ul>
          <p><strong>4. Both signatures are timestamped</strong> - Every signature automatically receives a date/time stamp for legal record-keeping</p>
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={["parties", "project", "financial", "signatures"]} className="space-y-4">
                {/* Parties */}
                <AccordionItem value="parties">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Parties
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-6">
                    {/* Contractor Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Contractor (You)
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company / Contractor Name</Label>
                          <Input
                            value={contract.contractorName}
                            onChange={(e) => updateContract("contractorName", e.target.value)}
                            placeholder="Company name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={contract.contractorAddress}
                            onChange={(e) => updateContract("contractorAddress", e.target.value)}
                            placeholder="Business address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={contract.contractorPhone}
                            onChange={(e) => updateContract("contractorPhone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={contract.contractorEmail}
                            onChange={(e) => updateContract("contractorEmail", e.target.value)}
                            placeholder="Email address"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Client Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Client / Customer
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={contract.clientName}
                            onChange={(e) => updateContract("clientName", e.target.value)}
                            placeholder="Client name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={contract.clientAddress}
                            onChange={(e) => updateContract("clientAddress", e.target.value)}
                            placeholder="Client address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={contract.clientPhone}
                            onChange={(e) => updateContract("clientPhone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={contract.clientEmail}
                            onChange={(e) => updateContract("clientEmail", e.target.value)}
                            placeholder="Email address"
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Project */}
                <AccordionItem value="project">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-green-500" />
                      Project Details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input
                          value={contract.projectName}
                          onChange={(e) => updateContract("projectName", e.target.value)}
                          placeholder="e.g., Bathroom Renovation"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project Address</Label>
                        <Input
                          value={contract.projectAddress}
                          onChange={(e) => updateContract("projectAddress", e.target.value)}
                          placeholder="Work site location"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Scope of Work</Label>
                      <Textarea
                        value={contract.scopeOfWork}
                        onChange={(e) => updateContract("scopeOfWork", e.target.value)}
                        placeholder="Detailed description of the work to be performed..."
                        rows={6}
                      />
                      {collectedData && (collectedData.photoEstimate || collectedData.calculatorResults.length > 0) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Pre-filled from Quick Mode synthesis data
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Financial */}
                <AccordionItem value="financial">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      Financial Terms
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Total Amount ($)</Label>
                        <Input
                          type="number"
                          value={contract.totalAmount}
                          onChange={(e) => updateContract("totalAmount", parseFloat(e.target.value) || 0)}
                        />
                        {collectedData && (collectedData.calculatorResults.length > 0 || collectedData.templateItems.length > 0) && contract.totalAmount > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            Calculated from synthesis data
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Deposit (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={contract.depositPercentage}
                          onChange={(e) => updateContract("depositPercentage", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span>Deposit ({contract.depositPercentage}%):</span>
                        <strong>{formatCurrency(contract.depositAmount)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance Due:</span>
                        <strong>{formatCurrency(contract.totalAmount - contract.depositAmount)}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Schedule</Label>
                      <Textarea
                        value={contract.paymentSchedule}
                        onChange={(e) => updateContract("paymentSchedule", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Timeline */}
                <AccordionItem value="timeline">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      Timeline
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={contract.startDate}
                          onChange={(e) => updateContract("startDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Completion</Label>
                        <Input
                          type="date"
                          value={contract.estimatedEndDate}
                          onChange={(e) => updateContract("estimatedEndDate", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Working Days / Hours</Label>
                      <Input
                        value={contract.workingDays}
                        onChange={(e) => updateContract("workingDays", e.target.value)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Terms */}
                <AccordionItem value="terms">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-500" />
                      Terms & Warranty
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Warranty Period</Label>
                      <Input
                        value={contract.warrantyPeriod}
                        onChange={(e) => updateContract("warrantyPeriod", e.target.value)}
                        placeholder="e.g., 1 year"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Change Order Policy</Label>
                      <Textarea
                        value={contract.changeOrderPolicy}
                        onChange={(e) => updateContract("changeOrderPolicy", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cancellation Policy</Label>
                      <Textarea
                        value={contract.cancellationPolicy}
                        onChange={(e) => updateContract("cancellationPolicy", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Signatures */}
                <AccordionItem value="signatures">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-rose-500" />
                      Digital Signatures
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {/* Signature workflow explanation */}
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Signature Workflow
                      </h4>
                      <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                        <li><strong>Contractor:</strong> Sign your section first (on the right)</li>
                        <li><strong>Generate PDF:</strong> Click "Generate Contract PDF"</li>
                        <li><strong>Share:</strong> Send to client via email, or show in person</li>
                        <li><strong>Client signs:</strong> They can sign:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>In person on your device</li>
                            <li>Print and return signed copy</li>
                          </ul>
                        </li>
                      </ol>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Badge className="mb-3 bg-blue-100 text-blue-800">Client</Badge>
                        <SignatureCapture
                          label="Client Signature"
                          placeholder="Client's full name"
                          onSignatureChange={setClientSignature}
                        />
                      </div>
                      <div>
                        <Badge className="mb-3 bg-amber-100 text-amber-800">Contractor</Badge>
                        <SignatureCapture
                          label="Contractor Signature"
                          placeholder="Your name"
                          onSignatureChange={setContractorSignature}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Contract Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contract Number */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Contract Number</p>
                <p className="text-xl font-bold">#{contract.contractNumber}</p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {contractorSignature && (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Contractor Signed
                  </Badge>
                )}
                {clientSignature && (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Client Signed
                  </Badge>
                )}
                {!contractorSignature && !clientSignature && (
                  <Badge className="bg-amber-100 text-amber-800 gap-1">
                    <Clock className="w-3 h-3" />
                    Awaiting Signatures
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Amount Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(contract.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit ({contract.depositPercentage}%)</span>
                  <span>{formatCurrency(contract.depositAmount)}</span>
                </div>
              </div>

              <Separator />

              {/* Generate Button */}
              <Button
                onClick={generateContractPDF}
                disabled={isGenerating}
                className="w-full bg-slate-800 hover:bg-slate-900"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Contract PDF"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Opens print dialog for PDF
              </p>

              <Separator />

              {/* Tips */}
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="flex items-start gap-2">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Tip: Sign first, then share with your client</span>
                </p>
                <p className="flex items-start gap-2">
                  <Send className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Save the PDF and send via email</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContractGenerator;
