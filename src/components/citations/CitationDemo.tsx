import React from "react";
import { SourceTag } from "./SourceTag";
import { ReferencesSection } from "./ReferencesSection";
import { useCitation } from "./CitationProvider";
import { CitationSource } from "@/types/citation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

// Demo data for showcasing the citation system
const demoSources: CitationSource[] = [
  {
    id: "1",
    sourceId: "D-102",
    documentName: "Foundation Blueprint v2.3",
    documentType: "blueprint",
    pageNumber: 4,
    contextSnippet: "The foundation depth shall be a minimum of 1.2 meters below grade level, with reinforced concrete specifications as outlined in section 3.4.",
    coordinates: { x: 20, y: 35, width: 60, height: 15 },
    timestamp: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    sourceId: "OBC 3.4",
    documentName: "Ontario Building Code 2024",
    documentType: "regulation",
    pageNumber: 127,
    contextSnippet: "All load-bearing walls shall maintain structural integrity under specified wind loads of up to 150 km/h as per regional classification.",
    timestamp: "2024-01-10T08:00:00Z",
  },
  {
    id: "3",
    sourceId: "LOG-045",
    documentName: "Site Inspection Log - Jan 2024",
    documentType: "log",
    pageNumber: 2,
    contextSnippet: "Soil compaction test results: 95% Proctor density achieved. Approved for foundation pour.",
    timestamp: "2024-01-20T14:15:00Z",
  },
  {
    id: "4",
    sourceId: "IMG-023",
    documentName: "Site Photo - Foundation Forms",
    documentType: "image",
    contextSnippet: "Photograph showing completed foundation formwork prior to concrete pour.",
    timestamp: "2024-01-18T09:45:00Z",
  },
];

export const CitationDemo: React.FC = () => {
  const { openProofPanel } = useCitation();

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 via-background to-orange-50/30 dark:from-amber-900/10 dark:via-background dark:to-orange-900/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">AI Analysis Summary</CardTitle>
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Example AI-generated content with inline citations */}
        <div className="text-sm leading-relaxed text-foreground space-y-3">
          <p>
            Based on our analysis of the project documents, the foundation specifications meet all requirements. 
            The foundation depth of 1.2 meters
            <SourceTag source={demoSources[0]} onOpenProofPanel={openProofPanel} />
            complies with local building codes
            <SourceTag source={demoSources[1]} onOpenProofPanel={openProofPanel} />
            for this soil classification.
          </p>
          
          <p>
            Recent site inspections confirm that soil compaction tests have passed
            <SourceTag source={demoSources[2]} onOpenProofPanel={openProofPanel} />
            with 95% Proctor density, exceeding the minimum 90% requirement. 
            Visual documentation of the completed formwork
            <SourceTag source={demoSources[3]} onOpenProofPanel={openProofPanel} />
            shows proper alignment and bracing.
          </p>

          <p>
            <strong>Recommendation:</strong> Proceed with concrete pour as scheduled. 
            All structural and regulatory requirements have been verified against 
            <SourceTag source={demoSources[1]} onOpenProofPanel={openProofPanel} />
            and site conditions documented in
            <SourceTag source={demoSources[2]} onOpenProofPanel={openProofPanel} />.
          </p>
        </div>

        {/* References Section */}
        <ReferencesSection 
          references={demoSources} 
          onOpenProofPanel={openProofPanel}
          defaultExpanded={false}
        />
      </CardContent>
    </Card>
  );
};

export default CitationDemo;
