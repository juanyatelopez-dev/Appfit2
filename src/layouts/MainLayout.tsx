import { useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/Header";
import { Outlet, useLocation } from "react-router-dom";
import GuestWarningBanner from "@/components/GuestWarningBanner";
import { useAuth } from "@/context/AuthContext";
import MobileBottomNav from "@/components/MobileBottomNav";

const MainLayout = () => {
  const { isGuest } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const scrollToTarget = () => {
      if (!location.hash) {
        main.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      const targetId = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(targetId);

      if (!target) {
        main.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      const mainRect = main.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop = main.scrollTop + targetRect.top - mainRect.top - 16;

      main.scrollTo({ top: Math.max(0, nextTop), behavior: "auto" });
    };

    requestAnimationFrame(scrollToTarget);
  }, [location.hash, location.pathname]);

  return (
    <div className="app-shell flex min-h-[100dvh] overflow-hidden bg-background md:min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden md:ml-64 md:min-h-screen">
        <DashboardHeader />
        {isGuest && <GuestWarningBanner />}

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-32 md:p-8 md:pb-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
