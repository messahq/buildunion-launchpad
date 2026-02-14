import { useNavigate } from "react-router-dom";
import DockHeader from "@/components/DockHeader";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const navigate = useNavigate();
  const runEngineeringAnalysis = async (projectData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("buildunion-brain", {
        body: {
          project_type: projectData?.type || "Renovation",
          image_url: projectData?.image || "",
          current_gross_sum: projectData?.total_budget || 0,
        },
      });

      if (error) throw error;

      console.log("Mérnöki válasz:", data);
      alert(`Elemzés kész! Státusz: ${data.financial_execution.status}`);
    } catch (err) {
      console.error("Hiba az elemzés során:", err);
      alert("Nem sikerült elérni a Mérnök Agyat.");
    }
  };
  return (
    <main className="relative min-h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <DockHeader title="MessaDock" showBackButton={false} accentColor="bg-cyan-500 hover:bg-cyan-600" />

      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      {/* Animated stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: Math.random() * 2 + 2 + "s",
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Virgo Constellation - Woman Clothed with the Sun */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "-40px" }}>
        <svg
          className="w-[550px] h-[550px] md:w-[700px] md:h-[700px] opacity-[0.22]"
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Virgo constellation stars with twinkling */}
          <g fill="white" className="constellation-stars">
            {/* Spica - brightest star */}
            <circle cx="200" cy="340" r="4" style={{ animation: "twinkle 3s ease-in-out infinite" }} />
            {/* Head region */}
            <circle cx="180" cy="60" r="2.5" style={{ animation: "twinkle 4s ease-in-out infinite 0.5s" }} />
            <circle cx="200" cy="80" r="2" style={{ animation: "twinkle 3.5s ease-in-out infinite 1s" }} />
            {/* Shoulder/arm region */}
            <circle cx="130" cy="120" r="2.2" style={{ animation: "twinkle 4.5s ease-in-out infinite 0.3s" }} />
            <circle cx="240" cy="110" r="2" style={{ animation: "twinkle 3.8s ease-in-out infinite 0.7s" }} />
            <circle cx="280" cy="130" r="1.8" style={{ animation: "twinkle 4.2s ease-in-out infinite 1.2s" }} />
            {/* Torso */}
            <circle cx="195" cy="160" r="2.5" style={{ animation: "twinkle 3.3s ease-in-out infinite 0.4s" }} />
            <circle cx="190" cy="210" r="2.2" style={{ animation: "twinkle 4.1s ease-in-out infinite 0.9s" }} />
            <circle cx="198" cy="260" r="2.8" style={{ animation: "twinkle 3.7s ease-in-out infinite 1.5s" }} />
            {/* Extended arm with wheat */}
            <circle cx="320" cy="180" r="2" style={{ animation: "twinkle 4.4s ease-in-out infinite 0.2s" }} />
            <circle cx="355" cy="205" r="1.5" style={{ animation: "twinkle 3.9s ease-in-out infinite 1.1s" }} />
            {/* Lower body */}
            <circle cx="200" cy="300" r="2.2" style={{ animation: "twinkle 4.3s ease-in-out infinite 0.6s" }} />
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

      {/* Top Section - BuildUnion Text */}
      <div className="relative z-10 flex flex-col items-center pt-8 md:pt-16 flex-1">
      </div>

      {/* Center Section - Clickable Orb */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ top: "30px" }}
      >
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
              background:
                "radial-gradient(circle at 30% 30%, rgba(251, 146, 60, 0.3), rgba(6, 182, 212, 0.2) 60%, transparent 80%)",
              filter: "blur(40px)",
              transform: "scale(1.4)",
            }}
          />

          {/* Globe with slow rotation */}
          <div
            className="relative w-40 h-40 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-full overflow-hidden transition-transform duration-500 group-hover:scale-105"
            style={{
              animation: "spinGlobe 80s linear infinite",
              background:
                "radial-gradient(circle at 35% 35%, rgba(251, 146, 60, 0.8), rgba(251, 146, 60, 0.4) 30%, rgba(6, 182, 212, 0.5) 60%, rgba(6, 182, 212, 0.9))",
              boxShadow: `
                inset -30px -30px 80px rgba(0, 0, 0, 0.5),
                inset 15px 15px 50px rgba(251, 146, 60, 0.3),
                0 0 80px rgba(251, 146, 60, 0.4),
                0 0 120px rgba(6, 182, 212, 0.3)
              `,
            }}
          >
            {/* Inner color layers */}
            <div
              className="absolute inset-4 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, rgba(251, 146, 60, 0.5), rgba(6, 182, 212, 0.4) 60%, transparent)",
              }}
            />
            <div
              className="absolute inset-8 rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.3), transparent 70%)",
              }}
            />
          </div>

          {/* Specular highlight */}
          <div
            className="absolute top-4 left-6 w-1/3 h-1/4 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.35), transparent 70%)",
              transform: "rotate(-25deg)",
            }}
          />

          {/* Atmospheric rim */}
          <div
            className="absolute inset-[-2px] rounded-full pointer-events-none"
            style={{
              background: "transparent",
              boxShadow: "inset 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 40px rgba(251, 146, 60, 0.2)",
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
