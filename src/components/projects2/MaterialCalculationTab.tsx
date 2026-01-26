import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Package,
  DollarSign,
  Hammer,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { downloadPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";

interface CostItem {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface TaskBasedEntry {
  item: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

interface MaterialCalculationTabProps {
  materials: TaskBasedEntry[];
  labor: TaskBasedEntry[];
  projectTotal: number;
  projectName?: string;
  projectAddress?: string;
  companyName?: string;
  onCostsChange?: (costs: { materials: CostItem[]; labor: CostItem[]; other: CostItem[] }) => void;
  currency?: string;
}

// Canadian provincial tax rates
const getCanadianTaxRates = (address: string): { gst: number; pst: number; hst: number; provinceName: string; provinceCode: string } => {
  const addressLower = address.toLowerCase();
  
  // Ontario - HST 13%
  if (addressLower.includes('ontario') || addressLower.includes(', on') || addressLower.includes('toronto') || 
      addressLower.includes('ottawa') || addressLower.includes('mississauga') || addressLower.includes('hamilton') ||
      addressLower.includes('brampton') || addressLower.includes('london') || addressLower.includes('markham')) {
    return { gst: 0, pst: 0, hst: 0.13, provinceName: 'Ontario', provinceCode: 'ON' };
  }
  // British Columbia - GST 5% + PST 7%
  if (addressLower.includes('british columbia') || addressLower.includes(', bc') || addressLower.includes('vancouver') || 
      addressLower.includes('victoria') || addressLower.includes('surrey') || addressLower.includes('burnaby')) {
    return { gst: 0.05, pst: 0.07, hst: 0, provinceName: 'British Columbia', provinceCode: 'BC' };
  }
  // Alberta - GST 5% only
  if (addressLower.includes('alberta') || addressLower.includes(', ab') || addressLower.includes('calgary') || 
      addressLower.includes('edmonton') || addressLower.includes('red deer')) {
    return { gst: 0.05, pst: 0, hst: 0, provinceName: 'Alberta', provinceCode: 'AB' };
  }
  // Quebec - GST 5% + QST 9.975%
  if (addressLower.includes('quebec') || addressLower.includes('québec') || addressLower.includes(', qc') || 
      addressLower.includes('montreal') || addressLower.includes('montréal') || addressLower.includes('laval')) {
    return { gst: 0.05, pst: 0.09975, hst: 0, provinceName: 'Quebec', provinceCode: 'QC' };
  }
  // Manitoba - GST 5% + PST 7%
  if (addressLower.includes('manitoba') || addressLower.includes(', mb') || addressLower.includes('winnipeg')) {
    return { gst: 0.05, pst: 0.07, hst: 0, provinceName: 'Manitoba', provinceCode: 'MB' };
  }
  // Saskatchewan - GST 5% + PST 6%
  if (addressLower.includes('saskatchewan') || addressLower.includes(', sk') || addressLower.includes('saskatoon') || 
      addressLower.includes('regina')) {
    return { gst: 0.05, pst: 0.06, hst: 0, provinceName: 'Saskatchewan', provinceCode: 'SK' };
  }
  // Nova Scotia - HST 15%
  if (addressLower.includes('nova scotia') || addressLower.includes(', ns') || addressLower.includes('halifax')) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'Nova Scotia', provinceCode: 'NS' };
  }
  // New Brunswick - HST 15%
  if (addressLower.includes('new brunswick') || addressLower.includes(', nb') || addressLower.includes('moncton') || 
      addressLower.includes('saint john')) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'New Brunswick', provinceCode: 'NB' };
  }
  // Newfoundland and Labrador - HST 15%
  if (addressLower.includes('newfoundland') || addressLower.includes('labrador') || addressLower.includes(', nl') || 
      addressLower.includes("st. john's")) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'Newfoundland and Labrador', provinceCode: 'NL' };
  }
  // Prince Edward Island - HST 15%
  if (addressLower.includes('prince edward island') || addressLower.includes(', pe') || addressLower.includes('charlottetown')) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'Prince Edward Island', provinceCode: 'PE' };
  }
  // Default to Ontario HST
  return { gst: 0, pst: 0, hst: 0.13, provinceName: 'Ontario', provinceCode: 'ON' };
};

export function MaterialCalculationTab({
  materials: initialMaterials,
  labor: initialLabor,
  projectTotal,
  projectName = "Project",
  projectAddress = "",
  companyName,
  onCostsChange,
  currency = "CAD"
}: MaterialCalculationTabProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  
  // Material items
  const [materialItems, setMaterialItems] = useState<CostItem[]>(() => 
    initialMaterials.map((m, idx) => ({
      id: `material-${idx}`,
      item: m.item,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unitPrice || 0,
      totalPrice: m.quantity * (m.unitPrice || 0),
    }))
  );

  // Labor items
  const [laborItems, setLaborItems] = useState<CostItem[]>(() => 
    initialLabor.map((l, idx) => ({
      id: `labor-${idx}`,
      item: l.item,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice || 0,
      totalPrice: l.quantity * (l.unitPrice || 0),
    }))
  );
  
  // Other/custom items
  const [otherItems, setOtherItems] = useState<CostItem[]>([]);
  
  // New other item form
  const [otherDescription, setOtherDescription] = useState("");
  const [otherQuantity, setOtherQuantity] = useState<number>(1);
  const [otherUnit, setOtherUnit] = useState("pcs");
  const [otherUnitPrice, setOtherUnitPrice] = useState<number>(0);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CostItem>>({});

  // Section collapse state
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [laborOpen, setLaborOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);

  // Calculate section totals
  const materialsTotal = materialItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const laborTotal = laborItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const otherTotal = otherItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const grandTotal = materialsTotal + laborTotal + otherTotal;

  // Update parent when items change
  useEffect(() => {
    onCostsChange?.({ materials: materialItems, labor: laborItems, other: otherItems });
  }, [materialItems, laborItems, otherItems, onCostsChange]);

  const handleItemChange = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string, 
    field: 'unitPrice' | 'quantity',
    value: number
  ) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      newItem.totalPrice = newItem.quantity * newItem.unitPrice;
      return newItem;
    }));
  };

  const startEditing = (item: CostItem) => {
    setEditingId(item.id);
    setEditValues({
      item: item.item,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    });
  };

  const saveEdit = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string
  ) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            ...editValues,
            totalPrice: (editValues.quantity || item.quantity) * (editValues.unitPrice || item.unitPrice)
          }
        : item
    ));
    setEditingId(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const deleteItem = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string
  ) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addOtherItem = () => {
    if (!otherDescription.trim()) return;
    
    const newItem: CostItem = {
      id: `other-${Date.now()}`,
      item: otherDescription,
      quantity: otherQuantity,
      unit: otherUnit,
      unitPrice: otherUnitPrice,
      totalPrice: otherQuantity * otherUnitPrice,
    };
    
    setOtherItems(prev => [...prev, newItem]);
    setOtherDescription("");
    setOtherQuantity(1);
    setOtherUnit("pcs");
    setOtherUnitPrice(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Generate and download PDF cost breakdown
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const currentDate = new Date().toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      // Get tax rates based on project address
      const taxInfo = getCanadianTaxRates(projectAddress);
      const subtotal = grandTotal;
      
      // Calculate taxes
      let gstAmount = 0;
      let pstAmount = 0;
      let hstAmount = 0;
      let taxLabel = '';
      
      if (taxInfo.hst > 0) {
        hstAmount = subtotal * taxInfo.hst;
        taxLabel = `HST (${(taxInfo.hst * 100).toFixed(0)}%)`;
      } else {
        if (taxInfo.gst > 0) {
          gstAmount = subtotal * taxInfo.gst;
        }
        if (taxInfo.pst > 0) {
          pstAmount = subtotal * taxInfo.pst;
          taxLabel = taxInfo.provinceCode === 'QC' ? 'QST' : 'PST';
        }
      }
      
      const totalTax = gstAmount + pstAmount + hstAmount;
      const grandTotalWithTax = subtotal + totalTax;

      // Build cost breakdown items HTML
      const buildItemsHtml = (items: CostItem[], colorClass: string) => {
        if (items.length === 0) return '';
        return items.map(item => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${item.item}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity.toLocaleString()}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.unit}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unitPrice)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: ${colorClass};">${formatCurrency(item.totalPrice)}</td>
          </tr>
        `).join('');
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto; padding: 40px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 32px; border-radius: 12px; margin-bottom: 32px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">Cost Breakdown</h1>
                  <p style="font-size: 14px; opacity: 0.9;">${projectName}</p>
                  ${projectAddress ? `<p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">📍 ${projectAddress}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  ${companyName ? `<p style="font-size: 16px; font-weight: 600;">${companyName}</p>` : ''}
                  <p style="font-size: 12px; opacity: 0.8;">Generated: ${currentDate}</p>
                  <div style="margin-top: 8px; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 6px; display: inline-block;">
                    <span style="font-size: 11px; opacity: 0.9;">Tax Region: </span>
                    <span style="font-size: 12px; font-weight: 600;">${taxInfo.provinceName} (${taxInfo.provinceCode})</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Materials Section -->
            ${materialItems.length > 0 ? `
              <div style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">📦</div>
                  <h2 style="font-size: 18px; font-weight: 600; color: #1e40af;">Materials</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #1e40af;">${formatCurrency(materialsTotal)}</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Qty</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unit</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unit Price</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(materialItems, '#1e40af')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Labor Section -->
            ${laborItems.length > 0 ? `
              <div style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 24px; height: 24px; background: #f59e0b; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">🔨</div>
                  <h2 style="font-size: 18px; font-weight: 600; color: #b45309;">Labor</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #b45309;">${formatCurrency(laborTotal)}</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Qty</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unit</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unit Price</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(laborItems, '#b45309')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Other Section -->
            ${otherItems.length > 0 ? `
              <div style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 24px; height: 24px; background: #8b5cf6; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">⋯</div>
                  <h2 style="font-size: 18px; font-weight: 600; color: #7c3aed;">Other</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #7c3aed;">${formatCurrency(otherTotal)}</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Qty</th>
                      <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unit</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unit Price</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(otherItems, '#7c3aed')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Summary & Grand Total with Tax -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; margin-top: 32px;">
              <!-- Subtotals -->
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                  <span style="color: #78716c;">📦 Materials</span>
                  <span style="font-weight: 600;">${formatCurrency(materialsTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                  <span style="color: #78716c;">🔨 Labor</span>
                  <span style="font-weight: 600;">${formatCurrency(laborTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                  <span style="color: #78716c;">⋯ Other</span>
                  <span style="font-weight: 600;">${formatCurrency(otherTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.15); font-weight: 600;">
                  <span style="color: #78350f;">Subtotal</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
              </div>

              <!-- Tax Section -->
              <div style="background: rgba(255,255,255,0.5); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 12px; font-weight: 600; color: #78350f;">📋 Tax (${taxInfo.provinceName})</span>
                </div>
                ${taxInfo.hst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #78716c; font-size: 13px;">HST (${(taxInfo.hst * 100).toFixed(0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(hstAmount)}</span>
                  </div>
                ` : ''}
                ${taxInfo.gst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #78716c; font-size: 13px;">GST (${(taxInfo.gst * 100).toFixed(0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(gstAmount)}</span>
                  </div>
                ` : ''}
                ${taxInfo.pst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span style="color: #78716c; font-size: 13px;">${taxInfo.provinceCode === 'QC' ? 'QST' : 'PST'} (${(taxInfo.pst * 100).toFixed(taxInfo.provinceCode === 'QC' ? 3 : 0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(pstAmount)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px dashed rgba(0,0,0,0.2); margin-top: 4px;">
                  <span style="color: #78350f; font-weight: 600; font-size: 13px;">Total Tax</span>
                  <span style="font-weight: 600;">${formatCurrency(totalTax)}</span>
                </div>
              </div>

              <!-- Grand Total -->
              <div style="border-top: 2px solid #b45309; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 20px; font-weight: 700; color: #78350f;">Grand Total</span>
                  <span style="font-size: 11px; color: #78716c; display: block;">(incl. tax)</span>
                </div>
                <span style="font-size: 28px; font-weight: 800; color: #78350f;">${formatCurrency(grandTotalWithTax)}</span>
              </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
              <p>This is a cost breakdown generated for project estimation purposes.</p>
              <p style="margin-top: 4px;">Tax rates applicable for ${taxInfo.provinceName}, Canada</p>
              <p style="margin-top: 4px;">Generated on ${currentDate}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await downloadPDF(htmlContent, {
        filename: `cost-breakdown-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`,
        pageFormat: 'a4',
        margin: 10
      });

      toast.success(t("materials.pdfExported", "Cost breakdown exported to PDF"));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t("materials.pdfError", "Failed to export PDF"));
    } finally {
      setIsExporting(false);
    }
  };

  // Reusable item row component
  const ItemRow = ({ 
    item, 
    setItems,
    isEditing 
  }: { 
    item: CostItem; 
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>;
    isEditing: boolean;
  }) => (
    <div 
      className={cn(
        "grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg transition-colors",
        isEditing ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
      )}
    >
      {isEditing ? (
        <>
          <div className="col-span-4">
            <Input
              value={editValues.item || ""}
              onChange={(e) => setEditValues(prev => ({ ...prev, item: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              value={editValues.quantity || 0}
              onChange={(e) => setEditValues(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm text-center"
            />
          </div>
          <div className="col-span-1">
            <Input
              value={editValues.unit || ""}
              onChange={(e) => setEditValues(prev => ({ ...prev, unit: e.target.value }))}
              className="h-8 text-sm text-center"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              step="0.01"
              value={editValues.unitPrice || ""}
              onChange={(e) => setEditValues(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm text-right"
              placeholder="0.00"
            />
          </div>
          <div className="col-span-2 text-right font-medium text-sm">
            {formatCurrency((editValues.quantity || 0) * (editValues.unitPrice || 0))}
          </div>
          <div className="col-span-1 flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
              onClick={() => saveEdit(setItems, item.id)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={cancelEdit}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="col-span-4 font-medium text-sm truncate" title={item.item}>
            {item.item}
          </div>
          <div className="col-span-2 text-center text-sm text-muted-foreground">
            {item.quantity.toLocaleString()}
          </div>
          <div className="col-span-1 text-center text-xs text-muted-foreground">
            {item.unit}
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              step="0.01"
              value={item.unitPrice || ""}
              onChange={(e) => handleItemChange(setItems, item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm text-right"
              placeholder="0.00"
            />
          </div>
          <div className="col-span-2 text-right font-medium text-sm">
            {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : "-"}
          </div>
          <div className="col-span-1 flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => startEditing(item)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteItem(setItems, item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );

  // Table header component
  const TableHeader = () => (
    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 pb-2 border-b">
      <div className="col-span-4">{t("materials.description", "Description")}</div>
      <div className="col-span-2 text-center">{t("materials.quantity", "Qty")}</div>
      <div className="col-span-1 text-center">{t("materials.unit", "Unit")}</div>
      <div className="col-span-2 text-right">{t("materials.unitPrice", "Unit Price")}</div>
      <div className="col-span-2 text-right">{t("materials.total", "Total")}</div>
      <div className="col-span-1"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {t("materials.calculation", "Cost Breakdown")}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {materialItems.length + laborItems.length + otherItems.length} {t("materials.items", "items")}
          </Badge>
          {/* Show project total for reference */}
          <Badge 
            variant="outline" 
            className="text-sm border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
          >
            Project: {formatCurrency(projectTotal)}
          </Badge>
          {/* Export PDF Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t("materials.exportPdf", "Export PDF")}</span>
          </Button>
        </div>
      </div>

      {/* Materials Section */}
      <Collapsible open={materialsOpen} onOpenChange={setMaterialsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  {t("materials.materialsSection", "Materials")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {materialItems.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-600">
                    {formatCurrency(materialsTotal)}
                  </span>
                  {materialsOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <TableHeader />
              {materialItems.map((item) => (
                <ItemRow 
                  key={item.id} 
                  item={item} 
                  setItems={setMaterialItems}
                  isEditing={editingId === item.id}
                />
              ))}
              {materialItems.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("materials.noMaterials", "No materials")}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Labor Section */}
      <Collapsible open={laborOpen} onOpenChange={setLaborOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-amber-500" />
                  {t("materials.laborSection", "Labor")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {laborItems.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-amber-600">
                    {formatCurrency(laborTotal)}
                  </span>
                  {laborOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <TableHeader />
              {laborItems.map((item) => (
                <ItemRow 
                  key={item.id} 
                  item={item} 
                  setItems={setLaborItems}
                  isEditing={editingId === item.id}
                />
              ))}
              {laborItems.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Hammer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("materials.noLabor", "No labor costs")}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Other Section */}
      <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <MoreHorizontal className="h-4 w-4 text-purple-500" />
                  {t("materials.otherSection", "Other")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {otherItems.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-purple-600">
                    {formatCurrency(otherTotal)}
                  </span>
                  {otherOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {otherItems.length > 0 && (
                <>
                  <TableHeader />
                  {otherItems.map((item) => (
                    <ItemRow 
                      key={item.id} 
                      item={item} 
                      setItems={setOtherItems}
                      isEditing={editingId === item.id}
                    />
                  ))}
                </>
              )}
              
              {/* Add Other Item Form */}
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-3">
                  {t("materials.addOtherHint", "Add delivery fees, permits, equipment rental, etc.")}
                </p>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.description", "Description")}
                    </label>
                    <Input
                      value={otherDescription}
                      onChange={(e) => setOtherDescription(e.target.value)}
                      placeholder={t("materials.enterDescription", "Enter description...")}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.quantity", "Quantity")}
                    </label>
                    <Input
                      type="number"
                      value={otherQuantity}
                      onChange={(e) => setOtherQuantity(parseFloat(e.target.value) || 0)}
                      className="h-9 text-center"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.unit", "Unit")}
                    </label>
                    <Input
                      value={otherUnit}
                      onChange={(e) => setOtherUnit(e.target.value)}
                      className="h-9 text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.unitPrice", "Unit Price")}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={otherUnitPrice || ""}
                      onChange={(e) => setOtherUnitPrice(parseFloat(e.target.value) || 0)}
                      className="h-9 text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium py-2">
                    {formatCurrency(otherQuantity * otherUnitPrice)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={addOtherItem}
                      disabled={!otherDescription.trim()}
                      size="sm"
                      className="w-full h-9"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Grand Total - matching project total with beige background */}
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="py-4">
          <div className="space-y-3">
            {/* Section subtotals */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                <span>Materials</span>
              </div>
              <div className="text-right font-medium">{formatCurrency(materialsTotal)}</div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hammer className="h-3.5 w-3.5 text-amber-500" />
                <span>Labor</span>
              </div>
              <div className="text-right font-medium">{formatCurrency(laborTotal)}</div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MoreHorizontal className="h-3.5 w-3.5 text-purple-500" />
                <span>Other</span>
              </div>
              <div className="text-right font-medium">{formatCurrency(otherTotal)}</div>
            </div>
            
            {/* Divider */}
            <div className="border-t border-amber-300 dark:border-amber-700" />
            
            {/* Grand Total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                <span className="font-semibold text-lg text-amber-900 dark:text-amber-200">
                  {t("materials.grandTotal", "Grand Total")}
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            {/* Comparison with project total */}
            {Math.abs(grandTotal - projectTotal) > 0.01 && projectTotal > 0 && (
              <div className="flex items-center justify-between text-xs text-amber-700/70 dark:text-amber-400/70 pt-2 border-t border-dashed border-amber-300 dark:border-amber-700">
                <span>Project Total (from tasks)</span>
                <span className="font-medium">{formatCurrency(projectTotal)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
