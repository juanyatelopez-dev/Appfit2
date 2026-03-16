import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Shield, ShieldAlert, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import type { AccountRole } from "@/context/auth/types";
import { getAdminRoleChangeAudit, getAdminUserDirectory, updateUserAccountRole } from "@/services/admin";

const roleMeta: Record<AccountRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  member: { label: "Usuario regular", variant: "secondary" },
  admin_manager: { label: "Admin designado", variant: "outline" },
  super_admin: { label: "Admin total", variant: "default" },
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { canManageAdminRoles, user } = useAuth();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin_user_directory"],
    queryFn: getAdminUserDirectory,
  });

  const auditQuery = useQuery({
    queryKey: ["admin_role_change_audit"],
    queryFn: getAdminRoleChangeAudit,
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

  return (
    <div className="space-y-6">
      <AppPageIntro
        eyebrow="Control de acceso"
        icon={<Users className="h-3.5 w-3.5" />}
        title="Directorio de usuarios"
        description="Vista administrativa de cuentas creadas, estado de onboarding y gobierno de roles."
      />

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Politica de roles del prototipo</CardTitle>
          <CardDescription>Separamos operacion y gobierno en tres niveles para validar el modelo antes de pasar a producción.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Shield className="h-4 w-4 text-primary" /> Usuario regular</div>
            <p className="mt-2 text-sm text-muted-foreground">Usa la app, registra datos y solo accede a su propia información.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><UserCog className="h-4 w-4 text-primary" /> Admin designado</div>
            <p className="mt-2 text-sm text-muted-foreground">Puede entrar al entorno admin y revisar estadísticas/globales, pero no reasigna roles.</p>
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
          <CardDescription>{canManageAdminRoles ? "Puedes reasignar roles desde esta vista." : "Tienes acceso de solo lectura para gobierno de usuarios."}</CardDescription>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
                    <TableHead>Alta</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersQuery.data ?? []).map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium">{row.email ?? "Sin email"}</TableCell>
                      <TableCell>{row.full_name ?? "Sin nombre"}</TableCell>
                      <TableCell>
                        <Badge variant={roleMeta[row.account_role].variant}>{roleMeta[row.account_role].label}</Badge>
                      </TableCell>
                      <TableCell>{row.onboarding_completed ? "Completo" : "Pendiente"}</TableCell>
                      <TableCell>{row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd") : "--"}</TableCell>
                      <TableCell className="text-right">
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
                            <SelectTrigger className="ml-auto w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Usuario regular</SelectItem>
                              <SelectItem value="admin_manager">Admin designado</SelectItem>
                              <SelectItem value="super_admin">Admin total</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">{row.user_id === user?.id ? "Tu cuenta" : "Solo lectura"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Auditoria reciente de roles</CardTitle>
          <CardDescription>Traza minima para saber quién cambió permisos administrativos y cuándo ocurrió.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
                          {roleMeta[row.previous_role].label} → {roleMeta[row.next_role].label}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Aún no hay cambios de rol registrados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
