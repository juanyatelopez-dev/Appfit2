import { BarChart3, Dumbbell, Home, Ruler, UtensilsCrossed } from "lucide-react";
import { NavLink } from "react-router-dom";
import { usePreferences } from "@/context/PreferencesContext";

const MobileBottomNav = () => {
  const { t } = usePreferences();
  const mobileItems = [
    { label: t("nav.today"), path: "/today", icon: Home },
    { label: t("nav.training"), path: "/training", icon: Dumbbell },
    { label: t("nav.nutrition"), path: "/nutrition", icon: UtensilsCrossed },
    { label: t("nav.body"), path: "/body", icon: Ruler },
    { label: t("nav.progress"), path: "/progress", icon: BarChart3 },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className="grid h-16 grid-cols-5">
        {mobileItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
