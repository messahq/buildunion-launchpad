import { useEffect, useRef } from "react";
import constructionVideo from "@/assets/construction-hero.mp4";
import { ChevronDown } from "lucide-react";

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      });
    }
  }, []);

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
        <source src={constructionVideo} type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-hero-overlay/60" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div className="text-center">
          <h1 
            className="font-display text-4xl font-light tracking-tight text-hero-text sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            BuildUnion
          </h1>
          <p 
            className="mt-4 font-display text-lg font-light tracking-[0.3em] uppercase text-hero-text-muted sm:text-xl md:text-2xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            Operational Truth
          </p>
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
