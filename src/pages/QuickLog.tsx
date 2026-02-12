import { useSearchParams } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import QuickLogCreator from "@/components/admin/QuickLogCreator";

export default function QuickLog() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <QuickLogCreator projectId={projectId} />
      </main>
      <BuildUnionFooter />
    </div>
  );
}
