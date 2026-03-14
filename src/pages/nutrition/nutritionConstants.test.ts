import { describe, expect, it } from "vitest";

import { ACTIVITY_LABELS, formatMetric, GOAL_LABELS, MEAL_SECTIONS } from "@/pages/nutrition/nutritionConstants";

describe("nutritionConstants", () => {
  it("defines the expected meal sections", () => {
    expect(MEAL_SECTIONS.map((meal) => meal.key)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
  });

  it("formats metric values and handles empty input", () => {
    expect(formatMetric(123)).toBe("123");
    expect(formatMetric(123.456, " kcal", 1)).toBe("123.5 kcal");
    expect(formatMetric(null, "g")).toBe("--");
  });

  it("exposes stable labels for activity and goals", () => {
    expect(ACTIVITY_LABELS.moderate).toBe("Moderado");
    expect(GOAL_LABELS.maintain).toBe("Mantener peso");
  });
});
