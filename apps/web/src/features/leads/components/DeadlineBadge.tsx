import { differenceInDays, format, isPast, isToday } from "date-fns";
import { AlertTriangle, Calendar as CalendarIcon, Timer } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import type { TFunc } from "@workspace/core";

export function DeadlineBadge({
  deadline,
  t,
}: {
  deadline: string | null | undefined;
  isAr: boolean;
  t: TFunc;
}) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const daysLeft = differenceInDays(d, new Date());
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const urgent = !overdue && daysLeft <= 2;

  const label = overdue
    ? t("leads.overdue", { n: Math.abs(daysLeft) })
    : today
    ? t("leads.due_today")
    : t("leads.due_in", { n: daysLeft });

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
        overdue && "bg-red-500/10 border-red-500/30 text-red-500",
        today && "bg-orange-500/10 border-orange-500/30 text-orange-500",
        urgent && !today && "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
        !overdue && !today && !urgent &&
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {overdue ? (
        <AlertTriangle className="h-4 w-4" />
      ) : today ? (
        <Timer className="h-4 w-4" />
      ) : (
        <CalendarIcon className="h-4 w-4" />
      )}
      <span>
        {label}
        <span className="font-normal mx-1 opacity-75">({format(d, "MMM d, yyyy")})</span>
      </span>
    </div>
  );
}
