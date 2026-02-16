import { ArrowLeft, ClipboardList, Database, Lock, Globe, Cookie, UserCheck, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const privacySections = [
  {
    icon: ClipboardList,
    title: "1. Information We Collect",
    desc: "When you create an account, we collect your name, email address, and optional profile information such as your trade, certifications, and company details. We also collect project data you input into the platform, including estimates, tasks, documents, and team communications.",
  },
  {
    icon: Database,
    title: "2. How We Use Your Data",
    desc: "Your data is used to provide and improve BuildUnion's services, including AI-powered project analysis, cost estimation, and compliance checks. We do not sell your personal information to third parties. AI models process your project data only to generate estimates and reports — no project data is used to train AI models.",
  },
  {
    icon: Lock,
    title: "3. Data Storage & Security",
    desc: "Your data is stored in geographically separated, redundant databases with real-time mirroring. All data is encrypted at rest and in transit using industry-standard encryption protocols. We implement Row-Level Security (RLS) policies to ensure users can only access their own data and projects they are members of.",
  },
  {
    icon: Globe,
    title: "4. Third-Party Services",
    desc: "We integrate with third-party services including payment processors (Stripe), mapping services (Google Maps), and AI providers for project analysis. Each integration is governed by its own privacy policy and we only share the minimum data required for each service to function.",
  },
  {
    icon: Cookie,
    title: "5. Cookies & Analytics",
    desc: "We use essential cookies to maintain your session and preferences (theme, language, region). We do not use third-party tracking cookies for advertising purposes.",
  },
  {
    icon: UserCheck,
    title: "6. Your Rights",
    desc: "You may request access to, correction of, or deletion of your personal data at any time through your account settings. You can delete your account entirely, which will remove all personal data associated with it. Project data shared with team members may be retained for the team's records.",
  },
  {
    icon: Clock,
    title: "7. Data Retention",
    desc: "We retain your data for as long as your account is active. Upon account deletion, personal data is removed within 30 days. Anonymized, aggregated data may be retained for analytics and platform improvement.",
  },
  {
    icon: Mail,
    title: "8. Contact",
    desc: "For privacy-related inquiries, contact us at admin@buildunion.ca.",
  },
];

const colors = [
  "bg-amber-500/10 text-amber-500",
  "bg-emerald-500/10 text-emerald-500",
  "bg-sky-500/10 text-sky-500",
  "bg-violet-500/10 text-violet-500",
  "bg-rose-500/10 text-rose-500",
  "bg-teal-500/10 text-teal-500",
  "bg-orange-500/10 text-orange-500",
  "bg-indigo-500/10 text-indigo-500",
];

const BuildUnionPrivacy = () => {
  const navigate = useNavigate();

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
          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">Last updated: February 15, 2025</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {privacySections.map((s, i) => (
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

export default BuildUnionPrivacy;
