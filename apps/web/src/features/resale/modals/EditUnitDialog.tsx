import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useI18n } from "@/shared/contexts/i18nContext";
import { UNIT_TYPES, type ResaleUnit } from "@workspace/core";
import type { ResaleFormValues } from "@workspace/api-client/zod/resale";

interface EditUnitDialogProps {
  unit: ResaleUnit | null;
  form: Partial<ResaleFormValues>;
  onFormChange: (updater: (f: Partial<ResaleFormValues>) => Partial<ResaleFormValues>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}

export function EditUnitDialog({
  unit,
  form,
  onFormChange,
  onClose,
  onSave,
  saving,
}: EditUnitDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={!!unit} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل الوحدة: {unit?.projectName}</DialogTitle>
        </DialogHeader>
        {unit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("resale.project_name")}</Label>
                <Input
                  value={form.projectName ?? ""}
                  onChange={(e) => onFormChange((f) => ({ ...f, projectName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("resale.unit_type")}</Label>
                <Select
                  value={form.unitType ?? "apartment"}
                  onValueChange={(v) => onFormChange((f) => ({ ...f, unitType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((ty) => (
                      <SelectItem key={ty} value={ty} className="capitalize">{ty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{t("resale.price_egp")}</Label>
                <Input
                  value={form.price ?? ""}
                  onChange={(e) => onFormChange((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("resale.area_sqm")}</Label>
                <Input
                  value={form.area ?? ""}
                  onChange={(e) => onFormChange((f) => ({ ...f, area: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("resale.floor")}</Label>
                <Input
                  type="number"
                  value={form.floor ?? ""}
                  onChange={(e) => onFormChange((f) => ({ ...f, floor: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("resale.description")}</Label>
              <Textarea
                rows={2}
                className="resize-none"
                value={form.description ?? ""}
                onChange={(e) => onFormChange((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">{t("resale.owner_details")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("resale.owner_name")}</Label>
                <Input
                  value={form.ownerName ?? ""}
                  onChange={(e) => onFormChange((f) => ({ ...f, ownerName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("resale.owner_phone")}</Label>
                <Input
                  value={form.ownerPhone ?? ""}
                  onChange={(e) => onFormChange((f) => ({ ...f, ownerPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("resale.owner_email")}</Label>
              <Input
                type="email"
                value={form.ownerEmail ?? ""}
                onChange={(e) => onFormChange((f) => ({ ...f, ownerEmail: e.target.value }))}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
