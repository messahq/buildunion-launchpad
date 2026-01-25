import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const BuildUnionCommunity = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Community</h1>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      </main>
      
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionCommunity;
