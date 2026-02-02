import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if app is already installed (Standalone mode) - includes iOS check
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsVisible(false);
      return; // Stop here, do not show anything
    }

    // 2. Check if dismissed recently (within 24 hours)
    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (dismissedTime > oneDayAgo) {
        return;
      }
    }

    // 3. Detect iOS (case-insensitive)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 4. Handle Android/Desktop Install Prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Force show for iOS web users (since they don't fire beforeinstallprompt)
    if (ios) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS Logic: Show instructions via alert
      alert(
        "To install BuildUnion on iOS:\n\n" +
        "1. Tap the Share button (square with arrow) below ⬇️\n" +
        "2. Scroll down and select 'Add to Home Screen' ➕"
      );
    } else if (deferredPrompt) {
      // Android/Chrome Logic: Trigger native prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-8 md:w-96 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-2xl border border-amber-400/20">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div 
          className="flex items-start gap-3 cursor-pointer" 
          onClick={handleInstallClick}
        >
          <div className="flex-shrink-0 bg-white/20 rounded-lg p-2">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Download className="w-5 h-5" />
              Add to Home Screen
            </h3>
            <p className="text-white/80 text-sm mt-1">
              {isIOS
                ? "Tap here for instructions to install the app."
                : "Install BuildUnion for quick access and offline functionality."}
            </p>

            {isIOS && (
              <div className="mt-3 flex items-center gap-2 text-white/90 text-xs">
                <span className="bg-white/20 px-2 py-1 rounded">
                  1. Tap{" "}
                  <svg
                    className="inline w-4 h-4 -mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l4 4h-3v8h-2V6H8l4-4zm8 10v8c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-8h2v8h12v-8h2z" />
                  </svg>
                </span>
                <span className="bg-white/20 px-2 py-1 rounded">
                  2. "Add to Home Screen"
                </span>
              </div>
            )}

            {!isIOS && deferredPrompt && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstallClick();
                }}
                className="mt-3 bg-white text-amber-600 hover:bg-white/90 font-medium"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
