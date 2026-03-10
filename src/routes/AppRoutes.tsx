import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireOnboarding from "@/routes/RequireOnboarding";
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Schedule from "@/pages/Schedule";
import Achievements from "@/pages/Achievements";
import Stats from "@/pages/Stats";
import Water from "@/pages/Water";
import Sleep from "@/pages/Sleep";
import Settings from "@/pages/Settings";
import BodyWeight from "@/pages/BodyWeight";
import Calendar from "@/pages/Calendar";
import DailyBiofeedback from "@/pages/DailyBiofeedback";
import BodyMeasurements from "@/pages/BodyMeasurements";
import Nutrition from "@/pages/Nutrition";
import Training from "@/pages/Training";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/NotFound";

import Auth from "@/pages/Auth";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />

        <Route element={<RequireOnboarding />}>
          <Route element={<MainLayout />}>
            <Route path="/today" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/today" replace />} />
            <Route path="/fitness-profile" element={<Profile />} />
            <Route path="/profile" element={<Navigate to="/fitness-profile" replace />} />
            <Route path="/goals" element={<Navigate to="/fitness-profile" replace />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/progress" element={<Stats />} />
            <Route path="/statistics" element={<Navigate to="/progress" replace />} />
            <Route path="/weekly-review" element={<Navigate to="/progress" replace />} />
            <Route path="/water" element={<Water />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/biofeedback" element={<DailyBiofeedback />} />
            <Route path="/body" element={<BodyMeasurements />} />
            <Route path="/measurements" element={<Navigate to="/body" replace />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/training" element={<Training />} />
            <Route path="/weight" element={<BodyWeight />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
