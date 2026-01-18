import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Brain, CheckCircle, Calendar, ArrowRight, Newspaper } from "lucide-react";
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

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-light text-slate-900 mb-6">
            Ready to Transform Your Projects?
          </h2>
          <p className="text-slate-600 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of construction professionals who trust BuildUnion to manage their documents and workflows.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/buildunion/workspace/new")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-lg px-10 py-7 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
          >
            Start New Project
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionWorkspace;