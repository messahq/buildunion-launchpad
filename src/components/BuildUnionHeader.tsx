import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Globe, LogOut, User, Plus, Crown, Zap, Folder, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import buildUnionLogo from "@/assets/buildunion-logo.png";
import AskMessaChat from "@/components/AskMessaChat";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ar", name: "العربية" },
  { code: "pt", name: "Português" },
  { code: "hu", name: "Magyar" },
];

const BuildUnionHeader = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === selectedLanguage);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const getTierIcon = () => {
    if (subscription.tier === "premium") {
      return <Crown className="h-3 w-3 text-amber-500" />;
    } else if (subscription.tier === "pro") {
      return <Zap className="h-3 w-3 text-blue-500" />;
    }
    return null;
  };

  const getTierBadge = () => {
    if (subscription.tier === "premium") {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-0.5">
          Premium
        </Badge>
      );
    } else if (subscription.tier === "pro") {
      return (
        <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">
          Pro
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs px-2 py-0.5">
        Free
      </Badge>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Left - Back to Dock */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-gray-600 hover:text-gray-900 gap-1 sm:gap-2 px-1 sm:px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">Back to Dock</span>
        </Button>

        {/* Center - Logo (hidden on very small screens) */}
        <div className="hidden xs:block absolute left-1/2 -translate-x-1/2">
          <img
            src={buildUnionLogo}
            alt="BuildUnion Logo"
            className="h-8 sm:h-12 w-auto object-contain"
          />
        </div>

        {/* Right - Ask Messa, Pricing, Auth Buttons & Language */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* Ask Messa Orb Button */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 hover:scale-110 transition-transform shadow-md flex items-center justify-center flex-shrink-0"
            title="Ask Messa AI"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-300 via-teal-300 to-amber-300 opacity-80" />
          </button>

          {/* My Projects Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/workspace")}
            className="text-gray-600 hover:text-gray-900 font-medium px-1.5 sm:px-3 text-xs sm:text-sm gap-1"
          >
            <Folder className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </Button>

          {/* Pricing Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/pricing")}
            className="text-gray-600 hover:text-gray-900 font-medium px-1.5 sm:px-3 text-xs sm:text-sm"
          >
            Pricing
          </Button>

          {/* Start New Project Button */}
          <Button
            size="sm"
            onClick={() => navigate("/buildunion/workspace/new")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 hidden md:flex"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>

          {/* Language Selector - hidden on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 gap-1 px-1.5 sm:px-3 hidden sm:flex"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm hidden md:inline">{currentLang?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={selectedLanguage === lang.code ? "bg-accent" : ""}
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            /* Logged in - User Menu */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:text-gray-900 gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    {getTierIcon()}
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-sm hidden md:inline">
                    {user.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] bg-white">
                <div className="px-2 py-2">
                  <p className="text-sm font-medium text-gray-900">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {getTierBadge()}
                    {subscription.subscriptionEnd && (
                      <span className="text-xs text-gray-400">
                        until {new Date(subscription.subscriptionEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/buildunion/profile/view")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                {subscription.subscribed && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/buildunion/pricing")}>
                      Manage Subscription
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {!subscription.subscribed && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/buildunion/pricing")} className="text-amber-600">
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {/* Language selector - visible in dropdown on mobile */}
                <div className="sm:hidden">
                  <DropdownMenuItem disabled className="text-xs text-gray-400 py-1">
                    <Globe className="h-3 w-3 mr-2" />
                    Language
                  </DropdownMenuItem>
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`pl-7 ${selectedLanguage === lang.code ? "bg-accent font-medium" : ""}`}
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Not logged in - Login/Register Buttons */
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/buildunion/login")}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Log In
              </Button>

              <Button
                size="sm"
                onClick={() => navigate("/buildunion/register")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium"
              >
                Register
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Ask Messa Chat */}
      <AskMessaChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </header>
  );
};

export default BuildUnionHeader;
