import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useI18n } from "@/shared/contexts/i18nContext";

interface ResaleFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (v: "grid" | "list") => void;
  unitTypes: string[];
}

export function ResaleFilters({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  viewMode,
  onViewModeChange,
  unitTypes,
}: ResaleFiltersProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("resale.search")}
          className="ps-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select value={filterType} onValueChange={onFilterTypeChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("resale.all_types")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("resale.all_types")}</SelectItem>
          {unitTypes.map((ty) => (
            <SelectItem key={ty} value={ty} className="capitalize">{ty}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("resale.all_status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("resale.all_status")}</SelectItem>
          <SelectItem value="active">{t("resale.available")}</SelectItem>
          <SelectItem value="inactive">{t("resale.inactive")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center border rounded-lg overflow-hidden">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          title="Grid"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          title="List"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
