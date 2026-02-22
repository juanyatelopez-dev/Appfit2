import { Home, Target, CalendarDays, Trophy, BarChart3, Settings, Crown, User, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Profile", icon: User, path: "/profile" },
  { title: "My Goals", icon: Target, path: "/goals" },
  { title: "Schedule", icon: CalendarDays, path: "/schedule" },
  { title: "Achievements", icon: Trophy, path: "/achievements" },
  { title: "Statistics", icon: BarChart3, path: "/stats" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

const Sidebar = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-30">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-border">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-3 ring-primary text-primary-foreground bg-primary flex items-center justify-center mb-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="User avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold">{getInitials(profile?.full_name || "")}</span>
          )}
        </div>
        <h3 className="text-base font-semibold text-card-foreground">
          {profile?.full_name || "User"}
        </h3>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>178 cm</span>
          <span className="text-border">|</span>
          <span>75 kg</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
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

      {/* Sign Out Button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Upgrade CTA */}
      <div className="px-4 pb-6">
        <div className="gradient-exercise rounded-xl p-4 text-center">
          <Crown className="w-8 h-8 text-primary-foreground mx-auto mb-2" />
          <p className="text-sm font-bold text-primary-foreground">Go Premium</p>
          <p className="text-xs text-primary-foreground/80 mt-1">Unlock all features</p>
          <button className="mt-3 w-full bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground text-xs font-semibold py-2 rounded-lg transition-colors backdrop-blur-sm">
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
