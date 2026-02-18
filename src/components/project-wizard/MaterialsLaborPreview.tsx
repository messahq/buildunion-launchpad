import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import { HardHatSpinner } from '@/components/ui/loading-states';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MaterialsLaborData {
  projectId?: string;
  tradeName?: string;
  timestamp?: string;
  materials?: Array<{
    name: string;
    category?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    wastePercentage?: number;
  }>;
  labor?: Array<{
    name: string;
    category?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    markupPercentage?: number;
  }>;
  summary?: {
    totalMaterials?: number;
    totalLabor?: number;
    totalCost?: number;
    wasteTotal?: number;
    markupTotal?: number;
  };
}

export function MaterialsLaborPreview({ 
  filePath, 
  fileName 
}: { 
  filePath: string; 
  fileName: string;
}) {
  const [data, setData] = useState<MaterialsLaborData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('project-documents')
          .download(filePath);
        
        if (downloadError) throw downloadError;
        
        const text = await fileData.text();
        const parsed = JSON.parse(text) as MaterialsLaborData;
        setData(parsed);
        setError(null);
      } catch (err) {
        console.error('Error loading materials-labor preview:', err);
        setError('Failed to load document preview');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <HardHatSpinner size="md" className="mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 text-red-500/70" />
        <p className="text-sm">{error || 'Unable to parse document'}</p>
      </div>
    );
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Materials & Labor Summary
            </h3>
            {data.tradeName && (
              <p className="text-sm text-muted-foreground mt-1">
                Trade: <span className="font-semibold text-foreground">{data.tradeName}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.summary?.totalCost || 0)}
              </p>
            </div>
          </div>
        </div>
        {data.timestamp && (
          <p className="text-xs text-muted-foreground">
            Generated: {new Date(data.timestamp).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Materials Table */}
      {data.materials && data.materials.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-sky-500" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Materials ({data.materials.length})
            </h4>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-sky-50 dark:bg-sky-950/30">
                <TableRow>
                  <TableHead className="text-xs font-bold">Item</TableHead>
                  <TableHead className="text-xs font-bold text-right">Qty</TableHead>
                  <TableHead className="text-xs font-bold text-right">Unit Price</TableHead>
                  <TableHead className="text-xs font-bold text-right">Total</TableHead>
                  {data.materials.some(m => m.wastePercentage) && (
                    <TableHead className="text-xs font-bold text-right">Waste</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.materials.map((material, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{material.name}</div>
                      {material.category && (
                        <div className="text-[10px] text-muted-foreground">{material.category}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">{material.unit}</div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {material.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatCurrency(material.unitPrice)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-emerald-600">
                      {formatCurrency(material.totalPrice)}
                    </TableCell>
                    {material.wastePercentage && (
                      <TableCell className="text-xs text-right text-amber-600 font-medium">
                        {material.wastePercentage}%
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.summary?.totalMaterials && (
            <div className="flex justify-end">
              <div className="w-64 border rounded-lg p-3 bg-sky-50/50 dark:bg-sky-950/20 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(data.summary.totalMaterials)}</span>
                </div>
                {data.summary.wasteTotal && data.summary.wasteTotal > 0 && (
                  <div className="flex justify-between text-xs border-t pt-1.5">
                    <span className="text-muted-foreground">Waste:</span>
                    <span className="font-mono font-medium text-amber-600">
                      +{formatCurrency(data.summary.wasteTotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Labor Table */}
      {data.labor && data.labor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-violet-500" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Labor ({data.labor.length})
            </h4>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-violet-50 dark:bg-violet-950/30">
                <TableRow>
                  <TableHead className="text-xs font-bold">Task</TableHead>
                  <TableHead className="text-xs font-bold text-right">Qty</TableHead>
                  <TableHead className="text-xs font-bold text-right">Unit Price</TableHead>
                  <TableHead className="text-xs font-bold text-right">Total</TableHead>
                  {data.labor.some(l => l.markupPercentage) && (
                    <TableHead className="text-xs font-bold text-right">Markup</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.labor.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{item.name}</div>
                      {item.category && (
                        <div className="text-[10px] text-muted-foreground">{item.category}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">{item.unit}</div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {item.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-violet-600">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                    {item.markupPercentage && (
                      <TableCell className="text-xs text-right text-indigo-600 font-medium">
                        {item.markupPercentage}%
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.summary?.totalLabor && (
            <div className="flex justify-end">
              <div className="w-64 border rounded-lg p-3 bg-violet-50/50 dark:bg-violet-950/20 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(data.summary.totalLabor)}</span>
                </div>
                {data.summary.markupTotal && data.summary.markupTotal > 0 && (
                  <div className="flex justify-between text-xs border-t pt-1.5">
                    <span className="text-muted-foreground">Markup:</span>
                    <span className="font-mono font-medium text-indigo-600">
                      +{formatCurrency(data.summary.markupTotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total Summary */}
      {data.summary && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/30">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Total Project Cost</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(data.summary.totalCost || 0)}
              </p>
            </div>
            <div className="text-right space-y-1.5 text-xs">
              {data.summary.totalMaterials && (
                <div className="flex justify-end gap-2">
                  <span className="text-muted-foreground">Materials:</span>
                  <span className="font-mono font-bold text-sky-600">
                    {formatCurrency(data.summary.totalMaterials)}
                  </span>
                </div>
              )}
              {data.summary.totalLabor && (
                <div className="flex justify-end gap-2">
                  <span className="text-muted-foreground">Labor:</span>
                  <span className="font-mono font-bold text-violet-600">
                    {formatCurrency(data.summary.totalLabor)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
