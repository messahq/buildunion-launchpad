import { useTranslation } from "react-i18next";
import { Users, Target, Heart, Shield, Award, Smartphone, ArrowLeft, Brain, Database, Cpu, Eye, FileCheck, Zap, Lock, Layers, Sparkles, Bot, GitMerge, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import aboutLogo from "@/assets/buildunion-logo-about.png";
import { useAuth } from "@/hooks/useAuth";

const BuildUnionAbout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const values = [
    {
      icon: Users,
      titleKey: "about.values.community.title",
      descKey: "about.values.community.description",
    },
    {
      icon: Target,
      titleKey: "about.values.precision.title",
      descKey: "about.values.precision.description",
    },
    {
      icon: Heart,
      titleKey: "about.values.passion.title",
      descKey: "about.values.passion.description",
    },
    {
      icon: Shield,
      titleKey: "about.values.trust.title",
      descKey: "about.values.trust.description",
    },
    {
      icon: Award,
      titleKey: "about.values.excellence.title",
      descKey: "about.values.excellence.description",
    },
    {
      icon: Smartphone,
      titleKey: "about.values.global.title",
      descKey: "about.values.global.description",
    },
  ];

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
        {/* Hero Section */}
        <section className="relative py-10 md:py-14 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
              <img 
                src={aboutLogo} 
                alt="BuildUnion Logo" 
                className="w-32 md:w-40 h-auto mb-5 drop-shadow-lg"
              />
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-foreground">{t("about.hero.titlePart1")}</span>{" "}
                <span className="text-amber-500">{t("about.hero.titlePart2")}</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t("about.hero.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("about.mission.title")}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("about.mission.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("about.values.title")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <Card
                  key={index}
                  className="border-border/50 hover:border-amber-400/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <value.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{t(value.titleKey)}</h3>
                        <p className="text-muted-foreground text-sm">{t(value.descKey)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                {t("about.story.title")}
              </h2>

              <div className="space-y-8 text-muted-foreground leading-relaxed">
                <p>{t("about.story.paragraph1")}</p>
                <p>{t("about.story.paragraph2")}</p>
                <p>{t("about.story.paragraph3")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-16 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-sm font-semibold tracking-widest uppercase text-amber-500 mb-3">What Powers Us</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Technology That Sets Us Apart
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  BuildUnion isn't just another construction app — it's an AI-native platform built on proprietary engines that no competitor can match.
                </p>
              </div>

              {/* 5-Engine AI Powerhouse */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {/* Gemini */}
                <Card className="border-border/50 bg-gradient-to-br from-background to-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/30">
                        <Eye className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <h3 className="font-bold text-lg">Gemini Vision</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Visual AI core using Google Gemini 2.5. Analyzes site photos, blueprints, and floor plans — extracts square footage, identifies materials, and generates cost estimates from images alone.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Photo Analysis", "Blueprint Reading", "Material Detection"].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* GPT */}
                <Card className="border-border/50 bg-gradient-to-br from-background to-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                        <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <h3 className="font-bold text-lg">GPT-5 Reasoning</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Serves as the data validation backbone. Cross-references project numbers, validates cost breakdowns, and provides detailed audit reports with actionable recommendations.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Data Validation", "Audit Reports", "Cost Analysis"].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Claude - NEW */}
                <Card className="border-orange-400/30 bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-900/10 dark:to-background relative overflow-hidden">
                  <Badge className="absolute top-3 right-3 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 text-[9px]">NEW</Badge>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                        <FileCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="font-bold text-lg">Claude OBC</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Regulatory compliance specialist. Checks every project against the Ontario Building Code 2024 and provides paragraph-level (§) citations for every flagged item.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["OBC Compliance", "§ Citations", "Permit Flags"].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Lovable */}
                <Card className="border-border/50 bg-gradient-to-br from-background to-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-900/30">
                        <Sparkles className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <h3 className="font-bold text-lg">Lovable DNA</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Project health orchestrator. Runs the 9-Pillar DNA Deep Audit, synthesizes cross-engine findings, and generates the final project health score.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["DNA Audit", "Health Score", "Risk Matrix"].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 font-medium">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Grok - Market & Schedule */}
                <Card className="border-blue-400/30 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-900/10 dark:to-background relative overflow-hidden">
                  <Badge className="absolute top-3 right-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[9px]">EXPANDED</Badge>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-bold text-lg">Grok Market & Schedule</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Real-time market pricing intelligence, weather-aware schedule optimization, affiliate supplier deals, and cost-saving strategies — all powered by external data feeds.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Market Pricing", "Schedule Optimizer", "Affiliate Deals", "Trend Intel"].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* M.E.S.S.A. Hub */}
                <Card className="border-amber-400/30 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-900/10 dark:to-background">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                        <Cpu className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="font-bold text-lg">M.E.S.S.A.</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      <strong className="text-foreground">Multi-Engine Synthesis</strong> — All 5 engines cross-validate each other. When they disagree, the system flags a conflict and shows both perspectives. This eliminates single-model hallucination.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["5-Engine Sync", "Conflict Detection", "Zero Hallucination"].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[
                  { value: "5", label: "AI Engines", sub: "Gemini · GPT · Claude · Lovable · Grok" },
                  { value: "16", label: "Citation Sources", sub: "Verified data points" },
                  { value: "2x", label: "Database Redundancy", sub: "Geo-separated mirrors" },
                  { value: "6", label: "Project Roles", sub: "Granular RBAC" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card border border-border rounded-xl p-5 text-center hover:border-amber-300 transition-colors">
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{stat.value}</div>
                    <div className="font-semibold text-foreground text-sm mb-1">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Feature Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Database,
                    title: "Hybrid Data Architecture",
                    desc: "Your project data lives in two independent, geographically separated databases that mirror each other in real-time. If one goes down, the other keeps running — zero data loss, zero downtime. Every record maintains full UUID consistency across both systems.",
                    color: "purple"
                  },
                  {
                    icon: Layers,
                    title: "RAG Compliance Engine",
                    desc: "A true Retrieval-Augmented Generation pipeline powered by pgvector embeddings of the OBC 2024 Part 9 (Residential). Trade-specific semantic search delivers paragraph-level citations — not generic AI summaries.",
                    color: "indigo"
                  },
                  {
                    icon: FileCheck,
                    title: "16-Source Citation System",
                    desc: "Every number in your estimate traces back to one of 16 verified data sources — from RSMeans to CNESST standards. Nothing is invented; everything is auditable.",
                    color: "teal"
                  },
                  {
                    icon: Lock,
                    title: "Baseline Lock Protocol",
                    desc: "Once an estimate is approved, it's cryptographically versioned. Any modification triggers a formal change-order flow with full audit trail, protecting both contractors and clients.",
                    color: "red"
                  },
                  {
                    icon: Zap,
                    title: "Tiered AI Cost Optimization",
                    desc: "Smart model routing sends simple tasks to lightweight models (Gemini Flash Lite) and reserves heavyweight reasoning (GPT-5) for compliance checks — cutting AI costs by up to 70% without sacrificing quality.",
                    color: "yellow"
                  },
                  {
                    icon: Shield,
                    title: "RBAC + Row-Level Security",
                    desc: "Role-Based Access Control meets Postgres RLS policies. Owners, foremen, workers, and inspectors each see only what they're authorized to — enforced at the database level, not just the UI.",
                    color: "cyan"
                  },
                ].map((item) => {
                  const colorMap: Record<string, string> = {
                    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                    teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
                    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                    yellow: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                    cyan: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
                  };
                  return (
                    <Card key={item.title} className="border-border/50 hover:border-amber-400/30 transition-colors">
                      <CardContent className="p-6">
                        <div className={`p-3 rounded-xl w-fit mb-4 ${colorMap[item.color]?.split(" ").slice(0, 2).join(" ")}`}>
                          <item.icon className={`h-5 w-5 ${colorMap[item.color]?.split(" ").slice(2).join(" ")}`} />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("about.cta.title")}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("about.cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => navigate(user ? "/buildunion/workspace" : "/buildunion/register")}
              >
                {user ? t("login.goToWorkspace", "Go to Workspace") : t("about.cta.joinButton")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/buildunion/community")}
              >
                {t("about.cta.communityButton")}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionAbout;
