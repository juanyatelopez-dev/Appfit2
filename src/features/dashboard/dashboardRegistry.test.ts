import { describe, expect, it } from "vitest";

import { buildDashboardLayout } from "@/features/dashboard/dashboardRegistry";
import type { DashboardStackCard } from "@/features/dashboard/dashboardTypes";

const card = (
  key: string,
  mobileOrder: number,
  preferredColumn: "left" | "right",
  weight: number,
): DashboardStackCard => ({
  key,
  placement: {
    mobileOrder,
    preferredColumn,
    weight,
  },
  node: null,
});

describe("buildDashboardLayout", () => {
  it("orders cards by mobileOrder for mobile rendering", () => {
    const cards = [
      card("c", 30, "right", 2),
      card("a", 10, "left", 2),
      card("b", 20, "left", 1),
    ];

    const layout = buildDashboardLayout(cards);
    expect(layout.orderedCards.map((item) => item.key)).toEqual(["a", "b", "c"]);
  });

  it("keeps cards distributed across columns", () => {
    const cards = [
      card("left-heavy-1", 10, "left", 5),
      card("left-heavy-2", 20, "left", 5),
      card("right-1", 30, "right", 3),
      card("right-2", 40, "right", 3),
    ];

    const layout = buildDashboardLayout(cards);
    expect(layout.left.length).toBeGreaterThan(0);
    expect(layout.right.length).toBeGreaterThan(0);
    expect(layout.left.length + layout.right.length).toBe(cards.length);
  });
});
