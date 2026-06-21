/**
 * Client detail — Mobile.
 *
 * Data via `useGetClient` (clients hook) and `useLeads` (leads hook) from
 * `@workspace/api-client`. Styled with native design tokens.
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

import { useGetClient } from "@workspace/api-client/hooks/clients";
import { useLeads } from "@workspace/api-client/hooks/leads";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function ClientDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const clientId = id ?? "";
  const { data: client, isLoading, error } = useGetClient(clientId);
  const { data: allLeads = [] } = useLeads();
  const clientLeads = React.useMemo(
    () => allLeads.filter((l) => l.clientId === clientId),
    [allLeads, clientId],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("clients.title")} onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !client) {
    const parsed = error ? parseApiError(error) : { title: t("clients.not_found"), message: "" };
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("clients.title")} onBack={() => router.back()} />
        <View style={[styles.center, { padding: 24 }]}>
          <Text style={styles.errorTitle}>{parsed.title}</Text>
          {!!parsed.message && <Text style={styles.errorMessage}>{parsed.message}</Text>}
        </View>
      </View>
    );
  }

  const initials = client.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.container}>
      <ScreenHeader title={client.name} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{client.name}</Text>
          {!!client.company && (
            <Text style={styles.heroMeta}>{client.company}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t("clients.client_info")}</Text>
        <View style={styles.section}>
          {!!client.email && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`mailto:${client.email}`)}
            >
              <Feather name="mail" size={16} color={theme.colors.primary} />
              <View style={styles.contactBody}>
                <Text style={styles.contactLabel}>{t("clients.email")}</Text>
                <Text style={styles.contactValue}>{client.email}</Text>
              </View>
              <Feather name="external-link" size={14} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {!!client.phone && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`tel:${client.phone}`)}
            >
              <Feather name="phone" size={16} color={theme.colors.primary} />
              <View style={styles.contactBody}>
                <Text style={styles.contactLabel}>{t("clients.phone")}</Text>
                <Text style={styles.contactValue}>{client.phone}</Text>
              </View>
              <Feather name="external-link" size={14} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {!!client.notes && (
          <>
            <Text style={styles.sectionTitle}>{t("clients.notes")}</Text>
            <View style={styles.section}>
              <Text style={styles.notes}>{client.notes}</Text>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>
          {t("clients.leads_section")} ({clientLeads.length})
        </Text>
        <View style={{ marginBottom: 120 }}>
          {clientLeads.length === 0 ? (
            <Text style={styles.noLeads}>—</Text>
          ) : (
            clientLeads.map((lead) => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadRow}
                onPress={() =>
                  router.push({ pathname: "/lead/[id]", params: { id: lead.id } })
                }
                activeOpacity={0.75}
              >
                <Text style={styles.leadName} numberOfLines={1}>
                  {lead.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.leadMeta}>{lead.status}</Text>
                  <Feather
                    name="chevron-right"
                    size={15}
                    color={theme.colors.mutedForeground}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { paddingHorizontal: 20, paddingTop: 20 },
    hero: {
      alignItems: "center",
      borderRadius: theme.radius.xl,
      padding: 28,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.lg,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarTxt: { fontSize: 26, fontWeight: "700", color: c.primaryForeground },
    heroName: { fontSize: 20, fontWeight: "700", color: c.foreground },
    heroMeta: { fontSize: 13, color: c.mutedForeground, marginTop: 4 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: c.mutedForeground,
      letterSpacing: 0.7,
      marginBottom: 8,
      marginTop: 4,
      textTransform: "uppercase",
    },
    section: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      marginBottom: 20,
      overflow: "hidden",
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    contactBody: { flex: 1 },
    contactLabel: { fontSize: 11, fontWeight: "500", color: c.mutedForeground },
    contactValue: { fontSize: 15, fontWeight: "500", color: c.foreground, marginTop: 1 },
    notes: { fontSize: 14, lineHeight: 21, padding: 14, color: c.mutedForeground },
    noLeads: { fontSize: 14, color: c.mutedForeground, textAlign: "center", paddingVertical: 20 },
    leadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: theme.radius.md,
      padding: 14,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    leadName: { flex: 1, fontSize: 14, fontWeight: "500", color: c.foreground },
    leadMeta: { fontSize: 12, color: c.mutedForeground },
    errorTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, marginBottom: 6 },
    errorMessage: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
}
