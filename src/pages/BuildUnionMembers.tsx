import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { MemberDirectory } from "@/components/community/MemberDirectory";

const BuildUnionMembers = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Member Directory</h1>
          <p className="text-muted-foreground">
            Find and connect with verified construction professionals in your area
          </p>
        </div>

        <MemberDirectory />
      </main>
      
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionMembers;
