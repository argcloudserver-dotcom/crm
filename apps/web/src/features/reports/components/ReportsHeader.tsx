import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, FileDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/utils/utils";
import { useI18n } from "@/shared/contexts/i18nContext";
import { PRESETS } from "../constants";

interface ReportsHeaderProps {
  date: DateRange | undefined;
  onDateChange: (v: DateRange | undefined) => void;
  activePreset: number;
  onPreset: (idx: number) => void;
  onClearPreset: () => void;
  onExport: () => void;
  exportDisabled: boolean;
}

export function ReportsHeader({
  date,
  onDateChange,
  activePreset,
  onPreset,
  onClearPreset,
  onExport,
  exportDisabled,
}: ReportsHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("reports.title")}</h2>
        <p className="text-muted-foreground text-sm">بيانات حية — آخر تحديث الآن</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PRESETS.map((p, idx) => (
            <button
              key={p.label}
              onClick={() => onPreset(idx)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                activePreset === idx
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-start font-normal min-w-[200px]",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="me-2 h-4 w-4 shrink-0" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "d MMM")} – {format(date.to, "d MMM yyyy")}
                  </>
                ) : (
                  format(date.from, "d MMM yyyy")
                )
              ) : (
                <span>اختر فترة</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(v) => {
                onDateChange(v);
                onClearPreset();
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={onExport} disabled={exportDisabled} className="gap-2">
          <FileDown className="h-4 w-4" /> تصدير
        </Button>
      </div>
    </div>
  );
}
