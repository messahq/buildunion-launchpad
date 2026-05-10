import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

const evaluateStrength = (pw: string): { score: StrengthLevel; label: string } => {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: score as StrengthLevel, label: labels[score] };
};

const HeroSignupForm = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const strength = useMemo(() => evaluateStrength(password), [password]);
  const emailValid = useMemo(
    () => email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === "function") {
        setCapsLockOn(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, []);

  const strengthColors = [
    "bg-zinc-700",
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-emerald-500",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!emailValid) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Canada-only gate: verify caller IP geolocation before creating account
      try {
        const { data: geo } = await supabase.functions.invoke("country-check");
        if (geo && geo.allowed === false) {
          toast.error(
            `BuildUnion is currently available in Canada only. Detected location: ${geo.countryName || geo.country || "Unknown"}.`
          );
          setLoading(false);
          return;
        }
      } catch (geoErr) {
        console.warn("Country check failed, allowing signup:", geoErr);
      }

      const { error } = await signUp(email.trim(), password, fullName.trim());

      if (error) {
        toast.error(error.message);
      } else {
        // Fire welcome email in background (non-blocking)
        supabase.functions.invoke("send-welcome-email", {
          body: { email: email.trim(), fullName: fullName.trim() },
        }).catch(() => {});

        toast.success("Check your email to verify your account!");
        setSubmitted(true);
        // Redirect to the dedicated confirmation screen with resend option
        setTimeout(() => {
          navigate(`/buildunion/confirm-email?email=${encodeURIComponent(email.trim())}`);
        }, 1200);
      }
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-white font-display text-xl font-semibold">Account Created!</h3>
        <p className="text-zinc-400 text-sm text-center max-w-sm">
          We sent a verification link to your email. Please confirm to get started.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dock-login")}
          className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10 mt-2"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
      <Input
        type="text"
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        maxLength={100}
        autoComplete="name"
        className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-300 h-11 backdrop-blur-sm"
      />

      <div>
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-invalid={!emailValid}
          className={`bg-zinc-800/80 text-white placeholder:text-zinc-300 h-11 backdrop-blur-sm ${
            !emailValid ? "border-red-500/70" : "border-zinc-700"
          }`}
        />
        {!emailValid && (
          <p className="text-red-400 text-xs mt-1 ml-1">Invalid email format</p>
        )}
      </div>

      <div>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-300 h-11 backdrop-blur-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= strength.score ? strengthColors[strength.score] : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-300 ml-1">
              Strength: <span className="font-medium">{strength.label}</span>
            </p>
          </div>
        )}

        {capsLockOn && (
          <p className="flex items-center gap-1 text-amber-400 text-xs mt-2 ml-1">
            <AlertTriangle className="h-3 w-3" />
            Caps Lock is on
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold h-12 text-base shadow-lg shadow-amber-500/20 transition-all duration-200"
      >
        {loading ? <HardHatSpinner size="sm" /> : "Get Started — Free"}
      </Button>

      <p className="text-zinc-300 text-xs text-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
        Already have an account?{" "}
        <button type="button" onClick={() => navigate("/dock-login")} className="text-amber-400 hover:text-amber-300 underline">
          Sign in
        </button>
      </p>
    </form>
  );
};

export default HeroSignupForm;
