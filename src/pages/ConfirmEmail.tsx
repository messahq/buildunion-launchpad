import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import buildUnionLogo from "@/assets/buildunion-logo.png";

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Email address not found");
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Confirmation email sent!");
    }
    setResending(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion")}
            className="text-gray-600 hover:text-gray-900 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Button>
          <img
            src={buildUnionLogo}
            alt="BuildUnion Logo"
            className="h-10 w-auto object-contain"
          />
          <div className="w-20" />
        </div>
      </header>

      {/* Confirmation Message */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-orange-500" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-gray-500 mb-6">
              We've sent a confirmation link to{" "}
              {email && (
                <span className="font-medium text-gray-700">{email}</span>
              )}
              {!email && "your email address"}. Please click the link to verify
              your account.
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full gap-2"
                disabled={resending || !email}
              >
                <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending..." : "Resend Confirmation Email"}
              </Button>

              <Button
                onClick={() => navigate("/buildunion/login")}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                Go to Login
              </Button>
            </div>

            <p className="text-gray-400 text-sm mt-6">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ConfirmEmail;
