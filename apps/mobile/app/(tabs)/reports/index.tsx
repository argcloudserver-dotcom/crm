/**
 * Reports overview — Mobile.
 *
 * Consumes `useResaleReportQuery`, `useTrendsReportQuery`, and
 * `useProjectsReportQuery` from `@workspace/api-client/hooks/reports`
 * (the same hooks used by the web Reports page). Renders summary cards +
 * top breakdowns; styled with native tokens, translated via `useI18n`.
 */
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  useResaleReportQuery,
  useTrendsReportQuery,
  useProjectsReportQuery,
} from "@workspace/api-client/hooks/reports";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function ReportsScreen(): React.ReactElement {
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const resale = useResaleReportQuery();
  const trends = useTrendsReportQuery();
  const projects = useProjectsReportQuery();

  const loading = resale.isLoading || trends.isLoading || projects.isLoading;
  const refreshing =
    resale.isRefetching || trends.isRefetching || projects.isRefetching;
  const error = resale.error || trends.error || projects.error;

  async function onRefresh() {
    await Promise.all([resale.refetch(), trends.refetch(), projects.refetch()]);
  }

  if (loading && !resale.data && !trends.data && !projects.data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("reports.title")} noBorder />
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
        <ScreenHeader title={t("reports.title")} noBorder />
        <View style={[styles.center, { padding: theme.spacing[6] }]}>
          <Text style={styles.errorTitle}>{parsed.title}</Text>
          <Text style={styles.errorMessage}>{parsed.message}</Text>
          <TouchableOpacity style={styles.retry} onPress={onRefresh}>
            <Text style={styles.retryText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const days = trends.data?.days ?? [];
  const totalLeads = days.reduce((acc, d) => acc + d.total, 0);
  const wonLeads = days.reduce((acc, d) => acc + d.won, 0);
  const lostLeads = days.reduce((acc, d) => acc + d.lost, 0);
  const conv = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const kpis = [
    {
      label: t("reports.total_leads"),
      value: String(totalLeads),
      icon: "users" as const,
      color: theme.colors.primary,
    },
    {
      label: t("reports.conversion_rate"),
      value: `${conv}%`,
      icon: "trending-up" as const,
      color: theme.colors.success,
    },
    {
      label: t("reports.total_value"),
      value: resale.data ? formatCompact(resale.data.totalValue) : "—",
      icon: "dollar-sign" as const,
      color: theme.colors.accent,
    },
    {
      label: t("resale.title"),
      value: String(resale.data?.total ?? 0),
      icon: "home" as const,
      color: theme.colors.info,
    },
  ];

  const topProjects = (projects.data?.projects ?? [])
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topResaleProjects = (resale.data?.byProject ?? [])
    .slice()
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("reports.title")} noBorder />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: `${k.color}18` }]}>
                <Feather name={k.icon} size={16} color={k.color} />
              </View>
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t("reports.sales")}</Text>
        <View style={styles.card}>
          <DistroRow label={t("common.actions")} value={`${wonLeads}`} color={theme.colors.success} max={totalLeads} theme={theme} />
          <DistroRow label={t("common.status")} value={`${lostLeads}`} color={theme.colors.destructive} max={totalLeads} theme={theme} />
          <DistroRow label={t("common.all")} value={`${totalLeads}`} color={theme.colors.primary} max={Math.max(totalLeads, 1)} theme={theme} />
        </View>

        <Text style={styles.sectionTitle}>{t("reports.pipeline")}</Text>
        <View style={styles.card}>
          {topProjects.length === 0 ? (
            <Text style={styles.emptyTxt}>{t("common.no_data")}</Text>
          ) : (
            topProjects.map((p) => (
              <View key={p.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.listMeta}>
                    {p.total} · {p.convRate}%
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: `${theme.colors.success}18` }]}>
                  <Text style={[styles.pillTxt, { color: theme.colors.success }]}>{p.won}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>{t("reports.resale")}</Text>
        <View style={[styles.card, { marginBottom: 80 }]}>
          {topResaleProjects.length === 0 ? (
            <Text style={styles.emptyTxt}>{t("common.no_data")}</Text>
          ) : (
            topResaleProjects.map((p) => (
              <View key={p.project} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>{p.project}</Text>
                  <Text style={styles.listMeta}>
                    {p.count} {t("reports.col.units")}
                  </Text>
                </View>
                <Text style={[styles.pillTxt, { color: theme.colors.accent }]}>
                  {formatCompact(p.totalValue)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DistroRow({
  label,
  value,
  color,
  max,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  max: number;
  theme: ReturnType<typeof buildNativeTheme>;
}) {
  const pct = max > 0 ? Math.min(100, (Number(value) / max) * 100) : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: theme.colors.foreground }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.foreground }}>{value}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </View>
    </View>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    kpiCard: {
      flexBasis: "47%",
      flexGrow: 1,
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: 14,
    },
    kpiIcon: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    kpiValue: { fontSize: 22, fontWeight: "800", color: c.foreground },
    kpiLabel: { fontSize: 11, color: c.mutedForeground, marginTop: 2 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: c.mutedForeground,
      letterSpacing: 0.6,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: 14,
      marginBottom: 18,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    listTitle: { fontSize: 14, color: c.foreground, fontWeight: "600" },
    listMeta: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
    pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: theme.radius.full },
    pillTxt: { fontSize: 12, fontWeight: "700" },
    emptyTxt: { fontSize: 13, color: c.mutedForeground, textAlign: "center", paddingVertical: 16 },
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
