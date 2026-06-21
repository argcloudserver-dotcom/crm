import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListResaleUnitsQueryKey,
  useAssignResaleUnit,
  useListUsers,
} from "@workspace/api-client";
import { toast } from "sonner";
import { UserCheck, UserX } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useI18n } from "@/shared/contexts/i18nContext";
import type { ResaleUnit } from "@workspace/core";

interface AssignDialogProps {
  unit: ResaleUnit;
  onClose: () => void;
}

export function AssignDialog({ unit, onClose }: AssignDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const assignUnit = useAssignResaleUnit();
  const { data: users = [] } = useListUsers() as {
    data: { id: string; name: string; role: string; email: string }[];
  };

  const employees = users.filter((u) => !["ceo", "admin", "director"].includes(u.role));
  const [selectedId, setSelectedId] = useState<string>(unit.assignedTo ?? "");

  const handleAssign = () => {
    assignUnit.mutate(
      { unitId: unit.id, data: { assignedTo: selectedId || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResaleUnitsQueryKey() });
          toast.success(selectedId ? t("resale.assign_success") : t("resale.unassign_success"));
          onClose();
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{t("resale.assign_dialog_title")}</DialogTitle>
        <p className="text-sm text-muted-foreground">{unit.projectName}</p>
      </DialogHeader>

      <div className="space-y-3 py-1">
        <button
          onClick={() => setSelectedId("")}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-start transition-all ${
            selectedId === ""
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <UserX className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{t("resale.unassigned")}</span>
        </button>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedId(emp.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-start transition-all ${
                selectedId === emp.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(emp?.name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{emp.name}</p>
                <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
              </div>
              {selectedId === emp.id && <UserCheck className="w-4 h-4 shrink-0 ms-auto text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={handleAssign} disabled={assignUnit.isPending}>
          {assignUnit.isPending ? "..." : t("resale.assign")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
