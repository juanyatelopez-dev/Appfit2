import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { trackPanelView } from "@/services/productAnalytics";

const PanelUsageTracker = () => {
  const location = useLocation();
  const { user, isGuest, loading, accountRole } = useAuth();
  const lastTrackedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || isGuest || !user?.id) {
      return;
    }

    const trackingKey = `${user.id}:${location.pathname}`;
    if (lastTrackedKeyRef.current === trackingKey) {
      return;
    }

    lastTrackedKeyRef.current = trackingKey;

    void trackPanelView({
      pathname: location.pathname,
      accountRole,
    }).catch((error) => {
      console.warn("Could not track panel usage.", error);
    });
  }, [accountRole, isGuest, loading, location.pathname, user?.id]);

  return null;
};

export default PanelUsageTracker;
