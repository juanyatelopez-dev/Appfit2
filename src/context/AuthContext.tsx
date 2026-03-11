import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'sonner';

interface Profile {
    full_name: string | null;
    birth_date: string | null;
    avatar_url: string | null;
    weight: number | null;
    height: number | null;
    biological_sex: "male" | "female" | null;
    activity_level: "low" | "moderate" | "high" | "very_high" | "hyperactive" | null;
    nutrition_goal_type: "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null;
    day_archetype: "base" | "heavy" | "recovery" | null;
    goal_type: string | null;
    target_weight_kg: number | null;
    target_date: string | null;
    start_weight_kg: number | null;
    goal_direction: "lose" | "gain" | "maintain" | null;
    water_goal_ml: number | null;
    water_quick_options_ml: number[] | null;
    sleep_goal_minutes: number | null;
    calorie_goal: number | null;
    protein_goal_g: number | null;
    carb_goal_g: number | null;
    fat_goal_g: number | null;
    onboarding_completed: boolean | null;
    app_language: "en" | "es" | null;
    theme_preference: "light" | "dark" | "system" | null;
    theme_accent_color: string | null;
    theme_background_style: string | null;
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
    refreshProfile: () => Promise<void>;
    updateAvatar: (file: File) => Promise<string>;
    updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const GUEST_STORAGE_KEY = 'appfit_is_guest';
const AUTH_RESOLVE_TIMEOUT_MS = 8000;
const ONBOARDING_CACHE_KEY_PREFIX = "appfit_onboarding_completed_";

const getOnboardingCacheKey = (userId: string) => `${ONBOARDING_CACHE_KEY_PREFIX}${userId}`;
const getCachedOnboarding = (userId: string): boolean | null => {
    const raw = localStorage.getItem(getOnboardingCacheKey(userId));
    if (raw === null) return null;
    return raw === "true";
};
const setCachedOnboarding = (userId: string, value: boolean) =>
    localStorage.setItem(getOnboardingCacheKey(userId), value ? "true" : "false");

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(timeoutMessage));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });

const createGuestProfile = (): Profile => ({
    full_name: 'Guest',
    birth_date: null,
    avatar_url: null,
    weight: null,
    height: null,
    biological_sex: "male",
    activity_level: "moderate",
    nutrition_goal_type: "maintain",
    day_archetype: "base",
    goal_type: null,
    target_weight_kg: null,
    target_date: null,
    start_weight_kg: null,
    goal_direction: null,
    water_goal_ml: 2000,
    water_quick_options_ml: [250, 500, 1000, 2000],
    sleep_goal_minutes: 480,
    calorie_goal: 2000,
    protein_goal_g: 150,
    carb_goal_g: 250,
    fat_goal_g: 70,
    onboarding_completed: true,
    app_language: "en",
    theme_preference: "system",
    theme_accent_color: "cyan",
    theme_background_style: "focus",
});

const createEmptyProfile = (): Profile => ({
    full_name: null,
    birth_date: null,
    avatar_url: null,
    weight: null,
    height: null,
    biological_sex: "male",
    activity_level: "moderate",
    nutrition_goal_type: "maintain",
    day_archetype: "base",
    goal_type: null,
    target_weight_kg: null,
    target_date: null,
    start_weight_kg: null,
    goal_direction: null,
    water_goal_ml: 2000,
    water_quick_options_ml: [250, 500, 1000, 2000],
    sleep_goal_minutes: 480,
    calorie_goal: 2000,
    protein_goal_g: 150,
    carb_goal_g: 250,
    fat_goal_g: 70,
    onboarding_completed: null,
    app_language: "en",
    theme_preference: "system",
    theme_accent_color: "cyan",
    theme_background_style: "focus",
});

const deriveOnboardingCompleted = (resolvedProfile: Profile | null) => {
    if (!resolvedProfile) return false;
    if (resolvedProfile.onboarding_completed === true) return true;

    return Boolean(
        resolvedProfile.full_name ||
        resolvedProfile.weight !== null ||
        resolvedProfile.height !== null ||
        resolvedProfile.goal_type ||
        resolvedProfile.nutrition_goal_type ||
        resolvedProfile.activity_level
    );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [authedProfile, setAuthedProfile] = useState<Profile | null>(null);
    const [guestProfile, setGuestProfile] = useState<Profile>(() => createGuestProfile());
    const [isGuest, setIsGuest] = useState(() => localStorage.getItem(GUEST_STORAGE_KEY) === 'true');
    const profile = isGuest ? guestProfile : authedProfile;

    const logFlow = (message: string) => {
        if (import.meta.env.DEV) {
            console.log(`[AuthFlow] ${message}`);
        }
    };

    const fetchProfile = async (userId: string): Promise<Profile> => {
        let { data, error } = await supabase
            .from('profiles')
            .select('full_name,birth_date,height,weight,biological_sex,activity_level,nutrition_goal_type,day_archetype,goal_type,avatar_url,target_weight_kg,target_date,start_weight_kg,goal_direction,water_goal_ml,water_quick_options_ml,sleep_goal_minutes,calorie_goal,protein_goal_g,carb_goal_g,fat_goal_g,onboarding_completed,app_language,theme_preference,theme_accent_color,theme_background_style')
            .eq('id', userId)
            .limit(1)
            .maybeSingle();

        if (
            error &&
            (
                error.message?.includes("schema cache") ||
                error.message?.includes("calorie_goal") ||
                error.message?.includes("protein_goal_g") ||
                error.message?.includes("carb_goal_g") ||
                error.message?.includes("fat_goal_g") ||
                error.message?.includes("biological_sex") ||
                error.message?.includes("activity_level") ||
                error.message?.includes("nutrition_goal_type") ||
                error.message?.includes("day_archetype") ||
                error.message?.toLowerCase().includes("column")
            )
        ) {
            const fallback = await supabase
                .from('profiles')
                .select('full_name,height,weight,goal_type,avatar_url')
                .eq('id', userId)
                .limit(1)
                .maybeSingle();
            data = fallback.data as any;
            error = fallback.error;
        }

        if (error) {
            throw error;
        }

        const nextProfile: Profile = {
            full_name: data?.full_name ?? null,
            birth_date: data?.birth_date ?? null,
            height: data?.height ?? null,
            weight: data?.weight ?? null,
            biological_sex: (data?.biological_sex as Profile["biological_sex"]) ?? "male",
            activity_level: (data?.activity_level as Profile["activity_level"]) ?? "moderate",
            nutrition_goal_type: (data?.nutrition_goal_type as Profile["nutrition_goal_type"]) ?? "maintain",
            day_archetype: (data?.day_archetype as Profile["day_archetype"]) ?? "base",
            goal_type: data?.goal_type ?? null,
            avatar_url: data?.avatar_url ?? null,
            target_weight_kg: data?.target_weight_kg ?? null,
            target_date: data?.target_date ?? null,
            start_weight_kg: data?.start_weight_kg ?? null,
            goal_direction: (data?.goal_direction as Profile["goal_direction"]) ?? null,
            water_goal_ml: data?.water_goal_ml ?? 2000,
            water_quick_options_ml: data?.water_quick_options_ml ?? [250, 500, 1000, 2000],
            sleep_goal_minutes: data?.sleep_goal_minutes ?? 480,
            calorie_goal: data?.calorie_goal ?? 2000,
            protein_goal_g: data?.protein_goal_g ?? 150,
            carb_goal_g: data?.carb_goal_g ?? 250,
            fat_goal_g: data?.fat_goal_g ?? 70,
            onboarding_completed: data?.onboarding_completed ?? null,
            app_language: (data?.app_language as Profile["app_language"]) ?? "en",
            theme_preference: (data?.theme_preference as Profile["theme_preference"]) ?? "system",
            theme_accent_color: data?.theme_accent_color ?? "cyan",
            theme_background_style: data?.theme_background_style ?? "focus",
        };
        setAuthedProfile(nextProfile);
        return nextProfile;
    };

    const syncAuthenticatedUser = async (authUser: User) => {
        logFlow("Syncing authenticated user: " + authUser.id);
        setUser(authUser);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);

        try {
            const resolvedProfile = await withTimeout(
                fetchProfile(authUser.id),
                AUTH_RESOLVE_TIMEOUT_MS,
                'Profile fetch timed out.'
            );
            const derivedCompleted = deriveOnboardingCompleted(resolvedProfile);
            const cachedCompleted = getCachedOnboarding(authUser.id);
            const completed = derivedCompleted || cachedCompleted === true;
            setOnboardingCompleted(completed);
            setCachedOnboarding(authUser.id, completed);
        } catch (error) {
            console.error('Error fetching profile:', error);
            const fallbackCompleted = getCachedOnboarding(authUser.id);
            setOnboardingCompleted(prev => prev ?? fallbackCompleted ?? true);
        }
    };

    const refreshProfile = async () => {
        if (!user || isGuest) return;
        await fetchProfile(user.id);
    };

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            logFlow("Initializing Auth...");
            try {
                const { data: { session } } = await withTimeout(
                    supabase.auth.getSession(),
                    AUTH_RESOLVE_TIMEOUT_MS,
                    'Initial auth session check timed out.'
                );
                if (!isMounted) return;

                if (session?.user) {
                    logFlow("Initial session detected: " + session.user.id);
                    await syncAuthenticatedUser(session.user);
                } else {
                    logFlow("No initial session detected.");
                    setUser(null);
                    setAuthedProfile(null);
                    setGuestProfile(createGuestProfile());
                    setOnboardingCompleted(isGuest ? true : false);
                }
            } catch (error) {
                console.error('Error during initial session check:', error);
                if (isMounted) {
                    setUser(null);
                    setAuthedProfile(null);
                    setGuestProfile(createGuestProfile());
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

            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                try {
                    if (session?.user) {
                        await syncAuthenticatedUser(session.user);
                    } else if (localStorage.getItem(GUEST_STORAGE_KEY) !== 'true') {
                        setUser(null);
                        setAuthedProfile(null);
                        setOnboardingCompleted(false);
                    }
                } catch (error) {
                    console.error('Error processing auth state change:', error);
                    if (localStorage.getItem(GUEST_STORAGE_KEY) !== 'true') {
                        setUser(null);
                        setAuthedProfile(null);
                        setOnboardingCompleted(false);
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                logFlow(`Skipping loading transition for ${event}`);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setAuthedProfile(null);
                setGuestProfile(createGuestProfile());
                setOnboardingCompleted(false);
                setIsGuest(false);
                localStorage.removeItem(GUEST_STORAGE_KEY);
                setLoading(false);
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
        setAuthedProfile(null);
        setGuestProfile(createGuestProfile());
        setOnboardingCompleted(false);

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const continueAsGuest = () => {
        logFlow("Switching to Guest Mode");
        setIsGuest(true);
        localStorage.setItem(GUEST_STORAGE_KEY, 'true');
        setUser(null);
        setAuthedProfile(null);
        setOnboardingCompleted(true);
        setGuestProfile(createGuestProfile());
    };

    const exitGuest = () => {
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        setGuestProfile(createGuestProfile());
        setOnboardingCompleted(false);
    };

    const completeOnboarding = async () => {
        if (!user || isGuest) return;
        logFlow("Completing onboarding...");
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            if (error && !error.message?.includes("onboarding_completed")) {
                throw error;
            }
        } catch (error) {
            console.warn("Could not persist onboarding_completed in profiles, using local cache fallback.", error);
        }

        setOnboardingCompleted(true);
        setCachedOnboarding(user.id, true);
        setAuthedProfile(prev => prev ? { ...prev, onboarding_completed: true } : prev);
    };

    const updateAvatar = async (file: File) => {
        if (!file) {
            throw new Error('No file selected.');
        }

        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file.');
        }

        if (isGuest || !user) {
            throw new Error("Guest mode: avatar upload is disabled.");
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadError) {
            throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(path);

        return publicUrlData.publicUrl;
    };

    const updateProfile = async (data: Partial<Profile>) => {
        logFlow("Updating profile...");

        if (isGuest) {
            logFlow("Guest mode: performing local update.");
            setGuestProfile(prev => ({ ...prev, ...data }));
            return;
        }

        if (!user) return;

        // Optimistic update
        const oldProfile = authedProfile;
        const baseProfile = authedProfile ?? createEmptyProfile();
        setAuthedProfile({ ...baseProfile, ...data });

        let { error } = await supabase
            .from('profiles')
            .update({ ...data, updated_at: new Date().toISOString() } as any)
            .eq('id', user.id);

        // Some projects don't have updated_at in profiles; retry without it.
        if (error && error.message?.includes("Could not find the 'updated_at' column")) {
            const retry = await supabase
                .from('profiles')
                .update(data as any)
                .eq('id', user.id);
            error = retry.error;
        }

        if (error) {
            setAuthedProfile(oldProfile);
            toast.error(error.message);
            throw error;
        }

        if (typeof data.onboarding_completed === "boolean" && user?.id) {
            setCachedOnboarding(user.id, data.onboarding_completed);
            setOnboardingCompleted(data.onboarding_completed);
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
            refreshProfile,
            updateAvatar,
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
