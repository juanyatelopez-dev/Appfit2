import { Bell, LogOut } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DashboardHeader = () => {
  const { language, t } = usePreferences();
  const { signOut, isGuest, exitGuest } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const dateStr = today.toLocaleDateString(language === "es" ? "es-ES" : "en-US", options);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDay = today.getDay();
  // Convert Sunday=0 to index 6, Mon=1 to 0, etc.
  const activeDayIndex = currentDay === 0 ? 6 : currentDay - 1;

  const handleAuthAction = async () => {
    try {
      if (isGuest) {
        exitGuest();
        navigate("/auth", { replace: true, state: { fromGuestSwitch: true } });
        return;
      }

      await signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "Could not sign out.");
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">{t("header.dashboard")}</h2>
          <p className="text-xs text-muted-foreground">{dateStr}</p>
        </div>
        <div className="hidden md:flex items-center gap-1 ml-4">
          {days.map((day, i) => (
            <span
              key={day}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i === activeDayIndex
                  ? "bg-primary text-primary-foreground"
                  : i < activeDayIndex
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {day.charAt(0)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
          onClick={handleAuthAction}
          aria-label={isGuest ? "Go to auth" : "Sign out"}
          title={isGuest ? "Switch account" : "Sign out"}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
