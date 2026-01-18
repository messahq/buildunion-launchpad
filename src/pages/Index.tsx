import { useNavigate } from "react-router-dom";
import messaOrb from "@/assets/messa-orb.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen w-full bg-slate-50 flex items-center justify-center overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-50" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6">
        {/* MessaDock Title */}
        <h1 className="font-display text-2xl font-light tracking-widest text-slate-400 mb-12 uppercase">
          MessaDock
        </h1>

        {/* Interactive Orb */}
        <button
          onClick={() => navigate("/buildunion")}
          className="relative group cursor-pointer transition-all duration-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-200 rounded-full"
          aria-label="Enter BuildUnion"
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400/20 to-cyan-400/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150" />
          
          {/* Orb image */}
          <img
            src={messaOrb}
            alt="MESSA Orb"
            className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain drop-shadow-2xl transition-all duration-500 group-hover:drop-shadow-[0_0_60px_rgba(251,146,60,0.3)]"
          />
          
          {/* Subtle pulse animation ring */}
          <div className="absolute inset-0 rounded-full border border-slate-200/50 animate-ping opacity-20" />
        </button>

        {/* Subtle hint text */}
        <p className="mt-12 text-sm text-slate-400 font-light tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
          Click to enter
        </p>
      </div>
    </main>
  );
};

export default Index;
