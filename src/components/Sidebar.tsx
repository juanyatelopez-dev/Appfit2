import { Home, Target, CalendarDays, Trophy, BarChart3, Settings, Crown } from "lucide-react";
import avatarImg from "@/assets/avatar.jpg";

const menuItems = [
  { title: "Home", icon: Home, active: true },
  { title: "My Goals", icon: Target },
  { title: "Schedule", icon: CalendarDays },
  { title: "Achievements", icon: Trophy },
  { title: "Statistics", icon: BarChart3 },
  { title: "Settings", icon: Settings },
];

const AppSidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-30">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-border">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-3 ring-primary/20 mb-3">
          <img src={avatarImg} alt="User avatar" className="w-full h-full object-cover" />
        </div>
        <h3 className="text-base font-semibold text-card-foreground">Carlos Rivera</h3>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>178 cm</span>
          <span className="text-border">|</span>
          <span>75 kg</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  item.active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

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

export default AppSidebar;
