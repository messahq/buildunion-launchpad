import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import davidVideo from "@/assets/david-video.mp4";
import { ArrowLeft, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  }, []);

  const currentLang = languages.find((l) => l.code === selectedLanguage);

  return (
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
      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-24 md:pb-32">
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
            className="mt-10 flex flex-col items-center gap-6 animate-fade-in-up opacity-0"
            style={{ animationDelay: "1s", animationFillMode: "forwards" }}
          >
            <Button
              size="lg"
              onClick={() => navigate("/buildunion/workspace")}
              className="bg-white text-gray-900 hover:bg-white/90 font-semibold text-base px-8 py-6 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Enter Workspace
            </Button>
            
            {/* Our Vision Accordion */}
            <Accordion type="single" collapsible className="w-full max-w-2xl">
              <AccordionItem value="vision" className="border-none">
                <AccordionTrigger className="text-hero-text/60 hover:text-hero-text/80 text-sm font-normal hover:no-underline justify-center gap-2 py-2 [&[data-state=open]>svg]:rotate-180">
                  Our Vision
                </AccordionTrigger>
                <AccordionContent className="bg-zinc-800/90 backdrop-blur-sm rounded-lg p-6 mt-2 text-left">
                  <h3 className="text-amber-500 font-display text-xl mb-1">Vision</h3>
                  <p className="text-zinc-400 text-sm italic mb-4">Michelangelo – David – 1503</p>
                  
                  <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
                    <p>
                      More than five hundred years ago in Florence, a twelve-ton block of marble stood — cracked, shapeless, and forgotten by the masters for forty years.
                    </p>
                    <p>
                      But a young sculptor saw something others could not.
                    </p>
                    <p>
                      For three years, and with more than a million strikes of his hammer, he worked until the hidden figure within was finally free. When asked how he created it, he simply said:
                    </p>
                    
                    {/* Quote with amber accent */}
                    <blockquote className="border-l-2 border-amber-500 pl-4 py-1 italic text-amber-400">
                      "The sculpture was already in the stone. I just removed everything that was not David."
                    </blockquote>
                    
                    <p>
                      BuildUnion sees the same hidden potential within today's construction world — in 4.6 million skilled professionals, in thousands of growing companies, and in the human hands that build the future every single day.
                    </p>
                    
                    <p className="font-semibold text-white text-center pt-2">
                      Because sometimes, the masterpiece isn't built. It's uncovered.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-scroll-hint">
        <ChevronDown className="h-6 w-6 text-hero-text-muted" strokeWidth={1} />
      </div>
    </section>
  );
};

export default HeroSection;
