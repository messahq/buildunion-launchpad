import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
// AskMessaChat removed - will be rebuilt in Project 3.0
import FAQDialog from "@/components/community/FAQDialog";
import UnionBenefitsDialog from "@/components/community/UnionBenefitsDialog";
import CertificationsDialog from "@/components/community/CertificationsDialog";
import QuickStartDialog from "@/components/community/QuickStartDialog";
import UnionFinderDialog from "@/components/community/UnionFinderDialog";
import { FileUp, Brain, CheckCircle, Calendar, ArrowRight, Newspaper, HelpCircle, Shield, FileText, Link2, Building2, Scale, TrendingUp, Heart, DollarSign, Briefcase, BookOpen, AlertTriangle, Users, MessageSquare, Hammer, ExternalLink, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const newsItems = [
  {
    id: 1,
    title: "Ontario Investing $224B in Infrastructure",
    description: "The province announced a massive 10-year infrastructure plan including transit expansion, hospital construction, and highway improvements across Ontario.",
    date: "Jan 20, 2026",
    category: "Investment",
    sourceUrl: "https://www.ontario.ca/page/building-ontario",
    source: "Ontario.ca"
  },
  {
    id: 2,
    title: "IBEW Local 353 Reaches New Agreement",
    description: "The International Brotherhood of Electrical Workers Local 353 ratified a new 3-year collective agreement with improved wages and benefits.",
    date: "Jan 18, 2026",
    category: "Union",
    sourceUrl: "https://www.ibew353.org",
    source: "IBEW 353"
  },
  {
    id: 3,
    title: "BuildOntario Launches Skills Training Initiative",
    description: "New provincial program aims to train 100,000 skilled trades workers over the next 5 years to address construction labour shortage.",
    date: "Jan 12, 2026",
    category: "Training",
    sourceUrl: "https://www.buildontario.com",
    source: "BuildOntario"
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

const BuildUnionCommunity = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isMessaChatOpen, setIsMessaChatOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isUnionBenefitsOpen, setIsUnionBenefitsOpen] = useState(false);
  const [isCertificationsOpen, setIsCertificationsOpen] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isUnionFinderOpen, setIsUnionFinderOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToHome", "Back to Home")}
          </Button>
        </div>

        {/* News & Updates Section - At the top */}
        <section className="py-12 px-6 bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-900/10 dark:to-background">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Newspaper className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">Latest</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                News & Updates
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Stay informed about the latest developments, features, and partnerships at BuildUnion.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              {newsItems.map((item) => (
                <motion.a
                  key={item.id}
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                >
                  <Card className="bg-card border-border hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Calendar className="h-3 w-3" />
                          {item.date}
                        </div>
                      </div>
                      <CardTitle className="text-lg font-semibold text-foreground group-hover:text-amber-600 transition-colors">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </CardDescription>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs">Source: {item.source}</span>
                        <div className="flex items-center text-amber-600 font-medium group-hover:translate-x-1 transition-transform">
                          Read more <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.a>
              ))}
            </motion.div>
          </div>
        </section>


        {/* Industry Headlines Section */}
        <section className="py-16 px-6 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground">
                Industry Headlines
              </h2>
              <a 
                href="https://www.constructconnect.com/blog" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors flex items-center gap-1"
              >
                View all updates <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <a 
                href="https://www.toronto.ca/city-government/budget-finances/city-budget/capital-budget/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-cyan-300 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold text-muted-foreground border border-border px-2 py-1 rounded">TORONTO</span>
                  <span className="text-xs text-muted-foreground">January 2026</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 leading-tight group-hover:text-cyan-600 transition-colors">
                  Toronto Announces $500M Infrastructure Investment
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  City-wide upgrades across transit, roads and public facilities through 2026.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">#infrastructure</span>
                    <span className="text-xs text-muted-foreground">#investment</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-cyan-600 transition-colors" />
                </div>
              </a>

              <a 
                href="https://www.skilledtradesontario.ca/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-cyan-300 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold text-muted-foreground border border-border px-2 py-1 rounded">ONTARIO</span>
                  <span className="text-xs text-muted-foreground">January 2026</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 leading-tight group-hover:text-cyan-600 transition-colors">
                  Ontario Skilled Trades Shortage Reaches Critical Levels
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Province reports 80,000 vacancies amid sustained construction boom.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">#skilled-trades</span>
                    <span className="text-xs text-muted-foreground">#labor</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-cyan-600 transition-colors" />
                </div>
              </a>

              <a 
                href="https://www.ontario.ca/page/construction-health-and-safety" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-cyan-300 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold text-muted-foreground border border-border px-2 py-1 rounded">CANADA</span>
                  <span className="text-xs text-muted-foreground">January 2026</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 leading-tight group-hover:text-cyan-600 transition-colors">
                  New Safety Regulations Take Effect in 2026
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Mandatory PPE standards and refresher training introduced across worksites.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">#safety</span>
                    <span className="text-xs text-muted-foreground">#regulation</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-cyan-600 transition-colors" />
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Union & Community Section */}
        <section className="py-20 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600 font-semibold text-sm uppercase tracking-wider">Stronger Together</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Union & Community
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join 4.6 million skilled professionals building a stronger future.
              </p>
            </div>

            <motion.div
              className="grid md:grid-cols-3 gap-5 mb-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.div
                className="bg-card rounded-xl p-5 shadow-sm border border-border h-full text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 cursor-pointer"
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              >
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">+27%</div>
                <h3 className="text-base font-bold text-foreground mb-2">Higher Wages</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Union workers earn 27% more on average.</p>
              </motion.div>

              <motion.div
                className="bg-card rounded-xl p-5 shadow-sm border border-border h-full text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 cursor-pointer"
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              >
                <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">94%</div>
                <h3 className="text-base font-bold text-foreground mb-2">Health Coverage</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Employer-sponsored health insurance coverage.</p>
              </motion.div>

              <motion.div
                className="bg-card rounded-xl p-5 shadow-sm border border-border h-full text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 cursor-pointer"
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">3.2x</div>
                <h3 className="text-base font-bold text-foreground mb-2">Job Security</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">More likely to have pension plans.</p>
              </motion.div>
            </motion.div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 border border-amber-200 dark:border-amber-700">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold text-foreground mb-1">Ready to Join the Movement?</h3>
                <p className="text-muted-foreground text-sm">Connect with local unions and access exclusive training programs.</p>
              </div>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 whitespace-nowrap"
                onClick={() => setIsUnionFinderOpen(true)}
              >
                Find Your Local Union
              </Button>
            </div>
          </div>
        </section>


        {/* The Process Section */}
        <section className="py-20 px-6 bg-card border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">How It Works</span>
              <h2 className="text-3xl md:text-4xl font-display font-light text-foreground mt-4 mb-4">
                The Process
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From document upload to actionable insights — three simple steps to transform your construction workflows.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {processSteps.map((step, index) => (
                <div key={step.step} className="relative">
                  {index < processSteps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-amber-300 to-amber-100" />
                  )}
                  
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700 mb-6 relative">
                      <step.icon className="h-10 w-10 text-amber-600" />
                      <span className="absolute -top-2 -right-2 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-bold">
                        {step.step}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Roadmap
              </h2>
              <p className="text-muted-foreground">
                What's coming next to BuildUnion.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-0 right-0 top-6 h-px bg-border hidden md:block" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="relative">
                  <div className="hidden md:flex justify-center mb-4">
                    <div className="w-4 h-4 rounded-full bg-amber-500 border-4 border-background shadow z-10" />
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-sm border border-border h-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Phase 1</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">~65%</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">Public MVP</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Core platform features enabling collaboration.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="hidden md:flex justify-center mb-4">
                    <div className="w-4 h-4 rounded-full bg-amber-400 border-4 border-background shadow z-10" />
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-sm border border-border h-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Phase 2</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">~30%</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">Verified Professionals</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Professional verification with credentials.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="hidden md:flex justify-center mb-4">
                    <div className="w-4 h-4 rounded-full bg-muted-foreground/30 border-4 border-background shadow z-10" />
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-sm border border-border h-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Phase 3</span>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">PLANNED</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">Union Collaborations</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Strategic partnerships with major unions.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="hidden md:flex justify-center mb-4">
                    <div className="w-4 h-4 rounded-full bg-muted-foreground/30 border-4 border-background shadow z-10" />
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-sm border border-border h-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Phase 4</span>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">PLANNED</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">City-by-City Expansion</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">Phased rollout across metropolitan areas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resources Hub Section */}
        <section className="py-16 px-6 bg-card">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Resources Hub
              </h2>
              <p className="text-muted-foreground">
                Everything you need to navigate the construction industry.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <button 
                onClick={() => setIsFAQOpen(true)}
                className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 group text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition-colors mb-1">Construction FAQ</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Common questions about permits, safety, and contracts.</p>
                </div>
              </button>

              <button 
                onClick={() => setIsUnionBenefitsOpen(true)}
                className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 group text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition-colors mb-1">Union Benefits</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Guide to wages, health coverage, and job security.</p>
                </div>
              </button>

              <button 
                onClick={() => setIsCertificationsOpen(true)}
                className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 group text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition-colors mb-1">Ontario Certifications</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Mandatory and recommended certifications guide.</p>
                </div>
              </button>

              <button 
                onClick={() => setIsQuickStartOpen(true)}
                className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 group text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Link2 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition-colors mb-1">Quick Start Guide</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Get your profile and portfolio ready in minutes.</p>
                </div>
              </button>

              <button 
                onClick={() => navigate("/buildunion/members")}
                className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 group text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition-colors mb-1">Join the Community</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Connect with other professionals.</p>
                </div>
              </button>

              <button 
                onClick={() => setIsMessaChatOpen(true)}
                className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-amber-200 group text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition-colors mb-1">Ask Messa</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Need specific help? Chat with our AI assistant.</p>
                </div>
              </button>
            </div>
          </div>
        </section>


        {/* Latest News Feed Section */}
        <section className="py-20 px-6 bg-card">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">Stay Informed</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Latest News Feed</h2>
              </div>
              <a href="#" className="text-amber-600 hover:text-amber-700 font-medium hidden sm:flex items-center gap-1">
                View all news <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card border-border hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Investment</span>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="h-3 w-3" />
                      Jan 18, 2026
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground group-hover:text-amber-600 transition-colors leading-tight">
                    Ontario Announces $3.2B Transit Expansion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                    15 new transit stations across GTA by 2030. Expected to create 45,000 jobs.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Wages</span>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="h-3 w-3" />
                      Jan 15, 2026
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground group-hover:text-amber-600 transition-colors leading-tight">
                    Electricians See 12% Wage Increase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                    IBEW Local 353 secures historic contract with enhanced benefits.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded">Training</span>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="h-3 w-3" />
                      Jan 12, 2026
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground group-hover:text-amber-600 transition-colors leading-tight">
                    Record Enrollment in Trades Colleges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                    34% increase in trades program applications across Ontario.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">Safety</span>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="h-3 w-3" />
                      Jan 10, 2026
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground group-hover:text-amber-600 transition-colors leading-tight">
                    Enhanced Worksite Safety Protocols
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                    New regulations for heat stress breaks and fall protection.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <BuildUnionFooter />
      
      {/* Dialogs */}
      {/* AskMessaChat removed for Project 3.0 */}
      <FAQDialog isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
      <UnionBenefitsDialog isOpen={isUnionBenefitsOpen} onClose={() => setIsUnionBenefitsOpen(false)} />
      <CertificationsDialog isOpen={isCertificationsOpen} onClose={() => setIsCertificationsOpen(false)} />
      <QuickStartDialog isOpen={isQuickStartOpen} onClose={() => setIsQuickStartOpen(false)} />
      <UnionFinderDialog isOpen={isUnionFinderOpen} onClose={() => setIsUnionFinderOpen(false)} />
    </div>
  );
};

export default BuildUnionCommunity;
