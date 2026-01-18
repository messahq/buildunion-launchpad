import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import davidVideo from "@/assets/david-hero.mp4";
import { ArrowLeft, ChevronDown, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ar", name: "العربية" },
  { code: "pt", name: "Português" },
  { code: "hu", name: "Magyar" },
];

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [visionOpen, setVisionOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  }, []);

  const currentLang = languages.find((l) => l.code === selectedLanguage);

  return (
    <>
      <section className="relative h-screen w-full overflow-hidden">
        {/* Video Background */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={davidVideo} type="video/mp4" />
        </video>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-hero-overlay/60" />

        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-hero-text/80 hover:text-hero-text hover:bg-white/10 backdrop-blur-sm border border-white/20 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Dock</span>
          </Button>
        </div>

        {/* Language Selector */}
        <div className="absolute top-6 right-6 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-hero-text/80 hover:text-hero-text hover:bg-white/10 backdrop-blur-sm border border-white/20 gap-2"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm">{currentLang?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={selectedLanguage === lang.code ? "bg-accent" : ""}
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-0 md:-mt-32">
          <div className="max-w-4xl text-center">
            <h1
              className="font-display text-4xl font-light tracking-tight text-hero-text sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              BuildUnion
            </h1>
            <p
              className="mt-6 font-display text-lg font-semibold leading-relaxed text-hero-text sm:text-xl md:text-2xl animate-fade-in-up opacity-0 max-w-2xl mx-auto"
              style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
            >
              Construction grade project management platform for teams who build the real world
            </p>
            <div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up opacity-0"
              style={{ animationDelay: "1s", animationFillMode: "forwards" }}
            >
              <Button
                size="lg"
                onClick={() => navigate("/buildunion/workspace")}
                className="bg-white text-gray-900 hover:bg-white/90 font-semibold text-base px-8 py-6 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                Enter Workspace
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setVisionOpen(true)}
                className="border-white/40 text-hero-text hover:bg-white/10 hover:border-white/60 font-semibold text-base px-8 py-6 rounded-md backdrop-blur-sm transition-all duration-200 gap-2"
              >
                <Eye className="h-5 w-5" />
                Our Vision
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-scroll-hint">
          <ChevronDown className="h-6 w-6 text-hero-text-muted" strokeWidth={1} />
        </div>
      </section>

      {/* Vision Modal */}
      <Dialog open={visionOpen} onOpenChange={setVisionOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-3xl font-display font-light tracking-tight text-foreground">
              Our Vision
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              The philosophy behind BuildUnion
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* The David Story */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-0.5 bg-amber-500" />
                The Unfinished Masterpiece
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                When Michelangelo was asked how he created David, he famously replied: 
                <span className="italic text-foreground"> "I saw the angel in the marble and carved until I set him free."</span>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The block of Carrara marble that would become David had been abandoned for 25 years. 
                Two other sculptors had already failed to work with it. Where they saw a ruined stone, 
                Michelangelo saw potential waiting to be released.
              </p>
            </div>

            {/* The Connection */}
            <div className="space-y-4 border-t border-border/50 pt-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-0.5 bg-amber-500" />
                Building the Future
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Like the half-finished David in our video, BuildUnion is a work in progress—a vision 
                being carved from raw potential. The amber light you see represents the precision and 
                craft needed to shape something extraordinary from chaos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We're not just building software. We're building the tools that will help construction 
                teams worldwide transform their raw materials—concrete, steel, glass, and human ingenuity—into 
                structures that will stand for generations.
              </p>
            </div>

            {/* The Promise */}
            <div className="space-y-4 border-t border-border/50 pt-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-0.5 bg-amber-500" />
                From Marble to Monument
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Every great building starts as a vision trapped in blueprints, materials, and logistics. 
                BuildUnion is the chisel that sets that vision free—organizing complexity, connecting 
                teams, and turning ambitious plans into physical reality.
              </p>
              <p className="text-foreground font-medium">
                We see the angel in the marble. Now let's carve it together.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeroSection;
