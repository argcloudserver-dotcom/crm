import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getListResaleUnitsQueryKey } from "@workspace/api-client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/shared/contexts/i18nContext";
import { patchResaleUnit } from "@workspace/api-client/hooks/resale";

interface ToggleHideFieldProps {
  unitId: string;
  field: "isOwnerPhoneHidden" | "isOwnerEmailHidden";
  value: boolean;
  label: string;
}

export function ToggleHideField({ unitId, field, value, label }: ToggleHideFieldProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => patchResaleUnit(unitId, { [field]: !value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListResaleUnitsQueryKey() });
      toast.success(`${label} ${!value ? t("resale.hidden") : t("resale.visible")}`);
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {value
        ? <EyeOff className="w-3.5 h-3.5 text-amber-500" />
        : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
      <span>{value ? t("resale.hidden") : t("resale.visible")}</span>
    </button>
  );
}
