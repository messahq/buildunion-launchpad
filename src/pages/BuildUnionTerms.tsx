import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

const BuildUnionTerms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BuildUnionHeader />
      <main className="max-w-3xl mx-auto px-6 py-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-4xl font-display font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 15, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using BuildUnion ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform. These terms apply to all users, including project owners, team members, and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Account Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate, current information during registration. You agree to notify us immediately of any unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Permitted Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              BuildUnion is designed for construction project management, estimation, and team collaboration. You may not use the Platform for any unlawful purpose, to distribute harmful content, or to attempt to gain unauthorized access to other users' data or the Platform's infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              BuildUnion uses AI models to generate estimates, compliance checks, and project analysis. AI-generated content is provided as a professional aid and should not be considered a substitute for licensed professional advice. All estimates are approximations and must be verified by qualified professionals before use in contracts or permits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data and content you upload to BuildUnion. By using the Platform, you grant us a limited license to process your data as necessary to provide our services. BuildUnion's brand, design, and proprietary technology remain our exclusive property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Subscriptions & Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid features are billed on a recurring basis. You may cancel at any time; access continues until the end of your billing period. Refunds are handled on a case-by-case basis. Prices may change with 30 days' notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              BuildUnion is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of the Platform, including but not limited to reliance on AI-generated estimates, data loss, or service interruptions. Our total liability shall not exceed the amount paid by you in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate accounts that violate these terms. You may delete your account at any time. Upon termination, your right to use the Platform ceases immediately. Provisions regarding intellectual property, liability, and dispute resolution survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the Province of Ontario, Canada. Any disputes shall be resolved in the courts of Ontario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at legal@buildunion.ca.
            </p>
          </section>
        </div>
      </main>
      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionTerms;
