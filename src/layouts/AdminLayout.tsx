import { BarChart3, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const adminNavItems = [
  { label: "Resumen", path: "/admin", icon: BarChart3, exact: true },
  { label: "Usuarios", path: "/admin/users", icon: Users },
];

const AdminLayout = () => {
  const { accountRole } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">Admin Console</p>
            <h1 className="text-lg font-semibold text-foreground">AppFit Control Tower</h1>
            <p className="text-sm text-muted-foreground">Entorno operativo para supervision del prototipo y gobierno de accesos.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Rol actual: {accountRole === "super_admin" ? "Super admin" : "Admin designado"}
            </div>
            <Button asChild variant="outline">
              <NavLink to="/today">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Volver a la app
              </NavLink>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:px-8">
        <aside className="space-y-2">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
