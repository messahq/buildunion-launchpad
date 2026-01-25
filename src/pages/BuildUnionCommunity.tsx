import { useState } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users } from "lucide-react";
import { CommunityForum } from "@/components/community/CommunityForum";
import { MemberDirectory } from "@/components/community/MemberDirectory";

const BuildUnionCommunity = () => {
  const [activeTab, setActiveTab] = useState("forum");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Community</h1>
          <p className="text-muted-foreground">
            Connect with fellow construction professionals, share knowledge, and grow your network
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="forum" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Forum
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forum">
            <CommunityForum />
          </TabsContent>

          <TabsContent value="members">
            <MemberDirectory />
          </TabsContent>
        </Tabs>
      </main>
      
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionCommunity;