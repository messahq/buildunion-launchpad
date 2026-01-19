import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import QuickModePhotoEstimate from "@/components/quick-mode/QuickModePhotoEstimate";
import QuickModeTemplates from "@/components/quick-mode/QuickModeTemplates";
import QuickModeCalculator from "@/components/quick-mode/QuickModeCalculator";
import QuickModeQuoteGenerator from "@/components/quick-mode/QuickModeQuoteGenerator";
import QuickModeOnboarding from "@/components/quick-mode/QuickModeOnboarding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, LayoutTemplate, Calculator, FileText, Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const BuildUnionQuickMode = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("photo");
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-background py-8 sm:py-12 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion")}
              className="gap-2 text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-amber-600 uppercase tracking-wide">Quick Mode</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Fast Estimates for Small Jobs
                </h1>
                <p className="text-muted-foreground max-w-xl">
                  No blueprints? No problem. Get instant material estimates, use project templates, 
                  calculate quantities, and generate professional quotes in minutes.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/buildunion/workspace/new")}
                  className="gap-2"
                >
                  <span>PRO Mode</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content with Tabs */}
        <section className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-auto p-1 bg-muted/50 mb-6">
              <TabsTrigger 
                value="photo" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Photo Estimate</span>
                <span className="sm:hidden">Photo</span>
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
                <span className="sm:hidden">Templates</span>
              </TabsTrigger>
              <TabsTrigger 
                value="calculator" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Calculator</span>
                <span className="sm:hidden">Calc</span>
              </TabsTrigger>
              <TabsTrigger 
                value="quote" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Quote Generator</span>
                <span className="sm:hidden">Quote</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="mt-0">
              <QuickModePhotoEstimate />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <QuickModeTemplates />
            </TabsContent>

            <TabsContent value="calculator" className="mt-0">
              <QuickModeCalculator />
            </TabsContent>

            <TabsContent value="quote" className="mt-0">
              <QuickModeQuoteGenerator />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <BuildUnionFooter />

      {/* Onboarding for first-time users */}
      {showOnboarding && (
        <QuickModeOnboarding
          onComplete={() => setShowOnboarding(false)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
        />
      )}
    </div>
  );
};

export default BuildUnionQuickMode;
