import { ArrowLeft, Shield, Lock, Database, Eye, FileCheck, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const securityFeatures = [
  {
    icon: Lock,
    title: "Encryption",
    desc: "All data encrypted at rest and in transit using AES-256 and TLS 1.3.",
  },
  {
    icon: Shield,
    title: "Row-Level Security",
    desc: "Every database table enforces RLS — users can only access their own data and projects they belong to.",
  },
  {
    icon: Database,
    title: "Redundant Storage",
    desc: "Dual-database architecture with real-time mirroring across geographically separated systems.",
  },
  {
    icon: Eye,
    title: "JWT Authentication",
    desc: "Every API request is validated server-side with JWT tokens. No anonymous access to protected resources.",
  },
  {
    icon: FileCheck,
    title: "Input Validation",
    desc: "All inputs are validated on both client and server using Zod schemas and UUID format checks.",
  },
  {
    icon: Server,
    title: "Secure Backend Functions",
    desc: "All backend functions require authentication and verify project membership before granting access.",
  },
];

const BuildUnionSecurity = () => {
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
          <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">Security</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            How we protect your data and your projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
          {securityFeatures.map((f, i) => {
            const colors = [
              "bg-amber-500/10 text-amber-500",
              "bg-emerald-500/10 text-emerald-500",
              "bg-sky-500/10 text-sky-500",
              "bg-violet-500/10 text-violet-500",
              "bg-rose-500/10 text-rose-500",
              "bg-teal-500/10 text-teal-500",
            ];
            return (
              <Card key={f.title} className="border-border hover:border-amber-500/30 transition-colors">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`p-2.5 rounded-xl shrink-0 ${colors[i % colors.length]}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-8 max-w-2xl mx-auto">
          <section>
            <h2 className="text-xl font-semibold mb-3">API Key Management</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All sensitive API keys (payment processing, mapping, push notifications) are stored as encrypted backend secrets and are never exposed in client-side code. API keys are accessed only through authenticated backend functions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Role-Based Access Control</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Project members are assigned specific roles (foreman, worker, inspector, subcontractor) with granular permissions. Only project owners can manage team composition and access settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Reporting Vulnerabilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you discover a security vulnerability, please report it responsibly by contacting{" "}
              <a href="mailto:admin@buildunion.ca" className="text-amber-500 hover:underline">admin@buildunion.ca</a>.
              Do not create public reports for security issues.
            </p>
          </section>
        </div>
      </main>
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionSecurity;
