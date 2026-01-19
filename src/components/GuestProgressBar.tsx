import { useAuth } from "@/hooks/useAuth";
import { Check, Camera, UserPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestProgressBarProps {
  hasPhotoEstimate: boolean;
  className?: string;
}

export const GuestProgressBar = ({ hasPhotoEstimate, className }: GuestProgressBarProps) => {
  const { user } = useAuth();

  // Don't show for authenticated users
  if (user) return null;

  const steps = [
    {
      id: "photo",
      label: "Photo Estimate",
      icon: Camera,
      completed: hasPhotoEstimate,
      active: !hasPhotoEstimate,
    },
    {
      id: "register",
      label: "Register",
      icon: UserPlus,
      completed: false,
      active: hasPhotoEstimate,
    },
    {
      id: "full",
      label: "Full Access",
      icon: Sparkles,
      completed: false,
      active: false,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;

  return (
    <div className={cn("bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-amber-800">
          {completedSteps} of 3 steps to full experience
        </span>
        <span className="text-xs text-amber-600">
          {hasPhotoEstimate ? "Great progress!" : "Get started below"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  step.completed && "bg-green-500 text-white",
                  step.active && !step.completed && "bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2",
                  !step.active && !step.completed && "bg-gray-200 text-gray-400"
                )}
              >
                {step.completed ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  "ml-2 text-xs font-medium hidden sm:inline",
                  step.completed && "text-green-700",
                  step.active && !step.completed && "text-amber-700",
                  !step.active && !step.completed && "text-gray-400"
                )}
              >
                {step.label}
              </span>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3",
                    step.completed ? "bg-green-300" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {hasPhotoEstimate && (
        <p className="text-xs text-amber-600 mt-3 text-center">
          🎉 You're making progress! Register now to unlock all features.
        </p>
      )}
    </div>
  );
};

export default GuestProgressBar;
