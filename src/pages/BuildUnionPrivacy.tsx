import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const BuildUnionPrivacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BuildUnionHeader />
      <main className="max-w-3xl mx-auto px-6 py-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-4xl font-display font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 15, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account, we collect your name, email address, and optional profile information such as your trade, certifications, and company details. We also collect project data you input into the platform, including estimates, tasks, documents, and team communications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is used to provide and improve BuildUnion's services, including AI-powered project analysis, cost estimation, and compliance checks. We do not sell your personal information to third parties. AI models process your project data only to generate estimates and reports — no project data is used to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored in geographically separated, redundant databases with real-time mirroring. All data is encrypted at rest and in transit using industry-standard encryption protocols. We implement Row-Level Security (RLS) policies to ensure users can only access their own data and projects they are members of.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We integrate with third-party services including payment processors (Stripe), mapping services (Google Maps), and AI providers for project analysis. Each integration is governed by its own privacy policy and we only share the minimum data required for each service to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies & Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and preferences (theme, language, region). We do not use third-party tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request access to, correction of, or deletion of your personal data at any time through your account settings. You can delete your account entirely, which will remove all personal data associated with it. Project data shared with team members may be retained for the team's records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. Upon account deletion, personal data is removed within 30 days. Anonymized, aggregated data may be retained for analytics and platform improvement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related inquiries, contact us at privacy@buildunion.ca.
            </p>
          </section>
        </div>
      </main>
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionPrivacy;
