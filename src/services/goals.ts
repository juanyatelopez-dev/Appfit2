import { getGuestWeightGoal } from "@/services/bodyMetrics";
import { calculateGoalProgress, resolveGoalDirection, type GoalDirection } from "@/features/goals/goalProgress";

type ProfileLike = {
  target_weight_kg?: number | null;
  target_date?: string | null;
  start_weight_kg?: number | null;
  goal_direction?: GoalDirection | null;
};

export const getUserGoal = (profile: ProfileLike | null, isGuest = false) => {
  if (isGuest) return getGuestWeightGoal();
  return {
    target_weight_kg: profile?.target_weight_kg ?? null,
    target_date: profile?.target_date ?? null,
    start_weight_kg: profile?.start_weight_kg ?? null,
    goal_direction: profile?.goal_direction ?? null,
  };
};

export const getGoalProgress = ({
  current,
  initial,
  goal,
  direction,
  start,
}: {
  current: number | null;
  initial: number | null;
  goal: number | null;
  direction?: GoalDirection | null;
  start?: number | null;
}) => {
  const startWeight = start ?? initial;
  const resolvedDirection = resolveGoalDirection(direction ?? null, startWeight, goal);
  return calculateGoalProgress({
    start: startWeight,
    target: goal,
    current,
    direction: resolvedDirection,
  });
};
