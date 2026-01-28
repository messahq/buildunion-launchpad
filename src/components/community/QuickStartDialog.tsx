import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, UserPlus, FileText, Briefcase, CheckCircle, ArrowRight, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface QuickStartDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    number: 1,
    title: "Create Your Account",
    description: "Sign up with your email to get started. Your first project is free.",
    icon: UserPlus,
    action: { label: "Sign Up", route: "/register" }
  },
  {
    number: 2,
    title: "Complete Your Profile",
    description: "Add your trade, certifications, and experience. A complete profile helps you connect with opportunities.",
    icon: FileText,
    action: { label: "Go to Profile", route: "/buildunion/profile" }
  },
  {
    number: 3,
    title: "Choose Your Mode",
    description: "Solo Mode for individual work with estimates and contracts, or Team Mode for collaborative project management.",
    icon: Zap,
    tips: [
      "Solo Mode: Best for individual contractors and quick quotes",
      "Team Mode: Best for complex projects with team collaboration (Pro/Premium)"
    ]
  },
  {
    number: 4,
    title: "Start Your First Project",
    description: "Upload documents, add team members, and let M.E.S.S.A. help you organize everything.",
    icon: Briefcase,
    action: { label: "New Project", route: "/buildunion/workspace" }
  }
];

const features = [
  {
    title: "Solo Mode",
    icon: Zap,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    items: [
      "Photo-based estimates",
      "Instant contract generation",
      "Material calculations",
      "Email contracts to clients"
    ]
  },
  {
    title: "Team Mode",
    icon: Users,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    items: [
      "Team collaboration (Pro/Premium)",
      "Document analysis",
      "Task management",
      "Timeline tracking"
    ]
  }
];

const QuickStartDialog = ({ isOpen, onClose }: QuickStartDialogProps) => {
  const navigate = useNavigate();

  const handleNavigation = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Link2 className="h-6 w-6 text-orange-600" />
            Quick Start Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          <p className="text-muted-foreground">
            Get your BuildUnion profile and first project set up in just a few minutes. Follow these steps to start managing your construction projects like a pro.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-card rounded-lg border border-border hover:border-amber-200 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="h-4 w-4 text-amber-600" />
                    <h4 className="font-semibold text-foreground">{step.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  
                  {step.tips && (
                    <ul className="mt-2 space-y-1">
                      {step.tips.map((tip, tipIdx) => (
                        <li key={tipIdx} className="text-xs text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {step.action && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => handleNavigation(step.action.route)}
                    >
                      {step.action.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mode Comparison */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Choose Your Workflow</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${feature.bgColor} flex items-center justify-center`}>
                      <feature.icon className={`h-4 w-4 ${feature.color}`} />
                    </div>
                    <h4 className="font-semibold text-foreground">{feature.title}</h4>
                  </div>
                  <ul className="space-y-2">
                    {feature.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex-1">
              <p className="font-semibold text-foreground">Ready to get started?</p>
              <p className="text-sm text-muted-foreground">Create your free account and build your first project today.</p>
            </div>
            <Button 
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => handleNavigation("/buildunion/workspace")}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickStartDialog;
