import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ArchiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onArchive: () => void;
  onPermanentDelete: () => void;
  mode: "archive" | "restore";
}

export const ArchiveConfirmDialog = ({
  open,
  onOpenChange,
  projectName,
  onArchive,
  onPermanentDelete,
  mode,
}: ArchiveConfirmDialogProps) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    await onPermanentDelete();
    setIsDeleting(false);
    onOpenChange(false);
  };

  if (mode === "restore") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-600" />
              {t("archive.archivedProject", "Archived Project")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <span className="font-semibold text-foreground">"{projectName}"</span>
              <br /><br />
              {t("archive.restoreOrDelete", "Would you like to restore this project or permanently delete it?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                onArchive();
                onOpenChange(false);
              }}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Undo2 className="h-4 w-4" />
              {t("archive.restore", "Restore")}
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("archive.deletePermanently", "Delete Permanently")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("archive.deleteProject", "Delete Project?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {t("archive.deleteConfirmation", "Are you sure you want to delete")} <span className="font-semibold text-foreground">"{projectName}"</span>?
            <br /><br />
            {t("archive.archiveOption", "You can archive it instead to restore it later, or delete it permanently.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              onArchive();
              onOpenChange(false);
            }}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <Archive className="h-4 w-4" />
            {t("archive.moveToArchive", "Move to Archive")}
          </Button>
          <Button
            variant="destructive"
            onClick={handlePermanentDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("archive.deletePermanently", "Delete Permanently")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ArchiveConfirmDialog;
