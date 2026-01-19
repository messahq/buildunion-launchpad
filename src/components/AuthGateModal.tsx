import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Sparkles, FileUp, LayoutTemplate, FileText, Shield, Crown } from "lucide-react";

interface AuthGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: "blueprints" | "templates" | "quote" | "summary";
  incentiveMessage?: string;
}

const featureConfig = {
  blueprints: {
    icon: FileUp,
    title: "Blueprint Analysis",
    description: "Sign in to unlock M.E.S.S.A. AI blueprint analysis",
    benefits: [
      "3 free Blueprint analyses upon registration",
      "AI-powered material extraction",
      "Professional project summaries",
    ],
  },
  templates: {
    icon: LayoutTemplate,
    title: "My Templates",
    description: "Sign in to save and access your custom templates",
    benefits: [
      "Save unlimited custom templates",
      "Reuse on future projects",
      "Sync across all your devices",
    ],
  },
  quote: {
    icon: FileText,
    title: "Quote Generator",
    description: "Sign in to generate professional quotes",
    benefits: [
      "Professional PDF quotes",
      "Save quotes to your projects",
      "Track client proposals",
    ],
  },
  summary: {
    icon: Sparkles,
    title: "Project Summary",
    description: "Sign in to create and save project summaries",
    benefits: [
      "Combine all your estimates",
      "Export professional PDFs",
      "Save to your project library",
    ],
  },
};

export const AuthGateModal = ({
  open,
  onOpenChange,
  feature,
  incentiveMessage,
}: AuthGateModalProps) => {
  const navigate = useNavigate();
  const config = featureConfig[feature];
  const Icon = config.icon;

  const handleSignIn = () => {
    onOpenChange(false);
    navigate("/buildunion/login", { state: { returnTo: window.location.pathname } });
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate("/buildunion/register", { state: { returnTo: window.location.pathname } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-amber-600" />
          </div>
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits List */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Registration Benefits</span>
            </div>
            <ul className="space-y-2">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                  <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {incentiveMessage && (
            <p className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              {incentiveMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSignUp}
            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <UserPlus className="w-4 h-4" />
            Create Free Account
          </Button>
          <Button
            variant="outline"
            onClick={handleSignIn}
            className="w-full gap-2"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          Already have an account? Sign in to continue.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AuthGateModal;
