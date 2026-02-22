import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    /**
     * While loading is true, we render a stable loader.
     * This prevents premature redirects to home ('/') before the session is resolved.
     */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    /**
     * Authentication Check:
     * Only redirects if loading is complete and no user session is found.
     */
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // If authenticated, render children (via Outlet)
    return <Outlet />;
};

export default ProtectedRoute;
