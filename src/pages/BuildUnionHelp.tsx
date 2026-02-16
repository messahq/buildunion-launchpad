import { Link } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Rocket,
  Users,
  FileText,
  Calculator,
  Shield,
  MessageSquare,
  ArrowRight,
  BookOpen,
  Wrench,
  BarChart3,
  ClipboardList,
} from "lucide-react";

const faqs = [
  {
    q: "What is BuildUnion?",
    a: "BuildUnion is a construction-grade project management platform that combines AI-powered cost estimation, real-time team collaboration, material tracking, and Ontario Building Code compliance into one unified workspace.",
  },
  {
    q: "Is BuildUnion free to use?",
    a: "Yes! The Free tier gives you Solo mode with 1 active project, basic cost estimation, and site logging. Upgrade to Pro ($19.99/mo) for up to 10 projects, team collaboration, and AI assistant. Premium unlocks direct messaging, priority AI, and advanced analytics.",
  },
  {
    q: "How does the AI cost estimation work?",
    a: "Our M.E.S.S.A. AI engine analyzes your project details — trade type, area, location — and generates detailed material and labor cost breakdowns using real market data. You can also upload blueprints for automatic area detection.",
  },
  {
    q: "Can I invite my team?",
    a: "Absolutely. Pro and Premium plans support team collaboration. You can invite foremen, workers, subcontractors, and inspectors via email. Each role has specific permissions for viewing and editing project data.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. BuildUnion uses enterprise-grade security with row-level security policies, encrypted connections, and role-based access control. Your project data is only visible to you and your authorized team members.",
  },
  {
    q: "What is the Ontario Building Code (OBC) integration?",
    a: "BuildUnion includes a searchable database of Ontario Building Code sections. Our AI assistant, M.E.S.S.A., can reference relevant code sections when answering questions about your specific trade and project type.",
  },
  {
    q: "Can I generate invoices and contracts?",
    a: "Yes. You can generate professional PDF invoices from your cost estimates and create legally formatted contracts with digital signature support. Contracts can be shared with clients via secure links.",
  },
  {
    q: "How do I track materials on site?",
    a: "Use the Material Delivery Log to track expected vs. delivered quantities for each material. Team members can log deliveries with photos and notes, and project owners get a real-time overview of all deliveries.",
  },
];

const gettingStarted = [
  {
    icon: Rocket,
    title: "Create Your Account",
    desc: "Sign up with your email. Verify your address to unlock all features.",
  },
  {
    icon: Wrench,
    title: "Complete Your Profile",
    desc: "Add your trade, experience level, certifications, and company info.",
  },
  {
    icon: FileText,
    title: "Start a New Project",
    desc: "Use the Project Wizard to define your project — the AI handles the rest.",
  },
  {
    icon: Calculator,
    title: "Review Your Estimate",
    desc: "Check AI-generated material and labor costs. Edit line items as needed.",
  },
  {
    icon: Users,
    title: "Invite Your Team",
    desc: "Add team members with specific roles. Everyone gets the right level of access.",
  },
  {
    icon: ClipboardList,
    title: "Track & Manage",
    desc: "Assign tasks, log site reports, track deliveries, and generate invoices.",
  },
];

const useCases = [
  {
    icon: Wrench,
    title: "Renovation Contractors",
    desc: "Estimate kitchen, bathroom, or full-home renovation costs in minutes. Share professional quotes with clients.",
  },
  {
    icon: BarChart3,
    title: "General Contractors",
    desc: "Manage multi-trade projects with team roles, material tracking, and baseline budget control.",
  },
  {
    icon: BookOpen,
    title: "New Construction",
    desc: "Upload blueprints for automatic area calculation. Get OBC-compliant material lists and cost breakdowns.",
  },
  {
    icon: Shield,
    title: "Inspectors & Foremen",
    desc: "Use site check-ins, daily logs, and task management to keep projects on track and documented.",
  },
];

const BuildUnionHelp = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <BuildUnionHeader />

      {/* Hero */}
      <section className="bg-secondary border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-light tracking-tight mb-4">
            <span className="text-foreground">Build</span>
            <span className="text-amber-500">Union</span>
          </h2>
          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">
            Help Center
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to get started and make the most of BuildUnion.
          </p>
        </div>
      </section>

      {/* Getting Started */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-display font-semibold mb-2">Getting Started</h2>
        <p className="text-muted-foreground mb-8">Follow these steps to set up your first project.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gettingStarted.map((step, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-secondary border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-display font-semibold mb-2">Use Cases</h2>
          <p className="text-muted-foreground mb-8">How construction professionals use BuildUnion every day.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {useCases.map((uc, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6">
                <uc.icon className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-semibold text-foreground text-lg mb-2">{uc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-display font-semibold mb-2">Frequently Asked Questions</h2>
        <p className="text-muted-foreground mb-8">Quick answers to common questions.</p>
        <Accordion type="multiple" className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-lg px-5">
              <AccordionTrigger className="text-foreground text-left font-medium hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Contact CTA */}
      <section className="bg-secondary border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <MessageSquare className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
          <p className="text-muted-foreground mb-6">Our team is here to assist you.</p>
          <Link
            to="/buildunion/contact"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Contact Us <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionHelp;
