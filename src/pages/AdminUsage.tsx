import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, BarChart3, CalendarRange, Users } from "lucide-react";
import { AppPageIntro } from "@/components/layout/AppPageIntro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminPanelUsage, getAdminUsageDaily } from "@/services/admin";

const AdminUsage = () => {
  const panelUsageQuery = useQuery({
    queryKey: ["admin_panel_usage", 30],
    queryFn: () => getAdminPanelUsage(30),
  });

  const dailyUsageQuery = useQuery({
    queryKey: ["admin_usage_daily", 14],
    queryFn: () => getAdminUsageDaily(14),
  });

  const usageSummary = useMemo(() => {
    const rows = panelUsageQuery.data ?? [];
    const totalViews = rows.reduce((sum, row) => sum + row.total_views, 0);
    const totalUniqueUsers = rows.reduce((max, row) => Math.max(max, row.unique_users), 0);
    const topPanel = rows[0] ?? null;

    return {
      totalViews,
      totalUniqueUsers,
      topPanel,
    };
  }, [panelUsageQuery.data]);

  return (
    <div className="space-y-6">
      <AppPageIntro
        eyebrow="Product analytics"
        icon={<Activity className="h-3.5 w-3.5" />}
        title="Uso de paneles"
        description="Lectura operativa de que modulos se usan mas, cuantos usuarios entran y en que ventanas se mueve la adopcion."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-border/60">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <BarChart3 className="h-4 w-4" />
              </div>
              {panelUsageQuery.isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-black">{usageSummary.totalViews}</div>}
            </div>
            <div>
              <CardTitle className="text-sm">Vistas 30d</CardTitle>
              <CardDescription>Total de vistas registradas para paneles del producto en los ultimos 30 dias.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-3xl border-border/60">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <Users className="h-4 w-4" />
              </div>
              {panelUsageQuery.isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-black">{usageSummary.totalUniqueUsers}</div>}
            </div>
            <div>
              <CardTitle className="text-sm">Pico de usuarios</CardTitle>
              <CardDescription>Mayor numero de usuarios unicos detectados en un mismo panel durante la ventana actual.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-3xl border-border/60">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <CalendarRange className="h-4 w-4" />
              </div>
              {panelUsageQuery.isLoading ? <Skeleton className="h-7 w-28" /> : <div className="text-sm font-black uppercase tracking-[0.18em]">{usageSummary.topPanel?.panel_key ?? "Sin datos"}</div>}
            </div>
            <div>
              <CardTitle className="text-sm">Panel lider</CardTitle>
              <CardDescription>Modulo mas visitado en el periodo analizado, util para priorizar mejoras de producto.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Ranking de paneles</CardTitle>
          <CardDescription>Comparativa de uso por modulo para identificar las herramientas mas valiosas del prototipo.</CardDescription>
        </CardHeader>
        <CardContent>
          {panelUsageQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : panelUsageQuery.data && panelUsageQuery.data.length > 0 ? (
            <div className="rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Panel</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Vistas</TableHead>
                    <TableHead>Usuarios unicos</TableHead>
                    <TableHead>Ultima vista</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {panelUsageQuery.data.map((row) => (
                    <TableRow key={row.panel_key}>
                      <TableCell className="font-medium">{row.panel_key}</TableCell>
                      <TableCell>
                        <Badge variant={row.feature_area === "admin" ? "default" : "secondary"}>{row.feature_area}</Badge>
                      </TableCell>
                      <TableCell>{row.route}</TableCell>
                      <TableCell>{row.total_views}</TableCell>
                      <TableCell>{row.unique_users}</TableCell>
                      <TableCell>{row.last_viewed_at ? format(new Date(row.last_viewed_at), "yyyy-MM-dd HH:mm") : "--"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Todavia no hay trazas de uso. Navega por la app con cuentas autenticadas para empezar a poblar esta vista.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60">
        <CardHeader>
          <CardTitle>Tendencia diaria</CardTitle>
          <CardDescription>Serie corta de los ultimos dias para seguir adopcion y actividad reciente.</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyUsageQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : dailyUsageQuery.data && dailyUsageQuery.data.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {dailyUsageQuery.data.map((row) => (
                <div key={row.event_date} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{row.event_date}</p>
                  <p className="mt-3 text-2xl font-black">{row.total_views}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{row.unique_users} usuarios con actividad registrada</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Aun no hay volumen suficiente para mostrar tendencia diaria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsage;
