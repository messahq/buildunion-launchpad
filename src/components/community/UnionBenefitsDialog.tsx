import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, DollarSign, Heart, Briefcase, GraduationCap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UnionBenefitsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const benefits = [
  {
    icon: DollarSign,
    title: "Competitive Wages",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    items: [
      "Negotiated wage rates above industry average",
      "Regular cost-of-living adjustments",
      "Overtime and premium pay guarantees",
      "Transparent pay scales by trade and experience"
    ]
  },
  {
    icon: Heart,
    title: "Health & Dental Coverage",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    items: [
      "Comprehensive medical insurance",
      "Dental and vision care",
      "Prescription drug coverage",
      "Mental health support services",
      "Family coverage options"
    ]
  },
  {
    icon: Briefcase,
    title: "Pension & Retirement",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    items: [
      "Defined benefit pension plans",
      "Employer contribution matching",
      "Portable benefits across employers",
      "Early retirement options"
    ]
  },
  {
    icon: Shield,
    title: "Job Security",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    items: [
      "Collective bargaining protection",
      "Grievance and dispute resolution",
      "Seniority-based job assignments",
      "Wrongful termination protection"
    ]
  },
  {
    icon: GraduationCap,
    title: "Training & Development",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    items: [
      "Apprenticeship programs",
      "Continuing education support",
      "Safety certification training",
      "Leadership development programs"
    ]
  },
  {
    icon: Users,
    title: "Community & Support",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    items: [
      "Legal representation",
      "Financial counseling services",
      "Member assistance programs",
      "Networking opportunities"
    ]
  }
];

const majorUnions = [
  { name: "Carpenters' Union (UBCJA)", focus: "Carpentry, millwork, floor covering" },
  { name: "IBEW", focus: "Electrical workers" },
  { name: "UA Plumbers & Pipefitters", focus: "Plumbing, pipefitting, HVAC" },
  { name: "Ironworkers Union", focus: "Structural and reinforcing ironwork" },
  { name: "Labourers' International (LiUNA)", focus: "General construction labour" },
  { name: "Operating Engineers (IUOE)", focus: "Heavy equipment operation" }
];

const UnionBenefitsDialog = ({ isOpen, onClose }: UnionBenefitsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-orange-600" />
            Union Benefits Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <p className="text-muted-foreground">
            Union membership provides construction workers with comprehensive benefits, job security, and representation. 
            Here's what you can expect as a union member in Ontario.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className={`w-8 h-8 rounded-lg ${benefit.bgColor} flex items-center justify-center`}>
                      <benefit.icon className={`h-4 w-4 ${benefit.color}`} />
                    </div>
                    {benefit.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {benefit.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-muted/50 rounded-xl p-5 border border-border">
            <h3 className="font-semibold text-foreground mb-4">Major Construction Unions in Ontario</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {majorUnions.map((union, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
                  <Users className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-foreground">{union.name}</p>
                    <p className="text-xs text-muted-foreground">{union.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-amber-600">Interested in joining?</span> Contact your local union hall or visit their website to learn about membership requirements and the application process.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnionBenefitsDialog;
