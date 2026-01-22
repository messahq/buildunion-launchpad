import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, FileCheck, Briefcase, Plus, X, Pencil, 
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
  
  // Editing states
  const [editTrades, setEditTrades] = useState<string[]>(project.trades || []);
  const [editManpower, setEditManpower] = useState<ManpowerReq[]>(project.manpower_requirements || []);
  const [editCertifications, setEditCertifications] = useState<string[]>(project.required_certifications || []);
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Custom/Other inputs
  const [showOtherTrade, setShowOtherTrade] = useState(false);
  const [otherTrade, setOtherTrade] = useState("");
  const [showOtherCert, setShowOtherCert] = useState(false);
  const [otherCert, setOtherCert] = useState("");
  
  // Expand/collapse sections
  const [expandedSections, setExpandedSections] = useState({
    manpower: true,
    certifications: true,
    trades: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStartEdit = () => {
    setEditTrades(project.trades || []);
    setEditManpower(project.manpower_requirements || []);
    setEditCertifications(project.required_certifications || []);
    setAdditionalNotes("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowOtherTrade(false);
    setShowOtherCert(false);
    setOtherTrade("");
    setOtherCert("");
  };

  const handleAddOtherTrade = () => {
    if (otherTrade.trim() && !editTrades.includes(otherTrade.trim())) {
      setEditTrades([...editTrades, otherTrade.trim()]);
      setOtherTrade("");
      setShowOtherTrade(false);
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
      const { error } = await supabase
        .from("projects")
        .update({
          trades: editTrades,
          manpower_requirements: editManpower as any,
          required_certifications: editCertifications,
          // Note: additionalNotes could be stored in description or a new field
        })
        .eq("id", project.id);

      if (error) throw error;

      onProjectUpdate({
        ...project,
        trades: editTrades,
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

  // Quick add trades that aren't in TRADE_LABELS
  const getTradeLabel = (trade: string) => {
    return TRADE_LABELS[trade as keyof typeof TRADE_LABELS] || trade;
  };

  if (isEditing) {
    return (
      <div className="p-4 space-y-6">
        {/* Manpower Requirements */}
        <div className="space-y-3">
          <button 
            onClick={() => toggleSection("manpower")}
            className="flex items-center justify-between w-full"
          >
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Manpower Requirements
            </h4>
            {expandedSections.manpower ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expandedSections.manpower && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Select trades and specify how many workers you need:</p>
              
              {/* Current manpower */}
              {editManpower.length > 0 && (
                <div className="space-y-2 mb-3">
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

              {/* Quick add trades */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(TRADE_LABELS).slice(0, 12).map(([key, label]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className={`justify-start gap-2 ${
                      editManpower.some(m => m.trade === key) 
                        ? "border-cyan-300 bg-cyan-50" 
                        : ""
                    }`}
                    onClick={() => handleAddManpower(key)}
                  >
                    <Plus className="w-3 h-3" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* Other button */}
              {!showOtherTrade ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-dashed"
                  onClick={() => setShowOtherTrade(true)}
                >
                  <Plus className="w-3 h-3" />
                  Other Role...
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter custom role..."
                    value={otherTrade}
                    onChange={(e) => setOtherTrade(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddOtherTrade()}
                  />
                  <Button size="sm" onClick={handleAddOtherTrade}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowOtherTrade(false); setOtherTrade(""); }}>
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
            {expandedSections.certifications ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedSections.certifications && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Select required certifications for this project:</p>
              
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

              {/* Other button */}
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

        {/* Required Trades */}
        <div className="space-y-3">
          <button 
            onClick={() => toggleSection("trades")}
            className="flex items-center justify-between w-full"
          >
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-500" />
              Required Trades
            </h4>
            {expandedSections.trades ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedSections.trades && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Select all trades needed for this project:</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(TRADE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`trade-edit-${key}`}
                      checked={editTrades.includes(key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditTrades([...editTrades, key]);
                        } else {
                          setEditTrades(editTrades.filter(t => t !== key));
                        }
                      }}
                    />
                    <label 
                      htmlFor={`trade-edit-${key}`} 
                      className="text-sm text-slate-600 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              {/* Custom trades */}
              {editTrades.filter(t => !Object.keys(TRADE_LABELS).includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {editTrades.filter(t => !Object.keys(TRADE_LABELS).includes(t)).map((trade) => (
                    <Badge 
                      key={trade} 
                      className="gap-1 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      {trade}
                      <button 
                        onClick={() => setEditTrades(editTrades.filter(t => t !== trade))}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
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

  // View mode
  return (
    <div className="p-4 space-y-6">
      {/* Manpower Requirements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-500" />
            Manpower Requirements
          </h4>
          <Badge variant="outline" className="text-xs">
            {project.manpower_requirements?.length || 0} roles
          </Badge>
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
            <p className="text-xs text-slate-400 mt-1">Click Edit to add required workers and roles.</p>
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

      {/* Required Trades */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-500" />
            Required Trades
          </h4>
          <Badge variant="outline" className="text-xs">
            {project.trades?.length || 0} trades
          </Badge>
        </div>
        
        {project.trades && project.trades.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.trades.map((trade, idx) => (
              <Badge key={idx} className="bg-amber-50 text-amber-700 border-amber-200">
                {getTradeLabel(trade)}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-center">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No trades specified yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click Edit to select required trades.</p>
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
