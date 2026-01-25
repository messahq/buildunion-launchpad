import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Globe, LogOut, User, Crown, Zap, Folder, Eye, Sun, Moon, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useBuProfile } from "@/hooks/useBuProfile";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

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
  const { profile } = useBuProfile();
  const { theme, toggleTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const currentLang = languages.find((l) => l.code === selectedLanguage);
  
  // Get user display name from registration
  const getDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name;
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

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
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm transition-colors">
      <div className="container mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Left - Back to Dock */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/buildunion")}
          className="text-muted-foreground hover:text-foreground gap-1 sm:gap-2 px-1 sm:px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">Back to Home</span>
        </Button>

        {/* Center - Logo (hidden on very small screens) */}
        <div 
          className="hidden xs:flex absolute left-1/2 -translate-x-1/2 cursor-pointer"
          onClick={() => navigate("/buildunion")}
        >
          <span className="text-lg sm:text-xl font-light tracking-tight">
            <span className="text-foreground">Build</span>
            <span className="text-amber-500">Union</span>
          </span>
        </div>

        {/* Right - Auth Buttons & Language */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground px-2"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* My Projects Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/workspace")}
            className="text-muted-foreground hover:text-foreground font-medium px-1.5 sm:px-3 text-xs sm:text-sm gap-1"
          >
            <Folder className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </Button>

          {/* Community Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/community")}
            className="text-muted-foreground hover:text-foreground font-medium px-1.5 sm:px-3 text-xs sm:text-sm gap-1"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Community</span>
          </Button>

          {/* Messages Link - only for logged in users */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/messages")}
              className="text-muted-foreground hover:text-foreground font-medium px-1.5 sm:px-3 text-xs sm:text-sm gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </Button>
          )}

          {/* Language Selector - hidden on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1 px-1.5 sm:px-3 hidden sm:flex"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm hidden md:inline">{currentLang?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px] bg-popover">
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
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    {getTierIcon()}
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs dark:bg-amber-900/50 dark:text-amber-400">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-sm hidden md:inline">
                    {getDisplayName()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] bg-popover">
                <div className="px-2 py-2">
                  <p className="text-sm font-medium text-foreground">{getDisplayName()}</p>
                  {profile?.company_name && (
                    <p className="text-xs text-amber-600 font-medium">{profile.company_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {getTierBadge()}
                    {subscription.subscriptionEnd && (
                      <span className="text-xs text-muted-foreground">
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
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground py-1">
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
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
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
                className="text-muted-foreground hover:text-foreground font-medium"
              >
                Log In
              </Button>

              <Button
                size="sm"
                onClick={() => navigate("/buildunion/register")}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium"
              >
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default BuildUnionHeader;
