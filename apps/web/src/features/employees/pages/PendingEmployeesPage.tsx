import { useListPendingUsers, useApproveUser, useRejectUser, getListPendingUsersQueryKey, getListUsersQueryKey, apiFetch } from "@workspace/api-client";
import type { User } from "@workspace/api-client";
import { useI18n } from "@/shared/contexts/i18nContext";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardFooter } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { CheckCircle2, XCircle, Mail, Phone, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type AssignableRole = "admin" | "ceo" | "director" | "team_leader" | "sales";

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "director", label: "Director" },
  { value: "team_leader", label: "Team Leader" },
  { value: "sales", label: "Sales" },
];

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-red-500/15 text-red-600 border-red-500/30",
  ceo: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  director: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  team_leader: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  sales: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

function RegistrationMethodBadge({ user }: { user: User }) {
  const provider = (user as User & { oauthProvider?: string }).oauthProvider;
  if (provider === "google") {
    return <Badge variant="outline" className="border-blue-500/30 text-blue-600">🔵 Google</Badge>;
  }
  if (provider === "facebook") {
    return <Badge variant="outline" className="border-indigo-500/30 text-indigo-600">🔷 Facebook</Badge>;
  }
  return <Badge variant="outline" className="border-slate-500/30 text-slate-600">✉️ Email</Badge>;
}

interface TeamLeader { id: string; name: string }

const NO_TEAM_LEADER_VALUE = "__none__";

export function PendingEmployeesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useListPendingUsers();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/auth/team-leaders", { method: "GET" })
      .then(async (res) => {
        if (!res.ok) return [];
        const payload = (await res.json()) as { data?: TeamLeader[] };
        const list = payload.data ?? [];
        setTeamLeaders(Array.isArray(list) ? list : []);
      })
      .catch(() => setTeamLeaders([]));
  }, []);

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: getListPendingUsersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  const handleApprove = (userId: string) => {
    approveUser.mutate(
      { userId },
      {
        onSuccess: () => {
          toast.success(t("employees.approve"));
          refreshLists();
        },
        onError: (err) => toast.error(err.message || t("common.error")),
      }
    );
  };

  const handleReject = () => {
    if (!rejectingId) return;
    rejectUser.mutate(
      { userId: rejectingId, data: { reason: rejectReason } },
      {
        onSuccess: () => {
          toast.success(t("employees.reject"));
          refreshLists();
          setRejectingId(null);
          setRejectReason("");
        },
        onError: (err) => toast.error(err.message || t("common.error")),
      }
    );
  };

  async function changeRole(
    userId: string,
    newRole: AssignableRole,
    teamLeaderId: string | null,
  ) {
    setSavingRoleId(userId);
    try {
      await apiFetch(`/api/users/${userId}/change-role-before-approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole, teamLeaderId }),
      });
      toast.success("Role updated");
      refreshLists();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingRoleId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("employees.pending_title")}</h2>
          <p className="text-muted-foreground">{t("employees.pending_subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("employees.pending_title")}</h2>
        <p className="text-muted-foreground">{t("employees.pending_subtitle")}</p>
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t("employees.no_pending")}</h3>
            <p className="text-muted-foreground mt-1">{t("common.no_data")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {users.map(user => {
            const currentRole = (user.role ?? "sales") as AssignableRole;
            const currentTL = user.teamLeaderId ?? null;
            return (
              <Card key={user.id} className="flex flex-col">
                <CardContent className="p-6 flex-1 space-y-4">
                  <div className="flex items-start gap-4">
                    <UserAvatar name={user.name} className="h-12 w-12" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg leading-tight truncate">{user.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <RegistrationMethodBadge user={user} />
                        <Badge
                          variant="outline"
                          className={ROLE_COLOR[currentRole] ?? "bg-muted text-muted-foreground"}
                        >
                          Requested: {currentRole.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-muted/30 p-4 rounded-lg border text-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{user.phone || t("employees.not_provided")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{t("employees.requested", { date: format(new Date(user.createdAt), "MMM d, yyyy") })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Change role (optional)
                    </label>
                    <Select
                      value={currentRole}
                      onValueChange={(v) =>
                        changeRole(
                          user.id,
                          v as AssignableRole,
                          v === "sales" ? currentTL : null,
                        )
                      }
                      disabled={savingRoleId === user.id}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {currentRole === "sales" && (
                      <div className="space-y-2">
                        <Select
                          value={currentTL ?? NO_TEAM_LEADER_VALUE}
                          onValueChange={(v) =>
                            changeRole(
                              user.id,
                              "sales",
                              v === NO_TEAM_LEADER_VALUE ? null : v,
                            )
                          }
                          disabled={savingRoleId === user.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Assign team leader" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_TEAM_LEADER_VALUE}>None</SelectItem>
                            {teamLeaders.map((tl) => (
                              <SelectItem key={tl.id} value={tl.id}>
                                {tl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {teamLeaders.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No team leaders are available yet. You can approve this sales user without one and assign a team leader later.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                    onClick={() => setRejectingId(user.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> {t("employees.reject")}
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(user.id)}
                    disabled={approveUser.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> {t("employees.approve")}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("employees.reject_title")}</DialogTitle>
            <DialogDescription>
              {t("employees.rejection_reason")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("employees.rejection_reason")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || rejectUser.isPending}>
              {t("employees.confirm_reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
