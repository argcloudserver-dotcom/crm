/**
 * Resale list — Mobile.
 *
 * Mirrors the web ResalePage by consuming `useListResaleUnits` from
 * `@workspace/api-client/hooks/resale`. Styled with native tokens from
 * `@workspace/ui/tokens` (no Tailwind / no web CSS), translated via
 * `useI18n`, with graceful loading / empty / error states.
 */
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useListResaleUnits } from "@workspace/api-client/hooks/resale";
import type { ResaleUnit } from "@workspace/api-client";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

const TYPE_FILTERS = [
  "all",
  "apartment",
  "villa",
  "townhouse",
  "studio",
  "duplex",
  "penthouse",
  "chalet",
  "commercial",
] as const;

function formatPrice(price?: string | null): string {
  if (!price) return "";
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(0)}K`;
  return `EGP ${n}`;
}

export default function ResaleListScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const {
    data: units = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useListResaleUnits();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => {
      const matchSearch =
        !q ||
        (u.title ?? "").toLowerCase().includes(q) ||
        (u.projectName ?? "").toLowerCase().includes(q);
      const matchType = typeFilter === "all" || u.unitType === typeFilter;
      return matchSearch && matchType;
    });
  }, [units, search, typeFilter]);

  const renderItem: ListRenderItem<ResaleUnit> = React.useCallback(
    ({ item }) => (
      <UnitCard
        unit={item}
        styles={styles}
        muted={theme.colors.mutedForeground}
        primary={theme.colors.primary}
        accent={theme.colors.accent}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/resale/[id]",
            params: { id: item.id },
          })
        }
      />
    ),
    [router, styles, theme.colors.mutedForeground, theme.colors.primary, theme.colors.accent],
  );

  if (isLoading && units.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("resale.title")} noBorder />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    const parsed = parseApiError(error);
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("resale.title")} noBorder />
        <View style={[styles.center, { padding: theme.spacing[6] }]}>
          <Text style={styles.errorTitle}>{parsed.title}</Text>
          <Text style={styles.errorMessage}>{parsed.message}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("resale.title")}
        subtitle={`${filtered.length}`}
        noBorder
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Feather
            name="search"
            size={16}
            color={theme.colors.mutedForeground}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t("resale.search")}
            placeholderTextColor={theme.colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        horizontal
        data={TYPE_FILTERS as unknown as string[]}
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        renderItem={({ item }) => {
          const active = item === typeFilter;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setTypeFilter(item)}
            >
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                {item === "all"
                  ? t("common.all")
                  : item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="home" size={36} color={theme.colors.mutedForeground} />
            <Text style={styles.emptyText}>{t("resale.no_units")}</Text>
          </View>
        }
      />
    </View>
  );
}

interface UnitCardProps {
  unit: ResaleUnit;
  styles: ReturnType<typeof makeStyles>;
  muted: string;
  primary: string;
  accent: string;
  onPress: () => void;
}

const UnitCard = React.memo(function UnitCard({
  unit,
  styles,
  muted,
  primary,
  accent,
  onPress,
}: UnitCardProps): React.ReactElement {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.imgWrap, { backgroundColor: `${primary}10` }]}>
        <Feather name="home" size={28} color={primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>
          {unit.title ?? unit.projectName}
        </Text>
        <Text style={styles.project} numberOfLines={1}>
          <Feather name="layers" size={11} color={muted} /> {unit.projectName}
        </Text>
        <View style={styles.row}>
          {!!unit.area && (
            <View style={styles.metaPill}>
              <Feather name="maximize-2" size={10} color={muted} />
              <Text style={styles.metaTxt}>{unit.area} {String(/^\d+$/.test(unit.area) ? "m²" : "")}</Text>
            </View>
          )}
          {!!unit.floor && (
            <View style={styles.metaPill}>
              <Feather name="layers" size={10} color={muted} />
              <Text style={styles.metaTxt}>F{unit.floor}</Text>
            </View>
          )}
          {!!unit.unitType && (
            <View style={styles.metaPill}>
              <Feather name="tag" size={10} color={muted} />
              <Text style={styles.metaTxt}>{unit.unitType}</Text>
            </View>
          )}
        </View>
        {!!unit.price && (
          <Text style={[styles.price, { color: accent }]}>
            {formatPrice(unit.price)}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={18} color={muted} />
    </TouchableOpacity>
  );
});

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      height: 46,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.foreground },
    filterRow: { maxHeight: 52, marginBottom: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 13, fontWeight: "500", color: c.mutedForeground },
    chipTxtActive: { color: c.primaryForeground },
    list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
    card: {
      flexDirection: "row",
      gap: 12,
      borderRadius: theme.radius.lg,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
    },
    imgWrap: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: { flex: 1, gap: 4 },
    title: { fontSize: 15, fontWeight: "600", color: c.foreground },
    project: { fontSize: 12, color: c.mutedForeground },
    row: { flexDirection: "row", gap: 8, marginTop: 2, flexWrap: "wrap" },
    metaPill: { flexDirection: "row", alignItems: "center", gap: 3 },
    metaTxt: { fontSize: 11, color: c.mutedForeground },
    price: { fontSize: 14, fontWeight: "700", marginTop: 2 },
    errorTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, marginBottom: 6 },
    errorMessage: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
    retry: {
      marginTop: 16,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
      backgroundColor: c.primary,
    },
    retryText: { color: c.primaryForeground, fontWeight: "600" },
  });
}
