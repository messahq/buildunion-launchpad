import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, FileCheck, Plus, X, Pencil, 
  Check, Loader2, MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Predefined certification options
const CERTIFICATION_OPTIONS = [
  "OSHA 10",
  "OSHA 30", 
  "CPR/First Aid",
  "Fall Protection",
  "Confined Space",
  "Hazmat",
  "Scaffolding",
  "Forklift/Heavy Equipment",
  "Electrical Safety",
  "Welding Certification",
  "Lead/Asbestos Awareness",
  "Rigging & Signaling"
];

interface ManpowerReq {
  trade: string;
  count: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  address?: string | null;
  trade?: string | null;
  trades?: string[];
  manpower_requirements?: ManpowerReq[];
  required_certifications?: string[];
  site_images?: string[];
}

interface RequirementsTabProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  TRADE_LABELS: Record<string, string>;
}

const RequirementsTab = ({ project, onProjectUpdate, TRADE_LABELS }: RequirementsTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editing states - manpower now includes trades with counts
  const [editManpower, setEditManpower] = useState<ManpowerReq[]>(project.manpower_requirements || []);
  const [editCertifications, setEditCertifications] = useState<string[]>(project.required_certifications || []);
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Custom/Other inputs
  const [showOtherRole, setShowOtherRole] = useState(false);
  const [otherRole, setOtherRole] = useState("");
  const [showOtherCert, setShowOtherCert] = useState(false);
  const [otherCert, setOtherCert] = useState("");
  
  // Expand/collapse sections
  const [expandedSections, setExpandedSections] = useState({
    manpower: true,
    certifications: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStartEdit = () => {
    setEditManpower(project.manpower_requirements || []);
    setEditCertifications(project.required_certifications || []);
    setAdditionalNotes("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowOtherRole(false);
    setShowOtherCert(false);
    setOtherRole("");
    setOtherCert("");
  };

  const handleAddOtherRole = () => {
    if (otherRole.trim()) {
      const existing = editManpower.find(m => m.trade.toLowerCase() === otherRole.trim().toLowerCase());
      if (existing) {
        setEditManpower(editManpower.map(m => 
          m.trade.toLowerCase() === otherRole.trim().toLowerCase() 
            ? { ...m, count: m.count + 1 } 
            : m
        ));
      } else {
        setEditManpower([...editManpower, { trade: otherRole.trim(), count: 1 }]);
      }
      setOtherRole("");
      setShowOtherRole(false);
    }
  };

  const handleAddOtherCert = () => {
    if (otherCert.trim() && !editCertifications.includes(otherCert.trim())) {
      setEditCertifications([...editCertifications, otherCert.trim()]);
      setOtherCert("");
      setShowOtherCert(false);
    }
  };

  const handleAddManpower = (trade: string) => {
    const existing = editManpower.find(m => m.trade === trade);
    if (existing) {
      setEditManpower(editManpower.map(m => 
        m.trade === trade ? { ...m, count: m.count + 1 } : m
      ));
    } else {
      setEditManpower([...editManpower, { trade, count: 1 }]);
    }
  };

  const handleRemoveManpower = (trade: string) => {
    setEditManpower(editManpower.filter(m => m.trade !== trade));
  };

  const handleUpdateManpowerCount = (trade: string, count: number) => {
    if (count <= 0) {
      handleRemoveManpower(trade);
    } else {
      setEditManpower(editManpower.map(m => 
        m.trade === trade ? { ...m, count } : m
      ));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Derive trades array from manpower requirements
      const derivedTrades = editManpower.map(m => m.trade);

      const { error } = await supabase
        .from("projects")
        .update({
          trades: derivedTrades,
          manpower_requirements: editManpower as any,
          required_certifications: editCertifications,
        })
        .eq("id", project.id);

      if (error) throw error;

      onProjectUpdate({
        ...project,
        trades: derivedTrades,
        manpower_requirements: editManpower,
        required_certifications: editCertifications,
      });

      setIsEditing(false);
      toast.success("Requirements updated successfully");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save requirements");
    } finally {
      setSaving(false);
    }
  };

  const getTradeLabel = (trade: string) => {
    return TRADE_LABELS[trade as keyof typeof TRADE_LABELS] || trade;
  };

  // Calculate totals
  const totalWorkers = editManpower.reduce((sum, m) => sum + m.count, 0);
  const projectTotalWorkers = (project.manpower_requirements || []).reduce((sum, m) => sum + m.count, 0);

  if (isEditing) {
    return (
      <div className="p-4 space-y-6">
        {/* Manpower & Trades Requirements - Unified */}
        <div className="space-y-3">
          <button 
            onClick={() => toggleSection("manpower")}
            className="flex items-center justify-between w-full"
          >
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Manpower & Trades Requirements
            </h4>
            <div className="flex items-center gap-2">
              {totalWorkers > 0 && (
                <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                  {totalWorkers} total
                </Badge>
              )}
              {expandedSections.manpower ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
          
          {expandedSections.manpower && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Select trades/roles and specify how many workers you need for each:</p>
              
              {/* Current manpower selections */}
              {editManpower.length > 0 && (
                <div className="space-y-2 mb-4">
                  {editManpower.map((req) => (
                    <div key={req.trade} className="flex items-center gap-2 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                      <span className="flex-1 text-sm font-medium text-slate-700">
                        {getTradeLabel(req.trade)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleUpdateManpowerCount(req.trade, req.count - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-medium">{req.count}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleUpdateManpowerCount(req.trade, req.count + 1)}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveManpower(req.trade)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick add trades - show all available */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(TRADE_LABELS).map(([key, label]) => {
                  const isAdded = editManpower.some(m => m.trade === key);
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className={`justify-start gap-2 ${
                        isAdded 
                          ? "border-cyan-400 bg-cyan-100 text-cyan-800" 
                          : "hover:border-cyan-300"
                      }`}
                      onClick={() => handleAddManpower(key)}
                    >
                      <Plus className="w-3 h-3" />
                      {label}
                      {isAdded && (
                        <Badge className="ml-auto bg-cyan-500 text-white text-xs px-1.5 py-0">
                          {editManpower.find(m => m.trade === key)?.count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Other role button */}
              {!showOtherRole ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-dashed mt-2"
                  onClick={() => setShowOtherRole(true)}
                >
                  <Plus className="w-3 h-3" />
                  Other Role / Trade...
                </Button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter custom role or trade..."
                    value={otherRole}
                    onChange={(e) => setOtherRole(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddOtherRole()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddOtherRole}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowOtherRole(false); setOtherRole(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Certifications */}
        <div className="space-y-3">
          <button 
            onClick={() => toggleSection("certifications")}
            className="flex items-center justify-between w-full"
          >
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-500" />
              Required Certifications
            </h4>
            <div className="flex items-center gap-2">
              {editCertifications.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  {editCertifications.length} selected
                </Badge>
              )}
              {expandedSections.certifications ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {expandedSections.certifications && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Select required certifications for workers on this project:</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CERTIFICATION_OPTIONS.map((cert) => (
                  <div key={cert} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cert-${cert}`}
                      checked={editCertifications.includes(cert)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditCertifications([...editCertifications, cert]);
                        } else {
                          setEditCertifications(editCertifications.filter(c => c !== cert));
                        }
                      }}
                    />
                    <label 
                      htmlFor={`cert-${cert}`} 
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      {cert}
                    </label>
                  </div>
                ))}
              </div>

              {/* Custom certs added */}
              {editCertifications.filter(c => !CERTIFICATION_OPTIONS.includes(c)).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {editCertifications.filter(c => !CERTIFICATION_OPTIONS.includes(c)).map((cert) => (
                    <Badge 
                      key={cert} 
                      variant="secondary" 
                      className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {cert}
                      <button 
                        onClick={() => setEditCertifications(editCertifications.filter(c => c !== cert))}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Other certification button */}
              {!showOtherCert ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-dashed"
                  onClick={() => setShowOtherCert(true)}
                >
                  <Plus className="w-3 h-3" />
                  Other Certification...
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter custom certification..."
                    value={otherCert}
                    onChange={(e) => setOtherCert(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddOtherCert()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddOtherCert}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowOtherCert(false); setOtherCert(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="space-y-3">
          <Label className="font-medium text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-500" />
            Additional Notes / Comments
          </Label>
          <Textarea
            placeholder="Add any special requirements, notes, or comments about the project needs..."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-slate-400">These notes will be visible to team members assigned to the project.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Requirements
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancelEdit}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // View mode - unified display
  return (
    <div className="p-4 space-y-6">
      {/* Manpower & Trades Requirements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-500" />
            Manpower & Trades
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {project.manpower_requirements?.length || 0} roles
            </Badge>
            {projectTotalWorkers > 0 && (
              <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 text-xs">
                {projectTotalWorkers} workers
              </Badge>
            )}
          </div>
        </div>
        
        {project.manpower_requirements && project.manpower_requirements.length > 0 ? (
          <div className="space-y-2">
            {project.manpower_requirements.map((req, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <span className="text-sm font-medium text-slate-700">
                  {getTradeLabel(req.trade)}
                </span>
                <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                  {req.count} worker{req.count > 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No manpower requirements defined yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click Edit to add required trades and worker counts.</p>
          </div>
        )}
      </div>

      {/* Required Certifications */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-500" />
            Required Certifications
          </h4>
          <Badge variant="outline" className="text-xs">
            {project.required_certifications?.length || 0} certs
          </Badge>
        </div>
        
        {project.required_certifications && project.required_certifications.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.required_certifications.map((cert, idx) => (
              <Badge key={idx} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {cert}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-center">
            <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No certifications required yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click Edit to specify required certifications.</p>
          </div>
        )}
      </div>

      <Button 
        variant="outline" 
        className="w-full gap-2 mt-4 border-cyan-200 hover:bg-cyan-50"
        onClick={handleStartEdit}
      >
        <Pencil className="w-4 h-4" />
        Edit Requirements
      </Button>
    </div>
  );
};

export default RequirementsTab;
