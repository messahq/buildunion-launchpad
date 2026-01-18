import DockHeader from "@/components/DockHeader";

const OrbPage = () => {
  return (
    <main className="bg-slate-50 min-h-screen">
      <DockHeader title="Orb Module" accentColor="bg-cyan-500 hover:bg-cyan-600" />
      
      {/* Empty workspace content */}
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-slate-400 font-light tracking-widest uppercase text-sm">
          Orb Module - Coming Soon
        </p>
      </div>
    </main>
  );
};

export default OrbPage;
