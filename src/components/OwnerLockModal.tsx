import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface OwnerLockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: () => void;
  title?: string;
  description?: string;
}

export function OwnerLockModal({
  open,
  onOpenChange,
  onAuthorized,
  title = "Owner Authorization Required",
  description = "You are modifying Operational Truth data. Please enter your account password to confirm.",
}: OwnerLockModalProps) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError("Unable to verify identity");
        return;
      }

      // Re-authenticate with password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        setError("Invalid password. Authorization denied.");
        return;
      }

      // Success
      toast.success("Owner authorized", { description: "Action permitted." });
      setPassword("");
      setError(null);
      onOpenChange(false);
      onAuthorized();
    } catch (err) {
      console.error("[OwnerLock] Verification failed:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md border-amber-500/50 bg-background">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-lg font-bold">
              {title}
            </AlertDialogTitle>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <AlertDialogDescription className="text-sm text-amber-700 dark:text-amber-300">
              ATTENTION: {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Account Password
          </label>
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            className="border-amber-500/30 focus:border-amber-500"
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={verifying}>
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleVerify}
            disabled={verifying || !password.trim()}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Authorize
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
