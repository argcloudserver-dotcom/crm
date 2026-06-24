import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserCog, Briefcase } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import { apiFetch, getListLeadsQueryKey } from "@workspace/api-client";
import type { Lead } from "@workspace/api-client";
import { useAuth } from "@/shared/contexts/AuthContext";

type Role = "director" | "team_leader" | "sales";
interface AssignableUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  teamLeaderId: string | null;
}
interface AssignableResponse {
  directors: AssignableUser[];
  teamLeaders: AssignableUser[];
  sales: AssignableUser[];
}

interface AssignLeadModalProps {
  lead: Lead | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABEL: Record<Role, string> = {
  director: "Directors",
  team_leader: "Team Leaders",
  sales: "Sales",
};
const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string }>> = {
  director: Briefcase,
  team_leader: UserCog,
  sales: Users,
};

export function AssignLeadModal({ lead, open, onOpenChange }: AssignLeadModalProps) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Record<Role, Set<string>>>({
    director: new Set(),
    team_leader: new Set(),
    sales: new Set(),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNote("");
      setSelected({ director: new Set(), team_leader: new Set(), sales: new Set() });
    }
  }, [open]);

  const { data, isLoading } = useQuery<AssignableResponse>({
    queryKey: ["users", "assignable"],
    queryFn: async () => {
      const res = await apiFetch("/api/users/assignable");
      if (!res.ok) throw new Error("Failed to load assignable users");
      const json = await res.json();
      return (json.data ?? json) as AssignableResponse;
    },
    enabled: open,
  });

  // Visible role lists based on viewer role.
  const visibleRoles: Role[] = useMemo(() => {
    const role = currentUser?.role;
    if (role === "admin" || role === "ceo") return ["director", "team_leader", "sales"];
    if (role === "director") return ["team_leader", "sales"];
    if (role === "team_leader") return ["sales"];
    return [];
  }, [currentUser]);

  if (!lead) return null;

  const toggle = (role: Role, id: string) => {
    setSelected((prev) => {
      const next = new Set(prev[role]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [role]: next };
    });
  };

  const totalSelected =
    selected.director.size + selected.team_leader.size + selected.sales.size;

  const onAssign = async () => {
    if (totalSelected === 0) {
      toast.error("Select at least one person to assign");
      return;
    }
    const targets: { userId: string; role: Role }[] = [];
    (Object.keys(selected) as Role[]).forEach((role) => {
      selected[role].forEach((userId) => targets.push({ userId, role }));
    });

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/leads/${lead.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, note: note || null, setPrimary: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Assignment failed");
      }
      toast.success(
        `Lead assigned to ${totalSelected} ${totalSelected === 1 ? "person" : "people"}`,
      );
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["lead-assignments", lead.id] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <p className="text-sm text-muted-foreground">{lead.name}</p>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading users…</p>
            ) : (
              visibleRoles.map((role) => {
                const Icon = ROLE_ICON[role];
                const list =
                  role === "director" ? data?.directors ?? []
                  : role === "team_leader" ? data?.teamLeaders ?? []
                  : data?.sales ?? [];
                return (
                  <section key={role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4" />
                        {ROLE_LABEL[role]}
                        <Badge variant="outline" className="ml-1">
                          {selected[role].size}/{list.length}
                        </Badge>
                      </Label>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-2">
                        No {ROLE_LABEL[role].toLowerCase()} available.
                      </p>
                    ) : (
                      <div className="border rounded-md divide-y">
                        {list.map((u) => {
                          const checked = selected[role].has(u.id);
                          return (
                            <label
                              key={u.id}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(role, u.id)}
                              />
                              <span className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-medium text-primary">
                                {(u.name || "?").charAt(0).toUpperCase()}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{u.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })
            )}

            <div className="space-y-2">
              <Label>Assignment Note (optional)</Label>
              <Textarea
                placeholder="Why are you assigning this lead?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onAssign} disabled={totalSelected === 0 || submitting}>
            {submitting ? "Assigning…" : `Assign (${totalSelected})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
