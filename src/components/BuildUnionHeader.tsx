import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import buildUnionLogo from "@/assets/buildunion-logo.png";

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
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const currentLang = languages.find((l) => l.code === selectedLanguage);

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

        {/* Center - Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <img
            src={buildUnionLogo}
            alt="BuildUnion Logo"
            className="h-12 w-auto object-contain"
          />
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

          {/* Login Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            Log In
          </Button>

          {/* Register Button */}
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium"
          >
            Register
          </Button>
        </div>
      </div>
    </header>
  );
};

export default BuildUnionHeader;
