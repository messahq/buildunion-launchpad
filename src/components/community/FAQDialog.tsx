import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, FileText, Shield, Scale, Briefcase } from "lucide-react";

interface FAQDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const faqCategories = [
  {
    title: "Permits & Regulations",
    icon: FileText,
    items: [
      {
        question: "What permits do I need for residential construction in Ontario?",
        answer: "Most residential construction requires a building permit from your local municipality. This includes new builds, additions, structural changes, plumbing, electrical, and HVAC work. Minor repairs and cosmetic changes typically don't require permits. Always check with your local building department."
      },
      {
        question: "How long does it take to get a building permit?",
        answer: "Simple residential permits can take 10-15 business days. Complex projects may take 4-8 weeks. Factors affecting timeline include project complexity, completeness of application, and municipal workload. Consider using BuildUnion's document preparation tools to ensure complete submissions."
      },
      {
        question: "What is the Ontario Building Code (OBC)?",
        answer: "The OBC is the provincial regulation that sets minimum standards for building construction, renovation, and demolition. It covers structural requirements, fire safety, accessibility, energy efficiency, and more. The 2024 updates include enhanced fire safety and energy efficiency requirements."
      }
    ]
  },
  {
    title: "Safety & Compliance",
    icon: Shield,
    items: [
      {
        question: "What safety certifications are mandatory in Ontario?",
        answer: "Required certifications include Working at Heights (for work 3m+), WHMIS 2015 for hazardous materials handling, and trade-specific certifications. Many employers also require First Aid/CPR, Confined Space Entry, and Propane Handling depending on the work."
      },
      {
        question: "What are OHSA requirements for construction sites?",
        answer: "The Occupational Health and Safety Act requires employers to provide safe equipment, proper training, and adequate supervision. Workers must use required PPE, report hazards, and follow safety procedures. Joint Health and Safety Committees are required for sites with 20+ workers."
      },
      {
        question: "How do I report a safety violation?",
        answer: "Report violations to the Ministry of Labour at 1-877-202-0008 or through their online portal. You can report anonymously. Internal reports should go to your site supervisor or JHSC representative first. Document everything with photos and written records."
      }
    ]
  },
  {
    title: "Contracts & Payments",
    icon: Scale,
    items: [
      {
        question: "What should be included in a construction contract?",
        answer: "Essential elements include: scope of work, materials specifications, timeline with milestones, payment schedule, change order procedures, warranty terms, dispute resolution, insurance requirements, and termination clauses. BuildUnion's Quick Mode can generate compliant contracts."
      },
      {
        question: "What is the Construction Lien Act?",
        answer: "Ontario's Construction Act (formerly Lien Act) protects contractors' right to payment. You can place a lien on property if unpaid. Key deadlines: preserve lien within 60 days of last work, perfect lien within 90 days. Holdback requirements (10%) protect against liens."
      },
      {
        question: "How do I handle change orders?",
        answer: "All changes should be documented in writing before work begins. Include: description of change, cost impact, timeline impact, and approval signatures. Never proceed with changed work without written authorization. BuildUnion tracks all change orders with full audit trails."
      }
    ]
  },
  {
    title: "Business & Career",
    icon: Briefcase,
    items: [
      {
        question: "How do I become a licensed contractor in Ontario?",
        answer: "Ontario doesn't require a general contractor license, but you need business registration, liability insurance ($2M minimum recommended), and WSIB coverage. Specific trades (electrical, plumbing, HVAC) require provincial licenses. Consider joining a trade association for credibility."
      },
      {
        question: "What insurance do contractors need?",
        answer: "Essential coverage includes: Commercial General Liability ($2-5M), Professional Liability (Errors & Omissions), WSIB coverage, Commercial Auto, and Tools/Equipment coverage. Many clients require Umbrella/Excess Liability for larger projects."
      },
      {
        question: "How does BuildUnion's tier system work?",
        answer: "Free tier offers Solo Mode for individual project management. Pro ($19.99/mo) unlocks Team Mode for up to 10 members, AI assistant, and contracts. Premium ($49.99/mo) adds up to 50 team members, direct messaging, conflict visualization, and priority AI responses."
      }
    ]
  }
];

const FAQDialog = ({ isOpen, onClose }: FAQDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-cyan-600" />
            Construction FAQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {faqCategories.map((category, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <category.icon className="h-5 w-5 text-amber-600" />
                {category.title}
              </div>
              <Accordion type="single" collapsible className="w-full">
                {category.items.map((item, itemIdx) => (
                  <AccordionItem key={itemIdx} value={`${idx}-${itemIdx}`}>
                    <AccordionTrigger className="text-left text-sm hover:text-amber-600">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-amber-600">Need more help?</span> Use the Ask Messa AI assistant for specific questions about your projects and local regulations.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FAQDialog;
