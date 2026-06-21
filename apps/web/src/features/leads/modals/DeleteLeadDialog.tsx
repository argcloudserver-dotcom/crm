import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import type { TFunc } from "@workspace/core";

export interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TFunc;
  onConfirm: () => void;
}

export function DeleteLeadDialog({ open, onOpenChange, t, onConfirm }: DeleteLeadDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leads.delete_lead_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("leads.delete_lead_desc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("leads.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
