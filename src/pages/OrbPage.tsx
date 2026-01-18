import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const OrbPage = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen w-full bg-slate-950 flex items-center justify-center">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Dock</span>
        </Button>
      </div>

      {/* Empty page placeholder */}
      <p className="text-slate-500 font-light tracking-widest uppercase text-sm">
        Orb Module - Coming Soon
      </p>
    </main>
  );
};

export default OrbPage;
