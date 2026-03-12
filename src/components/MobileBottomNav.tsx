import { Dumbbell, Home, UtensilsCrossed } from "lucide-react";
import { NavLink } from "react-router-dom";
import { usePreferences } from "@/context/PreferencesContext";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const { t } = usePreferences();
  const mobileItems = [
    { label: t("nav.training"), path: "/training", icon: Dumbbell },
    { label: t("nav.today"), path: "/today", icon: Home },
    { label: t("nav.nutrition"), path: "/nutrition", icon: UtensilsCrossed },
  ];

  return (
    <nav
      aria-label="Navegacion principal movil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card shadow-[0_-10px_26px_-24px_hsl(var(--foreground)/0.35)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-[4.25rem] grid-cols-3 gap-2 px-5">
        {mobileItems.map((item) => (
          <li key={item.path} className="flex items-center justify-center">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[10px] transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                      isActive
                        ? "border-primary/20 bg-primary/12 text-primary"
                        : "border-transparent bg-transparent text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={cn("line-clamp-1 text-[10px] font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
