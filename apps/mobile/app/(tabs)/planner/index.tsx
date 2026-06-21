/**
 * Daily Planner — Mobile.
 *
 * Mirrors the web PlannerPage by consuming the planner hooks from
 * `@workspace/api-client/hooks/planner`. Supports listing today's tasks,
 * adding a task, toggling done, and deleting. Styled with native design
 * tokens from `@workspace/ui/tokens`.
 */
import React from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useQueryClient } from "@tanstack/react-query";

import {
  useListPlannerTasks,
  useCreatePlannerTask,
  useUpdatePlannerTask,
  useDeletePlannerTask,
  getListPlannerTasksQueryKey,
} from "@workspace/api-client/hooks/planner";
import type { PlannerTask } from "@workspace/api-client";
import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";
import { parseApiError } from "@workspace/shared/errors";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useAuthContext } from "@/contexts/AuthContext";

type Priority = "low" | "medium" | "high";

const PRIORITIES: ReadonlyArray<Priority> = ["low", "medium", "high"];

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PlannerScreen(): React.ReactElement {
  const { t } = useI18n();
  const { isDark } = useAppTheme();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const dateStr = React.useMemo(() => todayString(), []);

  const [newTitle, setNewTitle] = React.useState("");
  const [newPriority, setNewPriority] = React.useState<Priority>("medium");

  const {
    data: tasks = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useListPlannerTasks({ userId: user?.id, date: dateStr });

  const createTask = useCreatePlannerTask();
  const updateTask = useUpdatePlannerTask();
  const deleteTask = useDeletePlannerTask();

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListPlannerTasksQueryKey() });
  }, [queryClient]);

  const onAdd = React.useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;
    createTask.mutate(
      { data: { title, priority: newPriority, date: dateStr } },
      {
        onSuccess: () => {
          setNewTitle("");
          invalidate();
        },
        onError: (err) => {
          const parsed = parseApiError(err);
          Alert.alert(parsed.title, parsed.message);
        },
      },
    );
  }, [newTitle, newPriority, dateStr, createTask, invalidate]);

  const onToggle = React.useCallback(
    (task: PlannerTask) => {
      updateTask.mutate(
        { taskId: task.id, data: { isDone: !task.isDone } },
        {
          onSuccess: invalidate,
          onError: (err) => {
            const parsed = parseApiError(err);
            Alert.alert(parsed.title, parsed.message);
          },
        },
      );
    },
    [updateTask, invalidate],
  );

  const onDelete = React.useCallback(
    (task: PlannerTask) => {
      Alert.alert(task.title, "", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteTask.mutate(
              { taskId: task.id },
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
    [deleteTask, invalidate],
  );

  const sorted = React.useMemo(() => {
    const pWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
    return [...tasks].sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      const pA = pWeight[a.priority as Priority] ?? 0;
      const pB = pWeight[b.priority as Priority] ?? 0;
      return pB - pA;
    });
  }, [tasks]);

  const renderItem: ListRenderItem<PlannerTask> = React.useCallback(
    ({ item }) => (
      <TaskRow
        task={item}
        styles={styles}
        theme={theme}
        onToggle={() => onToggle(item)}
        onDelete={() => onDelete(item)}
      />
    ),
    [styles, theme, onToggle, onDelete],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("planner.title")}
        subtitle={t("planner.subtitle")}
        noBorder
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder={t("planner.task_name")}
          placeholderTextColor={theme.colors.mutedForeground}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const active = p === newPriority;
            const color = priorityColor(p, theme);
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  active && { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => setNewPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityTxt,
                    active && { color: theme.colors.primaryForeground },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={onAdd}
            disabled={createTask.isPending || !newTitle.trim()}
          >
            <Feather name="plus" size={16} color={theme.colors.primaryForeground} />
            <Text style={styles.addBtnTxt}>{t("planner.add_task")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && tasks.length === 0 ? (
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
          data={sorted}
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
              <Feather name="check-circle" size={36} color={theme.colors.mutedForeground} />
              <Text style={styles.emptyText}>{t("planner.no_tasks")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

interface TaskRowProps {
  task: PlannerTask;
  styles: ReturnType<typeof makeStyles>;
  theme: ReturnType<typeof buildNativeTheme>;
  onToggle: () => void;
  onDelete: () => void;
}

const TaskRow = React.memo(function TaskRow({
  task,
  styles,
  theme,
  onToggle,
  onDelete,
}: TaskRowProps): React.ReactElement {
  const pColor = priorityColor((task.priority as Priority) ?? "medium", theme);
  return (
    <View style={[styles.taskRow, task.isDone && { opacity: 0.55 }]}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          { borderColor: task.isDone ? theme.colors.success : theme.colors.border },
          task.isDone && { backgroundColor: theme.colors.success },
        ]}
        onPress={onToggle}
      >
        {task.isDone && (
          <Feather name="check" size={14} color={theme.colors.primaryForeground} />
        )}
      </TouchableOpacity>
      <View style={styles.taskBody}>
        <Text
          style={[
            styles.taskTitle,
            task.isDone && { textDecorationLine: "line-through" },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: `${pColor}22` }]}>
          <Text style={[styles.priorityBadgeTxt, { color: pColor }]}>
            {task.priority}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Feather name="trash-2" size={16} color={theme.colors.destructive} />
      </TouchableOpacity>
    </View>
  );
});

function priorityColor(p: Priority, theme: ReturnType<typeof buildNativeTheme>): string {
  switch (p) {
    case "high":
      return theme.colors.destructive;
    case "medium":
      return theme.colors.warning;
    case "low":
    default:
      return theme.colors.mutedForeground;
  }
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    composer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    input: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      height: 46,
      fontSize: 15,
      color: c.foreground,
    },
    priorityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    priorityChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    priorityTxt: { fontSize: 12, fontWeight: "600", color: c.mutedForeground, textTransform: "capitalize" },
    addBtn: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.md,
    },
    addBtnTxt: { color: c.primaryForeground, fontSize: 13, fontWeight: "600" },
    list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
    taskRow: {
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
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    taskBody: { flex: 1, gap: 4 },
    taskTitle: { fontSize: 15, fontWeight: "500", color: c.foreground },
    priorityBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    priorityBadgeTxt: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
    deleteBtn: { padding: 6 },
    errorTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, marginBottom: 6 },
    errorMessage: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
}
