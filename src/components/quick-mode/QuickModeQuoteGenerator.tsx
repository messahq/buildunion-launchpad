import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Download, Building2, User, DollarSign, ArrowRight, SkipForward, Save, FolderPlus, LayoutTemplate, ChevronDown, ChevronUp, PenLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { RegionSelector } from "@/components/RegionSelector";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SignatureCapture from "@/components/SignatureCapture";
import AddressAutocomplete from "@/components/AddressAutocomplete";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface SignatureData {
  type: 'drawn' | 'typed';
  data: string;
  name: string;
  signedAt?: string;
}

interface QuoteData {
  // Company Info
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  
  // Client Info
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  
  // Project Info
  projectName: string;
  projectAddress: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  
  // Line Items
  lineItems: LineItem[];
  
  // Terms
  paymentTerms: string;
  notes: string;
  warranty: string;
  
  // Signatures
  clientSignature?: SignatureData | null;
  contractorSignature?: SignatureData | null;
}

interface CollectedData {
  photoEstimate: any | null;
  calculatorResults: any[];
  templateItems: any[];
}

interface QuoteProgressUpdate {
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyEmail?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  lineItemsCount?: number;
}

interface QuickModeQuoteGeneratorProps {
  collectedData?: CollectedData;
  onSkipToSummary?: () => void;
  onQuoteGenerated?: (quote: QuoteData) => void;
  onSaveToProjects?: (projectData: any) => void;
  onProgressUpdate?: (data: QuoteProgressUpdate) => void;
}

const defaultQuote: QuoteData = {
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  clientName: "",
  clientAddress: "",
  clientPhone: "",
  clientEmail: "",
  projectName: "",
  projectAddress: "",
  quoteNumber: `Q-${Date.now().toString().slice(-6)}`,
  quoteDate: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  lineItems: [],
  paymentTerms: "50% deposit required. Balance due upon completion.",
  notes: "",
  warranty: "1 year workmanship warranty included.",
};

const units = ["unit", "sq ft", "lin ft", "hour", "day", "each", "lot", "job"];

const QuickModeQuoteGenerator = ({ collectedData, onSkipToSummary, onQuoteGenerated, onSaveToProjects, onProgressUpdate }: QuickModeQuoteGeneratorProps) => {
  const [quote, setQuote] = useState<QuoteData>(defaultQuote);
  const [activeSection, setActiveSection] = useState<"company" | "client" | "items" | "preview">("company");
  const [isSaving, setIsSaving] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [profileData, setProfileData] = useState<{
    companyLogoUrl?: string | null;
    companyName?: string | null;
    companyWebsite?: string | null;
    phone?: string | null;
  } | null>(null);
  const [clientSignature, setClientSignature] = useState<{ type: 'drawn' | 'typed'; data: string; name: string } | null>(null);
  const [contractorSignature, setContractorSignature] = useState<{ type: 'drawn' | 'typed'; data: string; name: string } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState("");
  const { calculateTax, config, formatCurrency: formatCurrencyRegion } = useRegionSettings();
  const { user } = useAuth();

  // Report progress updates to parent
  useEffect(() => {
    onProgressUpdate?.({
      companyName: quote.companyName,
      companyPhone: quote.companyPhone,
      companyAddress: quote.companyAddress,
      companyEmail: quote.companyEmail,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress,
      clientPhone: quote.clientPhone,
      lineItemsCount: quote.lineItems.length,
    });
  }, [quote, onProgressUpdate]);

  // Fetch profile data for branding
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('bu_profiles')
        .select('company_logo_url, company_name, company_website, phone')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setProfileData({
          companyLogoUrl: data.company_logo_url,
          companyName: data.company_name,
          companyWebsite: data.company_website,
          phone: data.phone
        });
        
        // Pre-fill company info from profile
        setQuote(prev => ({
          ...prev,
          companyName: data.company_name || prev.companyName,
          companyPhone: data.phone || prev.companyPhone,
          companyEmail: user.email || prev.companyEmail
        }));
      }
    };
    fetchProfile();
  }, [user]);

  // Pre-fill line items from collected data
  useEffect(() => {
    if (collectedData) {
      const newLineItems: LineItem[] = [];
      
      // Add materials from photo estimate (AI detected materials)
      if (collectedData.photoEstimate?.materials) {
        collectedData.photoEstimate.materials.forEach((mat: any, idx: number) => {
          const quantity = typeof mat.quantity === 'string' 
            ? parseFloat(mat.quantity) || 1 
            : mat.quantity || 1;
          newLineItems.push({
            id: `photo-${idx}-${mat.item}`,
            description: mat.item,
            quantity: quantity,
            unit: mat.unit || "unit",
            unitPrice: 0,
          });
        });
      }
      
      // Add from calculator results
      collectedData.calculatorResults.forEach((calc, idx) => {
        if (calc.result?.materials) {
          calc.result.materials.forEach((mat: any) => {
            // Avoid duplicates from photo estimate
            const isDuplicate = newLineItems.some(
              item => item.description.toLowerCase() === mat.item?.toLowerCase()
            );
            if (!isDuplicate) {
              newLineItems.push({
                id: `calc-${idx}-${mat.item}`,
                description: mat.item,
                quantity: mat.quantity,
                unit: mat.unit || "unit",
                unitPrice: 0,
              });
            }
          });
        }
      });

      // Add labor from calculator
      collectedData.calculatorResults.forEach((calc, idx) => {
        if (calc.result?.laborHours) {
          newLineItems.push({
            id: `labor-${idx}`,
            description: `Labor - ${calc.calcType}`,
            quantity: calc.result.laborHours,
            unit: "hour",
            unitPrice: 0,
          });
        }
      });

      // Add from template items
      collectedData.templateItems.forEach((template, idx) => {
        if (template.materials) {
          template.materials.forEach((mat: any) => {
            // Avoid duplicates
            const matName = mat.name || mat;
            const isDuplicate = newLineItems.some(
              item => item.description.toLowerCase() === matName.toLowerCase()
            );
            if (!isDuplicate) {
              newLineItems.push({
                id: `template-${idx}-${matName}`,
                description: matName,
                quantity: mat.quantity || 1,
                unit: mat.unit || "unit",
                unitPrice: mat.price || 0,
              });
            }
          });
        }
      });

      if (newLineItems.length > 0) {
        setQuote(prev => ({
          ...prev,
          lineItems: newLineItems,
        }));
      }
    }
  }, [collectedData]);

  const updateQuote = (field: keyof QuoteData, value: any) => {
    setQuote((prev) => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unit: "unit",
      unitPrice: 0,
    };
    setQuote((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setQuote((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeLineItem = (id: string) => {
    if (quote.lineItems.length === 1) {
      toast.error("At least one line item is required");
      return;
    }
    setQuote((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  };

  const subtotal = quote.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxResult = calculateTax(subtotal);
  const total = taxResult.total;

  // Open save dialog
  const handleOpenSaveDialog = () => {
    if (!user) {
      toast.error("Please sign in to save projects");
      return;
    }
    // Pre-fill with project name if exists
    setSaveProjectName(quote.projectName || "");
    setShowSaveDialog(true);
  };

  // Save to projects function
  const handleSaveToProjects = async () => {
    if (!user) {
      toast.error("Please sign in to save projects");
      return;
    }

    const projectName = saveProjectName.trim() || quote.projectName.trim();
    if (!projectName) {
      toast.error("Please enter a project name");
      return;
    }

    setIsSaving(true);
    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description: `Generated from Quick Mode. Client: ${quote.clientName || 'Not specified'}`,
          status: 'draft',
          address: quote.projectAddress || quote.clientAddress || null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project summary with all collected data
      const { error: summaryError } = await supabase
        .from('project_summaries')
        .insert([{
          user_id: user.id,
          project_id: project.id,
          status: 'draft',
          client_name: quote.clientName || null,
          client_email: quote.clientEmail || null,
          client_phone: quote.clientPhone || null,
          client_address: quote.clientAddress || null,
          line_items: quote.lineItems as any,
          material_cost: subtotal,
          total_cost: total,
          notes: quote.notes || null,
          photo_estimate: collectedData?.photoEstimate || null,
          calculator_results: collectedData?.calculatorResults || null,
          template_items: collectedData?.templateItems || null,
        }]);

      if (summaryError) throw summaryError;

      setShowSaveDialog(false);
      toast.success("Project saved successfully!");
      
      if (onSaveToProjects) {
        onSaveToProjects({ projectId: project.id, quote, collectedData });
      }
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error(error.message || "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save project and generate PDF
  const generatePDFAndSave = async () => {
    // First, auto-save the project if user is authenticated
    if (user) {
      const projectName = quote.projectName.trim() || quote.clientName.trim() || `Quote ${quote.quoteNumber}`;
      
      try {
        // Create project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: projectName,
            description: `Generated from Quick Mode. Client: ${quote.clientName || 'Not specified'}`,
            status: 'draft',
            address: quote.projectAddress || quote.clientAddress || null,
          })
          .select()
          .single();

        if (!projectError && project) {
          // Create project summary with all collected data
          await supabase
            .from('project_summaries')
            .insert([{
              user_id: user.id,
              project_id: project.id,
              status: 'draft',
              client_name: quote.clientName || null,
              client_email: quote.clientEmail || null,
              client_phone: quote.clientPhone || null,
              client_address: quote.clientAddress || null,
              line_items: quote.lineItems as any,
              material_cost: subtotal,
              total_cost: total,
              notes: quote.notes || null,
              photo_estimate: collectedData?.photoEstimate || null,
              calculator_results: collectedData?.calculatorResults || null,
              template_items: collectedData?.templateItems || null,
            }]);
          
          toast.success("Project auto-saved!");
          
          if (onSaveToProjects) {
            onSaveToProjects({ projectId: project.id, quote, collectedData });
          }
        }
      } catch (error) {
        console.error("Error auto-saving project:", error);
        // Continue with PDF generation even if save fails
      }
    }
    
    // Then generate PDF
    generatePDF();
  };

  const generatePDF = () => {
    // Always use current date for issued date
    const currentDate = new Date().toISOString().split("T")[0];
    const validUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // Create a printable version
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate PDF");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.quoteNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            padding: 0; 
            color: #1a1a1a; 
            background: #fff;
            line-height: 1.5;
          }
          
          /* Professional Header */
          .header-bar {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 24px 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-brand h1 { 
            font-size: 26px; 
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
          }
          .company-brand p {
            font-size: 13px;
            opacity: 0.85;
          }
          .quote-badge {
            background: rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 16px 24px;
            text-align: right;
          }
          .quote-badge .number {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .quote-badge .dates {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 4px;
          }

          /* Main Content */
          .content { padding: 40px; }
          
          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 40px;
          }
          .info-box {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            background: #fafafa;
          }
          .info-box h3 {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          .info-box .name {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
          }
          .info-box .details {
            font-size: 13px;
            color: #64748b;
          }

          /* Table */
          .items-section { margin-bottom: 32px; }
          .items-section h3 {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #1e293b;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          thead tr {
            background: #f8fafc;
          }
          th { 
            padding: 14px 16px; 
            text-align: left; 
            font-weight: 600; 
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
          }
          td { 
            padding: 16px; 
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          tbody tr:hover { background: #fafafa; }
          .text-right { text-align: right; }
          .item-desc { font-weight: 500; }

          /* Totals */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 24px;
          }
          .totals-box {
            width: 320px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 14px;
            border-bottom: 1px solid #e2e8f0;
          }
          .totals-row.total {
            border: none;
            padding-top: 16px;
            margin-top: 8px;
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
          }
          .totals-row .label { color: #64748b; }
          .totals-row .value { font-weight: 600; }

          /* Terms */
          .terms-section {
            margin-top: 40px;
            padding: 24px;
            background: #f8fafc;
            border-radius: 12px;
            border-left: 4px solid #1e293b;
          }
          .terms-section h3 {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
          }
          .terms-section p {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
          }

          /* Signature */
          .signature-section {
            margin-top: 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
          }
          .sig-box {
            padding-top: 16px;
            border-top: 2px solid #1e293b;
          }
          .sig-box p {
            font-size: 12px;
            color: #64748b;
          }

          /* Footer */
          .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }

          /* Ontario HST Badge */
          .hst-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            font-size: 10px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 8px;
          }

          @media print { 
            body { padding: 0; }
            .header-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div class="company-brand" style="display: flex; align-items: center; gap: 16px;">
            ${profileData?.companyLogoUrl ? `
              <img src="${profileData.companyLogoUrl}" alt="Company Logo" style="height: 60px; width: auto; border-radius: 8px; background: white; padding: 4px;" />
            ` : ''}
            <div>
              <h1>${quote.companyName || profileData?.companyName || "Your Company Name"}</h1>
              <p>${quote.companyAddress || "Address"}</p>
              <p style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                ${quote.companyPhone || profileData?.phone ? `<span>📞 ${quote.companyPhone || profileData?.phone}</span>` : ''}
                ${quote.companyEmail || user?.email ? `<span>✉️ ${quote.companyEmail || user?.email}</span>` : ''}
                ${profileData?.companyWebsite ? `<span>🌐 ${profileData.companyWebsite}</span>` : ''}
              </p>
            </div>
          </div>
          <div class="quote-badge">
            <div class="number">QUOTE #${quote.quoteNumber}</div>
            <div class="dates">
              Issued: ${new Date(currentDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}<br/>
              Valid Until: ${new Date(validUntilDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div class="content">
          <div class="info-grid">
            <div class="info-box">
              <h3>Bill To</h3>
              <p class="name">${quote.clientName || "Client Name"}</p>
              <p class="details">
                ${quote.clientAddress || ""}<br/>
                ${quote.clientPhone || ""}<br/>
                ${quote.clientEmail || ""}
              </p>
            </div>
            <div class="info-box">
              <h3>Project Details</h3>
              <p class="name">${quote.projectName || "Project Name"}</p>
              <p class="details">${quote.projectAddress || "Same as billing address"}</p>
            </div>
          </div>

          <div class="items-section">
            <h3>Itemized Quote</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 45%">Description</th>
                  <th class="text-right">Qty</th>
                  <th>Unit</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${quote.lineItems
                  .map(
                    (item) => `
                  <tr>
                    <td class="item-desc">${item.description || "—"}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td class="text-right">$${item.unitPrice.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</td>
                    <td class="text-right"><strong>$${(item.quantity * item.unitPrice).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</strong></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-box">
                <div class="totals-row">
                  <span class="label">Subtotal</span>
                  <span class="value">$${subtotal.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                </div>
                ${taxResult.breakdown.map((t, i) => `
                <div class="totals-row">
                  <span class="label">${t.name} (${(config.tax.components[i]?.rate * 100).toFixed(t.name === "QST" ? 3 : 0)}%) <span class="hst-badge">${config.shortName}</span></span>
                  <span class="value">$${t.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                </div>
                `).join("")}
                <div class="totals-row total">
                  <span>Total</span>
                  <span>$${total.toLocaleString('en-CA', { minimumFractionDigits: 2 })} CAD</span>
                </div>
              </div>
            </div>
          </div>

          <div class="terms-section">
            <h3>Terms & Conditions</h3>
            <p><strong>Payment:</strong> ${quote.paymentTerms}</p>
            ${quote.warranty ? `<p><strong>Warranty:</strong> ${quote.warranty}</p>` : ""}
            ${quote.notes ? `<p><strong>Additional Notes:</strong> ${quote.notes}</p>` : ""}
          </div>

          <div class="signature-section">
            <div class="sig-box">
              <p><strong>Client Acceptance</strong></p>
              ${clientSignature 
                ? clientSignature.type === 'drawn' 
                  ? '<img src="' + clientSignature.data + '" alt="Client Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                  : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + clientSignature.data + '</p>'
                : '<div style="height: 40px; border-bottom: 1px solid #ccc; margin: 8px 0;"></div>'}
              <p style="font-size: 11px; color: #666;">Signature & Date</p>
            </div>
            <div class="sig-box">
              <p><strong>Contractor Authorization</strong></p>
              ${contractorSignature 
                ? contractorSignature.type === 'drawn' 
                  ? '<img src="' + contractorSignature.data + '" alt="Contractor Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                  : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + contractorSignature.data + '</p>'
                : '<div style="height: 40px; border-bottom: 1px solid #ccc; margin: 8px 0;"></div>'}
              <p style="font-size: 11px; color: #666;">Signature & Date</p>
            </div>
          </div>

          <div class="footer" style="margin-top: 48px; padding: 24px 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 16px;">
              ${profileData?.companyLogoUrl ? `
                <img src="${profileData.companyLogoUrl}" alt="Logo" style="height: 40px; width: auto; border-radius: 6px; background: white; padding: 3px;" />
              ` : ''}
              <div>
                <p style="font-weight: 600; font-size: 14px; margin: 0;">${quote.companyName || profileData?.companyName || 'Your Company'}</p>
                <p style="font-size: 11px; opacity: 0.8; margin: 0;">Licensed & Insured • WSIB Covered</p>
              </div>
            </div>
            <div style="text-align: right; font-size: 12px;">
              <p style="margin: 0; display: flex; gap: 16px; justify-content: flex-end; flex-wrap: wrap;">
                ${quote.companyPhone || profileData?.phone ? `<span>📞 ${quote.companyPhone || profileData?.phone}</span>` : ''}
                ${quote.companyEmail || user?.email ? `<span>✉️ ${quote.companyEmail || user?.email}</span>` : ''}
              </p>
              ${profileData?.companyWebsite ? `<p style="margin: 4px 0 0 0; opacity: 0.8;">🌐 ${profileData.companyWebsite}</p>` : ''}
              <p style="margin: 8px 0 0 0; font-size: 10px; opacity: 0.6;">${config.legalNote} • ${config.footer}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Collected Data Summary Banner */}
      {collectedData && (collectedData.photoEstimate || collectedData.calculatorResults.length > 0 || collectedData.templateItems.length > 0) && (
        <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <LayoutTemplate className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Collected Data Summary</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {collectedData.photoEstimate && (
              <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                📸 Photo Estimate: {collectedData.photoEstimate.area || '?'} {collectedData.photoEstimate.areaUnit || 'sq ft'}
              </Badge>
            )}
            {collectedData.templateItems.map((template: any, idx: number) => (
              <Badge key={idx} className="bg-violet-100 text-violet-800 hover:bg-violet-100">
                📋 {template.templateName}: {template.projectName}
              </Badge>
            ))}
            {collectedData.calculatorResults.map((calc: any, idx: number) => (
              <Badge key={idx} className="bg-green-100 text-green-800 hover:bg-green-100">
                🧮 {calc.calcType}: {calc.result?.result?.toFixed(1)} {calc.result?.materials?.length || 0} materials
              </Badge>
            ))}
          </div>
          <p className="text-sm text-amber-700 mt-3">
            Line items have been pre-filled from your collected data. Edit quantities and add prices below.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-4">
        {/* Region Selector + Section Tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg flex-1">
            {[
              { id: "company", label: "Your Info", icon: Building2 },
              { id: "client", label: "Client", icon: User },
              { id: "items", label: "Line Items", icon: DollarSign },
            ].map((section) => (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "default" : "ghost"}
                className="flex-1"
                onClick={() => setActiveSection(section.id as any)}
              >
                <section.icon className="w-4 h-4 mr-2" />
                {section.label}
              </Button>
            ))}
          </div>
          <RegionSelector />
        </div>

        {/* Company Info */}
        {activeSection === "company" && (
          <Card>
            <CardHeader>
              <CardTitle>Your Business Information</CardTitle>
              <CardDescription>This will appear on the quote header</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={quote.companyName}
                    onChange={(e) => updateQuote("companyName", e.target.value)}
                    placeholder="ABC Construction Ltd."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={quote.companyPhone}
                    onChange={(e) => updateQuote("companyPhone", e.target.value)}
                    placeholder="(416) 555-0123"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <AddressAutocomplete
                  value={quote.companyAddress}
                  onChange={(value) => updateQuote("companyAddress", value)}
                  placeholder="123 Main St, Toronto, ON M1A 1A1"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={quote.companyEmail}
                  onChange={(e) => updateQuote("companyEmail", e.target.value)}
                  placeholder="info@abcconstruction.ca"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Info */}
        {activeSection === "client" && (
          <Card>
            <CardHeader>
              <CardTitle>Client & Project Information</CardTitle>
              <CardDescription>Details about your client and the project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    value={quote.clientName}
                    onChange={(e) => updateQuote("clientName", e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Phone</Label>
                  <Input
                    value={quote.clientPhone}
                    onChange={(e) => updateQuote("clientPhone", e.target.value)}
                    placeholder="(416) 555-0456"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client Address</Label>
                <AddressAutocomplete
                  value={quote.clientAddress}
                  onChange={(value) => updateQuote("clientAddress", value)}
                  placeholder="456 Oak Ave, Toronto, ON M2B 2B2"
                />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input
                  value={quote.clientEmail}
                  onChange={(e) => updateQuote("clientEmail", e.target.value)}
                  placeholder="john.smith@email.com"
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={quote.projectName}
                    onChange={(e) => updateQuote("projectName", e.target.value)}
                    placeholder="Bathroom Renovation"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quote Valid Until</Label>
                  <Input
                    type="date"
                    value={quote.validUntil}
                    onChange={(e) => updateQuote("validUntil", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Project Address (if different)</Label>
                <AddressAutocomplete
                  value={quote.projectAddress}
                  onChange={(value) => updateQuote("projectAddress", value)}
                  placeholder="Same as client address"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        {activeSection === "items" && (
          <Card>
            <CardHeader>
              <CardTitle>Quote Line Items</CardTitle>
              <CardDescription>Add materials, labor, and other costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First 2 items always visible */}
              {quote.lineItems.slice(0, 2).map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 border border-border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                      placeholder="e.g., Labor, Materials, Equipment..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateLineItem(item.id, "unit", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price ($)</Label>
                      <Input
                        type="number"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Enter price"
                      />
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Line Total: </span>
                    <span className="font-semibold text-amber-600">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Collapsible remaining items */}
              {quote.lineItems.length > 2 && (
                <Collapsible open={showAllItems} onOpenChange={setShowAllItems}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      {showAllItems ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide {quote.lineItems.length - 2} more items
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show {quote.lineItems.length - 2} more items
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    {quote.lineItems.slice(2).map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 border border-border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Item {index + 3}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(item.id, "description", e.target.value)
                            }
                            placeholder="e.g., Labor, Materials, Equipment..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateLineItem(item.id, "unit", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price ($)</Label>
                            <Input
                              type="number"
                              value={item.unitPrice === 0 ? "" : item.unitPrice}
                              onChange={(e) =>
                                updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                              }
                              placeholder="Enter price"
                            />
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground">Line Total: </span>
                          <span className="font-semibold text-amber-600">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Button variant="outline" onClick={addLineItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>

              <Separator />

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Textarea
                  value={quote.paymentTerms}
                  onChange={(e) => updateQuote("paymentTerms", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Warranty</Label>
                <Input
                  value={quote.warranty}
                  onChange={(e) => updateQuote("warranty", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={quote.notes}
                  onChange={(e) => updateQuote("notes", e.target.value)}
                  placeholder="Any additional terms or notes..."
                  rows={3}
                />
              </div>

              <Separator />

              {/* Signature Capture Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-amber-500" />
                  <h4 className="font-semibold text-foreground">Digital Signatures</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Capture signatures for the quote. You can type your name or draw your signature.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <SignatureCapture
                    label="Client Signature"
                    placeholder="Client's full name"
                    onSignatureChange={setClientSignature}
                  />
                  <SignatureCapture
                    label="Contractor Signature"
                    placeholder="Your full name"
                    onSignatureChange={setContractorSignature}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview & Summary */}
      <div className="space-y-4">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Quote Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quote Number */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Quote Number</p>
              <p className="text-xl font-bold">#{quote.quoteNumber}</p>
            </div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {taxResult.breakdown.map((t, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.name} ({(config.tax.components[idx]?.rate * 100).toFixed(t.name === "QST" ? 3 : 0)}%)</span>
                  <span>${t.amount.toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-amber-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Line Items Count */}
            <div className="text-center text-sm text-muted-foreground">
              {quote.lineItems.length} line item{quote.lineItems.length !== 1 ? "s" : ""}
            </div>

            {/* Generate Button */}
            <Button
              onClick={generatePDFAndSave}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate PDF Quote
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Opens a print dialog to save as PDF
            </p>

            <Separator />

            {/* Save to Projects - Primary Action */}
            <Button
              onClick={handleOpenSaveDialog}
              disabled={isSaving || !user}
              className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <FolderPlus className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save to Projects"}
            </Button>

            {!user && (
              <p className="text-xs text-center text-amber-600">
                Sign in to save projects
              </p>
            )}

            {/* Save Dialog */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-green-500" />
                    Save to Projects
                  </DialogTitle>
                  <DialogDescription>
                    Enter a name to save this quote as a project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="projectName"
                      value={saveProjectName}
                      onChange={(e) => setSaveProjectName(e.target.value)}
                      placeholder="e.g. Kitchen Renovation - Smith"
                      autoFocus
                    />
                  </div>
                  
                  {/* Summary of what will be saved */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Will be saved:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {quote.clientName && (
                        <p>• Client: {quote.clientName}</p>
                      )}
                      <p>• {quote.lineItems.length} line items</p>
                      <p>• Total: ${total.toFixed(2)}</p>
                      {collectedData?.photoEstimate && (
                        <p>• Photo estimate data</p>
                      )}
                      {collectedData?.calculatorResults && collectedData.calculatorResults.length > 0 && (
                        <p>• Calculator results ({collectedData.calculatorResults.length})</p>
                      )}
                      {collectedData?.templateItems && collectedData.templateItems.length > 0 && (
                        <p>• Template items ({collectedData.templateItems.length})</p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveToProjects}
                    disabled={isSaving || !saveProjectName.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {isSaving ? "Saving..." : "Save Project"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Separator />

            {/* Skip to Summary */}
            <Button
              variant="ghost"
              onClick={onSkipToSummary}
              className="w-full gap-2 text-muted-foreground"
            >
              <SkipForward className="w-4 h-4" />
              Skip (No Quote)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default QuickModeQuoteGenerator;
