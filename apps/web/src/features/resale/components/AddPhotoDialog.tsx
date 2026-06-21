import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListResaleUnitsQueryKey } from "@workspace/api-client";
import { toast } from "sonner";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { useI18n } from "@/shared/contexts/i18nContext";
import { MAX_PHOTOS, type PendingPhoto } from "@workspace/core";
import { attachResalePhoto, uploadResalePhotoFile } from "@workspace/api-client/hooks/resale";
import { PhotoPicker } from "./PhotoPicker";

interface AddPhotoDialogProps {
  unitId: string;
  onAdded: () => void;
  currentCount: number;
}

export function AddPhotoDialog({ unitId, onAdded, currentCount }: AddPhotoDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const remaining = MAX_PHOTOS - currentCount;

  async function handleUpload() {
    if (photos.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const { file } of photos) {
        const url = await uploadResalePhotoFile(file as File);
        await attachResalePhoto(unitId, url);
        uploaded++;
      }
      queryClient.invalidateQueries({ queryKey: getListResaleUnitsQueryKey() });
      toast.success(`${uploaded} ${t("resale.photo_added")}`);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setOpen(false);
      onAdded();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
    }
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={remaining <= 0}>
          <ImageIcon className="w-3 h-3" />
          {remaining <= 0
            ? t("resale.max_photos")
            : t("resale.photos_count", { current: String(currentCount), max: String(MAX_PHOTOS) })}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("resale.add_photos_dialog", { current: String(currentCount), max: String(MAX_PHOTOS) })}
          </DialogTitle>
        </DialogHeader>
        <PhotoPicker value={photos} onChange={setPhotos} />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleUpload} disabled={photos.length === 0 || uploading}>
            {uploading ? t("resale.uploading") : t("resale.upload_photos")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
