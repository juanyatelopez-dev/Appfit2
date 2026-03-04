import { Home, BarChart3, Settings, Scale, Target, Droplets, UserRound, CalendarDays } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import EditProfileModal from "@/components/profile/EditProfileModal";

const Sidebar = () => {
  const { profile, user, isGuest } = useAuth();
  const { t } = usePreferences();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const menuItems = [
    { title: t("nav.dashboard"), icon: Home, path: "/dashboard" },
    { title: t("nav.profile"), icon: UserRound, path: "/profile" },
    { title: t("nav.goals"), icon: Target, path: "/goals" },
    { title: t("nav.statistics"), icon: BarChart3, path: "/statistics" },
    { title: t("nav.water"), icon: Droplets, path: "/water" },
    { title: t("nav.weight"), icon: Scale, path: "/weight" },
    { title: t("nav.calendar"), icon: CalendarDays, path: "/calendar" },
    { title: t("nav.settings"), icon: Settings, path: "/settings" },
  ];

  const displayName = isGuest ? t("sidebar.guest") : profile?.full_name?.trim() || user?.email || t("sidebar.user");
  const heightLabel = profile?.height ? `${profile.height} cm` : "--";
  const weightLabel = profile?.weight ? `${profile.weight} kg` : "--";
  const goalLabel = profile?.goal_type || "--";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-30">
      <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-border">
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="relative mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          aria-label="Edit profile"
        >
          <Avatar className="w-20 h-20 ring-3 ring-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} alt="User avatar" className="object-cover" />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
        <h3 className="text-base font-semibold text-card-foreground">{displayName}</h3>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>{heightLabel}</span>
          <span className="text-border">|</span>
          <span>{weightLabel}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{goalLabel}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => setIsEditModalOpen(true)}
        >
          {t("sidebar.editProfile")}
        </Button>
      </div>

      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <EditProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
    </aside>
  );
};

export default Sidebar;
