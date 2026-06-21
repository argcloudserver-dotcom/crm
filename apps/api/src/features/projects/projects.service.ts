import * as repo from "./projects.repository";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./projects.schemas";
import type { ProjectWithCounts } from "./projects.types";

export async function listProjects(): Promise<ProjectWithCounts[]> {
  const rows = await repo.findAllWithCounts();
  return rows.map((r) => ({ ...r.project, leadsCount: Number(r.leadsCount) }));
}

export async function getProject(projectId: string): Promise<ProjectWithCounts | null> {
  const row = await repo.findByIdWithCount(projectId);
  if (!row) return null;
  return { ...row.project, leadsCount: Number(row.leadsCount) };
}

export async function createProject(
  createdBy: string,
  input: CreateProjectInput,
): Promise<ProjectWithCounts> {
  const project = await repo.insert({
    name: input.name,
    ownerName: input.ownerName ?? null,
    location: input.location ?? null,
    description: input.description ?? null,
    avgPrice: input.avgPrice ?? null,
    imageUrl: input.imageUrl ?? null,
    createdBy,
  });
  return { ...project, leadsCount: 0 };
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectWithCounts | null> {
  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) updateData[k] = v;
  }
  const updated = await repo.updateById(projectId, updateData);
  if (!updated) return null;
  return { ...updated, leadsCount: 0 };
}

export const deleteProject = repo.detachAndDelete;
