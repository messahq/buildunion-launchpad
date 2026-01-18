import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Brain, CheckCircle, Calendar, ArrowRight, Newspaper, HelpCircle, Shield, FileText, Link2, Users, MessageSquare, Building2, Scale, TrendingUp, Award, Heart, DollarSign, Briefcase, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
              Roadmap
            </h2>
            <p className="text-slate-500">
              What's coming next to BuildUnion.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2 hidden md:block" />

            {/* Phase 1 - Left */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
              <div className="md:w-1/2 md:pr-12 md:text-right">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3 md:flex-row-reverse">
                    <span className="text-sm text-slate-500">Phase 1</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                      IN PROGRESS (~65%)
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Public MVP</h3>
                  <p className="text-slate-500 text-sm">
                    Core platform features are live, enabling collaboration between professionals and businesses across projects.
                  </p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow z-10 hidden md:block" />
              <div className="md:w-1/2" />
            </div>

            {/* Phase 2 - Right */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
              <div className="md:w-1/2" />
              <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow z-10 hidden md:block" />
              <div className="md:w-1/2 md:pl-12">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Phase 2</span>
                    <span className="text-xs font-semibold text-cyan-700 bg-cyan-100 px-2 py-1 rounded">
                      COMING SOON
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Verified Professionals</h3>
                  <p className="text-slate-500 text-sm">
                    Introduction of professional verification, including credential checks and trade certifications to strengthen trust and accountability.
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 3 - Left */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
              <div className="md:w-1/2 md:pr-12 md:text-right">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3 md:flex-row-reverse">
                    <span className="text-sm text-slate-500">Phase 3</span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      PLANNED
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Union Collaborations</h3>
                  <p className="text-slate-500 text-sm">
                    Strategic partnerships with major unions, enabling coordinated workflows and access to exclusive collaboration benefits.
                  </p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow z-10 hidden md:block" />
              <div className="md:w-1/2" />
            </div>

            {/* Phase 4 - Right */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="md:w-1/2" />
              <div className="w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow z-10 hidden md:block" />
              <div className="md:w-1/2 md:pl-12">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Phase 4</span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      PLANNED
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">City-by-City Expansion</h3>
                  <p className="text-slate-500 text-sm">
                    Phased rollout across key metropolitan areas, supported by local partnerships and region-specific operational alignment.
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
      <section className="py-20 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
                  Industry Standards
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Ontario Building Code
                <span className="block text-amber-400">2024 Updates</span>
              </h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                Stay compliant with the latest OBC amendments. Our platform automatically cross-references 
                your documents against current building codes, ensuring your projects meet all regulatory requirements.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Fire Safety Updates</h4>
                    <p className="text-slate-400 text-sm">New requirements for high-rise residential buildings effective March 2024</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Accessibility Standards</h4>
                    <p className="text-slate-400 text-sm">Enhanced AODA compliance for commercial structures</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Energy Efficiency</h4>
                    <p className="text-slate-400 text-sm">Updated insulation and HVAC requirements for net-zero targets</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-bold text-amber-400 mb-2">2,847</div>
                <div className="text-slate-300 text-sm">Code sections analyzed</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-bold text-cyan-400 mb-2">99.2%</div>
                <div className="text-slate-300 text-sm">Compliance accuracy</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-bold text-green-400 mb-2">24h</div>
                <div className="text-slate-300 text-sm">Update cycle</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-bold text-purple-400 mb-2">156</div>
                <div className="text-slate-300 text-sm">Amendments tracked</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Union & Community Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
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

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Higher Wages */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-orange-100 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-2">+27%</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Higher Wages</h3>
              <p className="text-slate-500 text-sm">
                Union workers earn on average 27% more than non-union counterparts in the same trade.
              </p>
            </div>

            {/* Health Coverage */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-orange-100 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-2">94%</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Health Coverage</h3>
              <p className="text-slate-500 text-sm">
                Union members with employer-sponsored health insurance coverage for families.
              </p>
            </div>

            {/* Job Security */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-orange-100 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-2">3.2x</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Job Security</h3>
              <p className="text-slate-500 text-sm">
                Union workers are 3.2x more likely to have pension plans and retirement benefits.
              </p>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Join the Movement?
            </h3>
            <p className="text-orange-100 mb-6 max-w-xl mx-auto">
              Connect with local unions, access exclusive training programs, and build your career with the support of a strong community.
            </p>
            <Button className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-6 text-lg">
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
                <BookOpen className="h-5 w-5 text-slate-600" />
                <span className="text-slate-600 font-medium text-sm uppercase tracking-wider">
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
            <div className="bg-slate-50 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-32 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-white/80" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Investment</span>
                  <span className="text-xs text-slate-400">Jan 18, 2026</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">
                  $2.4B Federal Infrastructure Package Approved
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2">
                  Major funding for transit, bridges, and public facilities across Ontario.
                </p>
              </div>
            </div>

            {/* News Card 2 */}
            <div className="bg-slate-50 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-32 bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <TrendingUp className="h-12 w-12 text-white/80" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">Wages</span>
                  <span className="text-xs text-slate-400">Jan 15, 2026</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">
                  Construction Wages Rise 8.3% Year-Over-Year
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2">
                  Skilled trades see highest wage growth in decade amid labor shortage.
                </p>
              </div>
            </div>

            {/* News Card 3 */}
            <div className="bg-slate-50 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-32 bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <Award className="h-12 w-12 text-white/80" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Training</span>
                  <span className="text-xs text-slate-400">Jan 12, 2026</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">
                  New Apprenticeship Programs Launch Province-Wide
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2">
                  Government invests $180M in skilled trades training initiatives.
                </p>
              </div>
            </div>

            {/* News Card 4 */}
            <div className="bg-slate-50 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-32 bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Clock className="h-12 w-12 text-white/80" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Safety</span>
                  <span className="text-xs text-slate-400">Jan 10, 2026</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">
                  New Worksite Safety Standards Take Effect
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2">
                  Enhanced PPE requirements and mandatory rest periods now enforced.
                </p>
              </div>
            </div>
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