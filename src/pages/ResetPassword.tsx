import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import buildUnionLogo from "@/assets/buildunion-logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if user has a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // The reset password link should have created a session
      if (!session) {
        setError("Invalid or expired reset link. Please request a new password reset.");
      }
    };
    
    checkSession();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        
        // Sign out and redirect to login after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate("/buildunion/login");
        }, 3000);
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col">
        <header className="w-full bg-white border-b border-gray-200 px-6 py-4">
          <div className="container mx-auto flex items-center justify-center">
            <img
              src={buildUnionLogo}
              alt="BuildUnion Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Link Expired
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => navigate("/buildunion/forgot-password")}
              >
                Request New Reset Link
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full bg-white border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-center">
          <img
            src={buildUnionLogo}
            alt="BuildUnion Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {!success ? (
              <>
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Lock className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
                  Set New Password
                </h1>
                <p className="text-gray-500 text-center mb-8">
                  Enter your new password below. Make sure it's strong and secure.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p className={password.length >= 8 ? "text-green-600" : ""}>
                      • At least 8 characters
                    </p>
                    <p className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                      • One uppercase letter
                    </p>
                    <p className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                      • One lowercase letter
                    </p>
                    <p className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                      • One number
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Password"}
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
                  Password Updated!
                </h1>
                <p className="text-gray-500 text-center mb-6">
                  Your password has been successfully updated. You'll be redirected to the login page shortly.
                </p>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => navigate("/buildunion/login")}
                >
                  Go to Login
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
