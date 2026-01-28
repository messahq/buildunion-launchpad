import { useTranslation } from "react-i18next";
import { Users, Target, Heart, Shield, Award, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import aboutLogo from "@/assets/buildunion-logo-about.png";

const BuildUnionAbout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const values = [
    {
      icon: Users,
      titleKey: "about.values.community.title",
      descKey: "about.values.community.description",
    },
    {
      icon: Target,
      titleKey: "about.values.precision.title",
      descKey: "about.values.precision.description",
    },
    {
      icon: Heart,
      titleKey: "about.values.passion.title",
      descKey: "about.values.passion.description",
    },
    {
      icon: Shield,
      titleKey: "about.values.trust.title",
      descKey: "about.values.trust.description",
    },
    {
      icon: Award,
      titleKey: "about.values.excellence.title",
      descKey: "about.values.excellence.description",
    },
    {
      icon: Globe,
      titleKey: "about.values.global.title",
      descKey: "about.values.global.description",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <img 
                src={aboutLogo} 
                alt="BuildUnion Logo" 
                className="w-48 md:w-64 h-auto mb-8"
              />
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="text-foreground">{t("about.hero.titlePart1")}</span>{" "}
                <span className="text-amber-500">{t("about.hero.titlePart2")}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {t("about.hero.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("about.mission.title")}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("about.mission.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("about.values.title")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <Card
                  key={index}
                  className="border-border/50 hover:border-amber-400/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <value.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{t(value.titleKey)}</h3>
                        <p className="text-muted-foreground text-sm">{t(value.descKey)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                {t("about.story.title")}
              </h2>

              <div className="space-y-8 text-muted-foreground leading-relaxed">
                <p>{t("about.story.paragraph1")}</p>
                <p>{t("about.story.paragraph2")}</p>
                <p>{t("about.story.paragraph3")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-yellow-900/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("about.cta.title")}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("about.cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => navigate("/buildunion/register")}
              >
                {t("about.cta.joinButton")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/buildunion/community")}
              >
                {t("about.cta.communityButton")}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionAbout;
