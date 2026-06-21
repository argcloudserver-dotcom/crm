/**
 * Composite mutation hook for the Resale marketplace.
 *
 * Wraps generated + custom mutations with optimistic invalidation, shared
 * toasts, and inline edit-form state. Toast surface and translator are
 * injected by the caller so the hook works on web (sonner + useI18n) and
 * native (snackbar + native i18n) without changes.
 */
import { useState } from "react";

/** Minimal setter shape compatible with React's `Setter<T>`. */
type Setter<T> = (value: T | ((prev: T) => T)) => void;
import { useQueryClient } from "@tanstack/react-query";
import type { TFunc, ResaleUnit } from "@workspace/core";
import {
  getListResaleUnitsQueryKey,
  useDeleteResaleUnit,
} from "../../generated/api";
import type { ResaleFormValues } from "../../zod/resale";
import { deleteResalePhoto, patchResaleUnit } from "./api";

/** Minimal toast surface; both `sonner.toast` and RN snackbars satisfy this. */
export interface ToastAdapter {
  success: (message: string) => void;
  error: (message: string) => void;
}

export interface UseResaleActionsParams {
  t: TFunc;
  toast: ToastAdapter;
  /**
   * Confirmation strategy. Web passes `window.confirm`; mobile can swap in
   * an alert dialog. Returning `false` cancels the action.
   */
  confirm?: (message: string) => boolean | Promise<boolean>;
}

export interface UseResaleActionsResult {
  editingUnit: ResaleUnit | null;
  editForm: Partial<ResaleFormValues>;
  setEditForm: Setter<Partial<ResaleFormValues>>;
  editSaving: boolean;
  openEdit: (unit: ResaleUnit) => void;
  closeEdit: () => void;
  handleEditSave: () => Promise<void>;
  assigningUnit: ResaleUnit | null;
  setAssigningUnit: Setter<ResaleUnit | null>;
  closeAssign: () => void;
  handleDelete: (id: string) => void;
  handleDeletePhoto: (unitId: string, photoId: string) => Promise<void>;
}

export function useResaleActions({
  t,
  toast,
  confirm: confirmFn,
}: UseResaleActionsParams): UseResaleActionsResult {
  const queryClient = useQueryClient();
  const deleteUnit = useDeleteResaleUnit();

  const [editingUnit, setEditingUnit] = useState<ResaleUnit | null>(null);
  const [editForm, setEditForm] = useState<Partial<ResaleFormValues>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [assigningUnit, setAssigningUnit] = useState<ResaleUnit | null>(null);

  const askConfirm = async (msg: string): Promise<boolean> => {
    if (confirmFn) return await confirmFn(msg);
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      return window.confirm(msg);
    }
    return true;
  };

  const handleDelete = async (id: string) => {
    const ok = await askConfirm(t("resale.confirm_delete"));
    if (!ok) return;
    deleteUnit.mutate(
      { unitId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListResaleUnitsQueryKey(),
          });
          toast.success(t("resale.unit_deleted"));
        },
      },
    );
  };

  const handleDeletePhoto = async (unitId: string, photoId: string) => {
    try {
      await deleteResalePhoto(unitId, photoId);
      queryClient.invalidateQueries({
        queryKey: getListResaleUnitsQueryKey(),
      });
      toast.success("تم حذف الصورة");
    } catch {
      toast.error("فشل حذف الصورة");
    }
  };

  const openEdit = (unit: ResaleUnit) => {
    setEditingUnit(unit);
    setEditForm({
      projectName: unit.projectName,
      unitType: unit.unitType ?? "apartment",
      area: unit.area ?? "",
      price: unit.price ?? "",
      floor: unit.floor ?? undefined,
      ownerName: unit.ownerName ?? "",
      ownerPhone: unit.ownerPhone ?? "",
      ownerEmail: unit.ownerEmail ?? "",
      ownerNotes: unit.ownerNotes ?? "",
      description: unit.description ?? "",
      isOwnerPhoneHidden: unit.isOwnerPhoneHidden,
      isOwnerEmailHidden: unit.isOwnerEmailHidden,
    });
  };

  const handleEditSave = async () => {
    if (!editingUnit) return;
    setEditSaving(true);
    try {
      await patchResaleUnit(editingUnit.id, editForm);
      queryClient.invalidateQueries({
        queryKey: getListResaleUnitsQueryKey(),
      });
      toast.success("تم تحديث الوحدة بنجاح");
      setEditingUnit(null);
    } catch {
      toast.error("فشل تحديث الوحدة");
    } finally {
      setEditSaving(false);
    }
  };

  return {
    editingUnit,
    editForm,
    setEditForm,
    editSaving,
    openEdit,
    closeEdit: () => setEditingUnit(null),
    handleEditSave,
    assigningUnit,
    setAssigningUnit,
    closeAssign: () => setAssigningUnit(null),
    handleDelete,
    handleDeletePhoto,
  };
}
