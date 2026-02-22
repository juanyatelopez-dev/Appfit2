import { Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

// Future: wrap private routes with an AuthGuard component
// import AuthGuard from "@/components/AuthGuard";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes can go here */}
      {/* <Route path="/login" element={<Login />} /> */}

      {/* Protected routes wrapped in MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        {/* ADD NEW PROTECTED ROUTES HERE */}
        {/* <Route path="/goals" element={<Goals />} /> */}
        {/* <Route path="/schedule" element={<Schedule />} /> */}
        {/* <Route path="/achievements" element={<Achievements />} /> */}
        {/* <Route path="/statistics" element={<Statistics />} /> */}
        {/* <Route path="/settings" element={<Settings />} /> */}
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
