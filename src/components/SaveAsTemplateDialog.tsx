import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, LayoutTemplate, Sparkles } from "lucide-react";

interface LineItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  source: string;
}

interface SaveAsTemplateDialogProps {
  lineItems: LineItem[];
  photoEstimate?: any;
  calculatorType?: string;
  children: React.ReactNode;
}

const templateIcons = [
  { value: "📋", label: "📋 Clipboard" },
  { value: "🏠", label: "🏠 House" },
  { value: "🔧", label: "🔧 Wrench" },
  { value: "🔨", label: "🔨 Hammer" },
  { value: "🪚", label: "🪚 Saw" },
  { value: "🎨", label: "🎨 Paint" },
  { value: "💡", label: "💡 Light" },
  { value: "🚿", label: "🚿 Shower" },
  { value: "🪟", label: "🪟 Window" },
  { value: "🚪", label: "🚪 Door" },
  { value: "🏗️", label: "🏗️ Construction" },
  { value: "⚡", label: "⚡ Electric" },
];

const templateCategories = [
  { value: "flooring", label: "Flooring" },
  { value: "bathroom", label: "Bathroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "painting", label: "Painting" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "custom", label: "Custom" },
];

export function SaveAsTemplateDialog({ 
  lineItems, 
  photoEstimate,
  calculatorType,
  children 
}: SaveAsTemplateDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: "",
    description: "",
    category: "custom",
    icon: "📋",
    isPublic: false,
  });

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save templates");
      return;
    }

    if (!templateData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      // Extract materials from line items
      const materials = lineItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.unit_price,
      }));

      // Create checklist from line items
      const checklist = lineItems.map((item, idx) => ({
        id: `t_${idx}`,
        task: item.name,
        category: item.source === "photo" ? "AI Detected" : 
                 item.source === "calculator" ? "Calculated" : 
                 item.source === "template" ? "Template" : "Manual",
      }));

      const { error } = await supabase
        .from("user_templates")
        .insert([{
          user_id: user.id,
          name: templateData.name,
          description: templateData.description || null,
          category: templateData.category,
          icon: templateData.icon,
          materials: materials as any,
          checklist: checklist as any,
          line_items: lineItems as any,
          estimated_area: photoEstimate?.area || null,
          area_unit: photoEstimate?.areaUnit || "sq ft",
          calculator_type: calculatorType || null,
          is_public: templateData.isPublic,
        }]);

      if (error) throw error;

      toast.success("Template saved successfully!");
      setOpen(false);
      setTemplateData({
        name: "",
        description: "",
        category: "custom",
        icon: "📋",
        isPublic: false,
      });
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-amber-500" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this project configuration as a reusable template for future projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Preview */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Template will include:</span>
            </div>
            <ul className="mt-2 text-sm text-amber-700 space-y-1">
              <li>• {lineItems.length} line items with quantities</li>
              {photoEstimate?.area && (
                <li>• Area: {photoEstimate.area} {photoEstimate.areaUnit || 'sq ft'}</li>
              )}
              {calculatorType && (
                <li>• Calculator type: {calculatorType}</li>
              )}
            </ul>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g., Standard Tile Installation"
              value={templateData.name}
              onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-desc">Description</Label>
            <Textarea
              id="template-desc"
              placeholder="Brief description of this template..."
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
              className="h-20"
            />
          </div>

          {/* Icon & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={templateData.icon}
                onValueChange={(value) => setTemplateData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={templateData.category}
                onValueChange={(value) => setTemplateData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Allow other BuildUnion users to use this template
              </p>
            </div>
            <Switch
              checked={templateData.isPublic}
              onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, isPublic: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !templateData.name.trim()}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LayoutTemplate className="h-4 w-4" />
            )}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}