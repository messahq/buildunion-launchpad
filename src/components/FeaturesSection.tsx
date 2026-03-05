import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Calculator,
  Users,
  FileText,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURES = [
  {
    icon: Calculator,
    titleKey: "features.estimateTitle",
    descKey: "features.estimateDesc",
    fallbackTitle: "AI-Powered Estimates",
    fallbackDesc:
      "Upload blueprints or photos — get instant material & labor cost breakdowns calibrated to your region.",
  },
  {
    icon: Users,
    titleKey: "features.teamTitle",
    descKey: "features.teamDesc",
    fallbackTitle: "Team & Task Management",
    fallbackDesc:
      "Assign tasks, track progress in real-time, and keep your crew aligned from foundation to finish.",
  },
  {
    icon: FileText,
    titleKey: "features.contractTitle",
    descKey: "features.contractDesc",
    fallbackTitle: "Contracts & Invoices",
    fallbackDesc:
      "Generate professional contracts, send them for e-signature, and invoice clients — all in one place.",
  },
  {
    icon: BarChart3,
    titleKey: "features.dashboardTitle",
    descKey: "features.dashboardDesc",
    fallbackTitle: "Project Dashboard",
    fallbackDesc:
      "Monitor budgets, timelines, and site logs with a bird's-eye view of every active project.",
  },
  {
    icon: Shield,
    titleKey: "features.complianceTitle",
    descKey: "features.complianceDesc",
    fallbackTitle: "Code Compliance",
    fallbackDesc:
      "Built-in Ontario Building Code references so your estimates and plans stay compliant from day one.",
  },
  {
    icon: Zap,
    titleKey: "features.quicklogTitle",
    descKey: "features.quicklogDesc",
    fallbackTitle: "Quick Log",
    fallbackDesc:
      "Snap a photo on-site, add notes, and generate a PDF daily report in under 30 seconds.",
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useTranslation();

  const Icon = feature.icon;
  const title = t(feature.titleKey, feature.fallbackTitle);
  const desc = t(feature.descKey, feature.fallbackDesc);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="group relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5"
    >
      {/* Glow on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
};

const FeaturesSection = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-60px" });
  const { t } = useTranslation();

  return (
    <section className="relative bg-background py-24 px-6 overflow-hidden">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/3 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-accent text-sm font-semibold tracking-widest uppercase mb-3">
            {t("features.sectionLabel", "Why BuildUnion")}
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            {t("features.sectionTitle", "Everything your crew needs.")}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            {t(
              "features.sectionSubtitle",
              "From first estimate to final invoice — one platform built by tradespeople, for tradespeople."
            )}
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.titleKey} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
