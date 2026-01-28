import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { CommunityForum } from "@/components/community/CommunityForum";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BuildUnionForum = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/buildunion/community')}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Discussion Forum</h1>
          <p className="text-muted-foreground">
            Share knowledge, ask questions, and connect with fellow construction professionals
          </p>
        </div>

        <CommunityForum />
      </main>
      
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionForum;
