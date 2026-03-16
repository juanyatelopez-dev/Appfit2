import { describe, expect, it } from "vitest";
import { getTrackedPanels, resolveTrackedPanel } from "@/services/productAnalytics";

describe("productAnalytics route catalog", () => {
  it("resolves tracked workspace and admin panels", () => {
    expect(resolveTrackedPanel("/today")?.panelKey).toBe("today");
    expect(resolveTrackedPanel("/admin/usage")?.panelKey).toBe("admin_usage");
  });

  it("returns null for routes that are not tracked", () => {
    expect(resolveTrackedPanel("/not-found")).toBeNull();
  });

  it("exposes the tracked panel catalog", () => {
    const panels = getTrackedPanels();

    expect(panels.some((panel) => panel.route === "/training")).toBe(true);
    expect(panels.some((panel) => panel.route === "/admin/users")).toBe(true);
  });
});
