import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
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
    exitGuest: () => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
    signOut: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    updateProfile: (data: Partial<Omit<Profile, 'id' | 'created_at'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const GUEST_STORAGE_KEY = 'appfit_is_guest';
const createGuestProfile = (): Profile => ({
    id: 'guest',
    full_name: 'Guest User',
    weight: 70,
    height: 175,
    goal_type: 'Build Muscles',
    is_premium: false,
    created_at: new Date().toISOString()
});

const deriveOnboardingCompleted = (resolvedProfile: Profile | null) => {
    if (!resolvedProfile) return false;

    return Boolean(
        resolvedProfile.full_name ||
        resolvedProfile.weight !== null ||
        resolvedProfile.height !== null ||
        resolvedProfile.goal_type
    );
};

const ensureProfile = async (userId: string): Promise<Profile> => {
    const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (fetchError) {
        throw fetchError;
    }

    if (existingProfile) {
        return existingProfile as Profile;
    }

    const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select('*')
        .single();

    if (insertError) {
        throw insertError;
    }

    return insertedProfile as Profile;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isGuest, setIsGuest] = useState(() => localStorage.getItem(GUEST_STORAGE_KEY) === 'true');

    const logFlow = (message: string) => {
        if (import.meta.env.DEV) {
            console.log(`[AuthFlow] ${message}`);
        }
    };

    const syncAuthenticatedUser = async (authUser: User) => {
        logFlow("Syncing authenticated user: " + authUser.id);
        setUser(authUser);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);

        try {
            const resolvedProfile = await ensureProfile(authUser.id);
            setProfile(resolvedProfile);
            setOnboardingCompleted(deriveOnboardingCompleted(resolvedProfile));
        } catch (error) {
            console.error('Error ensuring profile:', error);
            setProfile(null);
            setOnboardingCompleted(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            logFlow("Initializing Auth...");
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;

                if (session?.user) {
                    logFlow("Initial session detected: " + session.user.id);
                    await syncAuthenticatedUser(session.user);
                } else {
                    logFlow("No initial session detected.");
                    setUser(null);
                    setProfile(isGuest ? createGuestProfile() : null);
                    setOnboardingCompleted(isGuest ? true : false);
                }
            } catch (error) {
                console.error('Error during initial session check:', error);
                if (isMounted) {
                    setUser(null);
                    setProfile(isGuest ? createGuestProfile() : null);
                    setOnboardingCompleted(isGuest ? true : false);
                }
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
            if (!isMounted) return;

            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                setLoading(true);

                if (session?.user) {
                    await syncAuthenticatedUser(session.user);
                } else if (localStorage.getItem(GUEST_STORAGE_KEY) !== 'true') {
                    setUser(null);
                    setProfile(null);
                    setOnboardingCompleted(false);
                }

                setLoading(false);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setOnboardingCompleted(false);
                setIsGuest(false);
                localStorage.removeItem(GUEST_STORAGE_KEY);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        logFlow("Signing in with password...");
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
    };

    const signUp = async (email: string, password: string) => {
        logFlow("Signing up...");
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);

        const requiresEmailConfirmation = !data.session;
        return { requiresEmailConfirmation };
    };

    const signOut = async () => {
        logFlow("Signing out...");
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        setUser(null);
        setProfile(null);
        setOnboardingCompleted(false);

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const continueAsGuest = () => {
        logFlow("Switching to Guest Mode");
        setIsGuest(true);
        localStorage.setItem(GUEST_STORAGE_KEY, 'true');
        setUser(null);
        setOnboardingCompleted(true);
        setProfile(createGuestProfile());
    };

    const exitGuest = () => {
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        setProfile(null);
        setOnboardingCompleted(false);
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
            exitGuest,
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
