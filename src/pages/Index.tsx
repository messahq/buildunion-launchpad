import { useNavigate } from "react-router-dom";
import DockHeader from "@/components/DockHeader";

const Index = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <DockHeader 
        title="MessaDock" 
        showBackButton={false}
        accentColor="bg-cyan-500 hover:bg-cyan-600"
      />

      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Animated stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 2 + 's',
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>

      {/* Virgo Constellation - Woman Clothed with the Sun */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-40px' }}>
        <svg 
          className="w-[550px] h-[550px] md:w-[700px] md:h-[700px] opacity-[0.12]"
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Virgo constellation stars with twinkling */}
          <g fill="white" className="constellation-stars">
            {/* Spica - brightest star */}
            <circle cx="200" cy="340" r="4" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
            {/* Head region */}
            <circle cx="180" cy="60" r="2.5" style={{ animation: 'twinkle 4s ease-in-out infinite 0.5s' }} />
            <circle cx="200" cy="80" r="2" style={{ animation: 'twinkle 3.5s ease-in-out infinite 1s' }} />
            {/* Shoulder/arm region */}
            <circle cx="130" cy="120" r="2.2" style={{ animation: 'twinkle 4.5s ease-in-out infinite 0.3s' }} />
            <circle cx="240" cy="110" r="2" style={{ animation: 'twinkle 3.8s ease-in-out infinite 0.7s' }} />
            <circle cx="280" cy="130" r="1.8" style={{ animation: 'twinkle 4.2s ease-in-out infinite 1.2s' }} />
            {/* Torso */}
            <circle cx="195" cy="160" r="2.5" style={{ animation: 'twinkle 3.3s ease-in-out infinite 0.4s' }} />
            <circle cx="190" cy="210" r="2.2" style={{ animation: 'twinkle 4.1s ease-in-out infinite 0.9s' }} />
            <circle cx="198" cy="260" r="2.8" style={{ animation: 'twinkle 3.7s ease-in-out infinite 1.5s' }} />
            {/* Extended arm with wheat */}
            <circle cx="320" cy="180" r="2" style={{ animation: 'twinkle 4.4s ease-in-out infinite 0.2s' }} />
            <circle cx="355" cy="205" r="1.5" style={{ animation: 'twinkle 3.9s ease-in-out infinite 1.1s' }} />
            {/* Lower body */}
            <circle cx="200" cy="300" r="2.2" style={{ animation: 'twinkle 4.3s ease-in-out infinite 0.6s' }} />
          </g>
          {/* Connecting lines */}
          <g stroke="white" strokeWidth="0.5" fill="none" opacity="0.2">
            <path d="M180,60 L200,80 L195,160" />
            <path d="M200,80 L130,120" />
            <path d="M200,80 L240,110 L280,130" />
            <path d="M195,160 L190,210 L198,260 L200,300 L200,340" />
            <path d="M190,210 L320,180 L355,205" />
          </g>
          {/* Crown of 12 stars around head */}
          <g fill="rgba(255,215,0,0.3)">
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const x = 190 + Math.cos(angle) * 50;
              const y = 50 + Math.sin(angle) * 30;
              return <circle key={i} cx={x} cy={y} r="1.5" />;
            })}
          </g>
        </svg>
      </div>

      {/* Top Section - BuildUnion Capsule */}
      <div className="relative z-10 flex flex-col items-center pt-8 md:pt-16 flex-1">

        {/* BuildUnion Capsule Button */}
        <button
          onClick={() => navigate("/buildunion")}
          className="group relative px-8 py-4 rounded-full cursor-pointer focus:outline-none transition-all duration-500 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(6, 182, 212, 0.2))',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 0 30px rgba(251, 146, 60, 0.2), 0 0 60px rgba(6, 182, 212, 0.1)'
          }}
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-cyan-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Capsule content */}
          <div className="relative flex items-center gap-3">
            {/* Mini orb indicator */}
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(251, 146, 60, 0.9), rgba(6, 182, 212, 0.9))',
                boxShadow: '0 0 10px rgba(251, 146, 60, 0.5)'
              }}
            />
            <span className="text-white/90 font-light tracking-widest uppercase text-sm">
              BuildUnion
            </span>
          </div>
        </button>
      </div>

      {/* Center Section - Clickable Orb */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ top: '30px' }}>
        {/* Interactive CSS Orb */}
        <button
          onClick={() => navigate("/orb")}
          className="relative group cursor-pointer focus:outline-none pointer-events-auto"
          aria-label="Enter Orb Module"
        >
          {/* Outer glow rings - breathing animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 to-cyan-500/30 blur-3xl scale-150 animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-orange-500/20 blur-2xl scale-125 animate-[pulse_3s_ease-in-out_infinite_0.5s]" />
          
          {/* Rotating energy ring */}
          <div 
            className="absolute inset-[-20px] rounded-full border border-cyan-500/30 animate-[spin_20s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(6, 182, 212, 0.3), transparent, rgba(251, 146, 60, 0.3), transparent)'
            }}
          />
          
          {/* Second rotating ring - opposite direction */}
          <div 
            className="absolute inset-[-40px] rounded-full border border-orange-500/20 animate-[spin_30s_linear_infinite_reverse]"
            style={{
              background: 'conic-gradient(from 180deg, transparent, rgba(251, 146, 60, 0.2), transparent, rgba(6, 182, 212, 0.2), transparent)'
            }}
          />

          <div 
            className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full transition-transform duration-500 group-hover:scale-110"
            style={{
              animation: 'float 6s ease-in-out infinite',
              background: 'radial-gradient(circle at 30% 30%, rgba(251, 146, 60, 0.8), rgba(251, 146, 60, 0.4) 30%, rgba(6, 182, 212, 0.4) 60%, rgba(6, 182, 212, 0.8))',
              boxShadow: '0 0 60px rgba(251, 146, 60, 0.5), 0 0 120px rgba(6, 182, 212, 0.4), inset 0 0 80px rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Inner glow layers */}
            <div 
              className="absolute inset-4 rounded-full animate-[spin_10s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg, rgba(251, 146, 60, 0.6), transparent, rgba(6, 182, 212, 0.6), transparent, rgba(251, 146, 60, 0.6))',
                filter: 'blur(20px)'
              }}
            />
            <div 
              className="absolute inset-8 rounded-full animate-[spin_15s_linear_infinite_reverse]"
              style={{
                background: 'conic-gradient(from 90deg, rgba(6, 182, 212, 0.5), transparent, rgba(251, 146, 60, 0.5), transparent, rgba(6, 182, 212, 0.5))',
                filter: 'blur(15px)'
              }}
            />
            {/* Core glow */}
            <div 
              className="absolute inset-16 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
              style={{
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2) 50%, transparent)',
                filter: 'blur(10px)'
              }}
            />
          </div>
          
          {/* Particle effects */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: i % 2 === 0 ? 'rgba(251, 146, 60, 0.6)' : 'rgba(6, 182, 212, 0.6)',
                left: '50%',
                top: '50%',
                animation: `orbit ${8 + i * 2}s linear infinite`,
                animationDelay: `${i * 0.5}s`,
                transformOrigin: `${120 + i * 20}px 0`
              }}
            />
          ))}
        </button>
      </div>

      {/* Custom keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(1deg); }
          50% { transform: translateY(0px) rotate(0deg); }
          75% { transform: translateY(-5px) rotate(-1deg); }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(150px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(150px) rotate(-360deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </main>
  );
};

export default Index;
