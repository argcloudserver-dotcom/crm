/**
 * Employees list — Mobile.
 *
 * Mirrors the web EmployeesPage by consuming `useListUsers` from
 * `@workspace/api-client/hooks/employees`. Includes role filter chips and
 * a quick link to the pending-approvals sub-screen.
 */
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useListUsers, useListPendingUsers } from "@workspace/api-client/hooks/employees";
import type { User } from "@workspace/api-client";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

const ROLES = ["all", "ceo", "admin", "director", "team_leader", "sales"] as const;

const ROLE_META: Record<string, { color: string; label: string }> = {
  ceo: { color: "#7C3AED", label: "CEO" },
  admin: { color: "#DC2626", label: "Admin" },
  director: { color: "#0891B2", label: "Director" },
  team_leader: { color: "#2563EB", label: "Team Leader" },
  sales: { color: "#16A34A", label: "Sales" },
};

export default function EmployeesListScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<(typeof ROLES)[number]>("all");

  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useListUsers({ status: "active" });

  const { data: pending = [] } = useListPendingUsers();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.title ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const renderItem: ListRenderItem<User> = React.useCallback(
    ({ item }) => (
      <EmployeeRow
        user={item}
        styles={styles}
        muted={theme.colors.mutedForeground}
        onPress={() =>
          router.push({ pathname: "/(tabs)/employees/[id]", params: { id: item.id } })
        }
      />
    ),
    [router, styles, theme.colors.mutedForeground],
  );

  if (isLoading && users.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t("employees.title")} noBorder />
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
        <ScreenHeader title={t("employees.title")} noBorder />
        <View style={[styles.center, { padding: 24 }]}>
          <Text style={styles.errorTitle}>{parsed.title}</Text>
          <Text style={styles.errorMessage}>{parsed.message}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("employees.title")}
        subtitle={`${filtered.length}`}
        noBorder
        rightElement={
          <TouchableOpacity
            style={styles.pendingBtn}
            onPress={() => router.push("/(tabs)/employees/pending")}
          >
            <Feather name="user-plus" size={14} color={theme.colors.primaryForeground} />
            <Text style={styles.pendingBtnText}>
              {t("employees.pending_title")}
              {pending.length > 0 ? ` (${pending.length})` : ""}
            </Text>
          </TouchableOpacity>
        }
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
            placeholder={t("employees.search")}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
      >
        {ROLES.map((r) => {
          const active = r === roleFilter;
          const meta = ROLE_META[r];
          const color = meta?.color ?? theme.colors.primary;
          return (
            <TouchableOpacity
              key={r}
              style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => setRoleFilter(r)}
            >
              <Text
                style={[
                  styles.chipTxt,
                  active && { color: theme.colors.primaryForeground },
                ]}
              >
                {r === "all" ? "All" : meta?.label ?? r}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
            <Text style={styles.emptyText}>{t("employees.no_employees")}</Text>
          </View>
        }
      />
    </View>
  );
}

interface EmployeeRowProps {
  user: User;
  styles: ReturnType<typeof makeStyles>;
  muted: string;
  onPress: () => void;
}

const EmployeeRow = React.memo(function EmployeeRow({
  user,
  styles,
  muted,
  onPress,
}: EmployeeRowProps): React.ReactElement {
  const meta = ROLE_META[user.role] ?? { color: "#6B7280", label: user.role };
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: `${meta.color}22` }]}>
        <Text style={[styles.avatarTxt, { color: meta.color }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {user.name}
        </Text>
        {!!user.title && (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {user.title}
          </Text>
        )}
        {!!user.phone && (
          <View style={styles.metaRow}>
            <Feather name="phone" size={11} color={muted} />
            <Text style={styles.cardMeta}>{user.phone}</Text>
          </View>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <View style={[styles.roleBadge, { backgroundColor: `${meta.color}18` }]}>
          <Text style={[styles.roleTxt, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {user.isOnline && <View style={styles.onlineDot} />}
      </View>
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
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipTxt: { fontSize: 13, fontWeight: "500", color: c.mutedForeground },
    list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 },
    empty: { alignItems: "center", paddingTop: 60, gap: 12 },
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
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    roleTxt: { fontSize: 11, fontWeight: "700" },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
    pendingBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.md,
    },
    pendingBtnText: {
      color: c.primaryForeground,
      fontSize: 12,
      fontWeight: "600",
    },
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
