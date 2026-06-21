import { useMemo, useState } from "react";
import { useListResaleUnits } from "@workspace/api-client";
import { Dialog } from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Home } from "lucide-react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useI18n } from "@/shared/contexts/i18nContext";
import { toast } from "sonner";
import type { PendingPhoto, ResaleUnit } from "@workspace/core";
import { useResaleActions } from "@workspace/api-client/hooks/resale";
import { ResaleFilters } from "../components/ResaleFilters";
import { ResaleGridCard } from "../components/ResaleGridCard";
import { ResaleListRow } from "../components/ResaleListRow";
import { AddUnitDialog } from "../modals/AddUnitDialog";
import { AssignDialog } from "../modals/AssignDialog";
import { EditUnitDialog } from "../modals/EditUnitDialog";

function formatPrice(price: string | null | undefined): string {
  if (!price) return "-";
  const num = Number(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(num);
}

export function ResalePage() {
  const { t } = useI18n();
  const { currentUser } = useAuth();
  const isAdmin = !!currentUser && ["ceo", "admin", "director"].includes(currentUser.role);

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const { data: allUnits = [], isLoading } = useListResaleUnits() as {
    data: ResaleUnit[];
    isLoading: boolean;
  };

  const {
    editingUnit,
    editForm,
    setEditForm,
    editSaving,
    openEdit,
    closeEdit,
    handleEditSave,
    assigningUnit,
    setAssigningUnit,
    closeAssign,
    handleDelete,
    handleDeletePhoto,
  } = useResaleActions({
    t,
    toast: { success: toast.success, error: toast.error },
  });

  const units = useMemo(() => {
    const term = search.toLowerCase();
    return allUnits.filter((u) => {
      const matchSearch = search
        ? u.projectName.toLowerCase().includes(term) ||
          (u.unitType ?? "").toLowerCase().includes(term) ||
          (u.ownerName ?? "").toLowerCase().includes(term)
        : true;
      const matchType = filterType === "all" || u.unitType === filterType;
      const matchStatus =
        filterStatus === "all" || (filterStatus === "active" ? u.isActive : !u.isActive);
      return matchSearch && matchType && matchStatus;
    });
  }, [allUnits, search, filterType, filterStatus]);

  const unitTypes = useMemo(
    () => [...new Set(allUnits.map((u) => u.unitType).filter(Boolean) as string[])],
    [allUnits],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("resale.marketplace")}</h2>
          <p className="text-muted-foreground">
            {t("resale.units_available", {
              count: String(allUnits.length),
              active: String(allUnits.filter((u) => u.isActive).length),
            })}
          </p>
        </div>

        {isAdmin && (
          <AddUnitDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            isAdmin={isAdmin}
            pendingPhotos={pendingPhotos}
            setPendingPhotos={setPendingPhotos}
          />
        )}
      </div>

      <ResaleFilters
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        unitTypes={unitTypes}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <Skeleton className="h-52 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Home className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">{t("resale.no_units_found")}</p>
          <p className="text-sm opacity-70">{t("resale.try_adjust")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {units.map((unit, i) => (
            <ResaleGridCard
              key={unit.id}
              unit={unit}
              index={i}
              isAdmin={isAdmin}
              formatPrice={formatPrice}
              onAssign={setAssigningUnit}
              onEdit={openEdit}
              onDelete={handleDelete}
              onDeletePhoto={handleDeletePhoto}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y">
          {units.map((unit, i) => (
            <ResaleListRow
              key={unit.id}
              unit={unit}
              index={i}
              isAdmin={isAdmin}
              formatPrice={formatPrice}
              onAssign={setAssigningUnit}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={!!assigningUnit} onOpenChange={(v) => { if (!v) closeAssign(); }}>
        {assigningUnit && <AssignDialog unit={assigningUnit} onClose={closeAssign} />}
      </Dialog>

      <EditUnitDialog
        unit={editingUnit}
        form={editForm}
        onFormChange={setEditForm}
        onClose={closeEdit}
        onSave={handleEditSave}
        saving={editSaving}
      />
    </div>
  );
}
