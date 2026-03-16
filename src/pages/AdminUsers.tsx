import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, BellRing, Shield, ShieldAlert, UserCog, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import type { AccountRole } from "@/context/auth/types";
import { adminQueryDefaults, getAdminRoleChangeAudit, getAdminUserDirectory, updateUserAccountRole } from "@/services/admin";
import { getAdminNotificationAudit, reminderTemplates, sendAdminReminder, type NotificationKind } from "@/services/notifications";

const roleMeta: Record<AccountRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  member: { label: "Usuario regular", variant: "secondary" },
  admin_manager: { label: "Admin designado", variant: "outline" },
  super_admin: { label: "Admin total", variant: "default" },
};

const availableSignalFilters = ["all", "with_any_signal", "missing_profile", "onboarding_inconsistent", "without_activity"] as const;
type SignalFilter = (typeof availableSignalFilters)[number];

const resolveSignalFilter = (value: string | null): SignalFilter =>
  availableSignalFilters.includes((value ?? "") as SignalFilter) ? (value as SignalFilter) : "all";

const getReminderKinds = (row: Awaited<ReturnType<typeof getAdminUserDirectory>>[number]) => {
  const kinds: Array<Exclude<NotificationKind, "general">> = [];

  if (row.missing_profile) kinds.push("complete_profile");
  if (row.onboarding_inconsistent) kinds.push("resolve_onboarding");
  if (row.without_activity) kinds.push("log_first_activity");

  return kinds;
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { canManageAdminRoles, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>(resolveSignalFilter(searchParams.get("signal")));

  useEffect(() => {
    const querySignalFilter = resolveSignalFilter(searchParams.get("signal"));
    if (querySignalFilter !== signalFilter) {
      setSignalFilter(querySignalFilter);
    }
  }, [searchParams, signalFilter]);

  const usersQuery = useQuery({
    queryKey: ["admin_user_directory"],
    queryFn: getAdminUserDirectory,
    ...adminQueryDefaults,
  });

  const auditQuery = useQuery({
    queryKey: ["admin_role_change_audit"],
    queryFn: getAdminRoleChangeAudit,
    ...adminQueryDefaults,
  });

  const notificationAuditQuery = useQuery({
    queryKey: ["admin_notification_audit"],
    queryFn: () => getAdminNotificationAudit(20),
    ...adminQueryDefaults,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, nextRole }: { userId: string; nextRole: AccountRole }) => {
      setUpdatingUserId(userId);
      await updateUserAccountRole(userId, nextRole);
    },
    onSuccess: () => {
      toast.success("Rol actualizado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["admin_user_directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin_role_change_audit"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo actualizar el rol.");
    },
    onSettled: () => {
      setUpdatingUserId(null);
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async ({ targetUserId, kind }: { targetUserId: string; kind: Exclude<NotificationKind, "general"> }) => {
      await sendAdminReminder(targetUserId, kind);
    },
    onSuccess: (_, variables) => {
      const template = reminderTemplates[variables.kind];
      toast.success(`Recordatorio enviado: ${template.title}.`);
      queryClient.invalidateQueries({ queryKey: ["admin_notification_audit"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo enviar el recordatorio.");
    },
  });

  const directoryRows = usersQuery.data ?? [];

  const signalSummary = useMemo(
    () => ({
      missingProfile: directoryRows.filter((row) => row.missing_profile).length,
      onboardingInconsistent: directoryRows.filter((row) => row.onboarding_inconsistent).length,
      withoutActivity: directoryRows.filter((row) => row.without_activity).length,
    }),
    [directoryRows],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return directoryRows.filter((row) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        row.email?.toLowerCase().includes(normalizedSearch) ||
        row.full_name?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      switch (signalFilter) {
        case "with_any_signal":
          return row.missing_profile || row.onboarding_inconsistent || row.without_activity;
        case "missing_profile":
          return row.missing_profile;
        case "onboarding_inconsistent":
          return row.onboarding_inconsistent;
        case "without_activity":
          return row.without_activity;
        default:
          return true;
      }
    });
  }, [directoryRows, searchTerm, signalFilter]);

  const handleSignalFilterChange = (value: SignalFilter) => {
    setSignalFilter(value);
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value === "all") {
      nextSearchParams.delete("signal");
    } else {
      nextSearchParams.set("signal", value);
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <AppPageIntro
        eyebrow="Control de acceso"
        icon={<Users className="h-3.5 w-3.5" />}
        title="Directorio de usuarios"
        description="Vista administrativa de cuentas creadas, estado de onboarding, recordatorios internos y gobierno de roles."
      />

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Politica de roles del prototipo</CardTitle>
          <CardDescription>Separamos operacion y gobierno en tres niveles para validar el modelo antes de pasar a produccion.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Shield className="h-4 w-4 text-primary" /> Usuario regular</div>
            <p className="mt-2 text-sm text-muted-foreground">Usa la app, registra datos y solo accede a su propia informacion.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><UserCog className="h-4 w-4 text-primary" /> Admin designado</div>
            <p className="mt-2 text-sm text-muted-foreground">Puede entrar al entorno admin y revisar estadisticas globales y usuarios, ademas de enviar recordatorios internos.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 text-primary" /> Admin total</div>
            <p className="mt-2 text-sm text-muted-foreground">Gobierna accesos y puede convertir cuentas entre roles administrativos.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Cuentas registradas</CardTitle>
          <CardDescription>
            {canManageAdminRoles
              ? "Puedes reasignar roles, detectar cuentas en riesgo y enviar recordatorios internos desde esta vista."
              : "Tienes acceso de lectura operativa y puedes enviar recordatorios internos a cuentas con senales."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left transition-transform hover:-translate-y-0.5"
              onClick={() => handleSignalFilterChange("missing_profile")}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Usuarios sin perfil</p>
              <p className="mt-3 text-3xl font-black">{signalSummary.missingProfile}</p>
              <p className="mt-2 text-sm text-muted-foreground">Cuentas creadas que no tienen fila en perfiles.</p>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4 text-left transition-transform hover:-translate-y-0.5"
              onClick={() => handleSignalFilterChange("onboarding_inconsistent")}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Onboarding inconsistente</p>
              <p className="mt-3 text-3xl font-black">{signalSummary.onboardingInconsistent}</p>
              <p className="mt-2 text-sm text-muted-foreground">Diferencias entre el estado de usuarios y perfiles.</p>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left transition-transform hover:-translate-y-0.5"
              onClick={() => handleSignalFilterChange("without_activity")}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Usuarios sin actividad</p>
              <p className="mt-3 text-3xl font-black">{signalSummary.withoutActivity}</p>
              <p className="mt-2 text-sm text-muted-foreground">Cuentas sin nutricion, peso ni medidas registradas.</p>
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Buscar cuenta</p>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Email o nombre"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Filtrar por senal</p>
              <Select value={signalFilter} onValueChange={(value) => handleSignalFilterChange(value as SignalFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  <SelectItem value="with_any_signal">Con alguna senal</SelectItem>
                  <SelectItem value="missing_profile">Sin perfil</SelectItem>
                  <SelectItem value="onboarding_inconsistent">Onboarding inconsistente</SelectItem>
                  <SelectItem value="without_activity">Sin actividad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : usersQuery.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              No se pudo cargar el directorio de usuarios. Revisa que `get_admin_user_directory_detailed()` o la version legacy
              `get_admin_user_directory()` existan en Supabase y que el schema cache este recargado.
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Senales</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((row) => {
                    const reminderKinds = getReminderKinds(row);

                    return (
                      <TableRow key={row.user_id}>
                        <TableCell className="font-medium">{row.email ?? "Sin email"}</TableCell>
                        <TableCell>{row.full_name ?? "Sin nombre"}</TableCell>
                        <TableCell>
                          <Badge variant={roleMeta[row.account_role].variant}>{roleMeta[row.account_role].label}</Badge>
                        </TableCell>
                        <TableCell>{row.onboarding_completed ? "Completo" : "Pendiente"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {row.missing_profile ? <Badge variant="outline">Sin perfil</Badge> : null}
                            {row.onboarding_inconsistent ? <Badge variant="outline">Onboarding inconsistente</Badge> : null}
                            {row.without_activity ? <Badge variant="secondary">Sin actividad</Badge> : null}
                            {!row.missing_profile && !row.onboarding_inconsistent && !row.without_activity ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                <AlertTriangle className="h-3 w-3" />
                                Saludable
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd") : "--"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {reminderKinds.length > 0 && row.user_id !== user?.id ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" disabled={reminderMutation.isPending}>
                                    <BellRing className="mr-2 h-4 w-4" />
                                    Recordar
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Enviar recordatorio</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {reminderKinds.map((kind) => (
                                    <DropdownMenuItem
                                      key={`${row.user_id}-${kind}`}
                                      onSelect={() => {
                                        reminderMutation.mutate({
                                          targetUserId: row.user_id,
                                          kind,
                                        });
                                      }}
                                    >
                                      {reminderTemplates[kind].title}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}

                            {canManageAdminRoles && row.user_id !== user?.id ? (
                              <Select
                                value={row.account_role}
                                onValueChange={(value) =>
                                  updateRoleMutation.mutate({
                                    userId: row.user_id,
                                    nextRole: value as AccountRole,
                                  })
                                }
                                disabled={updateRoleMutation.isPending && updatingUserId === row.user_id}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Usuario regular</SelectItem>
                                  <SelectItem value="admin_manager">Admin designado</SelectItem>
                                  <SelectItem value="super_admin">Admin total</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="self-center text-xs text-muted-foreground">{row.user_id === user?.id ? "Tu cuenta" : "Solo lectura"}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!usersQuery.isLoading && filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              No hay cuentas que coincidan con los filtros seleccionados.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Recordatorios recientes</CardTitle>
          <CardDescription>Traza del nuevo sistema de notificaciones internas para soporte operativo y seguimiento futuro.</CardDescription>
        </CardHeader>
        <CardContent>
          {notificationAuditQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notificationAuditQuery.isError ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              La auditoria de recordatorios aun no esta disponible o no pudo cargarse.
            </div>
          ) : notificationAuditQuery.data && notificationAuditQuery.data.length > 0 ? (
            <div className="rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Emisor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificationAuditQuery.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd HH:mm") : "--"}</TableCell>
                      <TableCell>{row.target_email ?? row.target_user_id}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.read_at ? "Leida" : "Pendiente"}</TableCell>
                      <TableCell>{row.sender_email ?? "Sistema"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Aun no hay recordatorios enviados desde admin.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Auditoria reciente de roles</CardTitle>
          <CardDescription>Traza minima para saber quien cambio permisos administrativos y cuando ocurrio.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : auditQuery.isError ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              La auditoria de roles no pudo cargarse.
            </div>
          ) : auditQuery.data && auditQuery.data.length > 0 ? (
            <div className="rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Cuenta afectada</TableHead>
                    <TableHead>Cambio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditQuery.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd HH:mm") : "--"}</TableCell>
                      <TableCell>{row.actor_email ?? "Sistema / desconocido"}</TableCell>
                      <TableCell>{row.target_email ?? row.target_user_id}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {roleMeta[row.previous_role].label} {"->"} {roleMeta[row.next_role].label}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Aun no hay cambios de rol registrados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
