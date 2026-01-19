import { useState } from "react";
import { Calculator, Plus, Trash2, Copy, Check, ArrowRight, LayoutTemplate, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface CalculatorType {
  id: string;
  name: string;
  unit: string;
  formula: string;
  inputs: Array<{
    id: string;
    label: string;
    unit: string;
    defaultValue?: number;
  }>;
  calculate: (inputs: Record<string, number>) => {
    result: number;
    breakdown: string;
    materials: Array<{ item: string; quantity: number; unit: string }>;
    laborHours: number;
  };
}

const calculators: CalculatorType[] = [
  {
    id: "tile",
    name: "Tile / Ceramic",
    unit: "sq ft",
    formula: "Length × Width + 10% waste",
    inputs: [
      { id: "length", label: "Length", unit: "ft", defaultValue: 10 },
      { id: "width", label: "Width", unit: "ft", defaultValue: 12 },
      { id: "tileSize", label: "Tile Size", unit: "in²", defaultValue: 12 },
    ],
    calculate: (inputs) => {
      const area = inputs.length * inputs.width;
      const withWaste = area * 1.1;
      const tileSqFt = (inputs.tileSize * inputs.tileSize) / 144;
      const tilesNeeded = Math.ceil(withWaste / tileSqFt);
      
      return {
        result: withWaste,
        breakdown: `${inputs.length}ft × ${inputs.width}ft = ${area} sq ft + 10% waste = ${withWaste.toFixed(1)} sq ft`,
        materials: [
          { item: "Tiles", quantity: tilesNeeded, unit: "pcs" },
          { item: "Thinset mortar", quantity: Math.ceil(withWaste / 50), unit: "bags (50 lb)" },
          { item: "Grout", quantity: Math.ceil(withWaste / 100), unit: "bags (25 lb)" },
          { item: "Tile spacers", quantity: Math.ceil(tilesNeeded / 50), unit: "packs" },
        ],
        laborHours: Math.ceil(area / 20) * 2, // ~20 sq ft per hour for tile
      };
    },
  },
  {
    id: "flooring",
    name: "Flooring (Hardwood/Laminate)",
    unit: "sq ft",
    formula: "Length × Width + 10% waste",
    inputs: [
      { id: "length", label: "Length", unit: "ft", defaultValue: 12 },
      { id: "width", label: "Width", unit: "ft", defaultValue: 15 },
      { id: "boxCoverage", label: "Box Coverage", unit: "sq ft/box", defaultValue: 20 },
    ],
    calculate: (inputs) => {
      const area = inputs.length * inputs.width;
      const withWaste = area * 1.1;
      const boxesNeeded = Math.ceil(withWaste / inputs.boxCoverage);
      
      return {
        result: withWaste,
        breakdown: `${inputs.length}ft × ${inputs.width}ft = ${area} sq ft + 10% waste = ${withWaste.toFixed(1)} sq ft`,
        materials: [
          { item: "Flooring boxes", quantity: boxesNeeded, unit: "boxes" },
          { item: "Underlayment", quantity: Math.ceil(withWaste / 100), unit: "rolls" },
          { item: "Transition strips", quantity: Math.ceil(inputs.length / 8), unit: "pcs" },
          { item: "Spacers", quantity: 2, unit: "packs" },
        ],
        laborHours: Math.ceil(area / 50) * 2, // ~50 sq ft per hour for flooring
      };
    },
  },
  {
    id: "carpet",
    name: "Carpet",
    unit: "sq ft",
    formula: "Length × Width + 5% waste",
    inputs: [
      { id: "length", label: "Length", unit: "ft", defaultValue: 15 },
      { id: "width", label: "Width", unit: "ft", defaultValue: 12 },
    ],
    calculate: (inputs) => {
      const area = inputs.length * inputs.width;
      const withWaste = area * 1.05;
      const sqYards = Math.ceil(withWaste / 9);
      
      return {
        result: withWaste,
        breakdown: `${inputs.length}ft × ${inputs.width}ft = ${area} sq ft + 5% waste = ${withWaste.toFixed(1)} sq ft (${sqYards} sq yd)`,
        materials: [
          { item: "Carpet", quantity: sqYards, unit: "sq yd" },
          { item: "Carpet pad", quantity: sqYards, unit: "sq yd" },
          { item: "Tack strips", quantity: Math.ceil((inputs.length + inputs.width) * 2 / 4), unit: "4ft strips" },
          { item: "Seam tape", quantity: Math.ceil(inputs.length / 15), unit: "rolls" },
        ],
        laborHours: Math.ceil(area / 100), // ~100 sq ft per hour for carpet
      };
    },
  },
  {
    id: "paint",
    name: "Paint Coverage",
    unit: "sq ft",
    formula: "(Perimeter × Height - Openings) × 2 coats",
    inputs: [
      { id: "length", label: "Room Length", unit: "ft", defaultValue: 12 },
      { id: "width", label: "Room Width", unit: "ft", defaultValue: 10 },
      { id: "height", label: "Wall Height", unit: "ft", defaultValue: 8 },
      { id: "doors", label: "# of Doors", unit: "", defaultValue: 1 },
      { id: "windows", label: "# of Windows", unit: "", defaultValue: 2 },
    ],
    calculate: (inputs) => {
      const perimeter = (inputs.length + inputs.width) * 2;
      const wallArea = perimeter * inputs.height;
      const doorArea = inputs.doors * 21; // avg door ~21 sq ft
      const windowArea = inputs.windows * 15; // avg window ~15 sq ft
      const paintableArea = wallArea - doorArea - windowArea;
      const twoCoats = paintableArea * 2;
      const gallonsNeeded = Math.ceil(twoCoats / 350); // ~350 sq ft per gallon
      
      return {
        result: paintableArea,
        breakdown: `Walls: ${wallArea} sq ft - Doors: ${doorArea} sq ft - Windows: ${windowArea} sq ft = ${paintableArea} sq ft (×2 coats)`,
        materials: [
          { item: "Paint", quantity: gallonsNeeded, unit: "gallons" },
          { item: "Primer", quantity: Math.ceil(gallonsNeeded / 2), unit: "gallons" },
          { item: "Painter's tape", quantity: Math.ceil(perimeter / 60), unit: "rolls" },
          { item: "Drop cloths", quantity: 2, unit: "pcs" },
          { item: "Roller covers", quantity: 3, unit: "pcs" },
        ],
        laborHours: Math.ceil(paintableArea / 100) * 2, // ~100 sq ft per hour
      };
    },
  },
  {
    id: "drywall",
    name: "Drywall",
    unit: "sheets",
    formula: "Wall Area ÷ 32 sq ft per sheet + 10%",
    inputs: [
      { id: "length", label: "Wall Length", unit: "ft", defaultValue: 20 },
      { id: "height", label: "Wall Height", unit: "ft", defaultValue: 8 },
    ],
    calculate: (inputs) => {
      const area = inputs.length * inputs.height;
      const sheetsNeeded = Math.ceil((area * 1.1) / 32); // 4x8 = 32 sq ft
      
      return {
        result: sheetsNeeded,
        breakdown: `${inputs.length}ft × ${inputs.height}ft = ${area} sq ft ÷ 32 sq ft/sheet + 10% = ${sheetsNeeded} sheets`,
        materials: [
          { item: "Drywall sheets (4×8)", quantity: sheetsNeeded, unit: "sheets" },
          { item: "Drywall screws", quantity: Math.ceil(sheetsNeeded * 0.5), unit: "lb" },
          { item: "Joint compound", quantity: Math.ceil(sheetsNeeded / 4), unit: "buckets" },
          { item: "Drywall tape", quantity: Math.ceil(inputs.length / 100), unit: "rolls" },
        ],
        laborHours: sheetsNeeded * 0.75, // ~45 min per sheet
      };
    },
  },
  {
    id: "concrete",
    name: "Concrete",
    unit: "cubic yards",
    formula: "Length × Width × Depth ÷ 27",
    inputs: [
      { id: "length", label: "Length", unit: "ft", defaultValue: 10 },
      { id: "width", label: "Width", unit: "ft", defaultValue: 10 },
      { id: "depth", label: "Depth", unit: "in", defaultValue: 4 },
    ],
    calculate: (inputs) => {
      const cubicFeet = inputs.length * inputs.width * (inputs.depth / 12);
      const cubicYards = cubicFeet / 27;
      const withWaste = cubicYards * 1.1;
      const bags80lb = Math.ceil(withWaste * 45); // ~45 bags per cubic yard
      
      return {
        result: withWaste,
        breakdown: `${inputs.length}ft × ${inputs.width}ft × ${(inputs.depth / 12).toFixed(2)}ft = ${cubicFeet.toFixed(1)} cu ft = ${cubicYards.toFixed(2)} cu yd + 10% = ${withWaste.toFixed(2)} cu yd`,
        materials: [
          { item: "Ready-mix concrete", quantity: Math.ceil(withWaste), unit: "cu yd" },
          { item: "Or 80lb concrete bags", quantity: bags80lb, unit: "bags" },
          { item: "Rebar #4", quantity: Math.ceil((inputs.length + inputs.width) * 2 / 20), unit: "20ft bars" },
          { item: "Wire mesh", quantity: Math.ceil((inputs.length * inputs.width) / 50), unit: "rolls" },
        ],
        laborHours: Math.ceil(withWaste * 4), // ~4 hours per cu yd
      };
    },
  },
  {
    id: "roofing",
    name: "Roofing Shingles",
    unit: "squares",
    formula: "Roof Area ÷ 100 + waste factor",
    inputs: [
      { id: "length", label: "Roof Length", unit: "ft", defaultValue: 40 },
      { id: "width", label: "Roof Width", unit: "ft", defaultValue: 25 },
      { id: "pitch", label: "Roof Pitch", unit: "/12", defaultValue: 6 },
    ],
    calculate: (inputs) => {
      // Pitch multiplier calculation
      const pitchMultipliers: Record<number, number> = {
        0: 1.00, 1: 1.003, 2: 1.014, 3: 1.031, 4: 1.054,
        5: 1.083, 6: 1.118, 7: 1.158, 8: 1.202, 9: 1.250,
        10: 1.302, 11: 1.357, 12: 1.414,
      };
      const multiplier = pitchMultipliers[inputs.pitch] || 1.118;
      const flatArea = inputs.length * inputs.width;
      const actualArea = flatArea * multiplier;
      const squares = actualArea / 100;
      const withWaste = squares * 1.15; // 15% waste for shingles
      
      return {
        result: withWaste,
        breakdown: `${inputs.length}ft × ${inputs.width}ft = ${flatArea} sq ft × ${multiplier} (${inputs.pitch}/12 pitch) = ${actualArea.toFixed(0)} sq ft = ${squares.toFixed(1)} squares + 15% = ${withWaste.toFixed(1)} squares`,
        materials: [
          { item: "Shingle bundles (3/square)", quantity: Math.ceil(withWaste * 3), unit: "bundles" },
          { item: "Felt underlayment", quantity: Math.ceil(withWaste), unit: "rolls" },
          { item: "Drip edge", quantity: Math.ceil((inputs.length * 2 + inputs.width * 2) / 10), unit: "10ft pcs" },
          { item: "Roofing nails", quantity: Math.ceil(withWaste * 2), unit: "lb" },
          { item: "Ridge cap", quantity: Math.ceil(inputs.length / 33), unit: "bundles" },
        ],
        laborHours: Math.ceil(withWaste * 2.5), // ~2.5 hours per square
      };
    },
  },
  {
    id: "insulation",
    name: "Insulation",
    unit: "sq ft",
    formula: "Wall/Ceiling Area × Coverage",
    inputs: [
      { id: "length", label: "Length", unit: "ft", defaultValue: 30 },
      { id: "height", label: "Height", unit: "ft", defaultValue: 8 },
      { id: "rValue", label: "R-Value", unit: "", defaultValue: 19 },
    ],
    calculate: (inputs) => {
      const area = inputs.length * inputs.height;
      const batts = Math.ceil(area / 40); // ~40 sq ft per batt pack
      const rolls = Math.ceil(area / 75); // ~75 sq ft per roll
      
      return {
        result: area,
        breakdown: `${inputs.length}ft × ${inputs.height}ft = ${area} sq ft of R-${inputs.rValue} insulation`,
        materials: [
          { item: `R-${inputs.rValue} Batt packs`, quantity: batts, unit: "packs" },
          { item: "Or unfaced rolls", quantity: rolls, unit: "rolls" },
          { item: "Vapor barrier", quantity: Math.ceil(area / 200), unit: "rolls" },
          { item: "Staples", quantity: 1, unit: "box" },
        ],
        laborHours: Math.ceil(area / 200), // ~200 sq ft per hour
      };
    },
  },
  {
    id: "deck",
    name: "Deck / Decking",
    unit: "sq ft",
    formula: "Length × Width + 10% waste",
    inputs: [
      { id: "length", label: "Deck Length", unit: "ft", defaultValue: 16 },
      { id: "width", label: "Deck Width", unit: "ft", defaultValue: 12 },
      { id: "boardWidth", label: "Board Width", unit: "in", defaultValue: 6 },
    ],
    calculate: (inputs) => {
      const area = inputs.length * inputs.width;
      const withWaste = area * 1.1;
      const boardsPerRow = Math.ceil(inputs.width / (inputs.boardWidth / 12));
      const totalBoards = boardsPerRow * Math.ceil(inputs.length);
      
      return {
        result: withWaste,
        breakdown: `${inputs.length}ft × ${inputs.width}ft = ${area} sq ft + 10% waste = ${withWaste.toFixed(1)} sq ft`,
        materials: [
          { item: "Deck boards (16ft)", quantity: Math.ceil(totalBoards * 1.1), unit: "pcs" },
          { item: "Deck screws", quantity: Math.ceil(area / 10), unit: "lb" },
          { item: "Joist hangers", quantity: Math.ceil(inputs.length / 2), unit: "pcs" },
          { item: "Posts (4x4)", quantity: Math.ceil((inputs.length + inputs.width) / 6), unit: "pcs" },
        ],
        laborHours: Math.ceil(area / 25), // ~25 sq ft per hour
      };
    },
  },
  {
    id: "fencing",
    name: "Fencing",
    unit: "lin ft",
    formula: "Perimeter length",
    inputs: [
      { id: "length", label: "Total Length", unit: "ft", defaultValue: 100 },
      { id: "height", label: "Fence Height", unit: "ft", defaultValue: 6 },
    ],
    calculate: (inputs) => {
      const panels = Math.ceil(inputs.length / 8); // 8ft panels
      const posts = panels + 1;
      
      return {
        result: inputs.length,
        breakdown: `${inputs.length} linear ft at ${inputs.height}ft height`,
        materials: [
          { item: "Fence panels (8ft)", quantity: panels, unit: "pcs" },
          { item: "Posts (4x4)", quantity: posts, unit: "pcs" },
          { item: "Post caps", quantity: posts, unit: "pcs" },
          { item: "Concrete bags", quantity: posts * 2, unit: "bags" },
          { item: "Gate hardware", quantity: 1, unit: "set" },
        ],
        laborHours: Math.ceil(inputs.length / 10), // ~10 lin ft per hour
      };
    },
  },
  {
    id: "other",
    name: "Other (Custom)",
    unit: "unit",
    formula: "Custom calculation",
    inputs: [
      { id: "quantity", label: "Quantity", unit: "units", defaultValue: 1 },
      { id: "multiplier", label: "Multiplier", unit: "×", defaultValue: 1 },
    ],
    calculate: (inputs) => {
      const result = inputs.quantity * inputs.multiplier;
      
      return {
        result: result,
        breakdown: `${inputs.quantity} units × ${inputs.multiplier} = ${result} total`,
        materials: [
          { item: "Custom material", quantity: result, unit: "units" },
        ],
        laborHours: Math.ceil(result / 2), // estimate
      };
    },
  },
];

interface TemplateData {
  templateId: string;
  templateName: string;
  projectName: string;
  materials: string[];
}

interface QuickModeCalculatorProps {
  onCalculatorComplete?: (result: any) => void;
  onContinue?: () => void;
  templateData?: TemplateData | null;
  prefillArea?: number | null;
  prefillAreaUnit?: string;
}

const QuickModeCalculator = ({ onCalculatorComplete, onContinue, templateData, prefillArea, prefillAreaUnit }: QuickModeCalculatorProps) => {
  const [selectedCalc, setSelectedCalc] = useState(calculators[0]);
  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    calculators[0].inputs.forEach((input) => {
      initial[input.id] = input.defaultValue || 0;
    });
    
    // Pre-fill with area from photo estimate if available
    if (prefillArea) {
      // For tile calculator: calculate length and width from area (assume square-ish room)
      const sqRoot = Math.sqrt(prefillArea);
      initial["length"] = Math.round(sqRoot);
      initial["width"] = Math.round(prefillArea / Math.round(sqRoot));
    }
    
    return initial;
  });
  const [results, setResults] = useState<ReturnType<CalculatorType["calculate"]> | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedResults, setSavedResults] = useState<Array<{
    calcType: string;
    result: ReturnType<CalculatorType["calculate"]>;
  }>>([]);

  const handleCalcChange = (calcId: string) => {
    const calc = calculators.find((c) => c.id === calcId);
    if (calc) {
      setSelectedCalc(calc);
      const newInputs: Record<string, number> = {};
      calc.inputs.forEach((input) => {
        newInputs[input.id] = input.defaultValue || 0;
      });
      setInputs(newInputs);
      setResults(null);
    }
  };

  const handleInputChange = (inputId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [inputId]: numValue }));
  };

  const calculate = () => {
    const result = selectedCalc.calculate(inputs);
    setResults(result);
  };

  const saveResult = () => {
    if (!results) return;
    
    const savedItem = {
      calcType: selectedCalc.name,
      result: results,
    };
    
    setSavedResults(prev => [...prev, savedItem]);
    onCalculatorComplete?.(savedItem);
    toast.success(`${selectedCalc.name} saved to summary!`);
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `
${selectedCalc.name} Calculation
============================
${results.breakdown}

Materials Needed:
${results.materials.map((m) => `- ${m.item}: ${m.quantity} ${m.unit}`).join("\n")}

Estimated Labor: ${results.laborHours} hours
    `.trim();
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    onContinue?.();
  };

  return (
    <div className="space-y-6">
      {/* Pre-filled Area Banner */}
      {prefillArea && (
        <Alert className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-blue-800">Pre-filled from Photo Estimate:</span>
              <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                {prefillArea} {prefillAreaUnit || "sq ft"}
              </Badge>
              <span className="text-blue-600 ml-2 text-sm">• Dimensions are editable below</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Template Data Banner */}
      {templateData && (
        <Alert className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <LayoutTemplate className="h-4 w-4 text-violet-600" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-violet-800">Template: {templateData.templateName}</span>
              <span className="text-violet-600 ml-2">• {templateData.projectName}</span>
              {templateData.materials.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {templateData.materials.slice(0, 5).map((mat, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-violet-100 text-violet-700">
                      {mat}
                    </Badge>
                  ))}
                  {templateData.materials.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{templateData.materials.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-violet-600">
              <Sparkles className="w-4 h-4" />
              Calculate exact quantities below
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calculator Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              Material Calculator
            </CardTitle>
            <CardDescription>
              Enter dimensions to calculate materials and labor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Calculator Type Selector */}
            <div className="space-y-2">
              <Label>Calculator Type</Label>
              <Select value={selectedCalc.id} onValueChange={handleCalcChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calculators.map((calc) => (
                    <SelectItem key={calc.id} value={calc.id}>
                      {calc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Formula: {selectedCalc.formula}
              </p>
            </div>

            {/* Dynamic Inputs */}
            <div className="grid grid-cols-2 gap-4">
              {selectedCalc.inputs.map((input) => (
                <div key={input.id} className="space-y-2">
                  <Label htmlFor={input.id}>
                    {input.label} {input.unit && `(${input.unit})`}
                  </Label>
                  <Input
                    id={input.id}
                    type="number"
                    value={inputs[input.id] || ""}
                    onChange={(e) => handleInputChange(input.id, e.target.value)}
                    className="text-lg"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={calculate}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>
              {results && (
                <Button
                  onClick={saveResult}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Summary
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>Material quantities and labor estimate</CardDescription>
              </div>
              {results && (
                <Button variant="outline" size="sm" onClick={copyResults}>
                  {copied ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                {/* Main Result */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 mb-2">Calculation:</p>
                  <p className="text-foreground font-medium">{results.breakdown}</p>
                </div>

                {/* Total Area/Quantity */}
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Required</p>
                  <p className="text-4xl font-bold text-amber-600">
                    {results.result.toFixed(1)} <span className="text-lg">{selectedCalc.unit}</span>
                  </p>
                </div>

                {/* Materials List */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Materials Needed</h4>
                  <div className="space-y-2">
                    {results.materials.map((material, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                      >
                        <span className="text-foreground">{material.item}</span>
                        <Badge variant="secondary" className="font-mono">
                          {material.quantity} {material.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Labor Estimate */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-1">Estimated Labor</h4>
                  <p className="text-2xl font-bold text-amber-600">
                    {results.laborHours} hours
                  </p>
                  <p className="text-sm text-muted-foreground">
                    (~{Math.ceil(results.laborHours / 8)} work days)
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calculator className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Enter dimensions and click "Calculate" to see material estimates
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved Calculations */}
      {savedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Calculations ({savedResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedResults.map((saved, index) => (
                <Badge key={index} variant="outline" className="py-1.5 px-3">
                  {saved.calcType} - {saved.result.result.toFixed(1)} {calculators.find(c => c.name === saved.calcType)?.unit || 'units'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Continue to Next Step
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default QuickModeCalculator;
