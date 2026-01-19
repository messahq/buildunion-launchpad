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
          className="w-[550px] h-[550px] md:w-[700px] md:h-[700px] opacity-[0.22]"
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
          {/* Outer glow */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(251, 146, 60, 0.3), rgba(6, 182, 212, 0.2) 60%, transparent 80%)',
              filter: 'blur(40px)',
              transform: 'scale(1.4)',
            }}
          />

          {/* Globe with slow rotation */}
          <div 
            className="relative w-40 h-40 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-full overflow-hidden transition-transform duration-500 group-hover:scale-105"
            style={{
              animation: 'spinGlobe 80s linear infinite',
              background: 'radial-gradient(circle at 35% 35%, rgba(251, 146, 60, 0.7), rgba(6, 182, 212, 0.5) 50%, rgba(6, 182, 212, 0.9))',
              boxShadow: `
                inset -30px -30px 80px rgba(0, 0, 0, 0.5),
                inset 15px 15px 50px rgba(251, 146, 60, 0.3),
                0 0 80px rgba(251, 146, 60, 0.4),
                0 0 120px rgba(6, 182, 212, 0.3)
              `,
            }}
          >
            {/* Continent-like landmasses */}
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
              style={{ animation: 'spinGlobe 80s linear infinite' }}
            >
              <defs>
                <linearGradient id="landGradIndex" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(251, 146, 60, 0.7)" />
                  <stop offset="100%" stopColor="rgba(180, 100, 50, 0.5)" />
                </linearGradient>
              </defs>
              {/* North America-like */}
              <path d="M15,20 Q25,15 35,22 Q40,30 35,40 Q25,45 18,38 Q12,30 15,20" fill="url(#landGradIndex)" opacity="0.6" />
              {/* Europe/Asia-like */}
              <path d="M55,18 Q70,15 85,25 Q88,35 80,45 Q65,50 55,42 Q50,30 55,18" fill="url(#landGradIndex)" opacity="0.55" />
              {/* Africa-like */}
              <path d="M45,45 Q55,42 60,52 Q58,68 50,75 Q42,70 40,58 Q42,48 45,45" fill="url(#landGradIndex)" opacity="0.6" />
              {/* South America-like */}
              <path d="M25,55 Q32,52 35,60 Q33,75 28,82 Q22,78 20,65 Q22,58 25,55" fill="url(#landGradIndex)" opacity="0.55" />
              {/* Australia-like */}
              <path d="M75,60 Q85,58 88,65 Q86,75 78,78 Q72,74 73,65 Q74,62 75,60" fill="url(#landGradIndex)" opacity="0.5" />
            </svg>
            
            {/* Ocean depth layers */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 60% 70%, rgba(6, 182, 212, 0.3), transparent 50%)',
              }}
            />
            
            {/* Grid lines for globe effect */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-20"
              viewBox="0 0 100 100"
            >
              {/* Latitude lines */}
              {[20, 35, 50, 65, 80].map((y) => (
                <ellipse 
                  key={`lat-${y}`}
                  cx="50" 
                  cy={y} 
                  rx={Math.sin((y / 100) * Math.PI) * 48} 
                  ry="1.5" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.4)" 
                  strokeWidth="0.3"
                />
              ))}
              {/* Longitude curves */}
              <path d="M50,2 Q30,50 50,98" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.3" />
              <path d="M50,2 Q70,50 50,98" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.3" />
              <path d="M50,2 L50,98" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.3" />
              <path d="M50,2 Q15,50 50,98" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.2" />
              <path d="M50,2 Q85,50 50,98" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.2" />
            </svg>
          </div>
          
          {/* Specular highlight */}
          <div 
            className="absolute top-4 left-6 w-1/3 h-1/4 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.35), transparent 70%)',
              transform: 'rotate(-25deg)',
            }}
          />
          
          {/* Atmospheric rim */}
          <div 
            className="absolute inset-[-2px] rounded-full pointer-events-none"
            style={{
              background: 'transparent',
              boxShadow: 'inset 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 40px rgba(251, 146, 60, 0.2)',
            }}
          />
        </button>
      </div>

      {/* Custom keyframes */}
      <style>{`
        @keyframes spinGlobe {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
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
