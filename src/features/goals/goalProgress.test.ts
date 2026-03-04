import { describe, expect, it } from "vitest";

import { calculateGoalProgress, resolveGoalDirection, resolveInitialWeight } from "@/features/goals/goalProgress";

describe("goalProgress", () => {
  it("returns null when required values are missing", () => {
    expect(calculateGoalProgress({ start: null, target: 70, current: 80 })).toBeNull();
    expect(calculateGoalProgress({ start: 90, target: null, current: 80 })).toBeNull();
    expect(calculateGoalProgress({ start: 90, target: 70, current: null })).toBeNull();
  });

  it("calculates lose-goal progress", () => {
    expect(calculateGoalProgress({ start: 90, target: 80, current: 85, direction: "lose" })).toBe(50);
  });

  it("calculates gain-goal progress", () => {
    expect(calculateGoalProgress({ start: 70, target: 80, current: 75, direction: "gain" })).toBe(50);
  });

  it("handles same start and target as 100%", () => {
    expect(calculateGoalProgress({ start: 80, target: 80, current: 80, direction: "lose" })).toBe(100);
  });

  it("clamps progress to [0, 100]", () => {
    expect(calculateGoalProgress({ start: 90, target: 80, current: 100, direction: "lose" })).toBe(0);
    expect(calculateGoalProgress({ start: 90, target: 80, current: 70, direction: "lose" })).toBe(100);
  });

  it("resolves direction from start/target when not explicit", () => {
    expect(resolveGoalDirection(null, 90, 80)).toBe("lose");
    expect(resolveGoalDirection(null, 70, 80)).toBe("gain");
    expect(resolveGoalDirection(null, 80, 80)).toBe("maintain");
  });

  it("resolves initial weight from first entry, with profile fallback", () => {
    expect(resolveInitialWeight([{ weight_kg: 82.4 }], 90)).toBe(82.4);
    expect(resolveInitialWeight([], 88)).toBe(88);
    expect(resolveInitialWeight([], null)).toBeNull();
  });
});
