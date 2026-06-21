/**
 * Clients list — Mobile.
 *
 * Mirrors the web ClientsPage by consuming `useListClients` from
 * `@workspace/api-client/hooks/clients`. Styled with native design tokens
 * from `@workspace/ui/tokens` (no Tailwind / no web CSS), and labelled via
 * `useI18n` from `@workspace/i18n`.
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

import { useListClients } from "@workspace/api-client/hooks/clients";
import type { Client } from "@workspace/api-client";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function ClientsListScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [search, setSearch] = React.useState("");

  const {
    data: clients = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useListClients();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (cl) =>
        cl.name.toLowerCase().includes(q) ||
        (cl.email ?? "").toLowerCase().includes(q) ||
        (cl.phone ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  const renderItem: ListRenderItem<Client> = React.useCallback(
    ({ item }) => (
      <ClientRow
        client={item}
        styles={styles}
        muted={theme.colors.mutedForeground}
        primary={theme.colors.primary}
        onPress={() =>
          router.push({ pathname: "/(tabs)/clients/[id]", params: { id: item.id } })
        }
      />
    ),
    [router, styles, theme.colors.mutedForeground, theme.colors.primary],
  );

  if (isLoading && clients.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("clients.title")} noBorder />
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
        <ScreenHeader title={t("clients.title")} noBorder />
        <View style={[styles.center, { padding: theme.spacing[6] }]}>
          <Text style={styles.errorTitle}>{parsed.title}</Text>
          <Text style={styles.errorMessage}>{parsed.message}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t("clients.back") || "Try again"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("clients.title")}
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
            placeholder={t("clients.search")}
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
            <Feather name="users" size={36} color={theme.colors.mutedForeground} />
            <Text style={styles.emptyText}>{t("clients.no_clients")}</Text>
          </View>
        }
      />
    </View>
  );
}

interface ClientRowProps {
  client: Client;
  styles: ReturnType<typeof makeStyles>;
  muted: string;
  primary: string;
  onPress: () => void;
}

const ClientRow = React.memo(function ClientRow({
  client,
  styles,
  muted,
  primary,
  onPress,
}: ClientRowProps): React.ReactElement {
  const initials = client.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: `${primary}22` }]}>
        <Text style={[styles.avatarTxt, { color: primary }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {client.name}
        </Text>
        {!!client.company && (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {client.company}
          </Text>
        )}
        {!!client.email && (
          <View style={styles.metaRow}>
            <Feather name="mail" size={11} color={muted} />
            <Text style={styles.cardMeta} numberOfLines={1}>
              {client.email}
            </Text>
          </View>
        )}
        {!!client.phone && (
          <View style={styles.metaRow}>
            <Feather name="phone" size={11} color={muted} />
            <Text style={styles.cardMeta}>{client.phone}</Text>
          </View>
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
    list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: theme.radius.lg,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTxt: { fontSize: 16, fontWeight: "700" },
    cardBody: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 15, fontWeight: "600", color: c.foreground },
    cardMeta: { fontSize: 12, color: c.mutedForeground },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
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
