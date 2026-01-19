import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Zap, 
  Users, 
  Camera, 
  Brain, 
  FolderPlus, 
  MessageSquare, 
  MapPin, 
  Infinity,
  Check,
  ArrowRight
} from "lucide-react";

interface TrialLimitUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: "quick_estimate" | "project_creation" | "blueprint_analysis";
}

const FEATURE_INFO = {
  quick_estimate: {
    title: "AI Estimate Limit Reached",
    description: "You've used all 3 free AI photo estimates.",
    icon: Camera,
    color: "amber",
  },
  project_creation: {
    title: "Project Limit Reached", 
    description: "You've used your 1 free project creation.",
    icon: FolderPlus,
    color: "purple",
  },
  blueprint_analysis: {
    title: "Blueprint Analysis Limit Reached",
    description: "You've used all 3 free M.E.S.S.A. blueprint analyses.",
    icon: Brain,
    color: "cyan",
  },
};

const PRO_BENEFITS = [
  { icon: Camera, text: "Unlimited AI Photo Estimates", highlight: true },
  { icon: Brain, text: "Unlimited Blueprint Analysis", highlight: true },
  { icon: FolderPlus, text: "Unlimited Projects", highlight: true },
  { icon: Users, text: "Up to 10 Team Members" },
  { icon: MessageSquare, text: "Team Chat & Collaboration" },
  { icon: MapPin, text: "Team Location Map" },
];

export const TrialLimitUpgradeModal = ({ 
  open, 
  onOpenChange, 
  feature 
}: TrialLimitUpgradeModalProps) => {
  const navigate = useNavigate();
  const featureInfo = FEATURE_INFO[feature];
  const FeatureIcon = featureInfo.icon;

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/buildunion/pricing");
  };

  const colorClasses = {
    amber: {
      bg: "bg-amber-100",
      icon: "text-amber-600",
      border: "border-amber-200",
    },
    purple: {
      bg: "bg-purple-100", 
      icon: "text-purple-600",
      border: "border-purple-200",
    },
    cyan: {
      bg: "bg-cyan-100",
      icon: "text-cyan-600", 
      border: "border-cyan-200",
    },
  };

  const colors = colorClasses[featureInfo.color as keyof typeof colorClasses];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className={`mx-auto w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center mb-4`}>
            <FeatureIcon className={`w-8 h-8 ${colors.icon}`} />
          </div>
          <DialogTitle className="text-xl">{featureInfo.title}</DialogTitle>
          <DialogDescription className="text-base">
            {featureInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Pro Plan Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-foreground">Pro Plan</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">$19.99</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {PRO_BENEFITS.map((benefit, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 text-sm ${benefit.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${benefit.highlight ? 'bg-green-100' : 'bg-muted'}`}>
                    {benefit.highlight ? (
                      <Infinity className="w-3 h-3 text-green-600" />
                    ) : (
                      <Check className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <benefit.icon className={`w-4 h-4 ${benefit.highlight ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Limited Time Offer */}
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <Badge className="bg-green-600 text-white mb-1">
              <Zap className="w-3 h-3 mr-1" />
              Annual = 2 Months Free
            </Badge>
            <p className="text-xs text-green-700">
              Save $58/year with annual billing
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrialLimitUpgradeModal;