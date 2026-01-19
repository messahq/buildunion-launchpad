import { useState } from "react";
import { Bath, UtensilsCrossed, PaintBucket, Home, Wrench, Zap, Droplets, TreePine, Check, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  avgDuration: string;
  checklist: Array<{
    id: string;
    task: string;
    category: string;
  }>;
  materials: string[];
}

const templates: ProjectTemplate[] = [
  {
    id: "bathroom",
    name: "Bathroom Renovation",
    icon: <Bath className="w-6 h-6" />,
    color: "bg-blue-500",
    description: "Complete bathroom remodel including fixtures, tiling, and plumbing",
    avgDuration: "5-10 days",
    checklist: [
      { id: "b1", task: "Demolition & removal of old fixtures", category: "Prep" },
      { id: "b2", task: "Plumbing rough-in inspection", category: "Plumbing" },
      { id: "b3", task: "Waterproofing membrane application", category: "Waterproofing" },
      { id: "b4", task: "Tile installation - floor", category: "Tiling" },
      { id: "b5", task: "Tile installation - walls", category: "Tiling" },
      { id: "b6", task: "Vanity & sink installation", category: "Fixtures" },
      { id: "b7", task: "Toilet installation", category: "Fixtures" },
      { id: "b8", task: "Shower/tub installation", category: "Fixtures" },
      { id: "b9", task: "Electrical - GFCI outlets", category: "Electrical" },
      { id: "b10", task: "Ventilation fan installation", category: "Electrical" },
      { id: "b11", task: "Final plumbing connections", category: "Plumbing" },
      { id: "b12", task: "Grouting & caulking", category: "Finishing" },
      { id: "b13", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Tiles", "Grout", "Thinset", "Waterproofing membrane", "Vanity", "Toilet", "Faucets", "Shower fixtures"],
  },
  {
    id: "kitchen",
    name: "Kitchen Remodel",
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: "bg-orange-500",
    description: "Kitchen renovation with cabinets, countertops, and appliances",
    avgDuration: "2-4 weeks",
    checklist: [
      { id: "k1", task: "Remove existing cabinets & appliances", category: "Demolition" },
      { id: "k2", task: "Electrical updates for appliances", category: "Electrical" },
      { id: "k3", task: "Plumbing rough-in for sink", category: "Plumbing" },
      { id: "k4", task: "Cabinet installation - base", category: "Cabinets" },
      { id: "k5", task: "Cabinet installation - wall", category: "Cabinets" },
      { id: "k6", task: "Countertop templating", category: "Countertops" },
      { id: "k7", task: "Countertop installation", category: "Countertops" },
      { id: "k8", task: "Backsplash installation", category: "Tiling" },
      { id: "k9", task: "Sink & faucet installation", category: "Plumbing" },
      { id: "k10", task: "Appliance installation", category: "Appliances" },
      { id: "k11", task: "Cabinet hardware installation", category: "Finishing" },
      { id: "k12", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Cabinets", "Countertops", "Backsplash tile", "Sink", "Faucet", "Hardware", "Appliances"],
  },
  {
    id: "painting",
    name: "Interior Painting",
    icon: <PaintBucket className="w-6 h-6" />,
    color: "bg-purple-500",
    description: "Full room or house interior painting with prep work",
    avgDuration: "2-5 days",
    checklist: [
      { id: "p1", task: "Move/cover furniture", category: "Prep" },
      { id: "p2", task: "Repair holes & cracks", category: "Prep" },
      { id: "p3", task: "Sand surfaces", category: "Prep" },
      { id: "p4", task: "Apply painter's tape", category: "Prep" },
      { id: "p5", task: "Apply primer coat", category: "Priming" },
      { id: "p6", task: "First coat - walls", category: "Painting" },
      { id: "p7", task: "First coat - ceiling", category: "Painting" },
      { id: "p8", task: "Second coat - walls", category: "Painting" },
      { id: "p9", task: "Second coat - ceiling", category: "Painting" },
      { id: "p10", task: "Trim & detail work", category: "Finishing" },
      { id: "p11", task: "Remove tape & touch-ups", category: "Finishing" },
      { id: "p12", task: "Clean up & final walk-through", category: "Finishing" },
    ],
    materials: ["Paint", "Primer", "Painter's tape", "Drop cloths", "Brushes", "Rollers", "Spackle", "Sandpaper"],
  },
  {
    id: "roofing",
    name: "Roof Repair/Replace",
    icon: <Home className="w-6 h-6" />,
    color: "bg-slate-600",
    description: "Roofing repairs or full shingle replacement",
    avgDuration: "1-3 days",
    checklist: [
      { id: "r1", task: "Safety equipment setup", category: "Safety" },
      { id: "r2", task: "Remove old shingles", category: "Demolition" },
      { id: "r3", task: "Inspect decking for damage", category: "Inspection" },
      { id: "r4", task: "Replace damaged decking", category: "Repair" },
      { id: "r5", task: "Install ice & water shield", category: "Underlayment" },
      { id: "r6", task: "Install felt underlayment", category: "Underlayment" },
      { id: "r7", task: "Install drip edge", category: "Flashing" },
      { id: "r8", task: "Install shingles", category: "Shingles" },
      { id: "r9", task: "Install ridge cap", category: "Shingles" },
      { id: "r10", task: "Flash around penetrations", category: "Flashing" },
      { id: "r11", task: "Clean up & debris removal", category: "Finishing" },
      { id: "r12", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Shingles", "Underlayment", "Ice & water shield", "Drip edge", "Flashing", "Roofing nails", "Ridge cap"],
  },
  {
    id: "electrical",
    name: "Electrical Upgrade",
    icon: <Zap className="w-6 h-6" />,
    color: "bg-yellow-500",
    description: "Panel upgrades, new circuits, or outlet installation",
    avgDuration: "1-2 days",
    checklist: [
      { id: "e1", task: "Permit application", category: "Permits" },
      { id: "e2", task: "Power shutdown coordination", category: "Safety" },
      { id: "e3", task: "Remove old panel (if upgrading)", category: "Demolition" },
      { id: "e4", task: "Install new panel/breakers", category: "Installation" },
      { id: "e5", task: "Run new circuits", category: "Wiring" },
      { id: "e6", task: "Install outlets/switches", category: "Devices" },
      { id: "e7", task: "Grounding & bonding", category: "Safety" },
      { id: "e8", task: "Label circuits", category: "Finishing" },
      { id: "e9", task: "Rough-in inspection", category: "Inspection" },
      { id: "e10", task: "Final inspection & power-on", category: "Inspection" },
    ],
    materials: ["Breaker panel", "Breakers", "Wire", "Outlets", "Switches", "Junction boxes", "Conduit"],
  },
  {
    id: "plumbing",
    name: "Plumbing Repair",
    icon: <Droplets className="w-6 h-6" />,
    color: "bg-cyan-500",
    description: "Pipe repairs, fixture replacement, or drain clearing",
    avgDuration: "2-8 hours",
    checklist: [
      { id: "pl1", task: "Locate main water shutoff", category: "Prep" },
      { id: "pl2", task: "Shut off water supply", category: "Prep" },
      { id: "pl3", task: "Diagnose issue", category: "Diagnosis" },
      { id: "pl4", task: "Remove damaged components", category: "Repair" },
      { id: "pl5", task: "Install replacement parts", category: "Repair" },
      { id: "pl6", task: "Test for leaks", category: "Testing" },
      { id: "pl7", task: "Restore water supply", category: "Testing" },
      { id: "pl8", task: "Final leak check", category: "Inspection" },
      { id: "pl9", task: "Clean up work area", category: "Finishing" },
    ],
    materials: ["Pipes/fittings", "Sealant tape", "Valves", "Fixtures", "Soldering supplies", "Pipe cutters"],
  },
  {
    id: "hvac",
    name: "HVAC Service",
    icon: <Wrench className="w-6 h-6" />,
    color: "bg-emerald-500",
    description: "Heating/cooling maintenance, repair, or installation",
    avgDuration: "2-6 hours",
    checklist: [
      { id: "h1", task: "Thermostat check", category: "Diagnosis" },
      { id: "h2", task: "Filter inspection/replacement", category: "Maintenance" },
      { id: "h3", task: "Ductwork inspection", category: "Inspection" },
      { id: "h4", task: "Refrigerant level check", category: "AC" },
      { id: "h5", task: "Electrical connections check", category: "Electrical" },
      { id: "h6", task: "Clean condenser coils", category: "Cleaning" },
      { id: "h7", task: "Check blower motor", category: "Components" },
      { id: "h8", task: "Test system operation", category: "Testing" },
      { id: "h9", task: "Document readings", category: "Documentation" },
    ],
    materials: ["Filters", "Refrigerant", "Capacitors", "Contactors", "Thermostat", "Duct tape"],
  },
  {
    id: "landscaping",
    name: "Landscaping",
    icon: <TreePine className="w-6 h-6" />,
    color: "bg-green-600",
    description: "Garden design, planting, or hardscape installation",
    avgDuration: "1-5 days",
    checklist: [
      { id: "l1", task: "Mark utility lines (call before you dig)", category: "Safety" },
      { id: "l2", task: "Clear existing vegetation", category: "Prep" },
      { id: "l3", task: "Grade & level area", category: "Prep" },
      { id: "l4", task: "Install irrigation lines", category: "Irrigation" },
      { id: "l5", task: "Lay landscape fabric", category: "Prep" },
      { id: "l6", task: "Install edging", category: "Hardscape" },
      { id: "l7", task: "Place plants/trees", category: "Planting" },
      { id: "l8", task: "Spread mulch", category: "Finishing" },
      { id: "l9", task: "Test irrigation", category: "Testing" },
      { id: "l10", task: "Final cleanup", category: "Finishing" },
    ],
    materials: ["Plants", "Mulch", "Landscape fabric", "Edging", "Irrigation supplies", "Soil amendments"],
  },
];

const QuickModeTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState("");

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const progress = selectedTemplate
    ? Math.round((completedTasks.size / selectedTemplate.checklist.length) * 100)
    : 0;

  if (selectedTemplate) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>
              ← Back
            </Button>
            <div className={`w-10 h-10 rounded-lg ${selectedTemplate.color} flex items-center justify-center text-white`}>
              {selectedTemplate.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedTemplate.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedTemplate.avgDuration}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {progress}% Complete
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            placeholder="e.g., Johnson Bathroom Reno"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Task Checklist</CardTitle>
              <CardDescription>
                {completedTasks.size} of {selectedTemplate.checklist.length} tasks completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTemplate.checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      completedTasks.has(item.id)
                        ? "bg-green-50 border-green-200"
                        : "bg-background border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={completedTasks.has(item.id)}
                      onCheckedChange={() => toggleTask(item.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={item.id}
                        className={`font-medium cursor-pointer ${
                          completedTasks.has(item.id)
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.task}
                      </label>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.category}
                      </Badge>
                    </div>
                    {completedTasks.has(item.id) && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle>Typical Materials</CardTitle>
              <CardDescription>
                Common materials needed for this project type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.materials.map((material, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="py-2 px-3 text-sm"
                  >
                    {material}
                  </Badge>
                ))}
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  💡 <strong>Tip:</strong> Use the Calculator tab to get exact quantities based on your project dimensions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose a Project Template</h2>
        <p className="text-muted-foreground">
          Pre-built checklists and material lists for common construction projects
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:border-amber-400 group"
            onClick={() => setSelectedTemplate(template)}
          >
            <CardContent className="p-6">
              <div className={`w-12 h-12 rounded-xl ${template.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                {template.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{template.avgDuration}</Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuickModeTemplates;
