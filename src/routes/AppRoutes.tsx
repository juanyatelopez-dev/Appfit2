import { Suspense, lazy, type ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireAccountRole from "@/routes/RequireAccountRole";
import RequireOnboarding from "@/routes/RequireOnboarding";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminUsage = lazy(() => import("@/pages/AdminUsage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const Stats = lazy(() => import("@/pages/Stats"));
const Water = lazy(() => import("@/pages/Water"));
const Sleep = lazy(() => import("@/pages/Sleep"));
const Settings = lazy(() => import("@/pages/Settings"));
const BodyWeight = lazy(() => import("@/pages/BodyWeight"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const DailyBiofeedback = lazy(() => import("@/pages/DailyBiofeedback"));
const BodyMeasurements = lazy(() => import("@/pages/BodyMeasurements"));
const Nutrition = lazy(() => import("@/pages/Nutrition"));
const Training = lazy(() => import("@/pages/Training"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));

const RouteLoadingState = () => (
  <div className="flex min-h-[40vh] items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const withRouteFallback = (element: ReactElement) => (
  <Suspense fallback={<RouteLoadingState />}>{element}</Suspense>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={withRouteFallback(<Onboarding />)} />

        <Route element={<RequireAccountRole allowedRoles={["admin_manager", "super_admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={withRouteFallback(<AdminDashboard />)} />
            <Route path="/admin/users" element={withRouteFallback(<AdminUsers />)} />
            <Route path="/admin/usage" element={withRouteFallback(<AdminUsage />)} />
          </Route>
        </Route>

        <Route element={<RequireOnboarding />}>
          <Route element={<MainLayout />}>
            <Route path="/today" element={withRouteFallback(<Dashboard />)} />
            <Route path="/dashboard" element={<Navigate to="/today" replace />} />
            <Route path="/fitness-profile" element={withRouteFallback(<Profile />)} />
            <Route path="/profile" element={<Navigate to="/fitness-profile" replace />} />
            <Route path="/goals" element={<Navigate to="/fitness-profile" replace />} />
            <Route path="/schedule" element={<Navigate to="/training" replace />} />
            <Route path="/achievements" element={<Navigate to="/progress" replace />} />
            <Route path="/progress" element={withRouteFallback(<Stats />)} />
            <Route path="/statistics" element={<Navigate to="/progress" replace />} />
            <Route path="/weekly-review" element={<Navigate to="/progress" replace />} />
            <Route path="/water" element={withRouteFallback(<Water />)} />
            <Route path="/sleep" element={withRouteFallback(<Sleep />)} />
            <Route path="/biofeedback" element={withRouteFallback(<DailyBiofeedback />)} />
            <Route path="/body" element={withRouteFallback(<BodyMeasurements />)} />
            <Route path="/measurements" element={<Navigate to="/body" replace />} />
            <Route path="/nutrition" element={withRouteFallback(<Nutrition />)} />
            <Route path="/training" element={withRouteFallback(<Training />)} />
            <Route path="/weight" element={withRouteFallback(<BodyWeight />)} />
            <Route path="/calendar" element={withRouteFallback(<Calendar />)} />
            <Route path="/settings" element={withRouteFallback(<Settings />)} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
