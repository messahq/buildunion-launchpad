import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import ProjectList from "@/components/ProjectList";
import ProjectDashboardWidget from "@/components/ProjectDashboardWidget";
import OnlineTeamWidget from "@/components/OnlineTeamWidget";
import TeamMapView from "@/components/TeamMapView";
import TeamChat from "@/components/TeamChat";
import TeamMemberDashboard from "@/components/TeamMemberDashboard";
import PendingInvitations from "@/components/PendingInvitations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Brain, CheckCircle, Calendar, ArrowRight, Newspaper, HelpCircle, Shield, FileText, Link2, Users, MessageSquare, Building2, Scale, TrendingUp, Award, Heart, DollarSign, Briefcase, Clock, BookOpen, AlertTriangle, ArrowLeft, FolderOpen, UserCheck } from "lucide-react";

const newsItems = [
  {
    id: 1,
    title: "BuildUnion Launches Beta Program",
    description: "We're excited to announce our beta program for early adopters. Join now to shape the future of construction project management.",
    date: "Jan 15, 2026",
    category: "Product",
  },
  {
    id: 2,
    title: "Partnership with Leading Construction Firms",
    description: "BuildUnion partners with top construction companies to bring enterprise-grade solutions to teams of all sizes.",
    date: "Jan 5, 2026",
    category: "News",
  },
];

const processSteps = [
  {
    step: 1,
    title: "Upload Documents",
    description: "Simply upload your PDFs, blueprints, contracts, and project files. Our system accepts all standard construction document formats.",
    icon: FileUp,
  },
  {
    step: 2,
    title: "Dual-Engine Analysis",
    description: "OpenAI and Gemini work in parallel to analyze your documents, cross-referencing data for maximum accuracy and reliability.",
    icon: Brain,
  },
  {
    step: 3,
    title: "Operational Truth",
    description: "Receive fact-based answers with clear source citations. Every insight is traceable back to your original documents.",
    icon: CheckCircle,
  },
];

const BuildUnionWorkspace = () => {
  const navigate = useNavigate();

  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader />
      
      {/* Back Button */}
      <div className="container mx-auto px-6 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/buildunion")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      {/* Pending Invitations */}
      <section className="px-6 pt-4">
        <div className="max-w-6xl mx-auto">
          <PendingInvitations />
        </div>
      </section>
      
      {/* My Projects Section */}
      <section className="py-12 px-6 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="my-projects" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="my-projects" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                My Projects
              </TabsTrigger>
              <TabsTrigger value="shared" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Shared With Me
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <ProjectList />
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <ProjectDashboardWidget />
                  <OnlineTeamWidget />
                  <TeamMapView />
                  <TeamChat />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shared">
              <TeamMemberDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </section>
      
      {/* News & Updates Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Newspaper className="h-5 w-5 text-amber-600" />
              <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">Latest</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-light text-slate-900 mb-4">
              News & Updates
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Stay informed about the latest developments, features, and partnerships at BuildUnion.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {newsItems.map((item) => (
              <Card key={item.id} className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar className="h-3 w-3" />
                      {item.date}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 leading-relaxed">
                    {item.description}
                  </CardDescription>
                  <div className="mt-4 flex items-center text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Headlines Section */}
      <section className="py-16 px-6 bg-slate-100/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-semibold text-slate-900">
              Industry Headlines
            </h2>
            <a href="#" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors">
              View all updates →
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-slate-600 border border-slate-300 px-2 py-1 rounded">
                  TORONTO
                </span>
                <span className="text-xs text-slate-400">January 23, 2025</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 leading-tight">
                Toronto Announces $500M Infrastructure Investment
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                City-wide upgrades across transit, roads and public facilities through 2025.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-400">#infrastructure</span>
                <span className="text-xs text-slate-400">#investment</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-slate-600 border border-slate-300 px-2 py-1 rounded">
                  ONTARIO
                </span>
                <span className="text-xs text-slate-400">January 23, 2025</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 leading-tight">
                Ontario Skilled Trades Shortage Reaches Critical Levels
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Province reports 80,000 vacancies amid sustained construction boom.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-400">#skilled-trades</span>
                <span className="text-xs text-slate-400">#labor</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-slate-600 border border-slate-300 px-2 py-1 rounded">
                  CANADA
                </span>
                <span className="text-xs text-slate-400">January 23, 2025</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 leading-tight">
                New Safety Regulations Take Effect in 2025
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Mandatory PPE standards and refresher training introduced across worksites.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-400">#safety</span>
                <span className="text-xs text-slate-400">#regulation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* M.E.S.S.A. Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start">
            {/* Gradient Orb Icon */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 shadow-lg flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-300 via-teal-300 to-amber-300 opacity-80" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Label */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-600 font-semibold text-xs uppercase tracking-widest">
                  Core Intelligence: M.E.S.S.A.
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-slate-900 mb-4">
                Multi-Engine Smart Synthesis Agents
              </h2>

              {/* Description */}
              <p className="text-slate-600 leading-relaxed mb-4">
                Our system leverages industry-leading AI reasoning engines, like{" "}
                <span className="text-cyan-600 font-medium">OpenAI</span> and{" "}
                <span className="text-amber-600 font-medium">Google Gemini</span>, orchestrated through
                the MESSA synthesis layer to support complex, construction-grade decision making.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                Rather than relying on a single model, MESSA operates a dual-engine reasoning and
                verification workflow, designed to reduce uncertainty, surface discrepancies, and
                prioritize grounded, source-linked outputs. MESSA is designed to support real-world
                construction workflows — not by replacing professionals, but by structuring information,
                reducing noise, and enabling clearer decisions.
              </p>

              {/* Features */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Verified Data Retrieval</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Dual-Model Consensus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Source-Linked Proof</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Process Section */}
      <section className="py-20 px-6 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-display font-light text-slate-900 mt-4 mb-4">
              The Process
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From document upload to actionable insights — three simple steps to transform your construction workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {processSteps.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {index < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-amber-300 to-amber-100" />
                )}
                
                <div className="text-center">
                  {/* Step number */}
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 mb-6 relative">
                    <step.icon className="h-10 w-10 text-amber-600" />
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
              Roadmap
            </h2>
            <p className="text-slate-500">
              What's coming next to BuildUnion.
            </p>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Horizontal line */}
            <div className="absolute left-0 right-0 top-6 h-px bg-slate-200 hidden md:block" />

            {/* Phases Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Phase 1 */}
              <div className="relative">
                <div className="hidden md:flex justify-center mb-4">
                  <div className="w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow z-10" />
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Phase 1</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      ~65%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Public MVP</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Core platform features enabling collaboration between professionals.
                  </p>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="relative">
                <div className="hidden md:flex justify-center mb-4">
                  <div className="w-4 h-4 rounded-full bg-cyan-500 border-4 border-white shadow z-10" />
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Phase 2</span>
                    <span className="text-xs font-semibold text-cyan-700 bg-cyan-100 px-2 py-1 rounded">
                      SOON
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Verified Professionals</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Professional verification with credential and certification checks.
                  </p>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="relative">
                <div className="hidden md:flex justify-center mb-4">
                  <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow z-10" />
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Phase 3</span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      PLANNED
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Union Collaborations</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Strategic partnerships with major unions for coordinated workflows.
                  </p>
                </div>
              </div>

              {/* Phase 4 */}
              <div className="relative">
                <div className="hidden md:flex justify-center mb-4">
                  <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow z-10" />
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Phase 4</span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      PLANNED
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">City-by-City Expansion</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Phased rollout across key metropolitan areas with local partnerships.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Hub Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
              Resources Hub
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Everything you need to navigate the construction industry, from certifications to union benefits.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Construction FAQ */}
            <a href="#" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-6 flex items-start gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                  Construction FAQ
                </h3>
                <p className="text-slate-500 text-sm">
                  Common questions about permits, safety, and contracts.
                </p>
              </div>
            </a>

            {/* Union Benefits */}
            <a href="#" className="bg-orange-50 hover:bg-orange-100 rounded-xl p-6 flex items-start gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                  Union Benefits
                </h3>
                <p className="text-slate-500 text-sm">
                  Guide to wages, health coverage, and job security.
                </p>
              </div>
            </a>

            {/* Ontario Certifications */}
            <a href="#" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-6 flex items-start gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                  Ontario Certifications
                </h3>
                <p className="text-slate-500 text-sm">
                  Mandatory and recommended certifications guide.
                </p>
              </div>
            </a>

            {/* Quick Start Guide */}
            <a href="#" className="bg-orange-50 hover:bg-orange-100 rounded-xl p-6 flex items-start gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                  Quick Start Guide
                </h3>
                <p className="text-slate-500 text-sm">
                  Get your profile and portfolio ready in minutes.
                </p>
              </div>
            </a>

            {/* Join the Community */}
            <a href="#" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-6 flex items-start gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                  Join the Community
                </h3>
                <p className="text-slate-500 text-sm">
                  Connect with other professionals in our Facebook Group.
                </p>
              </div>
            </a>

            {/* Ask Messa */}
            <a href="#" className="bg-orange-50 hover:bg-orange-100 rounded-xl p-6 flex items-start gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                  Ask Messa
                </h3>
                <p className="text-slate-500 text-sm">
                  Need specific help? Chat with our AI assistant.
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Industry Standards & OBC Section */}
      <section className="py-20 px-6 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600 font-semibold text-sm uppercase tracking-wider">
                  Industry Standards
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-6">
                Ontario Building Code
                <span className="block text-amber-600">2024 Updates</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Stay compliant with the latest OBC amendments. Our platform automatically cross-references 
                your documents against current building codes, ensuring your projects meet all regulatory requirements.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Fire Safety Updates</h4>
                    <p className="text-slate-500 text-sm">New requirements for high-rise residential buildings effective March 2024</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Accessibility Standards</h4>
                    <p className="text-slate-500 text-sm">Enhanced AODA compliance for commercial structures</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Energy Efficiency</h4>
                    <p className="text-slate-500 text-sm">Updated insulation and HVAC requirements for net-zero targets</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="text-3xl font-bold text-amber-600 mb-1">2,847</div>
                <div className="text-slate-500 text-sm">Code sections analyzed</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="text-3xl font-bold text-cyan-600 mb-1">99.2%</div>
                <div className="text-slate-500 text-sm">Compliance accuracy</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="text-3xl font-bold text-green-600 mb-1">24h</div>
                <div className="text-slate-500 text-sm">Update cycle</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="text-3xl font-bold text-purple-600 mb-1">156</div>
                <div className="text-slate-500 text-sm">Amendments tracked</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Union & Community Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="h-5 w-5 text-amber-600" />
              <span className="text-amber-600 font-semibold text-sm uppercase tracking-wider">
                Stronger Together
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
              Union & Community
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Join 4.6 million skilled professionals building a stronger future. Union membership means 
              better wages, comprehensive benefits, and a voice in the industry.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {/* Higher Wages */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">+27%</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Higher Wages</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Union workers earn on average 27% more than non-union counterparts in the same trade.
              </p>
            </div>

            {/* Health Coverage */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Heart className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">94%</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Health Coverage</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Union members with employer-sponsored health insurance coverage for families.
              </p>
            </div>

            {/* Job Security */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-full text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">3.2x</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Job Security</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Union workers are 3.2x more likely to have pension plans and retirement benefits.
              </p>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="bg-slate-800 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-semibold text-white mb-1">
                Ready to Join the Movement?
              </h3>
              <p className="text-slate-400 text-sm">
                Connect with local unions and access exclusive training programs.
              </p>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 whitespace-nowrap">
              Find Your Local Union
            </Button>
          </div>
        </div>
      </section>

      {/* Latest News Feed Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">
                  Stay Informed
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900">
                Latest News Feed
              </h2>
            </div>
            <a href="#" className="text-amber-600 hover:text-amber-700 font-medium hidden sm:flex items-center gap-1">
              View all news <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* News Card 1 */}
            <Card className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Investment</span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="h-3 w-3" />
                    Jan 18, 2026
                  </div>
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-amber-700 transition-colors leading-tight">
                  Ontario Announces $3.2B Transit Expansion for GTA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-sm leading-relaxed">
                  Provincial government commits to building 15 new transit stations across Toronto, Mississauga, and Brampton by 2030. Project expected to create 45,000 construction jobs.
                </CardDescription>
                <div className="mt-3 flex items-center text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>

            {/* News Card 2 */}
            <Card className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Wages</span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="h-3 w-3" />
                    Jan 15, 2026
                  </div>
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-amber-700 transition-colors leading-tight">
                  Electricians See 12% Wage Increase in New Collective Agreement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-sm leading-relaxed">
                  IBEW Local 353 secures historic contract with 12% wage increase over 3 years, plus enhanced pension contributions and improved safety standards on job sites.
                </CardDescription>
                <div className="mt-3 flex items-center text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>

            {/* News Card 3 */}
            <Card className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">Training</span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="h-3 w-3" />
                    Jan 12, 2026
                  </div>
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-amber-700 transition-colors leading-tight">
                  Skilled Trades Colleges Report Record Enrollment Numbers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-sm leading-relaxed">
                  George Brown and Mohawk Colleges report 34% increase in trades program applications. Plumbing, HVAC, and electrical programs see highest demand.
                </CardDescription>
                <div className="mt-3 flex items-center text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>

            {/* News Card 4 */}
            <Card className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">Safety</span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="h-3 w-3" />
                    Jan 10, 2026
                  </div>
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-amber-700 transition-colors leading-tight">
                  Ministry of Labour Introduces Enhanced Worksite Safety Protocols
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-sm leading-relaxed">
                  New regulations require mandatory heat stress breaks during summer months and updated fall protection equipment for all high-rise construction projects.
                </CardDescription>
                <div className="mt-3 flex items-center text-amber-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8 sm:hidden">
            <a href="#" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1">
              View all news <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionWorkspace;