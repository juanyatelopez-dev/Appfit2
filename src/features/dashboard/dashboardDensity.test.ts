import { describe, expect, it } from "vitest";

import {
  DASHBOARD_CARD_DENSITY_KEY,
  loadDashboardCardDensity,
  saveDashboardCardDensity,
} from "@/features/dashboard/dashboardDensity";

describe("dashboardDensity", () => {
  it("returns comfortable by default", () => {
    window.localStorage.removeItem(DASHBOARD_CARD_DENSITY_KEY);
    expect(loadDashboardCardDensity()).toBe("comfortable");
  });

  it("returns stored compact value", () => {
    window.localStorage.setItem(DASHBOARD_CARD_DENSITY_KEY, "compact");
    expect(loadDashboardCardDensity()).toBe("compact");
  });

  it("falls back to comfortable for invalid value", () => {
    window.localStorage.setItem(DASHBOARD_CARD_DENSITY_KEY, "dense");
    expect(loadDashboardCardDensity()).toBe("comfortable");
  });

  it("saves density value to localStorage", () => {
    saveDashboardCardDensity("comfortable");
    expect(window.localStorage.getItem(DASHBOARD_CARD_DENSITY_KEY)).toBe("comfortable");
  });
});
