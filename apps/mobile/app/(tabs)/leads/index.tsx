/**
 * Leads list — Mobile.
 *
 * Validates the shared-package architecture end-to-end: data is fetched via
 * `useLeads` from `@workspace/api-client/hooks/leads`, status labels come
 * from `@workspace/core`, and the UI is styled with the native design
 * tokens from `@workspace/ui/tokens`. No web CSS, no Tailwind.
 */
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { useRouter } from "expo-router";

import { useLeads } from "@workspace/api-client/hooks/leads";
import type { Lead } from "@workspace/api-client";
import { STATUS_LABELS } from "@workspace/core";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

export default function LeadsListScreen(): React.ReactElement {
  const router = useRouter();
  const { locale } = useI18n();
  const theme = React.useMemo(() => buildNativeTheme(false), []);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const {
    data: leads,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useLeads();

  const renderItem: ListRenderItem<Lead> = React.useCallback(
    ({ item }) => (
      <LeadRow
        lead={item}
        locale={locale}
        styles={styles}
        accent={theme.colors.accent}
        muted={theme.colors.mutedForeground}
        onPress={() => router.push(`/lead/${item.id}`)}
      />
    ),
    [locale, styles, router, theme.colors.accent, theme.colors.mutedForeground],
  );

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    const parsed = parseApiError(error);
    return (
      <View style={[styles.flex, styles.center, { padding: theme.spacing[6] }]}>
        <Text style={styles.errorTitle}>{parsed.title}</Text>
        <Text style={styles.errorMessage}>{parsed.message}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        <Text style={styles.subtitle}>
          {(leads?.length ?? 0)} total
        </Text>
      </View>
      <FlatList
        data={leads ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={[styles.center, styles.empty]}>
            <Text style={styles.emptyText}>No leads yet.</Text>
          </View>
        }
      />
    </View>
  );
}

interface RowProps {
  lead: Lead;
  locale: "en" | "ar";
  styles: ReturnType<typeof makeStyles>;
  accent: string;
  muted: string;
  onPress: () => void;
}

function LeadRow({ lead, locale, styles, accent, muted, onPress }: RowProps) {
  const statusLabel =
    STATUS_LABELS[lead.status]?.[locale] ?? lead.status;
  const initials = lead.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || "?"}</Text>
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {lead.name}
        </Text>
        <Text style={[styles.rowMeta, { color: muted }]} numberOfLines={1}>
          {lead.phone ?? lead.email ?? lead.source}
        </Text>
      </View>
      <View style={[styles.statusPill, { borderColor: accent }]}>
        <Text style={[styles.statusText, { color: accent }]}>
          {statusLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { justifyContent: "center", alignItems: "center" },
    header: {
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[6],
      paddingBottom: theme.spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    title: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize["2xl"],
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing[1],
    },
    listContent: {
      padding: theme.spacing[4],
      flexGrow: 1,
    },
    separator: { height: theme.spacing[3] },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing[4],
      ...theme.shadows.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: c.muted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing[3],
    },
    avatarText: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.semibold,
      fontSize: theme.typography.fontSize.sm,
    },
    rowMain: { flex: 1, minWidth: 0 },
    rowName: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.semibold,
      fontSize: theme.typography.fontSize.base,
    },
    rowMeta: {
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    statusPill: {
      borderWidth: 1,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[1],
      marginLeft: theme.spacing[2],
    },
    statusText: {
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
    },
    empty: { paddingVertical: theme.spacing[10] },
    emptyText: {
      color: c.mutedForeground,
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.sm,
    },
    errorTitle: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.semibold,
      fontSize: theme.typography.fontSize.lg,
      marginBottom: theme.spacing[2],
    },
    errorMessage: {
      color: c.mutedForeground,
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
      marginBottom: theme.spacing[4],
    },
    retry: {
      backgroundColor: c.primary,
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.radius.md,
    },
    retryText: {
      color: c.primaryForeground,
      fontFamily: theme.typography.fontFamily.semibold,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
