import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, RefreshCw, ShieldAlert, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import buildUnionLogo from "@/assets/buildunion-logo.png";

const VerifyEmailPending = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");
  const email = emailParam || user?.email || "";
  const [resending, setResending] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check if user is already verified
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;
      
      // Refresh session to get latest email_confirmed_at
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      
      if (refreshedUser?.email_confirmed_at) {
        toast.success(t("verifyEmail.verified"));
        navigate("/buildunion/workspace");
      }
    };

    checkVerification();
    
    // Poll every 5 seconds to check if user verified
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [user, navigate, t]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error(t("verifyEmail.emailNotFound"));
      return;
    }

    setResending(true);
    
    // Use custom Resend-powered email function for reliable delivery
    try {
      const response = await supabase.functions.invoke('send-verification-email', {
        body: {
          email,
          fullName: user?.user_metadata?.full_name,
          redirectUrl: `${window.location.origin}/buildunion/workspace`,
        },
      });

      if (response.error) {
        console.error('Resend email failed:', response.error);
        toast.error(t("verifyEmail.sendFailed") || "Failed to send verification email");
      } else {
        toast.success(t("verifyEmail.emailSent"));
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(t("verifyEmail.sendFailed") || "Failed to send verification email");
    }
    
    setResending(false);
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    
    // Force refresh the session
    const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
    
    if (error) {
      toast.error(t("verifyEmail.checkFailed"));
    } else if (refreshedUser?.email_confirmed_at) {
      toast.success(t("verifyEmail.verified"));
      navigate("/buildunion/workspace");
    } else {
      toast.info(t("verifyEmail.stillPending"));
    }
    
    setCheckingStatus(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/buildunion");
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full bg-card border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion")}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{t("common.back")}</span>
          </Button>
          <img
            src={buildUnionLogo}
            alt="BuildUnion Logo"
            className="h-10 w-auto object-contain"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">{t("common.signOut")}</span>
          </Button>
        </div>
      </header>

      {/* Verification Message */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl shadow-lg p-8 text-center border border-border">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            </div>

            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {t("verifyEmail.title")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t("verifyEmail.description")}{" "}
              {email && (
                <span className="font-medium text-foreground">{email}</span>
              )}
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{t("verifyEmail.securityNote")}</strong>{" "}
                {t("verifyEmail.securityMessage")}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCheckStatus}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={checkingStatus}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? "animate-spin" : ""}`} />
                {checkingStatus ? t("verifyEmail.checking") : t("verifyEmail.checkStatus")}
              </Button>

              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full gap-2"
                disabled={resending || !email}
              >
                <Mail className={`h-4 w-4 ${resending ? "animate-pulse" : ""}`} />
                {resending ? t("verifyEmail.sending") : t("verifyEmail.resend")}
              </Button>
            </div>

            <p className="text-muted-foreground text-sm mt-6">
              {t("verifyEmail.spamTip")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default VerifyEmailPending;