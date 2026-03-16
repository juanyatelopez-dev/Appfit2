import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, ClipboardList, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminQueryDefaults, getAdminDashboardMetrics } from "@/services/admin";

const metricCards = [
  { key: "total_users", title: "Usuarios totales", icon: Users, description: "Cuentas creadas en la plataforma." },
  { key: "completed_onboarding_users", title: "Onboarding completado", icon: UserCheck, description: "Usuarios listos para operar dentro de la app." },
  { key: "admin_users", title: "Cuentas admin", icon: ShieldCheck, description: "Usuarios con permisos elevados." },
  { key: "nutrition_entries", title: "Logs de nutricion", icon: ClipboardList, description: "Entradas registradas por los usuarios." },
  { key: "body_metrics_entries", title: "Registros de peso", icon: BarChart3, description: "Entradas de peso acumuladas." },
  { key: "body_measurements_entries", title: "Mediciones corporales", icon: ClipboardList, description: "Historial de mediciones disponibles." },
  { key: "nutrition_profiles", title: "Perfiles nutricionales", icon: ClipboardList, description: "Perfiles y configuraciones activas." },
];

const signalCards = [
  {
    key: "users_without_profile",
    title: "Usuarios sin perfil",
    description: "Detecta cuentas creadas que no tienen fila en public.profiles.",
    filter: "missing_profile",
  },
  {
    key: "onboarding_inconsistent",
    title: "Onboarding inconsistente",
    description: "Diferencias entre public.users y public.profiles que deben revisarse.",
    filter: "onboarding_inconsistent",
  },
  {
    key: "users_without_activity",
    title: "Usuarios sin actividad",
    description: "Cuentas que aun no generan datos relevantes en la app.",
    filter: "without_activity",
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const metricsQuery = useQuery({
    queryKey: ["admin_dashboard_metrics"],
    queryFn: getAdminDashboardMetrics,
    ...adminQueryDefaults,
  });

  const completionRate = useMemo(() => {
    const total = metricsQuery.data?.total_users ?? 0;
    if (total === 0) return 0;
    return Math.round(((metricsQuery.data?.completed_onboarding_users ?? 0) / total) * 100);
  }, [metricsQuery.data]);

  return (
    <div className="space-y-6">
      <AppPageIntro
        eyebrow="Control Tower"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        title="Resumen de administracion"
        description="Visibilidad centralizada del uso de la app, avance de onboarding y volumen de datos recolectados."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const value = metricsQuery.data?.[card.key as keyof NonNullable<typeof metricsQuery.data>] ?? 0;

          return (
            <Card key={card.key} className="rounded-3xl border-border/60">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  {metricsQuery.isLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-black">{value}</div>}
                </div>
                <div>
                  <CardTitle className="text-sm">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Salud operativa del prototipo</CardTitle>
          <CardDescription>Lectura rapida para decidir si el producto ya esta listo para pruebas controladas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Adopcion inicial</p>
            {metricsQuery.isLoading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-3xl font-black">{completionRate}%</p>}
            <p className="mt-2 text-sm text-muted-foreground">Porcentaje de cuentas que ya superaron onboarding.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Masa de datos</p>
            {metricsQuery.isLoading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="mt-3 text-3xl font-black">{(metricsQuery.data?.nutrition_entries ?? 0) + (metricsQuery.data?.body_metrics_entries ?? 0)}</p>}
            <p className="mt-2 text-sm text-muted-foreground">Registros operativos clave para analizar comportamiento del usuario.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Gobierno de accesos</p>
            {metricsQuery.isLoading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 text-3xl font-black">{metricsQuery.data?.admin_users ?? 0}</p>}
            <p className="mt-2 text-sm text-muted-foreground">Cantidad de cuentas con capacidades administrativas configuradas.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Senales operativas</CardTitle>
          <CardDescription>Controles para detectar problemas funcionales del prototipo antes de una demo o piloto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {signalCards.map((signal) => {
            const value = metricsQuery.data?.[signal.key as keyof NonNullable<typeof metricsQuery.data>] ?? 0;
            const isHealthy = value === 0;

            return (
              <div
                key={signal.key}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/users?signal=${signal.filter}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/admin/users?signal=${signal.filter}`);
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${
                  isHealthy ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{signal.title}</p>
                    {metricsQuery.isLoading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 text-3xl font-black">{value}</p>}
                  </div>
                  <div className={`rounded-2xl p-2 ${isHealthy ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{signal.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
