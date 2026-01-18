import DockHeader from "@/components/DockHeader";

const OrbPage = () => {
  return (
    <main className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 min-h-screen">
      <DockHeader title="Orb Module" accentColor="bg-cyan-500 hover:bg-cyan-600" />
      
      {/* Hero Section with Orb */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Animated background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96">
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.4), rgba(251, 146, 60, 0.2) 60%, transparent)',
              filter: 'blur(40px)',
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Orb Module
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Explore the power of the Orb - your gateway to advanced features.
          </p>
        </div>
      </section>
    </main>
  );
};

export default OrbPage;
