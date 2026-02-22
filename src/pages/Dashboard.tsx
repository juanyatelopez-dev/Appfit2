import { Dumbbell, Flame, Moon, TrendingUp } from "lucide-react";
import StatCard from "@/components/StatCard";
import ActivityChart from "@/components/ActivityChart";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const { profile, user } = useAuth();
  console.log("Dashboard Rendered");

  if (import.meta.env.DEV) {
    console.log("[Dashboard] Rendering with profile:", profile);
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <div className="relative">
      {import.meta.env.DEV && (
        <div className="absolute -top-6 right-0 text-[10px] text-muted-foreground opacity-50">
          Dashboard Page
        </div>
      )}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          Welcome back, {displayName}
        </h2>
      </div>

      {/* Goal Section */}
      <div className="mb-8 p-6 bg-card rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground mb-1">Current Goal</p>
        <p className="text-sm font-medium italic">Goals module not implemented yet</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative">
        <div className="absolute inset-0 z-10 bg-background/20 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
          <p className="bg-card px-4 py-2 rounded-full border border-border shadow-sm text-sm font-medium">
            Stats module not implemented yet
          </p>
        </div>
        <StatCard
          title="Exercise"
          value="0"
          unit="min"
          progress={0}
          icon={Dumbbell}
          variant="exercise"
        />
        <StatCard
          title="Calories"
          value="0"
          unit="kcal"
          progress={0}
          icon={Flame}
          variant="meals"
        />
        <StatCard
          title="Sleep"
          value="0"
          unit="hrs"
          progress={0}
          icon={Moon}
          variant="sleep"
        />
      </div>

      {/* Chart */}
      <div className="relative">
        <ActivityChart />
        <div className="absolute inset-0 z-10 bg-background/20 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
          <p className="bg-card px-4 py-2 rounded-full border border-border shadow-sm text-sm font-medium">
            Weekly Activity module not implemented yet
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
