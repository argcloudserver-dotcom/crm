// TIL Brand Palette — UI-only color tokens that don't belong in @workspace/core.
// Shared domain label maps + funnel ordering have moved to @workspace/core and
// are re-exported below to keep existing imports stable.
import {
  REPORT_STATUS_LABELS_AR,
  REPORT_SOURCE_LABELS_AR,
  REPORT_FUNNEL_STAGE_ORDER,
} from "@workspace/core";

export const TIL = {
  gold: "#C9A84C",
  goldLight: "#E8D5A3",
  navy: "#0A1E38",
  navyLight: "#1E4976",
  blue: "#4A8FD4",
  green: "#22C59A",
  red: "#E05555",
  amber: "#D4900A",
} as const;

// Pie / multi-series chart colors — TIL-branded
export const CHART_COLORS = [TIL.gold, TIL.blue, TIL.green, TIL.red, TIL.navyLight];

// Pipeline funnel — progresses from navy → gold → green
export const FUNNEL_COLORS = [
  TIL.navyLight,
  "#2B5C8A",
  "#3B78B0",
  TIL.gold,
  "#D4900A",
  TIL.green,
];

export const STATUS_LABELS_AR = REPORT_STATUS_LABELS_AR;
export const SOURCE_LABELS_AR = REPORT_SOURCE_LABELS_AR;
export const FUNNEL_STAGE_ORDER = REPORT_FUNNEL_STAGE_ORDER;

export const MEDALS = ["🥇", "🥈", "🥉"];

export const tooltipStyle: React.CSSProperties = {
  borderRadius: "10px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--card-foreground))",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  padding: "8px 12px",
};

// Subtle TIL-gold tinted cursor — replaces the ugly dark default
export const chartCursor = { fill: TIL.gold, opacity: 0.07, radius: 6 };

export const PRESETS = [
  { label: "٧ أيام", days: 7 },
  { label: "٣٠ يوم", days: 30 },
  { label: "٩٠ يوم", days: 90 },
  { label: "هذا العام", days: -1 },
];
