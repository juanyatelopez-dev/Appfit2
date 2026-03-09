import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNutritionTargetBreakdown,
  setDailyCalorieOverride,
  setNutritionDayArchetype,
  type NutritionDayArchetype,
} from "@/services/nutrition";

type UseNutritionTargetsParams = {
  userId: string | null;
  date: Date;
  isGuest?: boolean;
  timeZone?: string;
  profile?: {
    birth_date?: string | null;
    weight?: number | null;
    height?: number | null;
    goal_type?: string | null;
    goal_direction?: "lose" | "gain" | "maintain" | null;
    biological_sex?: string | null;
    activity_level?: string | null;
    nutrition_goal_type?: string | null;
    day_archetype?: string | null;
  } | null;
};

const invalidateNutrition = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["nutrition_day_summary"] }),
    queryClient.invalidateQueries({ queryKey: ["nutrition_target_breakdown"] }),
    queryClient.invalidateQueries({ queryKey: ["nutrition_range_summary"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_data"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar_day_nutrition"] }),
    queryClient.invalidateQueries({ queryKey: ["stats_nutrition"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard_tremor_nutrition_7d"] }),
  ]);
};

export const useNutritionTargets = ({ userId, date, isGuest = false, timeZone, profile }: UseNutritionTargetsParams) => {
  const queryClient = useQueryClient();
  const metabolicProfileKey = [
    profile?.birth_date ?? "",
    profile?.weight ?? "",
    profile?.height ?? "",
    profile?.biological_sex ?? "",
    profile?.activity_level ?? "",
    profile?.nutrition_goal_type ?? "",
    profile?.day_archetype ?? "",
    profile?.goal_type ?? "",
  ].join("|");

  const targetQuery = useQuery({
    queryKey: ["nutrition_target_breakdown", userId, date.toISOString().slice(0, 10), isGuest, timeZone, metabolicProfileKey],
    queryFn: () => getNutritionTargetBreakdown(userId, date, { isGuest, timeZone, profile }),
    enabled: Boolean(userId) || isGuest,
  });

  const setArchetypeMutation = useMutation({
    mutationFn: (dayArchetype: NutritionDayArchetype) =>
      setNutritionDayArchetype(userId, date, dayArchetype, { isGuest, timeZone, profile }),
    onSuccess: async () => {
      await invalidateNutrition(queryClient);
    },
  });

  const setOverrideMutation = useMutation({
    mutationFn: (calorieOverride: number | null) =>
      setDailyCalorieOverride(userId, date, calorieOverride, { isGuest, timeZone, profile }),
    onSuccess: async () => {
      await invalidateNutrition(queryClient);
    },
  });

  return {
    target: targetQuery.data?.target,
    metabolicProfile: targetQuery.data?.profile,
    isLoading: targetQuery.isLoading,
    error: targetQuery.error,
    refetch: targetQuery.refetch,
    setDayArchetype: setArchetypeMutation.mutateAsync,
    setCalorieOverride: setOverrideMutation.mutateAsync,
    isSaving: setArchetypeMutation.isPending || setOverrideMutation.isPending,
  };
};
