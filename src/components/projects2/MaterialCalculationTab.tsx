import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
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
  Loader2,
  MapPin,
  PenLine,
  RotateCcw,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { downloadPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import SignatureCapture, { SignatureData } from "@/components/SignatureCapture";

interface CostItem {
  id: string;
  item: string;
  quantity: number;
  baseQuantity?: number; // Original quantity before waste
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isEssential?: boolean; // Whether 10% waste applies
}

interface TaskBasedEntry {
  item: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

interface ClientInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface MaterialCalculationTabProps {
  materials: TaskBasedEntry[];
  labor: TaskBasedEntry[];
  projectTotal: number;
  projectName?: string;
  projectAddress?: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  clientInfo?: ClientInfo;
  onCostsChange?: (costs: { materials: CostItem[]; labor: CostItem[]; other: CostItem[] }) => void;
  onGrandTotalChange?: (grandTotalWithTax: number) => void;
  onSave?: (costs: { materials: CostItem[]; labor: CostItem[]; other: CostItem[]; grandTotal: number }) => Promise<void>;
  currency?: string;
  dataSource?: 'saved' | 'ai' | 'tasks';
}

// Essential material patterns that get 10% waste calculation
const ESSENTIAL_PATTERNS = [
  /laminate|flooring/i,
  /underlayment/i,
  /baseboard|trim/i,
  /adhesive|glue|supplies/i,
];

const isEssentialMaterial = (itemName: string): boolean => {
  return ESSENTIAL_PATTERNS.some(pattern => pattern.test(itemName));
};

const WASTE_PERCENTAGE = 0.10;

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
  companyLogoUrl,
  companyPhone,
  companyEmail,
  companyWebsite,
  clientInfo,
  onCostsChange,
  onGrandTotalChange,
  onSave,
  currency = "CAD",
  dataSource = "ai"
}: MaterialCalculationTabProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Helper to create initial material items
  // IMPORTANT: AI data arrives as BASE (net) quantities - we apply waste here
  // Saved data arrives as FINAL quantities - we back-calculate base
  const createInitialMaterialItems = useCallback(() => {
    const laminateEntry = initialMaterials.find(m => /laminate|flooring/i.test(m.item));
    const laminateBaseQtyFromInput = laminateEntry?.quantity || 0;
    
    return initialMaterials.map((m, idx) => {
      const isEssential = isEssentialMaterial(m.item);
      
      // For saved data (dataSource === 'saved'), quantities are already final with waste
      // For AI data (dataSource === 'ai' or 'tasks'), quantities are BASE - apply waste
      if (dataSource === 'saved') {
        // Back-calculate base from saved final quantity
        const finalQty = m.quantity;
        const baseQty = isEssential 
          ? Math.round(finalQty / (1 + WASTE_PERCENTAGE)) 
          : finalQty;
        
        return {
          id: `material-${idx}`,
          item: m.item,
          baseQuantity: baseQty,
          quantity: finalQty,
          unit: m.unit,
          unitPrice: m.unitPrice || 0,
          totalPrice: finalQty * (m.unitPrice || 0),
          isEssential,
        };
      }
      
      // AI/Tasks data: input is BASE quantity, calculate waste-included quantity
      let baseQty = m.quantity;
      
      // Sync underlayment with laminate flooring base quantity
      if (/^underlayment$/i.test(m.item.trim()) && laminateBaseQtyFromInput > 0) {
        baseQty = laminateBaseQtyFromInput;
      }
      
      // Calculate final quantity with waste for essential materials
      const quantityWithWaste = isEssential 
        ? Math.ceil(baseQty * (1 + WASTE_PERCENTAGE)) 
        : baseQty;
      
      return {
        id: `material-${idx}`,
        item: m.item,
        baseQuantity: baseQty,
        quantity: quantityWithWaste,
        unit: m.unit,
        unitPrice: m.unitPrice || 0,
        totalPrice: quantityWithWaste * (m.unitPrice || 0),
        isEssential,
      };
    });
  }, [initialMaterials, dataSource]);

  // Helper to create initial labor items
  const createInitialLaborItems = useCallback(() => 
    initialLabor.map((l, idx) => ({
      id: `labor-${idx}`,
      item: l.item,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice || 0,
      totalPrice: l.quantity * (l.unitPrice || 0),
    }))
  , [initialLabor]);
  
  // Material items with waste calculation
  const [materialItems, setMaterialItems] = useState<CostItem[]>(createInitialMaterialItems);

  // Labor items
  const [laborItems, setLaborItems] = useState<CostItem[]>(createInitialLaborItems);
  
  // Other/custom items
  const [otherItems, setOtherItems] = useState<CostItem[]>([]);
  
  // Track unsaved changes and current data source
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<'saved' | 'ai' | 'tasks'>(dataSource);
  
  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get laminate base quantity for sync dependency
  const laminateBaseQty = materialItems.find(m => /laminate|flooring/i.test(m.item))?.baseQuantity;
  
  // Sync underlayment when laminate changes
  useEffect(() => {
    const laminateItem = materialItems.find(m => /laminate|flooring/i.test(m.item));
    const underlaymentItem = materialItems.find(m => /^underlayment$/i.test(m.item.trim()));
    
    if (laminateItem && underlaymentItem) {
      const laminateBase = laminateItem.baseQuantity || laminateItem.quantity / (1 + WASTE_PERCENTAGE);
      const underlaymentBase = underlaymentItem.baseQuantity || underlaymentItem.quantity / (1 + WASTE_PERCENTAGE);
      
      // Only sync if they're different
      if (Math.abs(laminateBase - underlaymentBase) > 1) {
        const newQuantityWithWaste = Math.ceil(laminateBase * (1 + WASTE_PERCENTAGE));
        setMaterialItems(prev => prev.map(item => {
          if (/^underlayment$/i.test(item.item.trim())) {
            return {
              ...item,
              baseQuantity: laminateBase,
              quantity: newQuantityWithWaste,
              totalPrice: newQuantityWithWaste * item.unitPrice,
            };
          }
          return item;
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laminateBaseQty]);
  
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
  
  // Signature state
  const [clientSignature, setClientSignature] = useState<SignatureData | null>(null);
  const [contractorSignature, setContractorSignature] = useState<SignatureData | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(true);

  // Calculate section totals
  const materialsTotal = materialItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const laborTotal = laborItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const otherTotal = otherItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const grandTotal = materialsTotal + laborTotal + otherTotal;

  // Update parent when items change
  useEffect(() => {
    onCostsChange?.({ materials: materialItems, labor: laborItems, other: otherItems });
  }, [materialItems, laborItems, otherItems, onCostsChange]);

  // Sync grand total with parent (including tax)
  useEffect(() => {
    if (onGrandTotalChange) {
      const taxInfo = getCanadianTaxRates(projectAddress);
      const subtotal = grandTotal;
      const gstAmount = taxInfo.gst > 0 ? subtotal * taxInfo.gst : 0;
      const pstAmount = taxInfo.pst > 0 ? subtotal * taxInfo.pst : 0;
      const hstAmount = taxInfo.hst > 0 ? subtotal * taxInfo.hst : 0;
      const totalTax = gstAmount + pstAmount + hstAmount;
      const grandTotalWithTax = subtotal + totalTax;
      onGrandTotalChange(grandTotalWithTax);
    }
  }, [grandTotal, projectAddress, onGrandTotalChange]);

  // Auto-save when items change (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || !onSave) return;
    
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for auto-save after 1 second of inactivity
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await onSave({
          materials: materialItems,
          labor: laborItems,
          other: otherItems,
          grandTotal,
        });
        setHasUnsavedChanges(false);
        setCurrentDataSource('saved');
        toast.success(t("materials.autoSaved", "Saved"));
      } catch (error) {
        console.error("Auto-save error:", error);
      }
    }, 1000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, materialItems, laborItems, otherItems, grandTotal, onSave, t]);

  // Handle base quantity change for essential materials (auto-updates waste)
  const handleBaseQuantityChange = (id: string, newBaseQty: number) => {
    setHasUnsavedChanges(true);
    setMaterialItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const quantityWithWaste = item.isEssential 
        ? Math.ceil(newBaseQty * (1 + WASTE_PERCENTAGE)) 
        : newBaseQty;
      
      return {
        ...item,
        baseQuantity: newBaseQty,
        quantity: quantityWithWaste,
        totalPrice: quantityWithWaste * item.unitPrice,
      };
    }));
  };

  const handleItemChange = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string, 
    field: 'unitPrice' | 'quantity',
    value: number
  ) => {
    setHasUnsavedChanges(true);
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
      baseQuantity: item.baseQuantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    });
  };

  const saveEdit = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string
  ) => {
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Reset all changes to initial state
  const handleReset = () => {
    setMaterialItems(createInitialMaterialItems());
    setLaborItems(createInitialLaborItems());
    setOtherItems([]);
    setHasUnsavedChanges(false);
    toast.info(t("materials.reset", "Changes reset to original values"));
  };

  // Save changes to database
  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave({
        materials: materialItems,
        labor: laborItems,
        other: otherItems,
        grandTotal,
      });
      setHasUnsavedChanges(false);
      setCurrentDataSource('saved');
      toast.success(t("materials.saved", "Cost breakdown saved successfully"));
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t("materials.saveError", "Failed to save cost breakdown"));
    } finally {
      setIsSaving(false);
    }
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

      // Build cost breakdown items HTML - Compact
      const buildItemsHtml = (items: CostItem[], colorClass: string) => {
        if (items.length === 0) return '';
        return items.map(item => `
          <tr>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9px;">${item.item}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 9px;">${item.quantity.toLocaleString()}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 9px;">${item.unit}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 9px;">${formatCurrency(item.unitPrice)}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; font-size: 9px; color: ${colorClass};">${formatCurrency(item.totalPrice)}</td>
          </tr>
        `).join('');
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              color: #1e293b; 
              line-height: 1.3; 
              font-size: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            td, th { word-wrap: break-word; overflow: hidden; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; padding: 15px;">
            <!-- Header with Company Branding - Compact -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${companyLogoUrl ? `
                    <img src="${companyLogoUrl}" alt="Logo" style="height: 40px; width: auto; max-width: 100px; object-fit: contain; background: white; padding: 4px; border-radius: 6px;" />
                  ` : ''}
                  <div>
                    <h1 style="font-size: 16px; font-weight: 700; margin-bottom: 2px;">${companyName || 'Cost Breakdown'}</h1>
                    ${companyName ? `<p style="font-size: 11px; opacity: 0.9;">Cost Breakdown</p>` : ''}
                    <p style="font-size: 11px; opacity: 0.8; margin-top: 2px;">${projectName}</p>
                    ${projectAddress ? `<p style="font-size: 9px; opacity: 0.7; margin-top: 2px;">📍 ${projectAddress}</p>` : ''}
                  </div>
                </div>
                <div style="text-align: right; font-size: 9px;">
                  <p style="opacity: 0.8;">${currentDate}</p>
                  <div style="margin-top: 4px; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; display: inline-block;">
                    <span style="font-weight: 600;">${taxInfo.provinceCode}</span>
                  </div>
                  ${(companyPhone || companyEmail) ? `
                    <p style="margin-top: 6px; opacity: 0.8;">
                      ${companyPhone ? `📞 ${companyPhone}` : ''}
                    </p>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Client Information Section -->
            ${clientInfo?.name ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 10px; font-weight: 600; color: #64748b; margin-bottom: 6px;">PREPARED FOR</div>
                <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${clientInfo.name}</div>
                ${clientInfo.email ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📧 ${clientInfo.email}</div>` : ''}
                ${clientInfo.phone ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📞 ${clientInfo.phone}</div>` : ''}
                ${clientInfo.address ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📍 ${clientInfo.address}</div>` : ''}
              </div>
            ` : ''}

            <!-- Materials Section - Compact -->
            ${materialItems.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px;">📦</span>
                  <h2 style="font-size: 12px; font-weight: 600; color: #1e40af;">Materials</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #1e40af; font-size: 11px;">${formatCurrency(materialsTotal)}</span>
                </div>
                <table style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 50px;">Qty</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40px;">Unit</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 70px;">Price</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(materialItems, '#1e40af')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Labor Section - Compact -->
            ${laborItems.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px;">🔨</span>
                  <h2 style="font-size: 12px; font-weight: 600; color: #b45309;">Labor</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #b45309; font-size: 11px;">${formatCurrency(laborTotal)}</span>
                </div>
                <table style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 50px;">Qty</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40px;">Unit</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 70px;">Price</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(laborItems, '#b45309')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Other Section - Compact -->
            ${otherItems.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px;">⋯</span>
                  <h2 style="font-size: 12px; font-weight: 600; color: #7c3aed;">Other</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #7c3aed; font-size: 11px;">${formatCurrency(otherTotal)}</span>
                </div>
                <table style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 50px;">Qty</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40px;">Unit</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 70px;">Price</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(otherItems, '#7c3aed')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Summary & Grand Total with Tax - Beige styling -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 6px; padding: 14px; margin-top: 16px;">
              <!-- Subtotals -->
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 10px;">
                  <span style="color: #78716c;">📦 Materials</span>
                  <span style="font-weight: 500;">${formatCurrency(materialsTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 10px;">
                  <span style="color: #78716c;">🔨 Labor</span>
                  <span style="font-weight: 500;">${formatCurrency(laborTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 10px;">
                  <span style="color: #78716c;">⋯ Other</span>
                  <span style="font-weight: 500;">${formatCurrency(otherTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-weight: 600; font-size: 11px;">
                  <span style="color: #78350f;">Subtotal</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
              </div>

              <!-- Tax Section -->
              <div style="background: rgba(255,255,255,0.6); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                <div style="font-size: 9px; font-weight: 600; color: #78350f; margin-bottom: 4px;">📋 Tax (${taxInfo.provinceName})</div>
                ${taxInfo.hst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px;">
                    <span style="color: #78716c;">HST (${(taxInfo.hst * 100).toFixed(0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(hstAmount)}</span>
                  </div>
                ` : ''}
                ${taxInfo.gst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px;">
                    <span style="color: #78716c;">GST (${(taxInfo.gst * 100).toFixed(0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(gstAmount)}</span>
                  </div>
                ` : ''}
                ${taxInfo.pst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px;">
                    <span style="color: #78716c;">${taxInfo.provinceCode === 'QC' ? 'QST' : 'PST'} (${(taxInfo.pst * 100).toFixed(taxInfo.provinceCode === 'QC' ? 3 : 0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(pstAmount)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px dashed rgba(0,0,0,0.15); margin-top: 3px; font-size: 9px;">
                  <span style="color: #78350f; font-weight: 600;">Total Tax</span>
                  <span style="font-weight: 600;">${formatCurrency(totalTax)}</span>
                </div>
              </div>

              <!-- Grand Total -->
              <div style="border-top: 2px solid #b45309; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 14px; font-weight: 700; color: #78350f;">Grand Total</span>
                  <span style="font-size: 8px; color: #78716c; display: block;">(incl. tax)</span>
                </div>
                <span style="font-size: 18px; font-weight: 800; color: #78350f;">${formatCurrency(grandTotalWithTax)}</span>
              </div>
            </div>

            <!-- Client Signature Section - Compact -->
            <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px;">
              <h3 style="font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Client Approval</h3>
              <p style="font-size: 8px; color: #64748b; margin-bottom: 12px;">
                By signing below, client approves this cost breakdown for: <strong>${projectName}</strong>
              </p>
              
              <div style="display: flex; gap: 20px;">
                <!-- Client Signature -->
                <div style="flex: 1;">
                  <p style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Client Signature</p>
                  ${clientSignature ? `
                    ${clientSignature.type === 'drawn' ? `
                      <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; margin-bottom: 4px; background: white;">
                        <img src="${clientSignature.data}" alt="Client Signature" style="height: 40px; max-width: 100%; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="border-bottom: 1px solid #1e293b; padding: 8px 0; margin-bottom: 4px; font-family: 'Dancing Script', cursive; font-size: 20px; color: #1e293b;">
                        ${clientSignature.data}
                      </div>
                    `}
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="font-weight: 500;">${clientSignature.name || clientSignature.data}</span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="font-weight: 500;">${new Date(clientSignature.signedAt).toLocaleDateString('en-CA')}</span>
                      </div>
                    </div>
                  ` : `
                    <div style="border-bottom: 1px solid #1e293b; height: 35px; margin-bottom: 4px;"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 80px;"></span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 50px;"></span>
                      </div>
                    </div>
                  `}
                </div>
                
                <!-- Contractor Signature -->
                <div style="flex: 1;">
                  <p style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Contractor Signature</p>
                  ${contractorSignature ? `
                    ${contractorSignature.type === 'drawn' ? `
                      <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; margin-bottom: 4px; background: white;">
                        <img src="${contractorSignature.data}" alt="Contractor Signature" style="height: 40px; max-width: 100%; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="border-bottom: 1px solid #1e293b; padding: 8px 0; margin-bottom: 4px; font-family: 'Dancing Script', cursive; font-size: 20px; color: #1e293b;">
                        ${contractorSignature.data}
                      </div>
                    `}
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="font-weight: 500;">${contractorSignature.name || contractorSignature.data}</span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="font-weight: 500;">${new Date(contractorSignature.signedAt).toLocaleDateString('en-CA')}</span>
                      </div>
                    </div>
                  ` : `
                    <div style="border-bottom: 1px solid #1e293b; height: 35px; margin-bottom: 4px;"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 80px;"></span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 50px;"></span>
                      </div>
                    </div>
                  `}
                </div>
              </div>
            </div>

            <!-- Footer with Company Branding - Compact -->
            <div style="margin-top: 16px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 12px; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${companyLogoUrl ? `
                    <img src="${companyLogoUrl}" alt="Logo" style="height: 24px; width: auto; max-width: 60px; object-fit: contain; background: white; padding: 2px; border-radius: 3px;" />
                  ` : ''}
                  <div>
                    <p style="font-weight: 600; font-size: 10px;">${companyName || 'BuildUnion'}</p>
                    ${companyPhone ? `<p style="font-size: 8px; opacity: 0.8;">📞 ${companyPhone}</p>` : ''}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8px; opacity: 0.8;">
                  <p style="font-style: italic;">Licensed & Insured</p>
                  <p>${currentDate}</p>
                </div>
              </div>
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
              type="text"
              inputMode="numeric"
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
            <NumericInput
              value={editValues.unitPrice}
              onChange={(val) => setEditValues(prev => ({ ...prev, unitPrice: val }))}
              className="h-8 text-sm text-right"
              placeholder="0"
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
          <div className="col-span-4 font-medium text-sm truncate flex items-center gap-2" title={item.item}>
            {item.item}
            {item.isEssential && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                +10%
              </Badge>
            )}
          </div>
          <div className="col-span-2 text-center text-sm text-muted-foreground">
            {item.isEssential && item.baseQuantity !== undefined ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <NumericInput
                    value={item.baseQuantity}
                    onChange={(val) => handleBaseQuantityChange(item.id, val)}
                    className="h-6 w-16 text-xs text-center p-1 border-dashed"
                    title={t("materials.editBaseQty", "Edit base quantity")}
                  />
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  → {item.quantity.toLocaleString()} (+10%)
                </span>
              </div>
            ) : (
              item.quantity.toLocaleString()
            )}
          </div>
          <div className="col-span-1 text-center text-xs text-muted-foreground">
            {item.unit}
          </div>
          <div className="col-span-2">
            <NumericInput
              value={item.unitPrice}
              onChange={(val) => handleItemChange(setItems, item.id, 'unitPrice', val)}
              className="h-8 text-sm text-right"
              placeholder="0"
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
          {/* Data source indicator */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              currentDataSource === 'saved' 
                ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
                : currentDataSource === 'ai'
                ? "border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
                : "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
            )}
          >
            {currentDataSource === 'saved' 
              ? "💾 Saved Edits" 
              : currentDataSource === 'ai' 
              ? "🤖 AI Generated" 
              : "📋 From Tasks"}
          </Badge>
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
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <Badge 
              variant="outline" 
              className="text-sm border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse"
            >
              {t("materials.unsaved", "Unsaved")}
            </Badge>
          )}
          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("materials.reset", "Reset")}</span>
          </Button>
          {/* Save Button */}
          {onSave && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t("materials.save", "Save")}</span>
            </Button>
          )}
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
                    <NumericInput
                      value={otherQuantity}
                      onChange={(val) => setOtherQuantity(val || 1)}
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
                    <NumericInput
                      value={otherUnitPrice}
                      onChange={(val) => setOtherUnitPrice(val)}
                      className="h-9 text-right"
                      placeholder="0"
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

      {/* Client Signature Section */}
      <Collapsible open={signatureOpen} onOpenChange={setSignatureOpen}>
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-green-600" />
                  {t("materials.signatures", "Signatures")}
                  {(clientSignature || contractorSignature) && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                      <Check className="h-3 w-3 mr-1" />
                      {clientSignature && contractorSignature ? '2/2' : '1/2'}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-3">
                  {signatureOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-4 border border-green-100 dark:border-green-900 space-y-6">
                <p className="text-xs text-muted-foreground">
                  {t("materials.signatureHint", "Capture signatures for cost breakdown approval. Draw or type signatures below.")}
                </p>
                
                {/* Dual Signature Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Client Signature */}
                  <div className="space-y-2">
                    <SignatureCapture
                      onSignatureChange={setClientSignature}
                      label={t("materials.clientApproval", "Client Signature")}
                      placeholder={t("materials.typeClientName", "Type client's full name")}
                    />
                  </div>
                  
                  {/* Contractor Signature */}
                  <div className="space-y-2">
                    <SignatureCapture
                      onSignatureChange={setContractorSignature}
                      label={t("materials.contractorApproval", "Contractor Signature")}
                      placeholder={t("materials.typeContractorName", "Type contractor's full name")}
                    />
                  </div>
                </div>
                
                {/* Status Summary */}
                {(clientSignature || contractorSignature) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-green-200 dark:border-green-800">
                    {clientSignature && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                        <Check className="h-3 w-3 mr-1" />
                        Client signed
                      </Badge>
                    )}
                    {contractorSignature && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                        <Check className="h-3 w-3 mr-1" />
                        Contractor signed
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Grand Total - matching project total with beige background and tax */}
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="py-4">
          {(() => {
            const taxInfo = getCanadianTaxRates(projectAddress);
            const subtotal = grandTotal;
            const gstAmount = taxInfo.gst > 0 ? subtotal * taxInfo.gst : 0;
            const pstAmount = taxInfo.pst > 0 ? subtotal * taxInfo.pst : 0;
            const hstAmount = taxInfo.hst > 0 ? subtotal * taxInfo.hst : 0;
            const totalTax = gstAmount + pstAmount + hstAmount;
            const grandTotalWithTax = subtotal + totalTax;

            return (
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
                
                {/* Subtotal */}
                <div className="border-t border-amber-300 dark:border-amber-700 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-800 dark:text-amber-300 font-medium">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                {/* Tax Region & Breakdown */}
                {projectAddress && (
                  <div className="bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        Tax Region: {taxInfo.provinceName} ({taxInfo.provinceCode})
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      {taxInfo.hst > 0 && (
                        <>
                          <span className="text-amber-700/80 dark:text-amber-400/80">
                            HST ({(taxInfo.hst * 100).toFixed(0)}%)
                          </span>
                          <span className="text-right font-medium">{formatCurrency(hstAmount)}</span>
                        </>
                      )}
                      {taxInfo.gst > 0 && (
                        <>
                          <span className="text-amber-700/80 dark:text-amber-400/80">
                            GST ({(taxInfo.gst * 100).toFixed(0)}%)
                          </span>
                          <span className="text-right font-medium">{formatCurrency(gstAmount)}</span>
                        </>
                      )}
                      {taxInfo.pst > 0 && (
                        <>
                          <span className="text-amber-700/80 dark:text-amber-400/80">
                            {taxInfo.provinceCode === 'QC' ? 'QST' : 'PST'} ({(taxInfo.pst * 100).toFixed(taxInfo.provinceCode === 'QC' ? 3 : 0)}%)
                          </span>
                          <span className="text-right font-medium">{formatCurrency(pstAmount)}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex justify-between text-sm border-t border-dashed border-amber-300 dark:border-amber-600 pt-1">
                      <span className="text-amber-800 dark:text-amber-300 font-medium">Total Tax</span>
                      <span className="font-semibold">{formatCurrency(totalTax)}</span>
                    </div>
                  </div>
                )}
                
                {/* Divider */}
                <div className="border-t-2 border-amber-400 dark:border-amber-600" />
                
                {/* Grand Total with Tax */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    <div>
                      <span className="font-semibold text-lg text-amber-900 dark:text-amber-200">
                        {t("materials.grandTotal", "Grand Total")}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 block">
                        (incl. tax)
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {formatCurrency(grandTotalWithTax)}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
