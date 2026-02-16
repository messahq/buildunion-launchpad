import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings2, 
  X, 
  ChevronUp,
  ChevronDown,
  Users,
  Sparkles
} from "lucide-react";
import { SubscriptionTier, TEAM_LIMITS } from "@/hooks/useSubscription";

const TIERS: { tier: SubscriptionTier; label: string; color: string }[] = [
  { tier: "free", label: "Free", color: "bg-slate-500" },
  { tier: "pro", label: "Pro", color: "bg-blue-500" },
  { tier: "premium", label: "Premium", color: "bg-purple-500" },
  { tier: "enterprise", label: "Enterprise", color: "bg-amber-500" },
];

const DevTierPanel = ({ userId }: { userId?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [currentOverride, setCurrentOverride] = useState<SubscriptionTier | null>(null);

  // Only show in development
  const isDev = import.meta.env.DEV;

  const storageKey = userId ? `dev_tier_override_${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored && TIERS.some(t => t.tier === stored)) {
      setCurrentOverride(stored as SubscriptionTier);
    } else {
      setCurrentOverride(null);
    }
  }, [storageKey]);

  const handleSetTier = (tier: SubscriptionTier) => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, tier);
    setCurrentOverride(tier);
    window.location.reload();
  };

  const handleClearOverride = () => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    setCurrentOverride(null);
    window.location.reload();
  };

  if (!isDev || !userId) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-[9999]">
        <Button
          size="default"
          variant="outline"
          className="bg-amber-500 text-black border-amber-600 hover:bg-amber-400 shadow-2xl gap-2 font-bold animate-pulse"
          onClick={() => setIsMinimized(false)}
        >
          <Settings2 className="h-5 w-5" />
          DEV TIER
          {currentOverride && (
            <Badge className={`${TIERS.find(t => t.tier === currentOverride)?.color} text-white text-xs`}>
              {currentOverride}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 w-72">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-sm">Dev Tier Tester</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setIsMinimized(true)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <p className="text-xs text-slate-400">
          Válassz egy tier-t a funkciók teszteléséhez. Az oldal újratöltődik a változtatás után.
        </p>

        {/* Tier Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {TIERS.map(({ tier, label, color }) => (
            <button
              key={tier}
              onClick={() => handleSetTier(tier)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${currentOverride === tier 
                  ? `${color} text-white ring-2 ring-white/30` 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{label}</span>
                {tier !== "free" && <Sparkles className="h-3 w-3" />}
              </div>
              <div className="text-xs opacity-70 mt-0.5">
                <Users className="h-3 w-3 inline mr-1" />
                {TEAM_LIMITS[tier] === Infinity ? "∞" : TEAM_LIMITS[tier]} team
              </div>
            </button>
          ))}
        </div>

        {/* Current Status */}
        {currentOverride && (
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Aktív override:</p>
                <p className="font-semibold text-amber-400 capitalize">{currentOverride}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-slate-600 hover:bg-slate-700"
                onClick={handleClearOverride}
              >
                Törlés
              </Button>
            </div>
          </div>
        )}

        {/* Feature Preview */}
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
          <p className="font-medium text-slate-400 mb-2">Tier features:</p>
          <ul className="space-y-1">
            <li>• <span className="text-blue-400">Pro:</span> 10 team member, roles disabled</li>
            <li>• <span className="text-purple-400">Premium:</span> 50 team, role választó</li>
            <li>• <span className="text-amber-400">Enterprise:</span> ∞ team, minden funkció</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DevTierPanel;
