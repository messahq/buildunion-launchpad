import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

const TRADES = [
  { value: "general_contractor", label: "General Contractor" },
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "carpenter", label: "Carpenter" },
  { value: "mason", label: "Mason / Bricklayer" },
  { value: "roofer", label: "Roofer" },
  { value: "hvac", label: "HVAC Technician" },
  { value: "painter", label: "Painter" },
  { value: "welder", label: "Welder" },
  { value: "concrete", label: "Concrete Worker" },
  { value: "drywall", label: "Drywall Installer" },
  { value: "flooring", label: "Flooring Specialist" },
  { value: "landscaper", label: "Landscaper" },
  { value: "project_manager", label: "Project Manager" },
  { value: "architect", label: "Architect / Engineer" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZES = [
  { value: "solo", label: "Solo (1 person)" },
  { value: "small", label: "Small (2–10)" },
  { value: "medium", label: "Medium (11–50)" },
  { value: "large", label: "Large (50+)" },
];

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !trade || !companySize || !location) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        email: email.trim().toLowerCase(),
        trade,
        company_size: companySize,
        location: location.trim(),
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the waitlist!");
          setSubmitted(true);
        } else {
          throw error;
        }
      } else {
        // Send welcome email
        supabase.functions.invoke("waitlist-welcome", {
          body: { email: email.trim(), trade, location },
        }).catch(() => {});

        setSubmitted(true);
        toast.success("Welcome to the waitlist!");
      }
    } catch (err) {
      console.error("Waitlist error:", err);
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
        <h3 className="text-white font-display text-xl font-semibold">You're on the list!</h3>
        <p className="text-zinc-400 text-sm text-center max-w-sm">
          We'll notify you when it's your turn to access BuildUnion. 
          Early members get exclusive benefits.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
      <Input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-500 h-11 backdrop-blur-sm"
      />
      
      <div className="grid grid-cols-2 gap-3">
        <Select value={trade} onValueChange={setTrade}>
          <SelectTrigger className="bg-zinc-800/80 border-zinc-700 text-white h-11 backdrop-blur-sm [&>span]:text-zinc-500 [&>span]:data-[value]:text-white">
            <SelectValue placeholder="Your trade" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {TRADES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-white hover:bg-zinc-700">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companySize} onValueChange={setCompanySize}>
          <SelectTrigger className="bg-zinc-800/80 border-zinc-700 text-white h-11 backdrop-blur-sm [&>span]:text-zinc-500 [&>span]:data-[value]:text-white">
            <SelectValue placeholder="Company size" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {COMPANY_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-white hover:bg-zinc-700">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input
        type="text"
        placeholder="City / Region (e.g. Toronto, ON)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
        maxLength={100}
        className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-500 h-11 backdrop-blur-sm"
      />

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold h-12 text-base shadow-lg shadow-amber-500/20 transition-all duration-200"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "Join the Waitlist"
        )}
      </Button>

      <p className="text-zinc-500 text-xs text-center">
        Early access is limited. We'll invite you based on your region and trade.
      </p>
    </form>
  );
};

export default WaitlistForm;
