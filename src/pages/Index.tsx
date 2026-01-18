import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen w-full bg-slate-950 flex items-center justify-center overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6">
        {/* MessaDock Title */}
        <h1 className="font-display text-2xl font-light tracking-[0.3em] text-slate-400/80 mb-16 uppercase animate-pulse">
          MessaDock
        </h1>

        {/* Interactive CSS Orb Container */}
        <button
          onClick={() => navigate("/buildunion")}
          className="relative group cursor-pointer focus:outline-none rounded-full"
          aria-label="Enter BuildUnion"
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
            className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full transition-all duration-700 group-hover:scale-110"
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

        {/* Hint text with fade */}
        <p className="mt-16 text-sm text-slate-500 font-light tracking-widest uppercase animate-pulse">
          Click to enter
        </p>
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
      `}</style>
    </main>
  );
};

export default Index;
