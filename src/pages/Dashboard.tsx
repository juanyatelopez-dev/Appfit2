import { useState } from "react";
import { Dumbbell, Flame, Moon, TrendingUp, User, Weight, Ruler } from "lucide-react";
import StatCard from "@/components/StatCard";
import ActivityChart from "@/components/ActivityChart";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/context/AuthContext";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import EditProfileModal from "@/components/profile/EditProfileModal";

const Dashboard = () => {
  const { profile, isGuest } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      {isGuest && <GuestWarningBanner />}

      {/* Header / Profile Summary Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pt-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.full_name || "Welcome Back!"}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-7">
            {profile?.weight && (
              <span className="flex items-center gap-1">
                <Weight className="w-3.5 h-3.5" /> {profile.weight}kg
              </span>
            )}
            {profile?.height && (
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5" /> {profile.height}cm
              </span>
            )}
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {profile?.goal_type || "No goal set"}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setIsEditModalOpen(true)}
        >
          Edit Profile
        </Button>
      </div>

      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Exercise" value="45" unit="min" progress={72} icon={Dumbbell} variant="exercise" />
        <StatCard title="Calories" value="1,840" unit="kcal" progress={65} icon={Flame} variant="meals" />
        <StatCard title="Sleep" value="7.5" unit="hrs" progress={88} icon={Moon} variant="sleep" />
      </div>

      {/* Chart */}
      <ActivityChart />
    </>
  );
};

export default Dashboard;
