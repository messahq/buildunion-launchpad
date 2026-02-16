import { ArrowLeft, FileText, UserCheck, ShieldCheck, Brain, Copyright, CreditCard, AlertTriangle, XCircle, Scale, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const termsSections = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    desc: "By accessing or using BuildUnion (\"the Platform\"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform. These terms apply to all users, including project owners, team members, and visitors.",
  },
  {
    icon: UserCheck,
    title: "2. Account Responsibilities",
    desc: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate, current information during registration. You agree to notify us immediately of any unauthorized access to your account.",
  },
  {
    icon: ShieldCheck,
    title: "3. Permitted Use",
    desc: "BuildUnion is designed for construction project management, estimation, and team collaboration. You may not use the Platform for any unlawful purpose, to distribute harmful content, or to attempt to gain unauthorized access to other users' data or the Platform's infrastructure.",
  },
  {
    icon: Brain,
    title: "4. AI-Generated Content",
    desc: "BuildUnion uses AI models to generate estimates, compliance checks, and project analysis. AI-generated content is provided as a professional aid and should not be considered a substitute for licensed professional advice. All estimates are approximations and must be verified by qualified professionals before use in contracts or permits.",
  },
  {
    icon: Copyright,
    title: "5. Intellectual Property",
    desc: "You retain ownership of all data and content you upload to BuildUnion. By using the Platform, you grant us a limited license to process your data as necessary to provide our services. BuildUnion's brand, design, and proprietary technology remain our exclusive property.",
  },
  {
    icon: CreditCard,
    title: "6. Subscriptions & Payment",
    desc: "Paid features are billed on a recurring basis. You may cancel at any time; access continues until the end of your billing period. Refunds are handled on a case-by-case basis. Prices may change with 30 days' notice.",
  },
  {
    icon: AlertTriangle,
    title: "7. Limitation of Liability",
    desc: 'BuildUnion is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of the Platform, including but not limited to reliance on AI-generated estimates, data loss, or service interruptions. Our total liability shall not exceed the amount paid by you in the preceding 12 months.',
  },
  {
    icon: XCircle,
    title: "8. Termination",
    desc: "We may suspend or terminate accounts that violate these terms. You may delete your account at any time. Upon termination, your right to use the Platform ceases immediately. Provisions regarding intellectual property, liability, and dispute resolution survive termination.",
  },
  {
    icon: Scale,
    title: "9. Governing Law",
    desc: "These Terms are governed by the laws of the Province of Ontario, Canada. Any disputes shall be resolved in the courts of Ontario.",
  },
  {
    icon: Mail,
    title: "10. Contact",
    desc: "For questions about these terms, contact us at admin@buildunion.ca.",
  },
];

const BuildUnionTerms = () => {
  const navigate = useNavigate();

  const colors = [
    "bg-amber-500/10 text-amber-500",
    "bg-emerald-500/10 text-emerald-500",
    "bg-sky-500/10 text-sky-500",
    "bg-violet-500/10 text-violet-500",
    "bg-rose-500/10 text-rose-500",
    "bg-teal-500/10 text-teal-500",
    "bg-orange-500/10 text-orange-500",
    "bg-indigo-500/10 text-indigo-500",
    "bg-cyan-500/10 text-cyan-500",
    "bg-amber-500/10 text-amber-500",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BuildUnionHeader />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-light tracking-tight mb-3">
            <span className="text-foreground">Build</span>
            <span className="text-amber-500">Union</span>
          </h2>
          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">Terms of Service</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">Last updated: February 15, 2025</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {termsSections.map((s, i) => (
            <Card key={s.title} className="border-border hover:border-amber-500/30 transition-colors">
              <CardContent className="flex items-start gap-4 p-5">
                <div className={`p-2.5 rounded-xl shrink-0 ${colors[i]}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-sm">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionTerms;
