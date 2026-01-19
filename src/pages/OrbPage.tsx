import DockHeader from "@/components/DockHeader";

const OrbPage = () => {
  return (
    <main className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 min-h-screen">
      <DockHeader title="Orb Module" accentColor="bg-cyan-500 hover:bg-cyan-600" />
      
      {/* Centered Globe Section */}
      <section className="relative flex flex-col items-center justify-start min-h-[calc(100vh-80px)] overflow-hidden pt-8 md:pt-12">
        
        {/* Rotating Globe - positioned higher */}
        <div className="relative w-72 h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] z-10">
          {/* Outer glow */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.3), rgba(251, 146, 60, 0.15) 60%, transparent 80%)',
              filter: 'blur(60px)',
              transform: 'scale(1.3)',
            }}
          />
          
          {/* Globe container with slow rotation */}
          <div 
            className="absolute inset-4 rounded-full overflow-hidden"
            style={{
              animation: 'spin 60s linear infinite',
              background: 'radial-gradient(circle at 35% 35%, rgba(6, 182, 212, 0.6), rgba(20, 50, 80, 0.8) 50%, rgba(10, 30, 50, 0.95))',
              boxShadow: `
                inset -20px -20px 60px rgba(0, 0, 0, 0.6),
                inset 10px 10px 40px rgba(6, 182, 212, 0.2),
                0 0 80px rgba(6, 182, 212, 0.3),
                0 0 120px rgba(251, 146, 60, 0.1)
              `,
            }}
          >
            {/* Continent-like patterns */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-40"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.6)" />
                  <stop offset="100%" stopColor="rgba(251, 146, 60, 0.3)" />
                </linearGradient>
              </defs>
              {/* Abstract landmass shapes */}
              <ellipse cx="30" cy="35" rx="15" ry="20" fill="url(#landGrad)" opacity="0.6" />
              <ellipse cx="65" cy="25" rx="12" ry="10" fill="url(#landGrad)" opacity="0.5" />
              <ellipse cx="70" cy="55" rx="18" ry="15" fill="url(#landGrad)" opacity="0.55" />
              <ellipse cx="25" cy="70" rx="10" ry="12" fill="url(#landGrad)" opacity="0.5" />
              <ellipse cx="50" cy="80" rx="8" ry="6" fill="url(#landGrad)" opacity="0.45" />
              <ellipse cx="85" cy="40" rx="6" ry="14" fill="url(#landGrad)" opacity="0.4" />
            </svg>
            
            {/* Grid lines for globe effect */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-15"
              viewBox="0 0 100 100"
            >
              {/* Latitude lines */}
              {[20, 35, 50, 65, 80].map((y) => (
                <ellipse 
                  key={`lat-${y}`}
                  cx="50" 
                  cy={y} 
                  rx={Math.sin((y / 100) * Math.PI) * 48} 
                  ry="2" 
                  fill="none" 
                  stroke="rgba(6, 182, 212, 0.5)" 
                  strokeWidth="0.3"
                />
              ))}
              {/* Longitude curves */}
              <path d="M50,2 Q30,50 50,98" fill="none" stroke="rgba(6, 182, 212, 0.5)" strokeWidth="0.3" />
              <path d="M50,2 Q70,50 50,98" fill="none" stroke="rgba(6, 182, 212, 0.5)" strokeWidth="0.3" />
              <path d="M50,2 L50,98" fill="none" stroke="rgba(6, 182, 212, 0.5)" strokeWidth="0.3" />
              <path d="M50,2 Q10,50 50,98" fill="none" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="0.2" />
              <path d="M50,2 Q90,50 50,98" fill="none" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="0.2" />
            </svg>
          </div>
          
          {/* Specular highlight */}
          <div 
            className="absolute top-8 left-8 w-1/3 h-1/4 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.25), transparent 70%)',
              transform: 'rotate(-30deg)',
            }}
          />
          
          {/* Atmospheric rim */}
          <div 
            className="absolute inset-3 rounded-full pointer-events-none"
            style={{
              background: 'transparent',
              boxShadow: 'inset 0 0 30px rgba(6, 182, 212, 0.3), inset 0 0 60px rgba(6, 182, 212, 0.1)',
            }}
          />
        </div>
        
        {/* Virgo Constellation - Woman Clothed with the Sun (below the globe) */}
        <div className="relative w-full flex justify-center mt-4">
          <svg 
            className="w-64 h-64 md:w-80 md:h-80 opacity-[0.08]"
            viewBox="0 0 400 400"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Virgo constellation stars */}
            <g fill="white">
              {/* Spica - brightest star */}
              <circle cx="200" cy="340" r="4" />
              {/* Head region */}
              <circle cx="180" cy="60" r="2.5" />
              <circle cx="200" cy="80" r="2" />
              {/* Shoulder/arm region */}
              <circle cx="130" cy="120" r="2.2" />
              <circle cx="240" cy="110" r="2" />
              <circle cx="280" cy="130" r="1.8" />
              {/* Torso */}
              <circle cx="195" cy="160" r="2.5" />
              <circle cx="190" cy="210" r="2.2" />
              <circle cx="198" cy="260" r="2.8" />
              {/* Extended arm with wheat */}
              <circle cx="320" cy="180" r="2" />
              <circle cx="355" cy="205" r="1.5" />
              {/* Lower body */}
              <circle cx="200" cy="300" r="2.2" />
            </g>
            {/* Connecting lines */}
            <g stroke="white" strokeWidth="0.8" fill="none" opacity="0.5">
              <path d="M180,60 L200,80 L195,160" />
              <path d="M200,80 L130,120" />
              <path d="M200,80 L240,110 L280,130" />
              <path d="M195,160 L190,210 L198,260 L200,300 L200,340" />
              <path d="M190,210 L320,180 L355,205" />
            </g>
            {/* Crown of 12 stars around head */}
            <g fill="rgba(255,215,0,0.4)">
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = 190 + Math.cos(angle) * 50;
                const y = 50 + Math.sin(angle) * 30;
                return <circle key={i} cx={x} cy={y} r="1.5" />;
              })}
            </g>
          </svg>
        </div>
        
        {/* Subtle particle effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-400/20"
              style={{
                left: `${20 + i * 10}%`,
                top: `${30 + (i % 3) * 20}%`,
                animation: `pulse ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default OrbPage;
