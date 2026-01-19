import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { ProjectSummary } from "@/components/ProjectSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BuildUnionProjectSummary() {
  const { summaryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get data from URL params if creating new summary from Quick Mode
  const projectId = searchParams.get("projectId");
  const photoEstimateRaw = searchParams.get("photoEstimate");
  const calculatorResultsRaw = searchParams.get("calculatorResults");
  const templateItemsRaw = searchParams.get("templateItems");

  let photoEstimate = null;
  let calculatorResults: any[] = [];
  let templateItems: any[] = [];

  try {
    if (photoEstimateRaw) photoEstimate = JSON.parse(decodeURIComponent(photoEstimateRaw));
    if (calculatorResultsRaw) calculatorResults = JSON.parse(decodeURIComponent(calculatorResultsRaw));
    if (templateItemsRaw) templateItems = JSON.parse(decodeURIComponent(templateItemsRaw));
  } catch (e) {
    console.error("Error parsing URL params:", e);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <BuildUnionHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza
          </Button>
        </div>

        <ProjectSummary
          summaryId={summaryId}
          projectId={projectId || undefined}
          photoEstimate={photoEstimate}
          calculatorResults={calculatorResults}
          templateItems={templateItems}
          onClose={() => navigate("/buildunion/workspace")}
        />
      </main>

      <BuildUnionFooter />
    </div>
  );
}
