export type GoalDirection = "lose" | "gain" | "maintain";

type GoalProgressInput = {
  start: number | null | undefined;
  target: number | null | undefined;
  current: number | null | undefined;
  direction?: GoalDirection | null;
};

type WeightEntryLike = {
  weight_kg: number;
};

export const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

export const resolveGoalDirection = (
  explicitDirection: GoalDirection | null | undefined,
  start: number | null | undefined,
  target: number | null | undefined,
): GoalDirection | null => {
  if (explicitDirection) return explicitDirection;
  if (start === null || start === undefined || target === null || target === undefined) return null;
  if (target < start) return "lose";
  if (target > start) return "gain";
  return "maintain";
};

export const calculateGoalProgress = ({ start, target, current, direction }: GoalProgressInput): number | null => {
  if (start === null || start === undefined) return null;
  if (target === null || target === undefined) return null;
  if (current === null || current === undefined) return null;

  const resolvedDirection = resolveGoalDirection(direction, start, target);
  if (!resolvedDirection) return null;

  if (resolvedDirection === "lose") {
    const denom = start - target;
    if (denom === 0) return 100;
    return clampProgress(((start - current) / denom) * 100);
  }

  if (resolvedDirection === "gain") {
    const denom = target - start;
    if (denom === 0) return 100;
    return clampProgress(((current - start) / denom) * 100);
  }

  const diff = Math.abs(current - target);
  return clampProgress(100 - diff * 20);
};

export const resolveInitialWeight = (
  entriesAsc: WeightEntryLike[],
  profileWeight: number | null | undefined,
): number | null => {
  if (entriesAsc.length > 0) return Number(entriesAsc[0].weight_kg);
  return profileWeight ?? null;
};
