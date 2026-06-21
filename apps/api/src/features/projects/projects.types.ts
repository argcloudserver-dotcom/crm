import type { Project } from "@workspace/db";
export interface ProjectWithCounts extends Project {
  leadsCount: number;
}
