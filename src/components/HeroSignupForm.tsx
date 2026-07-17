import { Clock } from "lucide-react";

const HeroSignupForm = () => {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-amber-500/30 bg-slate-900/70 backdrop-blur-md p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/40">
        <Clock className="h-7 w-7 text-amber-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Registration Temporarily Paused
      </h3>
      <p className="text-sm text-slate-300 leading-relaxed">
        We're putting the finishing touches on BuildUnion.
        Sign-ups and logins are closed for a short while — please check back soon.
      </p>
    </div>
  );
};

export default HeroSignupForm;
