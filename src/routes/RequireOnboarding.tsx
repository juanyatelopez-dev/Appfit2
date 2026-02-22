import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * RequireOnboarding Guard
 * 
 * Handles redirection based on the onboarding_completed status.
 * This should ONLY be rendered within a ProtectedRoute wrapper, 
 * as it assumes an authenticated user context.
 */
const RequireOnboarding = () => {
    const { onboardingCompleted, loading, user } = useAuth();
    const location = useLocation();

    if (import.meta.env.DEV) {
        console.log(`[RequireOnboarding] Path: ${location.pathname}, Onboarding: ${onboardingCompleted}, Loading: ${loading}`);
    }

    // Wait for auth and profile data to resolve
    if (loading || onboardingCompleted === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary text-center">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    /**
     * Redirection Decision Tree:
     * 
     * Case A: Onboarding NOT completed.
     * If the user is anywhere except the /onboarding page, redirect them there.
     */
    if (onboardingCompleted === false) {
        if (location.pathname !== '/onboarding') {
            console.log("[RequireOnboarding] Redirecting to /onboarding");
            return <Navigate to="/onboarding" replace />;
        }
    }

    /**
     * Case B: Onboarding completed.
     * If the user is on the /onboarding page, redirect them back to the dashboard.
     */
    if (onboardingCompleted === true) {
        if (location.pathname === '/onboarding') {
            console.log("[RequireOnboarding] Redirecting to /dashboard");
            return <Navigate to="/dashboard" replace />;
        }
    }

    /**
     * Case C: No redirection needed.
     * Either the user is on /onboarding and hasn't finished, 
     * or has finished and is NOT on /onboarding.
     */
    return <Outlet />;
};

export default RequireOnboarding;
