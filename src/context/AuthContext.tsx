import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    onboardingCompleted: boolean | null;
    profile: { full_name: string | null; avatar_url: string | null } | null;
    signIn: (email: string) => Promise<void>;
    signUp: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    updateProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

    const logFlow = (message: string) => {
        if (import.meta.env.DEV) {
            console.log(`[AuthFlow] ${message}`);
        }
    };

    const fetchProfile = async (userId: string) => {
        logFlow("Fetching profile for user: " + userId);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('onboarding_completed, full_name, avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return false;
            }

            if (data) {
                logFlow("Onboarding status resolved: " + data.onboarding_completed);
                setOnboardingCompleted(data.onboarding_completed);
                setProfile({
                    full_name: data.full_name,
                    avatar_url: data.avatar_url
                });
                return true;
            } else {
                logFlow("Profile missing. Attempting to create...");
                const { error: createError } = await supabase
                    .from('users')
                    .insert({ id: userId, onboarding_completed: false });

                if (createError) {
                    console.error('Error creating profile:', createError);
                    return false;
                }

                logFlow("Profile created successfully.");
                setOnboardingCompleted(false);
                setProfile({ full_name: null, avatar_url: null });
                return true;
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
            return false;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            logFlow("Checking initial session...");
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;

                if (!isMounted) return;

                setUser(currentUser);

                if (currentUser) {
                    logFlow("Session detected.");
                    await fetchProfile(currentUser.id);
                } else {
                    logFlow("No session detected.");
                    setOnboardingCompleted(null);
                    setProfile(null);
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                if (isMounted) {
                    logFlow("Auth loading complete.");
                    setLoading(false);
                }
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            logFlow(`Auth state change: ${event}`);
            const currentUser = session?.user ?? null;

            if (!isMounted) return;

            if (currentUser?.id !== user?.id || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setLoading(true);
                setUser(currentUser);

                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setOnboardingCompleted(null);
                    setProfile(null);
                }
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [user?.id]);

    const signIn = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
    };

    const signUp = async (email: string) => {
        const { error } = await supabase.auth.signUp({ email, password: 'temporary-password' });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const completeOnboarding = async () => {
        if (!user) return;
        logFlow("Completing onboarding...");
        const { error } = await supabase
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', user.id);

        if (error) throw error;
        setOnboardingCompleted(true);
        logFlow("Onboarding marked as complete.");
    };

    const updateProfile = async (data: { full_name?: string; avatar_url?: string }) => {
        if (!user) return;
        logFlow("Updating profile...");

        // Optimistic update
        const oldProfile = profile;
        setProfile(prev => prev ? { ...prev, ...data } : null);

        const { error } = await supabase
            .from('users')
            .update({
                ...data,
                updated_at: new Date().toISOString()
            })
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
