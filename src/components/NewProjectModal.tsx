import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, FileUp, Camera, Calculator, FileText, Brain, Crown, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { useSubscription } from "@/hooks/useSubscription";

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProjectModal = ({ open, onOpenChange }: NewProjectModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { remainingTrials, maxTrials } = useDbTrialUsage("blueprint_analysis");
  const { subscription } = useSubscription();
  const isPremium = subscription?.subscribed === true;

  const handleQuickMode = () => {
    onOpenChange(false);
    navigate("/buildunion/quick?flow=create");
  };

  const handleBlueprintMode = () => {
    onOpenChange(false);
    if (!user) {
      navigate("/buildunion/login", { state: { returnTo: "/buildunion/workspace/new" } });
    } else {
      navigate("/buildunion/workspace/new");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Új Projekt Indítása</DialogTitle>
          <DialogDescription>
            Válaszd ki a projekthez illő módszert
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Quick Mode Option */}
          <Card 
            className="cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
            onClick={handleQuickMode}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Quick Mode</h3>
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                      Gyors
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Kis munkákhoz, tervrajz nélkül. Fotó alapú becslés, sablonok, kalkulátor.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3 text-amber-500" />
                      Fotó becslés
                    </span>
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3 h-3 text-amber-500" />
                      Kalkulátor
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-amber-500" />
                      PDF ajánlat
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blueprint/M.E.S.S.A. Mode Option */}
          <Card 
            className="cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all group"
            onClick={handleBlueprintMode}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Blueprint Analysis</h3>
                    {!user ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="w-3 h-3" />
                        Bejelentkezés
                      </Badge>
                    ) : isPremium ? (
                      <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {remainingTrials}/{maxTrials} próba
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    M.E.S.S.A. dual-engine AI elemzés. Tervrajzok, dokumentumok feltöltése.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileUp className="w-3 h-3 text-cyan-500" />
                      PDF tervrajzok
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3 text-cyan-500" />
                      AI elemzés
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-cyan-500" />
                      Verified Facts
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Mindkét módszer eredményei összefűzhetők egy projekt summaryban
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
