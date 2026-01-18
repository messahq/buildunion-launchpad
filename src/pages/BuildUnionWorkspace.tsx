import BuildUnionHeader from "@/components/BuildUnionHeader";

const BuildUnionWorkspace = () => {
  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader />
      
      {/* Empty workspace content */}
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-slate-400 font-light tracking-widest uppercase text-sm">
          Workspace - Coming Soon
        </p>
      </div>
    </main>
  );
};

export default BuildUnionWorkspace;
