import { useState } from "react";
import { FileText, Plus, Trash2, Download, Building2, User, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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

const QuickModeQuoteGenerator = () => {
  const [quote, setQuote] = useState<QuoteData>(defaultQuote);
  const [activeSection, setActiveSection] = useState<"company" | "client" | "items" | "preview">("company");

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
  const tax = subtotal * 0.13; // 13% HST for Ontario
  const total = subtotal + tax;

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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company-info h1 { font-size: 24px; color: #f59e0b; margin-bottom: 8px; }
          .quote-info { text-align: right; }
          .quote-number { font-size: 20px; font-weight: bold; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; font-weight: bold; color: #666; margin-bottom: 8px; text-transform: uppercase; }
          .client-project { display: flex; gap: 40px; }
          .client-project > div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .totals { width: 300px; margin-left: auto; }
          .totals tr td { padding: 8px 12px; }
          .totals .total-row { font-size: 18px; font-weight: bold; background: #fef3c7; }
          .terms { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px; }
          .terms h3 { font-size: 14px; margin-bottom: 10px; }
          .terms p { font-size: 12px; color: #666; margin-bottom: 8px; }
          .signature { margin-top: 50px; display: flex; gap: 40px; }
          .signature-line { flex: 1; border-top: 1px solid #333; padding-top: 8px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${quote.companyName || "Your Company Name"}</h1>
            <p>${quote.companyAddress || "Address"}</p>
            <p>${quote.companyPhone || "Phone"} | ${quote.companyEmail || "Email"}</p>
          </div>
          <div class="quote-info">
            <p class="quote-number">QUOTE #${quote.quoteNumber}</p>
            <p>Date: ${quote.quoteDate}</p>
            <p>Valid Until: ${quote.validUntil}</p>
          </div>
        </div>

        <div class="section client-project">
          <div>
            <p class="section-title">Bill To</p>
            <p><strong>${quote.clientName || "Client Name"}</strong></p>
            <p>${quote.clientAddress || "Address"}</p>
            <p>${quote.clientPhone || ""}</p>
            <p>${quote.clientEmail || ""}</p>
          </div>
          <div>
            <p class="section-title">Project</p>
            <p><strong>${quote.projectName || "Project Name"}</strong></p>
            <p>${quote.projectAddress || "Address"}</p>
          </div>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th style="width: 50%">Description</th>
                <th class="text-right">Qty</th>
                <th>Unit</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${quote.lineItems
                .map(
                  (item) => `
                <tr>
                  <td>${item.description || "-"}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td>Subtotal</td>
              <td class="text-right">$${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>HST (13%)</td>
              <td class="text-right">$${tax.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td>Total</td>
              <td class="text-right">$${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="terms">
          <h3>Terms & Conditions</h3>
          <p><strong>Payment Terms:</strong> ${quote.paymentTerms}</p>
          ${quote.warranty ? `<p><strong>Warranty:</strong> ${quote.warranty}</p>` : ""}
          ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ""}
        </div>

        <div class="signature">
          <div class="signature-line">
            <p>Client Signature</p>
          </div>
          <div class="signature-line">
            <p>Date</p>
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
        {/* Section Tabs */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">HST (13%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickModeQuoteGenerator;
