import * as repo from "./planner.repository";
import type {
  CreatePlannerTaskInput,
  PlannerListQuery,
  UpdatePlannerTaskInput,
} from "./planner.schemas";
import type { PlannerTask } from "./planner.types";

export async function listTasks(
  currentUserId: string,
  query: PlannerListQuery,
): Promise<PlannerTask[]> {
  const targetUserId = query.userId ?? currentUserId;
  return repo.findByUser(targetUserId, query.date);
}

export async function createTask(
  currentUserId: string,
  input: CreatePlannerTaskInput,
): Promise<PlannerTask> {
  const userId = input.userId ?? currentUserId;
  const position = await repo.countByUserAndDate(userId, input.date);
  return repo.insert({
    userId,
    date: input.date,
    title: input.title,
    notes: input.notes ?? null,
    priority: input.priority ?? "medium",
    position,
  });
}

export async function updateTask(
  taskId: string,
  input: UpdatePlannerTaskInput,
): Promise<PlannerTask | null> {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.isDone !== undefined) updateData.is_done = input.isDone;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.position !== undefined) updateData.position = input.position;
  return repo.updateById(taskId, updateData);
}

export const deleteTask = repo.deleteById;
