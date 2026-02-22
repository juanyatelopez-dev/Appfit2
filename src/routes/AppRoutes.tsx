import { Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireOnboarding from "@/routes/RequireOnboarding";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />

      {/* Auth Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding page (only requires Auth) */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Routes requiring both Auth AND Onboarding Check */}
        <Route element={<RequireOnboarding />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD NEW PROTECTED ROUTES HERE */}
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
