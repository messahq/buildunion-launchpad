import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface RequireEmailVerificationProps {
  children: React.ReactNode;
}

/**
 * Protected route wrapper that requires email verification.
 * Redirects unverified users to the verification pending page.
 */
export const RequireEmailVerification = ({ children }: RequireEmailVerificationProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        // Get fresh user data to check email_confirmed_at
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        
        if (freshUser?.email_confirmed_at) {
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        console.error("Error checking email verification:", error);
        setIsVerified(false);
      } finally {
        setChecking(false);
      }
    };

    if (!loading) {
      checkEmailVerification();
    }
  }, [user, loading]);

  // Still loading auth state
  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/buildunion/login" state={{ from: location }} replace />;
  }

  // Logged in but not verified - redirect to verification page
  if (isVerified === false) {
    const email = user.email || "";
    return <Navigate to={`/buildunion/verify-email?email=${encodeURIComponent(email)}`} replace />;
  }

  // Verified - render children
  return <>{children}</>;
};

export default RequireEmailVerification;