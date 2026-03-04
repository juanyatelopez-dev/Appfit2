import { Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireOnboarding from "@/routes/RequireOnboarding";
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Goals from "@/pages/Goals";
import Schedule from "@/pages/Schedule";
import Achievements from "@/pages/Achievements";
import Stats from "@/pages/Stats";
import Water from "@/pages/Water";
import Settings from "@/pages/Settings";
import BodyWeight from "@/pages/BodyWeight";
import Calendar from "@/pages/Calendar";
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/statistics" element={<Stats />} />
            <Route path="/water" element={<Water />} />
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
