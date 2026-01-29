import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import buildUnionLogo from "@/assets/buildunion-logo.png";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/buildunion/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success("Password reset email sent!");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/login")}
            className="text-gray-600 hover:text-gray-900 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Login</span>
          </Button>
          <img
            src={buildUnionLogo}
            alt="BuildUnion Logo"
            className="h-10 w-auto object-contain"
          />
          <div className="w-20" />
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {!sent ? (
              <>
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Mail className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
                  Forgot Password?
                </h1>
                <p className="text-gray-500 text-center mb-8">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
                  Check Your Email
                </h1>
                <p className="text-gray-500 text-center mb-6">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Please check your inbox and follow the instructions.
                </p>
                <p className="text-sm text-gray-400 text-center mb-6">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSent(false)}
                  >
                    Try Another Email
                  </Button>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => navigate("/buildunion/login")}
                  >
                    Back to Login
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
