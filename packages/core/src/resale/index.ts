/**
 * Domain primitives for the Resale feature.
 *
 * Pure TypeScript types & constants shared between web/mobile resale
 * marketplace surfaces. Zod validation lives in
 * `@workspace/api-client/zod/resale`; React Query mutations + the shared
 * `useResaleActions` composite live in `@workspace/api-client/hooks/resale`.
 */

export const MAX_PHOTOS = 5;

export const UNIT_TYPES = [
  "apartment",
  "villa",
  "townhouse",
  "penthouse",
  "plot",
  "studio",
  "duplex",
] as const;
export type UnitTypeLiteral = (typeof UNIT_TYPES)[number];

export interface ResalePhoto {
  id: string;
  url: string;
  caption?: string | null;
  sortOrder: number;
}

export interface ResaleUnit {
  id: string;
  projectName: string;
  title?: string | null;
  unitType?: string | null;
  area?: string | null;
  price?: string | null;
  floor?: number | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  ownerNotes?: string | null;
  description?: string | null;
  isOwnerPhoneHidden: boolean;
  isOwnerEmailHidden: boolean;
  isActive: boolean;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdAt: string;
  photos?: ResalePhoto[];
}

/**
 * `file` is the platform's native binary blob — `File` on web, a
 * react-native asset descriptor on mobile. Typed as `unknown` here so the
 * core package stays free of DOM lib dependencies; consumers narrow to the
 * concrete type they need.
 */
export interface PendingPhoto {
  file: unknown;
  previewUrl: string;
}

/** Framer Motion list-card variants reused by web grid/list rows. */
export const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      type: "spring" as const,
      stiffness: 300,
      damping: 28,
    },
  }),
};
