import { useRef } from "react";
import { Plus, Upload, X } from "lucide-react";
import { useI18n } from "@/shared/contexts/i18nContext";
import { MAX_PHOTOS, type PendingPhoto } from "@workspace/core";

interface PhotoPickerProps {
  value: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
}

export function PhotoPicker({ value, onChange }: PhotoPickerProps) {
  const { t } = useI18n();
  const remaining = MAX_PHOTOS - value.length;
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    const newPreviews = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    onChange([...value, ...newPreviews].slice(0, MAX_PHOTOS));
    e.target.value = "";
  }

  function remove(idx: number) {
    URL.revokeObjectURL(value[idx].previewUrl);
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

      {value.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {value.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={p.previewUrl} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-black/65 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 hover:bg-muted/40 transition-colors"
            >
              <Plus className="w-5 h-5 text-muted-foreground/50" />
            </button>
          )}
        </div>
      )}

      {value.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all"
        >
          <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground/70">{t("resale.click_browse", { n: String(remaining) })}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-end">
        {value.length}/{MAX_PHOTOS}
      </p>
    </div>
  );
}
