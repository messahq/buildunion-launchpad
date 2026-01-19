import { usePendingInvitations } from "@/hooks/useProjectTeam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Mail, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PendingInvitations = () => {
  const navigate = useNavigate();
  const { invitations, loading, acceptInvitation, declineInvitation } = usePendingInvitations();

  const handleAccept = async (invitationId: string, projectId: string, projectName: string) => {
    const result = await acceptInvitation(invitationId, projectId);
    if (result.success) {
      toast.success(`You've joined "${projectName}"!`);
      // Navigate to the project
      navigate(`/buildunion/project/${projectId}`);
    } else {
      toast.error(result.error || "Failed to accept invitation");
    }
  };

  const handleDecline = async (invitationId: string, projectName: string) => {
    if (!confirm(`Decline invitation to "${projectName}"?`)) return;
    
    const result = await declineInvitation(invitationId);
    if (result.success) {
      toast.success("Invitation declined");
    } else {
      toast.error(result.error || "Failed to decline invitation");
    }
  };

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Mail className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Project Invitations</h3>
            <p className="text-xs text-slate-500">
              {invitations.length} pending invitation{invitations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{invitation.project_name}</p>
                  <p className="text-xs text-slate-500">
                    Invited {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDecline(invitation.id, invitation.project_name)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleAccept(invitation.id, invitation.project_id, invitation.project_name)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Join
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingInvitations;
