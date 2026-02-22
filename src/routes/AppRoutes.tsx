import { Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />

      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
