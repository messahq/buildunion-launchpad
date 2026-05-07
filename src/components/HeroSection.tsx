import { useEffect, useRef } from "react";
import aiUnionVideoAsset from "@/assets/ai-union-video.mp4.asset.json";
const davidVideo = aiUnionVideoAsset.url;
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import HeroSignupForm from "@/components/HeroSignupForm";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => video.play().catch(() => {});

    // Defer playback until browser is idle, so it never blocks first paint
    const idle = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(tryPlay, { timeout: 1500 })
      : window.setTimeout(tryPlay, 300);

    // Pause when scrolled offscreen to save CPU/battery; resume on return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      },
      { threshold: 0.05 }
    );
    io.observe(video);

    // Pause when tab is hidden
    const onVis = () => (document.hidden ? video.pause() : tryPlay());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return (
    <section className="relative h-screen landscape:h-auto landscape:min-h-[100svh] w-full overflow-hidden landscape:overflow-visible">
      {/* Video Background — lazy, low-priority, perf-safe */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center scale-110"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        // @ts-expect-error - non-standard but supported attribute
        fetchpriority="low"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          animation: 'videoFade 5s ease-in-out infinite',
          willChange: 'opacity',
          contain: 'strict',
        }}
      >
        <source src={davidVideo} type="video/mp4" />
      </video>

      {/* Dark Overlay — stronger on mobile for legibility */}
      <div className="absolute inset-0 bg-hero-overlay/65 sm:bg-hero-overlay/50" />
      {/* Bottom gradient — keeps tagline + signup readable on small screens */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] sm:h-[45%] bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />
      
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

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-12 md:pb-20 landscape:pb-8 landscape:pt-16">
        <div className="max-w-4xl text-center">
          <h1
            className="font-display text-4xl font-light tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl animate-fade-in-up leading-[0.95]"
            style={{ animationDelay: "0.2s", textShadow: '0 3px 14px rgba(0,0,0,0.75)' }}
          >
            <span className="text-white">Build</span>
            <span className="text-amber-400">Union</span>
          </h1>
          <p
            className="mt-5 sm:mt-6 font-display text-base font-medium leading-relaxed text-hero-text sm:text-xl md:text-2xl animate-fade-in-up opacity-0 max-w-md sm:max-w-2xl mx-auto px-2"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards", textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
          >
            {t("landing.tagline")}
          </p>
          <div
            className="mt-10 flex flex-col items-center gap-6 animate-fade-in-up opacity-0"
            style={{ animationDelay: "1s", animationFillMode: "forwards" }}
          >
            <HeroSignupForm />
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
