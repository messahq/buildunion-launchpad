import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import buildUnionLogo from "@/assets/buildunion-logo.png";
import { ConstructionLoader } from "@/components/ui/loading-states";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If user is already logged in, show message
  if (!authLoading && user) {
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
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('login.alreadyLoggedIn', 'You are already logged in')}
              </h1>
              <p className="text-gray-500 mb-6">
                {t('login.alreadyLoggedInDesc', 'You are currently signed in to your account.')}
              </p>
              <Button
                onClick={() => navigate("/buildunion/workspace")}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {t('login.goToWorkspace', 'Go to Workspace')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        toast.error("Please confirm your email before logging in");
        navigate(`/buildunion/confirm-email?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Successfully logged in!");
      navigate("/buildunion/workspace");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/buildunion/workspace")}
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
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-center mb-8">
              Sign in to your BuildUnion account
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => navigate("/buildunion/forgot-password")}
                    className="text-sm text-orange-500 hover:text-orange-600"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <ConstructionLoader show={loading} label="Signing you in…" sublabel="Verifying credentials" icon="hardhat" />
              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white relative overflow-hidden"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/buildunion/register")}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Register
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
