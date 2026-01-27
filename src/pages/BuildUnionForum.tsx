import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { CommunityForum } from "@/components/community/CommunityForum";

const BuildUnionForum = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
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
