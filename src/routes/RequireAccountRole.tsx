import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { AccountRole } from "@/context/auth/types";

type RequireAccountRoleProps = {
  allowedRoles: AccountRole[];
};

const RequireAccountRole = ({ allowedRoles }: RequireAccountRoleProps) => {
  const { user, loading, isGuest, accountRole } = useAuth();

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || isGuest) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowedRoles.includes(accountRole)) {
    return <Navigate to="/today" replace />;
  }

  return <Outlet />;
};

export default RequireAccountRole;
