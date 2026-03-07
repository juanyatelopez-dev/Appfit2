import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/Header";
import { Outlet } from "react-router-dom";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { useAuth } from "@/context/AuthContext";
import MobileBottomNav from "@/components/MobileBottomNav";

const MainLayout = () => {
  const { isGuest } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 md:ml-64 flex min-w-0 flex-col">
        <DashboardHeader />
        {isGuest && <GuestWarningBanner />}

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
