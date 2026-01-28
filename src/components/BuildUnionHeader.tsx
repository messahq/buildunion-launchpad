import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Globe, LogOut, User, Crown, Zap, Folder, Eye, Sun, Moon, Users, MessageSquare, Loader2, ChevronDown, Newspaper, Menu, X, Home, CreditCard, Shield, Search } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useBuProfile } from "@/hooks/useBuProfile";
import { useTheme } from "@/hooks/useTheme";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { GlobalSearch, GlobalSearchTrigger } from "@/components/GlobalSearch";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ja", name: "日本語" },
  { code: "hi", name: "हिन्दी" },
  { code: "hu", name: "Magyar" },
];

interface BuildUnionHeaderProps {
  projectMode?: "solo" | "team";
  summaryId?: string;
  projectId?: string;
  onModeChange?: (mode: "solo" | "team") => void;
}

const BuildUnionHeader = ({ projectMode, summaryId, projectId, onModeChange }: BuildUnionHeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const { profile } = useBuProfile();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useUnreadMessages();
  const { isAdmin } = useAdminRole();
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

  // Sync selectedLanguage with i18n.language on mount and language changes
  useEffect(() => {
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  // Sync language changes
  const handleLanguageChange = (langCode: string) => {
    console.log('Changing language to:', langCode);
    i18n.changeLanguage(langCode).then(() => {
      setSelectedLanguage(langCode);
      localStorage.setItem('language', langCode);
    });
  };
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const [sheetLanguageExpanded, setSheetLanguageExpanded] = useState(false);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check if user can access team mode (Pro/Premium/Enterprise)
  const canAccessTeamMode =
    subscription?.tier === "pro" ||
    subscription?.tier === "premium" ||
    subscription?.tier === "enterprise";

  // Handle mode toggle from header indicator
  const handleModeToggle = async () => {
    if (!summaryId || !onModeChange) return;
    
    // If switching to team and not authorized, redirect to pricing
    if (projectMode === "solo" && !canAccessTeamMode) {
      toast.info("Upgrade to Pro to unlock Team features");
      navigate("/buildunion/pricing");
      return;
    }

    setIsTogglingMode(true);
    try {
      const newMode = projectMode === "solo" ? "team" : "solo";
      
      // If project already exists, just update mode
      if (projectId) {
        const { error } = await supabase
          .from("project_summaries")
          .update({ mode: newMode })
          .eq("id", summaryId);

        if (error) throw error;
        
        onModeChange(newMode);
        toast.success(`Switched to ${newMode === "team" ? "Team" : "Solo"} mode`);
      } else if (newMode === "team") {
        // Need to create project - navigate to project creation
        toast.success("Opening Team Project setup...");
        navigate(`/buildunion/workspace/new?fromQuickMode=${encodeURIComponent(JSON.stringify({ summaryId }))}`);
      }
    } catch (error: any) {
      console.error("Mode toggle error:", error);
      toast.error(error.message || "Failed to switch mode");
    } finally {
      setIsTogglingMode(false);
    }
  };

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
    <>
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm transition-colors">
      <div className="container mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Left - Logo + Mode Indicator */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Back button - only on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion")}
            className="text-muted-foreground hover:text-foreground p-1.5 sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Logo - just decorative, not clickable */}
          <span className="text-lg sm:text-xl font-light tracking-tight">
            <span className="text-foreground">Build</span>
            <span className="text-amber-500">Union</span>
          </span>
          
          {/* Project Mode Indicator removed - now shown at bottom of page */}
        </div>

        {/* Right - Navigation & Auth */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* Global Search Button */}
          <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-muted-foreground hover:text-foreground px-2"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background border-l border-border">
              <SheetHeader className="border-b border-border pb-4 mb-4">
                <SheetTitle className="text-left">
                  <span className="font-display font-bold text-lg">
                    <span className="text-foreground">Build</span>
                    <span className="text-amber-500">Union</span>
                  </span>
                </SheetTitle>
              </SheetHeader>
              
              <nav className="flex flex-col gap-1">
                {/* Home */}
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11"
                  onClick={() => { navigate("/buildunion"); setMobileMenuOpen(false); }}
                >
                  <Home className="h-4 w-4" />
                  Home
                </Button>

                {/* Projects */}
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11"
                  onClick={() => { navigate("/buildunion/workspace"); setMobileMenuOpen(false); }}
                >
                  <Folder className="h-4 w-4" />
                  Projects
                </Button>

                {/* Community Section */}
                <div className="mt-2 mb-1">
                  <p className="text-xs font-medium text-muted-foreground px-4 py-2 uppercase tracking-wider">Community</p>
                </div>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11"
                  onClick={() => { navigate("/buildunion/community"); setMobileMenuOpen(false); }}
                >
                  <Newspaper className="h-4 w-4" />
                  News & Updates
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11"
                  onClick={() => { navigate("/buildunion/forum"); setMobileMenuOpen(false); }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Discussion Forum
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11"
                  onClick={() => { navigate("/buildunion/members"); setMobileMenuOpen(false); }}
                >
                  <User className="h-4 w-4" />
                  Member Directory
                </Button>

                {/* Messages - only for logged in users */}
                {user && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 relative"
                    onClick={() => { navigate("/buildunion/messages"); setMobileMenuOpen(false); }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Messages
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] flex items-center justify-center rounded-full"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                )}

                {/* Divider */}
                <div className="my-3 border-t border-border" />

                {/* Language Selector - Collapsible */}
                <div className="px-4 py-2">
                  <button
                    onClick={() => setSheetLanguageExpanded(!sheetLanguageExpanded)}
                    className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      Language: {currentLang?.name}
                    </span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${sheetLanguageExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {sheetLanguageExpanded && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {languages.map((lang) => (
                        <Button
                          key={lang.code}
                          variant={selectedLanguage === lang.code ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            handleLanguageChange(lang.code);
                            setSheetLanguageExpanded(false);
                          }}
                          className={selectedLanguage === lang.code ? "bg-amber-500 hover:bg-amber-600" : ""}
                        >
                          {lang.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme Toggle */}
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Theme</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="w-full justify-start gap-2"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-4 w-4 text-amber-500" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        Dark Mode
                      </>
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-border" />

                {/* Pricing */}
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11"
                  onClick={() => { navigate("/buildunion/pricing"); setMobileMenuOpen(false); }}
                >
                  <CreditCard className="h-4 w-4" />
                  Pricing
                </Button>

                {/* Auth buttons for mobile */}
                {!user && (
                  <div className="flex flex-col gap-2 mt-4 px-2">
                    <Button
                      variant="outline"
                      onClick={() => { navigate("/buildunion/login"); setMobileMenuOpen(false); }}
                      className="w-full"
                    >
                      Log In
                    </Button>
                    <Button
                      onClick={() => { navigate("/buildunion/register"); setMobileMenuOpen(false); }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Register
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Dark Mode Toggle - hidden on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground px-2 hidden md:flex"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Desktop Navigation - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 md:gap-2">
            {/* My Projects Link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/workspace")}
              className="text-muted-foreground hover:text-foreground font-medium px-3 text-sm gap-1"
            >
              <Folder className="h-4 w-4" />
              Projects
            </Button>

            {/* Community Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground font-medium px-3 text-sm gap-1"
                >
                  <Users className="h-4 w-4" />
                  Community
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover border border-border shadow-lg z-50">
                <DropdownMenuItem 
                  onClick={() => navigate("/buildunion/community")}
                  className="cursor-pointer gap-2"
                >
                  <Newspaper className="h-4 w-4" />
                  News & Updates
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/buildunion/forum")}
                  className="cursor-pointer gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Discussion Forum
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/buildunion/members")}
                  className="cursor-pointer gap-2"
                >
                  <User className="h-4 w-4" />
                  Member Directory
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Messages Link - only for logged in users */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/buildunion/messages")}
                className="text-muted-foreground hover:text-foreground font-medium px-3 text-sm gap-1 relative"
              >
                <MessageSquare className="h-4 w-4" />
                Messages
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[10px] flex items-center justify-center rounded-full"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-3"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm hidden lg:inline">{currentLang?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px] bg-popover border border-border shadow-lg z-50">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleLanguageChange(lang.code);
                    }}
                    className={`cursor-pointer ${selectedLanguage === lang.code ? "bg-muted font-medium" : ""}`}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
              <DropdownMenuContent align="end" className="min-w-[200px] bg-popover [&_.dropdown-item]:hover:bg-gradient-to-r [&_.dropdown-item]:hover:from-amber-50/80 [&_.dropdown-item]:hover:via-orange-50/60 [&_.dropdown-item]:hover:to-yellow-50/40 [&_.dropdown-item]:dark:hover:from-amber-950/30 [&_.dropdown-item]:dark:hover:via-orange-950/20 [&_.dropdown-item]:dark:hover:to-yellow-950/10">
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
                <DropdownMenuItem onClick={() => navigate("/buildunion/profile/view")} className="hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10">
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="text-red-600 dark:text-red-400">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                    {/* Dev Tier Selector - Admin only */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <DropdownMenuItem className="text-amber-600 dark:text-amber-400 cursor-pointer">
                          <Crown className="h-4 w-4 mr-2" />
                          Dev Tier: {localStorage.getItem("dev_tier_override") || "none"}
                          <ChevronDown className="h-3 w-3 ml-auto" />
                        </DropdownMenuItem>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent side="left" align="start" className="w-40 bg-popover border border-border">
                          {(["free", "pro", "premium", "enterprise"] as const).map((tier) => (
                            <DropdownMenuItem
                              key={tier}
                              onClick={() => {
                                localStorage.setItem("dev_tier_override", tier);
                                window.location.reload();
                              }}
                              className={`capitalize hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10 ${localStorage.getItem("dev_tier_override") === tier ? "bg-amber-50 dark:bg-amber-950/30 font-medium" : ""}`}
                            >
                              {tier === "free" && "🆓 Free"}
                              {tier === "pro" && "⚡ Pro"}
                              {tier === "premium" && "👑 Premium"}
                              {tier === "enterprise" && "🏢 Enterprise"}
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            localStorage.removeItem("dev_tier_override");
                            window.location.reload();
                          }}
                          className="text-muted-foreground hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10"
                        >
                          Clear Override
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenuSeparator />
                  </>
                )}
                {subscription.subscribed && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/buildunion/pricing")} className="hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10">
                      Manage Subscription
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {!subscription.subscribed && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/buildunion/pricing")} className="text-amber-600 hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10">
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {/* Language selector - collapsible in dropdown */}
                <div className="sm:hidden">
                  <DropdownMenuItem 
                    className="text-xs text-muted-foreground py-1 cursor-pointer hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10"
                    onClick={(e) => {
                      e.preventDefault();
                      setLanguageExpanded(!languageExpanded);
                    }}
                  >
                    <Globe className="h-3 w-3 mr-2" />
                    Language: {currentLang?.name}
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${languageExpanded ? 'rotate-180' : ''}`} />
                  </DropdownMenuItem>
                  {languageExpanded && (
                    <>
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => {
                            handleLanguageChange(lang.code);
                            setLanguageExpanded(false);
                          }}
                          className={`pl-7 hover:bg-gradient-to-r hover:from-amber-50/80 hover:via-orange-50/60 hover:to-yellow-50/40 dark:hover:from-amber-950/30 dark:hover:via-orange-950/20 dark:hover:to-yellow-950/10 ${selectedLanguage === lang.code ? "bg-amber-50 dark:bg-amber-950/30 font-medium" : ""}`}
                        >
                          {lang.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
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

    {/* Global Search Modal */}
    <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default BuildUnionHeader;
