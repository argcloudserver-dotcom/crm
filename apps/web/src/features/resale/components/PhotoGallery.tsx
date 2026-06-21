import { useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";

interface PhotoGalleryProps {
  photos: { id: string; url: string }[];
  unitName: string;
  noPhotosLabel: string;
  onDeletePhoto?: (photoId: string) => void;
}

export function PhotoGallery({ photos, unitName, noPhotosLabel, onDeletePhoto }: PhotoGalleryProps) {
  const [current, setCurrent] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-52 bg-gradient-to-br from-muted/70 to-muted/30 flex flex-col items-center justify-center rounded-t-xl text-muted-foreground">
        <ImageIcon className="w-9 h-9 mb-2 opacity-30" />
        <span className="text-xs opacity-60">{noPhotosLabel}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-52 rounded-t-xl overflow-hidden bg-muted group">
      {photos.map((photo, i) => (
        <img
          key={photo.id}
          src={photo.url}
          alt={`${unitName} ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"} group-hover:scale-[1.03]`}
          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x250/f4f4f5/a1a1aa?text=No+Image"; }}
        />
      ))}

      {onDeletePhoto && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const photoId = photos[current]?.id;
            if (photoId) onDeletePhoto(photoId);
          }}
          className="absolute top-2.5 left-2.5 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 z-10"
          title="حذف هذه الصورة"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + photos.length) % photos.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % photos.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-white w-4" : "bg-white/50 w-1.5"}`}
              />
            ))}
          </div>
          <div className="absolute top-2.5 right-2.5 bg-black/55 text-white text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
            {current + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
