import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Download, Building2, User, DollarSign, ArrowRight, SkipForward } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { RegionSelector } from "@/components/RegionSelector";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
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
}

interface CollectedData {
  photoEstimate: any | null;
  calculatorResults: any[];
  templateItems: any[];
}

interface QuickModeQuoteGeneratorProps {
  collectedData?: CollectedData;
  onSkipToSummary?: () => void;
  onQuoteGenerated?: (quote: QuoteData) => void;
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
  lineItems: [
    { id: "1", description: "", quantity: 1, unit: "unit", unitPrice: 0 },
  ],
  paymentTerms: "50% deposit required. Balance due upon completion.",
  notes: "",
  warranty: "1 year workmanship warranty included.",
};

const units = ["unit", "sq ft", "lin ft", "hour", "day", "each", "lot", "job"];

const QuickModeQuoteGenerator = ({ collectedData, onSkipToSummary, onQuoteGenerated }: QuickModeQuoteGeneratorProps) => {
  const [quote, setQuote] = useState<QuoteData>(defaultQuote);
  const [activeSection, setActiveSection] = useState<"company" | "client" | "items" | "preview">("company");
  const { calculateTax, config, formatCurrency: formatCurrencyRegion } = useRegionSettings();

  // Pre-fill line items from collected data
  useEffect(() => {
    if (collectedData) {
      const newLineItems: LineItem[] = [];
      
      // Add from calculator results
      collectedData.calculatorResults.forEach((calc, idx) => {
        if (calc.result?.materials) {
          calc.result.materials.forEach((mat: any) => {
            newLineItems.push({
              id: `calc-${idx}-${mat.item}`,
              description: mat.item,
              quantity: mat.quantity,
              unit: mat.unit || "unit",
              unitPrice: 0,
            });
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
            newLineItems.push({
              id: `template-${idx}-${mat.name}`,
              description: mat.name || mat,
              quantity: mat.quantity || 1,
              unit: mat.unit || "unit",
              unitPrice: mat.price || 0,
            });
          });
        }
      });

      if (newLineItems.length > 0) {
        setQuote(prev => ({
          ...prev,
          lineItems: newLineItems.length > 0 ? newLineItems : prev.lineItems,
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

  const generatePDF = () => {
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
          <div class="company-brand">
            <h1>${quote.companyName || "Your Company Name"}</h1>
            <p>${quote.companyAddress || "Address"}</p>
            <p>${quote.companyPhone || "Phone"} • ${quote.companyEmail || "Email"}</p>
          </div>
          <div class="quote-badge">
            <div class="number">QUOTE #${quote.quoteNumber}</div>
            <div class="dates">
              Issued: ${new Date(quote.quoteDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}<br/>
              Valid Until: ${new Date(quote.validUntil).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
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
              <p>Signature & Date</p>
            </div>
            <div class="sig-box">
              <p><strong>Contractor Authorization</strong></p>
              <p>Signature & Date</p>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business. This quote was generated using BuildUnion.</p>
            <p>${config.legalNote} • ${config.footer}</p>
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
                <Input
                  value={quote.companyAddress}
                  onChange={(e) => updateQuote("companyAddress", e.target.value)}
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
                <Input
                  value={quote.clientAddress}
                  onChange={(e) => updateQuote("clientAddress", e.target.value)}
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
                <Input
                  value={quote.projectAddress}
                  onChange={(e) => updateQuote("projectAddress", e.target.value)}
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
              {quote.lineItems.map((item, index) => (
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
                      placeholder="e.g., Labor - Tile Installation"
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
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
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
              onClick={generatePDF}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate PDF Quote
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Opens a print dialog to save as PDF
            </p>

            <Separator />

            {/* Continue to Summary */}
            <Button
              onClick={() => onQuoteGenerated?.(quote)}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Continue with Quote
              <ArrowRight className="w-4 h-4" />
            </Button>

            {/* Skip to Summary */}
            <Button
              variant="outline"
              onClick={onSkipToSummary}
              className="w-full gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip to Summary (No Quote)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickModeQuoteGenerator;
