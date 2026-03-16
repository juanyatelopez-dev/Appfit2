import { describe, expect, it } from "vitest";

import { createEmptyProfile, createGuestProfile, deriveOnboardingCompleted, resolveOnboardingCompleted } from "@/context/auth/profile";

describe("auth profile helpers", () => {
  it("creates stable guest and empty profile defaults", () => {
    const guest = createGuestProfile();
    const empty = createEmptyProfile();

    expect(guest.full_name).toBe("Guest");
    expect(guest.onboarding_completed).toBe(true);
    expect(guest.water_goal_ml).toBe(2000);

    expect(empty.full_name).toBeNull();
    expect(empty.onboarding_completed).toBeNull();
    expect(empty.sleep_goal_minutes).toBe(480);
  });

  it("derives onboarding completion from profile state", () => {
    expect(deriveOnboardingCompleted(null)).toBe(false);
    expect(deriveOnboardingCompleted({ ...createEmptyProfile(), onboarding_completed: true })).toBe(true);
    expect(deriveOnboardingCompleted({ ...createEmptyProfile(), onboarding_completed: false })).toBe(false);
    expect(deriveOnboardingCompleted({ ...createEmptyProfile(), full_name: "Stevan" })).toBe(false);
    expect(
      deriveOnboardingCompleted({
        ...createEmptyProfile(),
        full_name: "Stevan",
        weight: 80,
        height: 180,
        goal_type: "Maintain Weight",
      }),
    ).toBe(true);
    expect(deriveOnboardingCompleted(createEmptyProfile())).toBe(false);
  });

  it("prioritizes explicit onboarding flags over cache fallbacks", () => {
    expect(resolveOnboardingCompleted(null, true)).toBe(true);
    expect(resolveOnboardingCompleted({ ...createEmptyProfile(), onboarding_completed: false }, true)).toBe(false);
    expect(resolveOnboardingCompleted({ ...createEmptyProfile(), onboarding_completed: true }, false)).toBe(true);
    expect(
      resolveOnboardingCompleted(
        {
          ...createEmptyProfile(),
          full_name: "Stevan",
          weight: 80,
          height: 180,
          goal_type: "Maintain Weight",
        },
        false,
      ),
    ).toBe(true);
  });
});
