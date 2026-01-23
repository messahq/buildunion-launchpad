import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Home, Building2, Factory, Wrench, 
  Paintbrush, Zap, Droplets, TreePine,
  FileStack, Check
} from "lucide-react";

interface ManpowerReq {
  trade: string;
  count: number;
}

interface RequirementsTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  manpower: ManpowerReq[];
  certifications: string[];
}

const REQUIREMENTS_TEMPLATES: RequirementsTemplate[] = [
  {
    id: "residential-renovation",
    name: "Residential Renovation",
    description: "Standard home renovation with general trades",
    icon: <Home className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-500",
    manpower: [
      { trade: "general_contractor", count: 1 },
      { trade: "carpenter", count: 2 },
      { trade: "electrician", count: 1 },
      { trade: "plumber", count: 1 },
      { trade: "painter", count: 1 },
    ],
    certifications: ["OSHA 10", "CPR/First Aid"],
  },
  {
    id: "commercial-build",
    name: "Commercial Build",
    description: "Full commercial construction project",
    icon: <Building2 className="w-5 h-5" />,
    color: "from-purple-500 to-indigo-500",
    manpower: [
      { trade: "project_manager", count: 1 },
      { trade: "general_contractor", count: 2 },
      { trade: "electrician", count: 3 },
      { trade: "plumber", count: 2 },
      { trade: "hvac_technician", count: 2 },
      { trade: "carpenter", count: 4 },
      { trade: "concrete_worker", count: 3 },
      { trade: "drywall_installer", count: 2 },
    ],
    certifications: ["OSHA 30", "CPR/First Aid", "Fall Protection", "Confined Space"],
  },
  {
    id: "industrial-facility",
    name: "Industrial Facility",
    description: "Heavy industrial construction and machinery",
    icon: <Factory className="w-5 h-5" />,
    color: "from-orange-500 to-red-500",
    manpower: [
      { trade: "project_manager", count: 1 },
      { trade: "engineer", count: 2 },
      { trade: "welder", count: 4 },
      { trade: "heavy_equipment_operator", count: 3 },
      { trade: "electrician", count: 4 },
      { trade: "plumber", count: 2 },
      { trade: "hvac_technician", count: 2 },
    ],
    certifications: ["OSHA 30", "Hazmat", "Welding Certification", "Confined Space", "Fall Protection"],
  },
  {
    id: "electrical-upgrade",
    name: "Electrical Upgrade",
    description: "Electrical system installation or upgrade",
    icon: <Zap className="w-5 h-5" />,
    color: "from-yellow-500 to-amber-500",
    manpower: [
      { trade: "electrician", count: 3 },
      { trade: "general_contractor", count: 1 },
    ],
    certifications: ["OSHA 10", "Electrical Safety", "CPR/First Aid"],
  },
  {
    id: "plumbing-project",
    name: "Plumbing Project",
    description: "Plumbing installation or repair work",
    icon: <Droplets className="w-5 h-5" />,
    color: "from-sky-500 to-blue-500",
    manpower: [
      { trade: "plumber", count: 2 },
      { trade: "general_contractor", count: 1 },
    ],
    certifications: ["OSHA 10", "CPR/First Aid", "Confined Space"],
  },
  {
    id: "painting-finishing",
    name: "Painting & Finishing",
    description: "Interior/exterior painting and finishes",
    icon: <Paintbrush className="w-5 h-5" />,
    color: "from-pink-500 to-rose-500",
    manpower: [
      { trade: "painter", count: 3 },
      { trade: "drywall_installer", count: 1 },
    ],
    certifications: ["OSHA 10", "Lead/Asbestos Awareness"],
  },
  {
    id: "landscaping",
    name: "Landscaping Project",
    description: "Outdoor landscaping and hardscaping",
    icon: <TreePine className="w-5 h-5" />,
    color: "from-green-500 to-emerald-500",
    manpower: [
      { trade: "landscaper", count: 3 },
      { trade: "heavy_equipment_operator", count: 1 },
    ],
    certifications: ["OSHA 10", "Forklift/Heavy Equipment"],
  },
  {
    id: "maintenance-repair",
    name: "Maintenance & Repair",
    description: "General maintenance and repair work",
    icon: <Wrench className="w-5 h-5" />,
    color: "from-slate-500 to-gray-600",
    manpower: [
      { trade: "general_contractor", count: 1 },
      { trade: "electrician", count: 1 },
      { trade: "plumber", count: 1 },
    ],
    certifications: ["OSHA 10", "CPR/First Aid"],
  },
];

interface RequirementsTemplatesProps {
  onApplyTemplate: (manpower: ManpowerReq[], certifications: string[]) => void;
  disabled?: boolean;
}

const RequirementsTemplates = ({ onApplyTemplate, disabled }: RequirementsTemplatesProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelectTemplate = (template: RequirementsTemplate) => {
    setSelectedTemplate(template.id);
  };

  const handleApply = () => {
    const template = REQUIREMENTS_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      onApplyTemplate(template.manpower, template.certifications);
      setOpen(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-dashed border-cyan-300 text-cyan-700 hover:bg-cyan-50"
          disabled={disabled}
        >
          <FileStack className="w-4 h-4" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="w-5 h-5 text-cyan-500" />
            Requirements Templates
          </DialogTitle>
          <DialogDescription>
            Select a template to quickly configure your project's manpower and certification requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {REQUIREMENTS_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200"
                  : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-white flex-shrink-0`}>
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm">{template.name}</h4>
                    {selectedTemplate === template.id && (
                      <Check className="w-4 h-4 text-cyan-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                      {template.manpower.reduce((sum, m) => sum + m.count, 0)} workers
                    </Badge>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200">
                      {template.certifications.length} certs
                    </Badge>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Preview selected template */}
        {selectedTemplate && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
            <h5 className="font-medium text-slate-900 mb-2">Template Preview</h5>
            {(() => {
              const template = REQUIREMENTS_TEMPLATES.find(t => t.id === selectedTemplate);
              if (!template) return null;
              return (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Manpower</p>
                    <div className="flex flex-wrap gap-1">
                      {template.manpower.map((m, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {m.trade.replace(/_/g, " ")} × {m.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Certifications</p>
                    <div className="flex flex-wrap gap-1">
                      {template.certifications.map((cert, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
          >
            Apply Template
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequirementsTemplates;
