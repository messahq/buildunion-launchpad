import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DockHeaderProps {
  logo?: React.ReactNode;
  title: string;
  accentColor?: string;
}

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

const DockHeader = ({ logo, title, accentColor = "bg-orange-500 hover:bg-orange-600" }: DockHeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const currentLang = languages.find((l) => l.code === selectedLanguage);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left - Back to Dock */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-gray-600 hover:text-gray-900 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">Back to Dock</span>
        </Button>

        {/* Center - Logo/Title */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {logo}
          {!logo && (
            <span className="text-xl font-semibold text-gray-800">{title}</span>
          )}
        </div>

        {/* Right - Auth Buttons & Language */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 gap-1"
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
                  <User className="h-4 w-4" />
                  <span className="text-sm hidden md:inline">
                    {user.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem className="text-gray-500 text-xs">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                onClick={() => navigate("/dock/login")}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Log In
              </Button>

              <Button
                size="sm"
                onClick={() => navigate("/dock/register")}
                className={`${accentColor} text-white font-medium`}
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

export default DockHeader;
