/**
 * Resale unit detail — Mobile.
 *
 * Consumes `useGetResaleUnit` from `@workspace/api-client/hooks/resale`,
 * styled with native tokens, translated via `useI18n`.
 */
import React from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useGetResaleUnit } from "@workspace/api-client/hooks/resale";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function ResaleDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const { data: unit, isLoading, error } = useGetResaleUnit(id ?? "");

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("resale.title")} onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !unit) {
    const parsed = parseApiError(error);
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("resale.title")} onBack={() => router.back()} />
        <View style={[styles.center, { padding: theme.spacing[6] }]}>
          <Text style={styles.errorTitle}>{parsed.title}</Text>
          <Text style={styles.errorMessage}>{parsed.message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={unit.title ?? unit.projectName}
        subtitle={unit.projectName}
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Feather name="home" size={32} color={theme.colors.primary} />
          </View>
          {!!unit.price && (
            <Text style={styles.heroPrice}>
              {formatPrice(unit.price)}
            </Text>
          )}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: unit.isActive
                  ? `${theme.colors.success}18`
                  : `${theme.colors.mutedForeground}18`,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: unit.isActive
                    ? theme.colors.success
                    : theme.colors.mutedForeground,
                },
              ]}
            />
            <Text
              style={[
                styles.statusTxt,
                {
                  color: unit.isActive
                    ? theme.colors.success
                    : theme.colors.mutedForeground,
                },
              ]}
            >
              {unit.isActive ? t("resale.active") : t("resale.inactive")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("resale.unit_type")}</Text>
          <View style={styles.grid}>
            <InfoTile label={t("resale.unit_type")} value={unit.unitType ?? "—"} />
            <InfoTile label={t("resale.area")} value={unit.area ?? "—"} />
            <InfoTile label={t("resale.floor")} value={unit.floor ? String(unit.floor) : "—"} />
            <InfoTile label={t("resale.price_egp")} value={unit.price ?? "—"} />
          </View>
        </View>

        {!!unit.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("resale.description")}</Text>
            <View style={styles.card}>
              <Text style={styles.bodyText}>{unit.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("resale.owner_details")}</Text>
          <View style={styles.card}>
            <DetailRow icon="user" label={t("resale.owner_name")} value={unit.ownerName ?? "—"} />
            {!!unit.ownerPhone && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${unit.ownerPhone}`)}
              >
                <DetailRow
                  icon="phone"
                  label={t("resale.owner_phone")}
                  value={unit.ownerPhone}
                  actionColor={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
            {!!unit.ownerEmail && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`mailto:${unit.ownerEmail}`)}
              >
                <DetailRow
                  icon="mail"
                  label={t("resale.owner_email")}
                  value={unit.ownerEmail}
                  actionColor={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!!unit.assignedToName && (
          <View style={[styles.section, { marginBottom: 60 }]}>
            <Text style={styles.sectionTitle}>{t("common.actions")}</Text>
            <View style={styles.card}>
              <DetailRow
                icon="user-check"
                label={t("common.role")}
                value={unit.assignedToName}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }): React.ReactElement {
  const { isDark } = useAppTheme();
  const theme = buildNativeTheme(isDark);
  return (
    <View
      style={{
        flexBasis: "48%",
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: 14,
      }}
    >
      <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 15, color: theme.colors.foreground, fontWeight: "600", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  actionColor,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  actionColor?: string;
}): React.ReactElement {
  const { isDark } = useAppTheme();
  const theme = buildNativeTheme(isDark);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomColor: theme.colors.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
      }}
    >
      <Feather name={icon} size={16} color={actionColor ?? theme.colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 14, color: actionColor ?? theme.colors.foreground, marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function formatPrice(price: string): string {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(0)}K`;
  return `EGP ${n}`;
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    content: { padding: 20 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    heroCard: {
      backgroundColor: c.card,
      borderRadius: theme.radius.lg,
      borderColor: c.border,
      borderWidth: 1,
      padding: 24,
      alignItems: "center",
      marginBottom: 20,
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.full,
      backgroundColor: `${c.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    heroPrice: { fontSize: 24, fontWeight: "800", color: c.accent },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
      marginTop: 10,
    },
    statusDot: { width: 7, height: 7, borderRadius: 7 },
    statusTxt: { fontSize: 12, fontWeight: "700" },
    section: { marginBottom: 18 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: c.mutedForeground,
      letterSpacing: 0.6,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 14,
    },
    bodyText: { fontSize: 14, color: c.foreground, lineHeight: 20 },
    errorTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, marginBottom: 6 },
    errorMessage: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
}
