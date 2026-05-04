import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";

const HeroSignupForm = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields");
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
        setSubmitted(true);
        toast.success("Check your email to verify your account!");
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
        className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-300 h-11 backdrop-blur-sm"
      />

      <Input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-300 h-11 backdrop-blur-sm"
      />

      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-300 h-11 backdrop-blur-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
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
