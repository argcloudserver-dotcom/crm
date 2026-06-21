import { motion } from "framer-motion";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Edit, Home, Trash2, UserCheck } from "lucide-react";
import { useI18n } from "@/shared/contexts/i18nContext";
import { CARD_VARIANTS, type ResaleUnit } from "@workspace/core";
import { AddPhotoDialog } from "./AddPhotoDialog";

interface ResaleListRowProps {
  unit: ResaleUnit;
  index: number;
  isAdmin: boolean;
  formatPrice: (price: string | null | undefined) => string;
  onAssign: (unit: ResaleUnit) => void;
  onEdit: (unit: ResaleUnit) => void;
  onDelete: (id: string) => void;
}

export function ResaleListRow({
  unit,
  index,
  isAdmin,
  formatPrice,
  onAssign,
  onEdit,
  onDelete,
}: ResaleListRowProps) {
  const { t } = useI18n();

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 border">
        {unit.photos && unit.photos.length > 0 ? (
          <img
            src={unit.photos[0].url}
            alt={unit.projectName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{unit.projectName}</p>
          <Badge variant={unit.isActive ? "default" : "secondary"} className="text-xs shrink-0">
            {unit.isActive ? t("resale.available") : t("resale.inactive")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground capitalize">
          {unit.unitType ?? t("resale.property")}
          {unit.floor != null ? ` · ${t("resale.floor_n", { n: String(unit.floor) })}` : ""}
        </p>
      </div>

      <div className="text-end shrink-0">
        <p className="font-bold text-sm">{formatPrice(unit.price)}</p>
        {unit.area && <p className="text-xs text-muted-foreground">{unit.area} {t("resale.sqm")}</p>}
      </div>

      <div className="shrink-0 w-36 text-xs">
        {unit.ownerName && <p className="font-medium truncate">{unit.ownerName}</p>}
        {unit.ownerPhone && !unit.isOwnerPhoneHidden && (
          <p className="text-muted-foreground">{unit.ownerPhone}</p>
        )}
        {unit.ownerPhone && unit.isOwnerPhoneHidden && (
          <p className="text-muted-foreground tracking-widest">••••••</p>
        )}
      </div>

      {unit.assignedToName && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
          <UserCheck className="w-3.5 h-3.5" />
          <span className="max-w-[80px] truncate">{unit.assignedToName}</span>
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          <AddPhotoDialog unitId={unit.id} onAdded={() => {}} currentCount={unit.photos?.length ?? 0} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={() => onAssign(unit)}
            title={t("resale.assign")}
          >
            <UserCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={() => onEdit(unit)}
            title="تعديل"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(unit.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
