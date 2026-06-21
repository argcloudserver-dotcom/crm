import { motion } from "framer-motion";
import {
  Edit,
  Home,
  Mail,
  Maximize2,
  Phone,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { useI18n } from "@/shared/contexts/i18nContext";
import { CARD_VARIANTS, type ResaleUnit } from "@workspace/core";
import { PhotoGallery } from "./PhotoGallery";
import { AddPhotoDialog } from "./AddPhotoDialog";
import { ToggleHideField } from "./ToggleHideField";

interface ResaleGridCardProps {
  unit: ResaleUnit;
  index: number;
  isAdmin: boolean;
  formatPrice: (price: string | null | undefined) => string;
  onAssign: (unit: ResaleUnit) => void;
  onEdit: (unit: ResaleUnit) => void;
  onDelete: (id: string) => void;
  onDeletePhoto: (unitId: string, photoId: string) => void;
}

export function ResaleGridCard({
  unit,
  index,
  isAdmin,
  formatPrice,
  onAssign,
  onEdit,
  onDelete,
  onDeletePhoto,
}: ResaleGridCardProps) {
  const { t } = useI18n();

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
    >
      <PhotoGallery
        photos={unit.photos ?? []}
        unitName={unit.projectName}
        noPhotosLabel={t("resale.no_photos")}
        onDeletePhoto={isAdmin ? (photoId) => onDeletePhoto(unit.id, photoId) : undefined}
      />

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{unit.projectName}</h3>
            <p className="text-xs text-muted-foreground capitalize mt-0.5 flex items-center gap-1">
              <Home className="w-3 h-3" />
              {unit.unitType ?? t("resale.property")}
              {unit.floor != null && ` · ${t("resale.floor_n", { n: String(unit.floor) })}`}
            </p>
          </div>
          <Badge variant={unit.isActive ? "default" : "secondary"} className="shrink-0 text-xs">
            {unit.isActive ? t("resale.available") : t("resale.inactive")}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {unit.price && (
            <span className="font-bold text-foreground text-base">{formatPrice(unit.price)}</span>
          )}
          {unit.area && (
            <span className="flex items-center gap-0.5">
              <Maximize2 className="w-3 h-3" /> {unit.area} {t("resale.sqm")}
            </span>
          )}
        </div>

        {unit.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{unit.description}</p>
        )}

        <Separator className="my-1" />

        <div className="space-y-1">
          {unit.ownerName && (
            <div className="flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{unit.ownerName}</span>
            </div>
          )}
          {unit.ownerPhone && !unit.isOwnerPhoneHidden && (
            <div className="flex items-center gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${unit.ownerPhone}`} className="text-primary hover:underline">{unit.ownerPhone}</a>
            </div>
          )}
          {unit.ownerPhone && unit.isOwnerPhoneHidden && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span className="select-none tracking-widest">••••••••</span>
            </div>
          )}
          {unit.ownerEmail && !unit.isOwnerEmailHidden && (
            <div className="flex items-center gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${unit.ownerEmail}`} className="text-primary hover:underline truncate">{unit.ownerEmail}</a>
            </div>
          )}
          {unit.ownerEmail && unit.isOwnerEmailHidden && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="select-none tracking-widest">••••••••</span>
            </div>
          )}
        </div>

        {unit.assignedToName && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-md px-2 py-1 mt-1">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-medium">{unit.assignedToName}</span>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center justify-between mt-auto pt-2 border-t">
            <div className="flex items-center gap-3">
              <ToggleHideField unitId={unit.id} field="isOwnerPhoneHidden" value={unit.isOwnerPhoneHidden} label="Phone" />
              <ToggleHideField unitId={unit.id} field="isOwnerEmailHidden" value={unit.isOwnerEmailHidden} label="Email" />
            </div>
            <div className="flex items-center gap-1">
              <AddPhotoDialog unitId={unit.id} onAdded={() => {}} currentCount={unit.photos?.length ?? 0} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted"
                onClick={() => onAssign(unit)}
                title={t("resale.assign")}
              >
                <UserCheck className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted"
                onClick={() => onEdit(unit)}
                title="تعديل"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(unit.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
