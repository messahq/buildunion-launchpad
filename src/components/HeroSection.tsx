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
        className="absolute inset-0 h-full w-full object-cover object-center scale-110"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          animation: 'videoFade 5s ease-in-out infinite',
        }}
      >
        <source src={davidVideo} type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-hero-overlay/50" />
      
      {/* Amber Light Effect - Top Left */}
      <div 
        className="absolute top-0 left-1/4 w-[600px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(251, 146, 60, 0.25), rgba(217, 119, 6, 0.15) 30%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'amberPulse 8s ease-in-out infinite',
        }}
      />
      
      {/* Secondary Amber Glow */}
      <div 
        className="absolute top-1/4 left-1/3 w-[400px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(245, 158, 11, 0.2), transparent 60%)',
          filter: 'blur(80px)',
          animation: 'amberPulse 6s ease-in-out infinite 2s',
        }}
      />
      
      {/* Warm light rays effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, transparent 40%, transparent 100%)',
        }}
      />
      
      {/* Floating Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 60 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              background: `rgba(251, 191, 36, ${Math.random() * 0.4 + 0.2})`,
              boxShadow: `0 0 ${Math.random() * 4 + 2}px rgba(251, 146, 60, 0.5)`,
              animation: `floatDust ${Math.random() * 8 + 6}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

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
            className="font-display text-4xl font-light tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="text-white">Build</span>
            <span className="text-amber-400">Union</span>
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
      
      {/* Custom animations */}
      <style>{`
        @keyframes videoFade {
          0%, 100% { opacity: 1; }
          95% { opacity: 1; }
          97% { opacity: 0.7; }
          99% { opacity: 0.9; }
        }
        
        @keyframes amberPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes floatDust {
          0%, 100% { 
            transform: translateY(0) translateX(0); 
            opacity: 0.3;
          }
          25% { 
            transform: translateY(-20px) translateX(10px); 
            opacity: 0.7;
          }
          50% { 
            transform: translateY(-10px) translateX(-5px); 
            opacity: 0.5;
          }
          75% { 
            transform: translateY(-30px) translateX(15px); 
            opacity: 0.8;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
