// ============================================
// CONFLICT MAP MODAL - Citation Conflict Visualization
// ============================================
// Interactive graph visualization showing:
// - Citation nodes (colored by type)
// - Relationship edges (green = verified, red = conflict)
// - Hover/click for details
// - Conflict resolution suggestions
// ============================================

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  MapPin,
  Ruler,
  Hammer,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Citation } from '@/types/citation';
import { format } from 'date-fns';

interface ConflictMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citations: Citation[];
  projectData?: {
    name?: string;
    address?: string;
    status?: string;
  } | null;
}

// Conflict types
interface ConflictNode {
  id: string;
  type: string;
  label: string;
  value: string;
  timestamp: string;
  x: number;
  y: number;
  color: string;
  icon: React.ElementType;
  hasConflict: boolean;
  conflictDetails?: string;
}

interface ConflictEdge {
  from: string;
  to: string;
  type: 'verified' | 'conflict' | 'related';
  label?: string;
}

// Citation type to visual config
const CITATION_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PROJECT_NAME: { color: 'hsl(262, 80%, 50%)', icon: FileText, label: 'Project Name' },
  LOCATION: { color: 'hsl(200, 80%, 50%)', icon: MapPin, label: 'Location' },
  WORK_TYPE: { color: 'hsl(30, 80%, 50%)', icon: Hammer, label: 'Work Type' },
  TRADE_SELECTION: { color: 'hsl(340, 80%, 50%)', icon: Hammer, label: 'Trade' },
  GFA_LOCK: { color: 'hsl(150, 80%, 40%)', icon: Ruler, label: 'GFA' },
  TEMPLATE_LOCK: { color: 'hsl(280, 80%, 50%)', icon: Sparkles, label: 'Template' },
  TIMELINE: { color: 'hsl(45, 80%, 50%)', icon: Calendar, label: 'Start Date' },
  END_DATE: { color: 'hsl(20, 80%, 50%)', icon: Calendar, label: 'End Date' },
  TEAM_SIZE: { color: 'hsl(180, 80%, 40%)', icon: Users, label: 'Team Size' },
  TEAM_MEMBER_INVITE: { color: 'hsl(220, 80%, 50%)', icon: Users, label: 'Team Member' },
  BUDGET_ESTIMATE: { color: 'hsl(120, 80%, 40%)', icon: DollarSign, label: 'Budget' },
  DEMOLITION_PRICE: { color: 'hsl(0, 70%, 50%)', icon: DollarSign, label: 'Demo Price' },
};

const DEFAULT_CONFIG = { color: 'hsl(220, 10%, 50%)', icon: Circle, label: 'Data' };

export function ConflictMapModal({
  open,
  onOpenChange,
  citations,
  projectData,
}: ConflictMapModalProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Analyze citations for conflicts
  const { nodes, edges, conflicts } = useMemo(() => {
    const nodeList: ConflictNode[] = [];
    const edgeList: ConflictEdge[] = [];
    const conflictList: { id: string; description: string; severity: 'warning' | 'error' }[] = [];

    // Position nodes in a circular layout
    const centerX = 300;
    const centerY = 250;
    const radius = 180;

    citations.forEach((citation, index) => {
      const angle = (index / citations.length) * 2 * Math.PI - Math.PI / 2;
      const config = CITATION_CONFIG[citation.cite_type] || DEFAULT_CONFIG;
      
      nodeList.push({
        id: citation.id,
        type: citation.cite_type,
        label: config.label,
        value: typeof citation.answer === 'string' 
          ? citation.answer 
          : typeof citation.value === 'string' 
            ? citation.value 
            : JSON.stringify(citation.value || citation.answer),
        timestamp: citation.timestamp,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        color: config.color,
        icon: config.icon,
        hasConflict: false,
      });
    });

    // Detect conflicts
    const gfaCitations = citations.filter(c => c.cite_type === 'GFA_LOCK');
    const timelineCitations = citations.filter(c => c.cite_type === 'TIMELINE');
    const endDateCitations = citations.filter(c => c.cite_type === 'END_DATE');
    const tradeCitations = citations.filter(c => c.cite_type === 'TRADE_SELECTION');
    const templateCitations = citations.filter(c => c.cite_type === 'TEMPLATE_LOCK');
    const budgetCitations = citations.filter(c => 
      c.cite_type === 'DEMOLITION_PRICE' || c.cite_type === 'GFA_LOCK'
    );

    // 1. Check for multiple GFA values (conflict)
    if (gfaCitations.length > 1) {
      const values = gfaCitations.map(c => c.value);
      const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
      if (uniqueValues.size > 1) {
        conflictList.push({
          id: 'gfa-conflict',
          description: `Multiple GFA values detected: ${Array.from(uniqueValues).join(', ')}`,
          severity: 'error',
        });
        gfaCitations.forEach(c => {
          const node = nodeList.find(n => n.id === c.id);
          if (node) {
            node.hasConflict = true;
            node.conflictDetails = 'Conflicting GFA values';
          }
        });
        // Add conflict edges
        for (let i = 0; i < gfaCitations.length - 1; i++) {
          edgeList.push({
            from: gfaCitations[i].id,
            to: gfaCitations[i + 1].id,
            type: 'conflict',
            label: 'GFA mismatch',
          });
        }
      }
    }

    // 2. Check timeline consistency
    if (timelineCitations.length > 0 && endDateCitations.length > 0) {
      const startDate = timelineCitations[0]?.value || timelineCitations[0]?.answer;
      const endDate = endDateCitations[0]?.value || endDateCitations[0]?.answer;
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        if (end < start) {
          conflictList.push({
            id: 'timeline-conflict',
            description: `End date (${format(end, 'MMM dd')}) is before start date (${format(start, 'MMM dd')})`,
            severity: 'error',
          });
          
          const startNode = nodeList.find(n => n.id === timelineCitations[0].id);
          const endNode = nodeList.find(n => n.id === endDateCitations[0].id);
          if (startNode) {
            startNode.hasConflict = true;
            startNode.conflictDetails = 'Timeline conflict';
          }
          if (endNode) {
            endNode.hasConflict = true;
            endNode.conflictDetails = 'Timeline conflict';
          }
          
          edgeList.push({
            from: timelineCitations[0].id,
            to: endDateCitations[0].id,
            type: 'conflict',
            label: 'Invalid timeline',
          });
        } else {
          // Valid relationship
          edgeList.push({
            from: timelineCitations[0].id,
            to: endDateCitations[0].id,
            type: 'verified',
            label: `${Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))} days`,
          });
        }
      }
    }

    // 3. Check trade-template consistency
    if (tradeCitations.length > 0 && templateCitations.length > 0) {
      const trade = tradeCitations[0]?.value || tradeCitations[0]?.answer;
      const templateTrade = templateCitations[0]?.metadata?.trade_key;
      
      if (trade && templateTrade && String(trade).toLowerCase() !== String(templateTrade).toLowerCase()) {
        conflictList.push({
          id: 'trade-template-conflict',
          description: `Trade (${trade}) doesn't match template trade (${templateTrade})`,
          severity: 'warning',
        });
        
        edgeList.push({
          from: tradeCitations[0].id,
          to: templateCitations[0].id,
          type: 'conflict',
          label: 'Trade mismatch',
        });
      } else {
        edgeList.push({
          from: tradeCitations[0].id,
          to: templateCitations[0].id,
          type: 'verified',
        });
      }
    }

    // 4. Connect GFA to Template (verified relationship)
    if (gfaCitations.length > 0 && templateCitations.length > 0) {
      edgeList.push({
        from: gfaCitations[0].id,
        to: templateCitations[0].id,
        type: 'verified',
        label: 'Quantity source',
      });
    }

    // 5. Connect related citations
    if (tradeCitations.length > 0 && gfaCitations.length > 0) {
      const existingEdge = edgeList.find(
        e => (e.from === tradeCitations[0].id && e.to === gfaCitations[0].id) ||
             (e.from === gfaCitations[0].id && e.to === tradeCitations[0].id)
      );
      if (!existingEdge) {
        edgeList.push({
          from: tradeCitations[0].id,
          to: gfaCitations[0].id,
          type: 'related',
        });
      }
    }

    return { nodes: nodeList, edges: edgeList, conflicts: conflictList };
  }, [citations]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.2, 2)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.2, 0.5)), []);
  const handleReset = useCallback(() => {
    setZoom(1);
    setSelectedNode(null);
  }, []);

  const selectedNodeData = useMemo(() => {
    return nodes.find(n => n.id === selectedNode);
  }, [nodes, selectedNode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-50/80 to-purple-50/80 dark:from-violet-950/30 dark:to-purple-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-violet-700 dark:text-violet-300">
                  Citation Conflict Map
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {projectData?.name || 'Project'} • {nodes.length} citations • {conflicts.length} conflicts
                </p>
              </div>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Graph Canvas */}
          <div className="flex-1 relative bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Info className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No citations to visualize</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Complete the project wizard to generate citations
                  </p>
                </div>
              </div>
            ) : (
              <svg
                className="w-full h-full"
                viewBox={`0 0 600 500`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              >
                {/* Grid Pattern */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-slate-200 dark:text-slate-800"
                    />
                  </pattern>
                  
                  {/* Glow filter for conflict nodes */}
                  <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Center node (Project) */}
                <g>
                  <circle
                    cx={300}
                    cy={250}
                    r={35}
                    fill="hsl(262, 80%, 95%)"
                    stroke="hsl(262, 80%, 50%)"
                    strokeWidth={2}
                  />
                  <text
                    x={300}
                    y={255}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-violet-700"
                  >
                    {projectData?.name?.slice(0, 10) || 'Project'}
                  </text>
                </g>
                
                {/* Edges */}
                {edges.map((edge, idx) => {
                  const fromNode = nodes.find(n => n.id === edge.from);
                  const toNode = nodes.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;
                  
                  const strokeColor = edge.type === 'conflict' 
                    ? 'hsl(0, 80%, 50%)' 
                    : edge.type === 'verified' 
                      ? 'hsl(150, 80%, 40%)'
                      : 'hsl(220, 20%, 70%)';
                  
                  const midX = (fromNode.x + toNode.x) / 2;
                  const midY = (fromNode.y + toNode.y) / 2;
                  
                  return (
                    <g key={`edge-${idx}`}>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={strokeColor}
                        strokeWidth={edge.type === 'conflict' ? 2.5 : 1.5}
                        strokeDasharray={edge.type === 'related' ? '4,4' : undefined}
                        opacity={edge.type === 'conflict' ? 1 : 0.6}
                        filter={edge.type === 'conflict' ? 'url(#glow-red)' : undefined}
                      />
                      {edge.label && (
                        <text
                          x={midX}
                          y={midY - 5}
                          textAnchor="middle"
                          className={cn(
                            "text-[8px] font-medium",
                            edge.type === 'conflict' ? 'fill-red-600' : 'fill-muted-foreground'
                          )}
                        >
                          {edge.label}
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* Nodes */}
                {nodes.map((node) => {
                  const Icon = node.icon;
                  const isSelected = selectedNode === node.id;
                  const isHovered = hoveredNode === node.id;
                  
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer transition-transform"
                      onClick={() => setSelectedNode(isSelected ? null : node.id)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Node circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isSelected || isHovered ? 28 : 24}
                        fill={node.hasConflict ? 'hsl(0, 80%, 95%)' : `${node.color.replace(')', ', 0.15)')}`}
                        stroke={node.hasConflict ? 'hsl(0, 80%, 50%)' : node.color}
                        strokeWidth={isSelected ? 3 : 2}
                        filter={node.hasConflict ? 'url(#glow-red)' : isSelected ? 'url(#glow-green)' : undefined}
                        className="transition-all duration-200"
                      />
                      
                      {/* Conflict indicator */}
                      {node.hasConflict && (
                        <g>
                          <circle
                            cx={node.x + 18}
                            cy={node.y - 18}
                            r={8}
                            fill="hsl(0, 80%, 50%)"
                          />
                          <text
                            x={node.x + 18}
                            y={node.y - 14}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-white"
                          >
                            !
                          </text>
                        </g>
                      )}
                      
                      {/* Node label */}
                      <text
                        x={node.x}
                        y={node.y + 40}
                        textAnchor="middle"
                        className={cn(
                          "text-[9px] font-medium",
                          node.hasConflict ? 'fill-red-600' : 'fill-foreground'
                        )}
                      >
                        {node.label}
                      </text>
                      
                      {/* Value preview on hover */}
                      {isHovered && (
                        <text
                          x={node.x}
                          y={node.y + 52}
                          textAnchor="middle"
                          className="text-[8px] fill-muted-foreground"
                        >
                          {node.value.slice(0, 20)}{node.value.length > 20 ? '...' : ''}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Side Panel - Conflicts & Details */}
          <div className="w-72 border-l bg-background flex flex-col">
            {/* Conflict Summary */}
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  conflicts.length > 0 ? "text-red-500" : "text-green-500"
                )} />
                Conflict Analysis
              </h3>
              
              {conflicts.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      No Conflicts
                    </p>
                    <p className="text-xs text-green-600/70 dark:text-green-500/70">
                      All citations are consistent
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        conflict.severity === 'error'
                          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                          : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          conflict.severity === 'error' ? "text-red-500" : "text-amber-500"
                        )} />
                        <p className={cn(
                          "text-xs",
                          conflict.severity === 'error' 
                            ? "text-red-700 dark:text-red-400" 
                            : "text-amber-700 dark:text-amber-400"
                        )}>
                          {conflict.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Node Details */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold mb-3">
                {selectedNodeData ? 'Citation Details' : 'Legend'}
              </h3>
              
              {selectedNodeData ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="h-6 w-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${selectedNodeData.color}20` }}
                      >
                        <selectedNodeData.icon 
                          className="h-3.5 w-3.5" 
                          style={{ color: selectedNodeData.color }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedNodeData.label}</span>
                      {selectedNodeData.hasConflict && (
                        <Badge variant="destructive" className="text-[10px] h-5">
                          Conflict
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{selectedNodeData.value}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(selectedNodeData.timestamp), 'MMM dd, yyyy HH:mm')}
                    </p>
                    {selectedNodeData.conflictDetails && (
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        ⚠️ {selectedNodeData.conflictDetails}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                    className="w-full text-xs"
                  >
                    Clear Selection
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Edge Legend */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-8 h-0.5 bg-green-500 rounded" />
                      <span className="text-muted-foreground">Verified relationship</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-8 h-0.5 bg-red-500 rounded" />
                      <span className="text-muted-foreground">Conflict detected</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-slate-400" />
                      <span className="text-muted-foreground">Related data</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 mt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Click on any node to see citation details. Red nodes indicate conflicts that need resolution.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Footer */}
            <div className="p-4 border-t bg-muted/30">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{nodes.length}</p>
                  <p className="text-[10px] text-muted-foreground">Citations</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {edges.filter(e => e.type === 'verified').length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Verified</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {conflicts.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Conflicts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
