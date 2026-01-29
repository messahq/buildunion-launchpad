import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Key, LogOut, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Logout all devices state
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain a number";
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);

    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setChangingPassword(false);
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged out from all devices");
        navigate("/buildunion/login");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoggingOutAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setDeletingAccount(true);

    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { confirmation: deleteConfirmation },
      });

      if (error) {
        toast.error(error.message || "Failed to delete account");
      } else {
        toast.success("Account deleted successfully");
        await signOut();
        navigate("/buildunion");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security & Privacy
        </CardTitle>
        <CardDescription>
          Manage your account security and privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Change Password Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Change Password</h3>
          </div>
          
          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className={newPassword.length >= 8 ? "text-green-600" : ""}>• At least 8 characters</p>
                <p className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>• One uppercase letter</p>
                <p className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>• One lowercase letter</p>
                <p className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>• One number</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </div>

        {/* Logout All Devices Section */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Session Management</h3>
          </div>
          
          <div className="pl-6">
            <p className="text-sm text-muted-foreground mb-3">
              Lost your phone or suspect unauthorized access? Log out from all devices including this one.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout All Devices
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log you out from all devices where you're currently signed in, 
                    including this one. You'll need to log in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogoutAllDevices}
                    disabled={loggingOutAll}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {loggingOutAll ? "Logging out..." : "Logout All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h3 className="font-medium text-destructive">Danger Zone</h3>
          </div>
          
          <div className="pl-6">
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action is <strong>permanent and irreversible</strong>. All your data will be deleted:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Your profile and account information</li>
                      <li>All your projects and project data</li>
                      <li>All contracts and documents</li>
                      <li>Messages and forum posts</li>
                      <li>Any active subscriptions</li>
                    </ul>
                    <div className="pt-2">
                      <Label htmlFor="deleteConfirm" className="text-foreground">
                        Type <strong>DELETE</strong> to confirm:
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="DELETE"
                        className="mt-2"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== "DELETE" || deletingAccount}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete My Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySettings;
