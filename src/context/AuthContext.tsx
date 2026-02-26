import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';

interface Profile {
    id: string;
    full_name: string | null;
    weight: number | null;
    height: number | null;
    goal_type: string | null;
    is_premium: boolean;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    onboardingCompleted: boolean | null;
    profile: Profile | null;
    isGuest: boolean;
    continueAsGuest: () => void;
    signIn: (email: string) => Promise<void>;
    signUp: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    updateProfile: (data: Partial<Omit<Profile, 'id' | 'created_at'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isGuest, setIsGuest] = useState(false);

    const logFlow = (message: string) => {
        if (import.meta.env.DEV) {
            console.log(`[AuthFlow] ${message}`);
        }
    };

    const ensureProfile = async (userId: string) => {
        if (isGuest) return;
        logFlow("Ensuring profile for user: " + userId);
        try {
            // Use upsert to create profile if it doesn't exist
            // This satisfies the "Automatically insert a profile row" and "If profile does not exist on login: Create it automatically" requirements
            const { data, error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    // Default values if empty
                    full_name: user?.user_metadata?.full_name || null,
                }, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                console.error('Error ensuring profile:', error);
                return false;
            }

            if (data) {
                logFlow("Profile resolved.");
                setProfile(data);
                // We'll assume onboarding is completed if they have a full name for now, 
                // or we could add an onboarding_completed field to profiles too.
                // For now keeping the existing logic placeholder or adapting it.
                // The task says "Automatically insert a profile row... Default values if empty"
                // Let's assume onboarding is tied to having some data or a specific flag.
                // Since 'onboarding_completed' was in 'users' but not in the described 'profiles' table,
                // I will use a simple check or wait for user to define if they want that field in profiles.
                // Requirement: "id, full_name, weight, height, goal_type, is_premium, created_at"
                // I'll stick to these.
                setOnboardingCompleted(true);
                return true;
            }
        } catch (error) {
            console.error('Unexpected error ensuring profile:', error);
            return false;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            logFlow("Initializing Auth...");
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;

                if (!isMounted) return;

                if (currentUser) {
                    logFlow("Initial session detected: " + currentUser.id);
                    setUser(currentUser);
                    await ensureProfile(currentUser.id);
                } else {
                    logFlow("No initial session detected.");
                }
            } catch (error) {
                console.error('Error during initial session check:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    logFlow("Initial Auth check complete.");
                }
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            logFlow(`Auth state change: ${event}`);
            const currentUser = session?.user ?? null;

            if (!isMounted) return;

            if (event === 'SIGNED_IN') {
                setUser(currentUser);
                setLoading(true);
                if (currentUser) {
                    await ensureProfile(currentUser.id);
                }
                setLoading(false);
                setIsGuest(false);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setOnboardingCompleted(null);
                setIsGuest(false);
            } else if (event === 'TOKEN_REFRESHED') {
                setUser(currentUser);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const signUp = async (email: string) => {
        const { error } = await supabase.auth.signUp({ email, password: 'temporary-password' });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        setIsGuest(false);
        if (error) throw error;
    };

    const continueAsGuest = () => {
        logFlow("Switching to Guest Mode");
        setIsGuest(true);
        setUser(null);
        // Initialize default profile for guests
        setProfile({
            id: 'guest',
            full_name: 'Guest User',
            weight: 70,
            height: 175,
            goal_type: 'Build Muscles',
            is_premium: false,
            created_at: new Date().toISOString()
        });
        setOnboardingCompleted(true); // Guests skip onboarding
    };

    const completeOnboarding = async () => {
        if (!user || isGuest) return;
        logFlow("Completing onboarding...");
        // Assuming for now it's just state-based until table is updated.
        setOnboardingCompleted(true);
    };

    const updateProfile = async (data: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
        logFlow("Updating profile...");

        if (isGuest) {
            logFlow("Guest mode: performing local update.");
            setProfile(prev => prev ? { ...prev, ...data } : null);
            return;
        }

        if (!user) return;

        // Optimistic update
        const oldProfile = profile;
        setProfile(prev => prev ? { ...prev, ...data } : null);

        const { error } = await supabase
            .from('profiles')
            .update(data)
            .eq('id', user.id);

        if (error) {
            setProfile(oldProfile);
            console.error('Error updating profile:', error);
            throw error;
        }

        logFlow("Profile updated successfully.");
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            onboardingCompleted,
            profile,
            isGuest,
            continueAsGuest,
            signIn,
            signUp,
            signOut,
            completeOnboarding,
            updateProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
