import { describe, expect, it } from "vitest";

import { buildDashboardViewModel } from "@/features/dashboard/dashboardViewModel";
import type { DashboardCheckinModuleKey } from "@/services/dashboardCheckinPreferences";

const selectedModuleKeys: DashboardCheckinModuleKey[] = ["water", "sleep", "weight", "measurements", "biofeedback", "nutrition"];

describe("buildDashboardViewModel", () => {
  it("prioritizes active workout as primary action", () => {
    const model = buildDashboardViewModel({
      core: {
        waterTodayMl: 0,
        waterGoalMl: 2000,
        sleepDay: { total_minutes: 0 },
        weightSnapshot: { entries: [] },
        latestMeasurement: { date_key: null },
        bioToday: null,
      },
      todayKey: "2026-03-18",
      todayActivity: { hasNutrition: false },
      monthActivity: new Map(),
      selectedModuleKeys,
      activeWorkout: { name: "Pierna" },
      scheduledWorkout: { name: "Espalda" },
    });

    expect(model.primaryAction.label).toBe("Continuar entrenamiento");
    expect(model.primaryAction.href).toBe("/training?tab=today");
  });

  it("falls back to next pending module action when there is no workout", () => {
    const model = buildDashboardViewModel({
      core: {
        waterTodayMl: 0,
        waterGoalMl: 2000,
        sleepDay: { total_minutes: 420 },
        weightSnapshot: { entries: [{ measured_at: "2026-03-18" }] },
        latestMeasurement: { date_key: "2026-03-18" },
        bioToday: {},
      },
      todayKey: "2026-03-18",
      todayActivity: { hasNutrition: true },
      monthActivity: new Map(),
      selectedModuleKeys,
      activeWorkout: null,
      scheduledWorkout: null,
    });

    expect(model.nextModule?.key).toBe("water");
    expect(model.primaryAction.label).toBe("Registrar agua");
    expect(model.primaryAction.href).toBe("#water");
  });

  it("computes completion percentage and pending checklist", () => {
    const model = buildDashboardViewModel({
      core: {
        waterTodayMl: 1200,
        waterGoalMl: 2000,
        sleepDay: { total_minutes: 400 },
        weightSnapshot: { entries: [{ measured_at: "2026-03-18" }] },
        latestMeasurement: { date_key: null },
        bioToday: null,
      },
      todayKey: "2026-03-18",
      todayActivity: { hasNutrition: false },
      monthActivity: new Map(),
      selectedModuleKeys,
      activeWorkout: null,
      scheduledWorkout: null,
    });

    expect(model.dailyModules.length).toBe(6);
    expect(model.completionCount).toBe(3);
    expect(model.todayCompletionPct).toBe(50);
    expect(model.pendingChecklist.length).toBeGreaterThan(0);
  });
});
