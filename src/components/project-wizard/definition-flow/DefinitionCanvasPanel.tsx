// ============================================
// DEFINITION CANVAS PANEL - Right panel template editor
// Extracted from DefinitionFlowStage.tsx
// ============================================

import { motion } from "framer-motion";
import {
  Building2,
  Edit2,
  Trash2,
  Plus,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HardHatSpinner } from "@/components/ui/loading-states";
import {
  type TemplateItem,
  TRADE_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from "./types";

export interface CanvasPanelProps {
  currentSubStep: number;
  selectedTrade: string | null;
  templateLocked: boolean;
  teamSize: string | null;
  siteCondition: 'clear' | 'demolition';
  gfaValue: number;
  templateItems: TemplateItem[];
  materialTotal: number;
  laborTotal: number;
  demolitionCost: number;
  demolitionUnitPrice: number;
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  taxAmount: number;
  grandTotal: number;
  editingItem: string | null;
  wastePercent: number;
  onWastePercentChange: (value: number) => void;
  onMarkupPercentChange: (value: number) => void;
  onDemolitionUnitPriceChange: (value: number) => void;
  onUpdateItem: (itemId: string, field: keyof TemplateItem, value: number | string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onSetEditingItem: (id: string | null) => void;
  onLockTemplate: () => void;
  isSaving: boolean;
}

const CanvasPanel = ({
  currentSubStep,
  selectedTrade,
  templateLocked,
  teamSize,
  siteCondition,
  gfaValue,
  templateItems,
  materialTotal,
  laborTotal,
  demolitionCost,
  demolitionUnitPrice,
  subtotal,
  markupPercent,
  markupAmount,
  taxAmount,
  grandTotal,
  editingItem,
  wastePercent,
  onWastePercentChange,
  onMarkupPercentChange,
  onDemolitionUnitPriceChange,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSetEditingItem,
  onLockTemplate,
  isSaving,
}: CanvasPanelProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-gray-100 dark:bg-[#111827] overflow-hidden relative">
      {/* Subtle metal texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)' }}
      />

      {/* Canvas Header */}
      <div className="relative z-10 px-4 py-2.5 border-b border-gray-300 dark:border-orange-500/15 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-sm shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-widest">
            <Building2 className="h-3.5 w-3.5" />
            <span>Template Editor</span>
          </div>
          <h2 className="text-base font-bold bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
            {selectedTrade ? `${TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} — ${gfaValue.toLocaleString()} sq ft` : 'Awaiting Selection...'}
          </h2>
        </div>
        <motion.div
          className="px-2 py-1 bg-amber-100 dark:bg-[#ff9500]/15 border border-amber-300 dark:border-[#ff9500]/30 font-mono text-xs text-amber-700 dark:text-amber-400"
          style={{ clipPath: 'polygon(2% 0, 98% 0, 100% 100%, 0% 100%)' }}
          whileHover={{ scale: 1.05 }}
        >
          +{wastePercent}% waste
        </motion.div>
      </div>
      
      {/* Canvas Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-3">
        <motion.div
          key="template"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full space-y-2"
        >
          {/* Template Card */}
          <div className="w-full bg-white/80 dark:bg-[#0d1117]/60 backdrop-blur-md border border-gray-300 dark:border-orange-500/20 overflow-hidden"
            style={{ clipPath: 'polygon(0 0, 100% 0, 99.5% 100%, 0.5% 100%)' }}
          >
            {/* Template Header */}
            <div className="px-3 py-2.5 bg-gradient-to-r from-[#ff9500] to-[#ffaa33] flex items-center justify-between"
              style={{ clipPath: 'polygon(0 0, 100% 0, 99% 100%, 1% 100%)' }}
            >
              <div className="flex items-center gap-2">
                {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.icon && (
                  (() => {
                    const Icon = TRADE_OPTIONS.find(t => t.key === selectedTrade)?.icon;
                    return Icon ? <Icon className="h-4 w-4 text-white" /> : null;
                  })()
                )}
                <span className="font-normal text-sm text-white/90 uppercase tracking-wide">
                  {TRADE_OPTIONS.find(t => t.key === selectedTrade)?.label} Materials & Labor
                </span>
              </div>
              <span className="text-xs font-mono text-white/80">
                {gfaValue.toLocaleString()} sq ft
              </span>
            </div>
                
            {/* Items List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700/30">
              {templateItems.map(item => (
                <motion.div
                  key={item.id}
                  className="p-2.5 group transition-all duration-300 hover:bg-amber-50/50 dark:hover:bg-black/20"
                  whileHover={{ 
                    boxShadow: '0 0 6px rgba(255,149,0,0.1)',
                  }}
                >
                  {editingItem === item.id ? (
                    /* Editing Mode */
                    <div className="space-y-2">
                      <Input
                        value={item.name}
                        onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                        className="h-8 text-sm bg-gray-50 dark:bg-[#0d1117] border-gray-300 dark:border-gray-600/50 text-gray-800 dark:text-gray-100 font-mono"
                        placeholder="Item name"
                        autoFocus
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-gray-500 font-mono uppercase">Cat</Label>
                          <select
                            value={item.category}
                            onChange={(e) => onUpdateItem(item.id, 'category', e.target.value)}
                            className="w-full h-8 text-xs rounded border border-gray-300 dark:border-gray-600/50 bg-gray-50 dark:bg-[#0d1117] text-gray-800 dark:text-gray-200 px-2 font-mono"
                          >
                            <option value="material">Material</option>
                            <option value="labor">Labor</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 font-mono uppercase">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => onUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="h-8 text-sm bg-gray-50 dark:bg-[#0d1117] border-gray-300 dark:border-gray-600/50 text-gray-800 dark:text-gray-100 font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 font-mono uppercase">Unit</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => onUpdateItem(item.id, 'unit', e.target.value)}
                            placeholder="sq ft"
                            className="h-8 text-xs bg-gray-50 dark:bg-[#0d1117] border-gray-300 dark:border-gray-600/50 text-gray-800 dark:text-gray-100 font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 font-mono uppercase">$/U</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                            className="h-8 text-sm bg-gray-50 dark:bg-[#0d1117] border-gray-300 dark:border-gray-600/50 text-gray-800 dark:text-gray-100 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => onSetEditingItem(null)}
                          className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white font-mono"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 font-mono uppercase tracking-wider",
                            item.category === 'material'
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                              : "bg-green-500/15 text-green-400 border border-green-500/20"
                          )}>
                            {item.category === 'material' ? 'MAT' : 'LAB'}
                          </span>
                          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                          {item.applyWaste && item.category === 'material' && (
                            <motion.span 
                              className="text-[10px] font-mono font-bold text-white px-1.5 py-0.5 rounded-full bg-[#ff9500]"
                              style={{ boxShadow: '0 0 6px rgba(255,149,0,0.3)' }}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                            >
                              +{wastePercent}%
                            </motion.span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                          {item.quantity} {item.unit} × ${item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-gray-700 dark:text-gray-200 font-mono">
                          ${item.totalPrice.toLocaleString()}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity duration-200">
                          <button
                            onClick={() => onSetEditingItem(item.id)}
                            className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                          >
                            <Edit2 className="h-3 w-3 text-amber-400" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Add Item Button */}
            <button
              onClick={onAddItem}
              className="w-full p-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-black/20 flex items-center justify-center gap-1 border-t border-gray-200 dark:border-gray-700/30 font-mono uppercase tracking-wider transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
            
            {/* Waste % Adjustment */}
            <div className="px-3 py-2.5 bg-gray-50 dark:bg-[#0d1117]/60 border-t border-gray-200 dark:border-gray-700/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Waste Factor
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={wastePercent}
                    onChange={(e) => onWastePercentChange(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                    onFocus={(e) => {
                      if (wastePercent === 0) {
                        e.target.value = '';
                      } else {
                        e.target.select();
                      }
                    }}
                    className="w-14 h-7 text-center text-xs font-mono font-bold bg-gray-50 dark:bg-[#0d1117] border-gray-300 dark:border-gray-600/50 text-amber-600 dark:text-amber-400"
                  />
                  <span className="text-xs font-mono text-gray-500">%</span>
                </div>
              </div>
            </div>
            
            {/* Totals - Upgraded */}
            <div className="px-3 py-3 bg-gray-50/80 dark:bg-[#0d1117]/80 border-t border-gray-200 dark:border-orange-500/15 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">Materials (incl. {wastePercent}% waste)</span>
                <span className="text-gray-700 dark:text-gray-300">${materialTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">Labor</span>
                <span className="text-gray-700 dark:text-gray-300">${laborTotal.toLocaleString()}</span>
              </div>
              {siteCondition === 'demolition' && (
                <div className="flex items-center justify-between text-xs font-mono text-orange-400">
                  <span>Demolition ({gfaValue.toLocaleString()} sq ft)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">$</span>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={0.25}
                      value={demolitionUnitPrice}
                      onChange={(e) => onDemolitionUnitPriceChange(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                      onFocus={(e) => {
                        if (demolitionUnitPrice === 0) {
                          e.target.value = '';
                        } else {
                          e.target.select();
                        }
                      }}
                      className="w-14 h-6 text-center text-xs bg-gray-50 dark:bg-[#0d1117] border-gray-300 dark:border-gray-600/50 text-orange-600 dark:text-orange-400 font-mono"
                    />
                    <span className="text-gray-600">/sq ft</span>
                    <span className="text-xs ml-1 min-w-[60px] text-right font-bold text-orange-400">
                      +${demolitionCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs font-mono pt-1.5 border-t border-gray-200 dark:border-gray-700/30">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700 dark:text-gray-300">${subtotal.toLocaleString()}</span>
              </div>
              
              {/* Tax */}
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">Tax (13% HST)</span>
                <span className="text-gray-700 dark:text-gray-300">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {/* Grand Total */}
              <motion.div 
                className="flex justify-between font-black text-base pt-2 border-t-2 border-[#ff9500]/40 font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-gray-800 dark:text-gray-200 uppercase tracking-wider text-sm">Grand Total</span>
                <motion.span 
                  className="text-amber-400"
                  key={grandTotal}
                  initial={{ scale: 1.1, color: '#ffaa33' }}
                  animate={{ scale: 1, color: '#fbbf24' }}
                  transition={{ duration: 0.3 }}
                >
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </motion.span>
              </motion.div>
            </div>
            
            {/* Lock Template Button */}
            {!templateLocked && (
              <div className="px-3 py-3 bg-gray-50 dark:bg-[#0d1117]/60 border-t border-gray-200 dark:border-gray-700/30">
                <motion.button
                  onClick={onLockTemplate}
                  disabled={isSaving}
                  className="w-full h-12 text-sm font-medium uppercase tracking-[0.15em] text-white flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                  style={{ 
                    backgroundColor: '#10b981',
                    clipPath: 'polygon(0 0, 100% 0, 97% 100%, 3% 100%)',
                  }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: '0 0 24px rgba(16,185,129,0.4)',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSaving ? (
                    <>
                      <HardHatSpinner size="sm" />
                      Locking...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Lock Template & Continue
                    </>
                  )}
                </motion.button>
              </div>
            )}
            
            {/* Template Locked indicator */}
            {templateLocked && (
              <div className="px-3 py-2.5 bg-green-500/10 border-t border-green-500/20">
                <div className="flex items-center justify-center gap-2 text-green-400 font-mono text-xs uppercase tracking-widest">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="font-medium">Template Locked</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Additional info badges */}
          <div className="flex flex-wrap gap-1.5">
            {teamSize && (
              <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
                Team: {TEAM_SIZE_OPTIONS.find(t => t.key === teamSize)?.label}
              </span>
            )}
            {currentSubStep >= 2 && (
              <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
                Site: {siteCondition === 'clear' ? 'Clear' : 'Demolition'}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CanvasPanel;
