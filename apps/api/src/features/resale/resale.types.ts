import type { ResalePhoto, ResaleUnit } from "@workspace/db";

export interface ResaleUnitWithPhotos extends ResaleUnit {
  assignedToName: string | null;
  photos: ResalePhoto[];
}
