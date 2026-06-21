/**
 * Pending employees — Mobile.
 *
 * Lists users in `pending` status and lets admins approve / reject each
 * one. Mirrors `apps/web/.../PendingEmployeesPage.tsx`.
 */
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListPendingUsers,
  useApproveUser,
  useRejectUser,
  getListPendingUsersQueryKey,
  getListUsersQueryKey,
} from "@workspace/api-client/hooks/employees";
import type { User } from "@workspace/api-client";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function PendingEmployeesScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const {
    data: pending = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useListPendingUsers();

  const approveMutation = useApproveUser();
  const rejectMutation = useRejectUser();

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListPendingUsersQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  }, [queryClient]);

  const handleApprove = React.useCallback(
    (user: User) => {
      approveMutation.mutate(
        { userId: user.id },
        {
          onSuccess: invalidate,
          onError: (err) => {
            const parsed = parseApiError(err);
            Alert.alert(parsed.title, parsed.message);
          },
        },
      );
    },
    [approveMutation, invalidate],
  );

  const handleReject = React.useCallback(
    (user: User) => {
      Alert.alert(t("employees.reject_title"), user.name, [
        { text: "Cancel", style: "cancel" },
        {
          text: t("employees.confirm_reject"),
          style: "destructive",
          onPress: () =>
            rejectMutation.mutate(
              { userId: user.id, data: { reason: "" } },
              {
                onSuccess: invalidate,
                onError: (err) => {
                  const parsed = parseApiError(err);
                  Alert.alert(parsed.title, parsed.message);
                },
              },
            ),
        },
      ]);
    },
    [rejectMutation, invalidate, t],
  );

  const renderItem: ListRenderItem<User> = React.useCallback(
    ({ item }) => (
      <PendingRow
        user={item}
        styles={styles}
        muted={theme.colors.mutedForeground}
        approveColor={theme.colors.success}
        rejectColor={theme.colors.destructive}
        primaryFg={theme.colors.primaryForeground}
        onApprove={() => handleApprove(item)}
        onReject={() => handleReject(item)}
        approveDisabled={approveMutation.isPending}
        rejectDisabled={rejectMutation.isPending}
      />
    ),
    [
      styles,
      theme.colors.mutedForeground,
      theme.colors.success,
      theme.colors.destructive,
      theme.colors.primaryForeground,
      handleApprove,
      handleReject,
      approveMutation.isPending,
      rejectMutation.isPending,
    ],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("employees.pending_title")}
        subtitle={t("employees.pending_subtitle")}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.center, { padding: 24 }]}>
          <Text style={styles.errorTitle}>{parseApiError(error).title}</Text>
          <Text style={styles.errorMessage}>{parseApiError(error).message}</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
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
              <Feather name="user-check" size={36} color={theme.colors.mutedForeground} />
              <Text style={styles.emptyText}>—</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

interface PendingRowProps {
  user: User;
  styles: ReturnType<typeof makeStyles>;
  muted: string;
  approveColor: string;
  rejectColor: string;
  primaryFg: string;
  onApprove: () => void;
  onReject: () => void;
  approveDisabled: boolean;
  rejectDisabled: boolean;
}

const PendingRow = React.memo(function PendingRow({
  user,
  styles,
  muted,
  approveColor,
  rejectColor,
  primaryFg,
  onApprove,
  onReject,
  approveDisabled,
  rejectDisabled,
}: PendingRowProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {user.email}
        </Text>
        {!!user.title && (
          <View style={styles.metaRow}>
            <Feather name="briefcase" size={11} color={muted} />
            <Text style={styles.cardMeta}>{user.title}</Text>
          </View>
        )}
      </View>
      <View style={styles.actionsCol}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: approveColor }]}
          onPress={onApprove}
          disabled={approveDisabled}
        >
          <Feather name="check" size={14} color={primaryFg} />
          <Text style={[styles.actionTxt, { color: primaryFg }]}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: rejectColor }]}
          onPress={onReject}
          disabled={rejectDisabled}
        >
          <Feather name="x" size={14} color={primaryFg} />
          <Text style={[styles.actionTxt, { color: primaryFg }]}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: theme.radius.lg,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    cardBody: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 15, fontWeight: "600", color: c.foreground },
    cardMeta: { fontSize: 12, color: c.mutedForeground },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionsCol: { gap: 6 },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.md,
    },
    actionTxt: { fontSize: 12, fontWeight: "600" },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
    errorTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, marginBottom: 6 },
    errorMessage: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
}
