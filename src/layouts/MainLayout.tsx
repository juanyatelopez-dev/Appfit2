import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/Header";
import { Outlet } from "react-router-dom";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { useAuth } from "@/context/AuthContext";

const MainLayout = () => {
  const { isGuest } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col">
        <DashboardHeader />
        {isGuest && <GuestWarningBanner />}

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
