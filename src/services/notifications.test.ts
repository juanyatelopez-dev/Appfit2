import { describe, expect, it } from "vitest";
import { reminderTemplates } from "@/services/notifications";

describe("notification reminder templates", () => {
  it("defines action paths for the admin reminder flows", () => {
    expect(reminderTemplates.complete_profile.actionPath).toBe("/fitness-profile");
    expect(reminderTemplates.resolve_onboarding.actionPath).toBe("/onboarding");
    expect(reminderTemplates.log_first_activity.actionPath).toBe("/today");
  });

  it("keeps titles and actions available for future notification center usage", () => {
    expect(reminderTemplates.complete_profile.title.length).toBeGreaterThan(0);
    expect(reminderTemplates.resolve_onboarding.actionLabel.length).toBeGreaterThan(0);
    expect(reminderTemplates.log_first_activity.body.length).toBeGreaterThan(0);
  });
});
