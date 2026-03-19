import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DASHBOARD_CARD_DENSITY_KEY } from "@/features/dashboard/dashboardDensity";

const mockUseAuth = vi.fn();
const mockUseDashboardSnapshot = vi.fn();
const mockGetTrainingTodaySummary = vi.fn();
const mockGetDashboardCheckinModulePreferences = vi.fn();
const mockGetDashboardHomeWidgetPreferences = vi.fn();
const mockSaveDashboardCheckinModulePreferences = vi.fn();
const mockSaveDashboardHomeWidgetPreferences = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useDashboardSnapshot", () => ({
  useDashboardSnapshot: (...args: unknown[]) => mockUseDashboardSnapshot(...args),
}));

vi.mock("@/modules/training/services", () => ({
  getTrainingTodaySummary: (...args: unknown[]) => mockGetTrainingTodaySummary(...args),
}));

vi.mock("@/services/dashboardCheckinPreferences", () => ({
  DASHBOARD_CHECKIN_MODULE_DEFINITIONS: [
    { key: "water", label: "Agua", route: "#water" },
    { key: "sleep", label: "Sueno", route: "#sleep" },
    { key: "weight", label: "Peso", route: "#weight" },
  ],
  DEFAULT_DASHBOARD_CHECKIN_MODULES: ["water", "sleep", "weight"],
  getDashboardCheckinModulePreferences: (...args: unknown[]) => mockGetDashboardCheckinModulePreferences(...args),
  saveDashboardCheckinModulePreferences: (...args: unknown[]) => mockSaveDashboardCheckinModulePreferences(...args),
}));

vi.mock("@/services/dashboardHomePreferences", () => ({
  DASHBOARD_HOME_WIDGET_DEFINITIONS: [
    { key: "hero_routine", label: "Rutina de hoy" },
    { key: "hero_date", label: "Fecha" },
    { key: "hero_modules", label: "Modulos completos" },
    { key: "physical_progress", label: "Progreso corporal" },
    { key: "quick_actions", label: "Acciones clave" },
    { key: "status_row", label: "Resumen del dia" },
    { key: "nutrition", label: "Comidas del dia" },
    { key: "water", label: "Agua hoy" },
    { key: "weight", label: "Peso de hoy" },
  ],
  DEFAULT_DASHBOARD_HOME_WIDGETS: [
    "hero_routine",
    "hero_date",
    "hero_modules",
    "physical_progress",
    "quick_actions",
    "status_row",
    "nutrition",
    "water",
    "weight",
  ],
  getDashboardHomeWidgetPreferences: (...args: unknown[]) => mockGetDashboardHomeWidgetPreferences(...args),
  saveDashboardHomeWidgetPreferences: (...args: unknown[]) => mockSaveDashboardHomeWidgetPreferences(...args),
}));

vi.mock("@/components/dashboard/BodyMeasurementsCard", () => ({ default: () => <div>BodyMeasurementsCard</div> }));
vi.mock("@/components/dashboard/CalendarMiniWidget", () => ({ default: () => <div>CalendarMiniWidget</div> }));
vi.mock("@/components/dashboard/DashboardQuickActions", () => ({ default: () => <div>DashboardQuickActions</div> }));
vi.mock("@/components/dashboard/PhysicalProgressHub", () => ({ default: () => <div>PhysicalProgressHub</div> }));
vi.mock("@/components/dashboard/RecoveryCard", () => ({ default: () => <div>RecoveryCard</div> }));
vi.mock("@/components/dashboard/TacticalNotesCard", () => ({ default: () => <div>TacticalNotesCard</div> }));
vi.mock("@/components/dashboard/TodayStatusRow", () => ({ default: () => <div>TodayStatusRow</div> }));
vi.mock("@/components/dashboard/SleepCard", () => ({ default: () => <div>SleepCard</div> }));
vi.mock("@/components/dashboard/WaterCard", () => ({ default: () => <div>WaterCard</div> }));
vi.mock("@/components/daily/TodayBiofeedbackModule", () => ({ default: () => <div>TodayBiofeedbackModule</div> }));
vi.mock("@/components/daily/TodayMealsModule", () => ({ default: () => <div>TodayMealsModule</div> }));
vi.mock("@/components/daily/TodayWeightModule", () => ({ default: () => <div>TodayWeightModule</div> }));

import Dashboard from "@/pages/Dashboard";

const renderDashboard = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const getActionsSection = () => document.querySelector('section[aria-labelledby="dashboard-zone-actions"]');

describe("Dashboard page", () => {
  beforeEach(() => {
    window.localStorage.clear();

    mockUseAuth.mockReset();
    mockUseDashboardSnapshot.mockReset();
    mockGetTrainingTodaySummary.mockReset();
    mockGetDashboardCheckinModulePreferences.mockReset();
    mockGetDashboardHomeWidgetPreferences.mockReset();
    mockSaveDashboardCheckinModulePreferences.mockReset();
    mockSaveDashboardHomeWidgetPreferences.mockReset();

    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      isGuest: false,
      profile: { timezone: "America/Lima" },
    });

    const todayKey = "2026-03-19";
    mockUseDashboardSnapshot.mockReturnValue({
      todayKey,
      coreLoading: false,
      monthActivityLoading: false,
      monthActivity: new Map([[todayKey, { hasNutrition: false, hasWater: false, hasSleep: false, hasWeight: false, hasBiofeedback: false }]]),
      saveTodayNote: vi.fn().mockResolvedValue(undefined),
      core: {
        todayLabel: "jueves, 19 de marzo de 2026",
        activeDays7: 2,
        waterTodayMl: 0,
        waterGoalMl: 2000,
        sleepDay: { total_minutes: 0 },
        sleepGoalMinutes: 480,
        weightSnapshot: { entries: [] },
        latestMeasurement: { date_key: null },
        latestMeasurementWeight: null,
        previousMeasurement: null,
        bioToday: null,
        noteToday: null,
        noteLatest: null,
        physicalSummary: null,
        recovery: {
          score: 30,
          status: "Baja",
          drivers: [],
          subscores: { sleep: 0, biofeedback: 0, hydration: 0, consistency: 0 },
        },
        goal: { goal_direction: null },
        waistComparison: { deltaCm: null, label: "Sin referencia previa", referenceDateKey: null },
        nutritionToday: null,
      },
    });

    mockGetTrainingTodaySummary.mockResolvedValue({
      scheduledWorkout: null,
      activeSession: null,
    });

    mockGetDashboardCheckinModulePreferences.mockResolvedValue(["water", "sleep", "weight"]);
    mockGetDashboardHomeWidgetPreferences.mockResolvedValue([
      "hero_routine",
      "hero_date",
      "hero_modules",
      "physical_progress",
      "quick_actions",
      "status_row",
      "water",
      "weight",
    ]);
    mockSaveDashboardCheckinModulePreferences.mockResolvedValue(["water", "sleep", "weight"]);
    mockSaveDashboardHomeWidgetPreferences.mockResolvedValue([
      "hero_routine",
      "hero_date",
      "hero_modules",
      "physical_progress",
      "quick_actions",
      "status_row",
      "water",
      "weight",
    ]);
  });

  it("updates dashboard density to compact and persists it", async () => {
    renderDashboard();

    const settingsButton = await screen.findByRole("button", { name: "Widgets y densidad" });
    fireEvent.click(settingsButton);

    const compactButton = await screen.findByRole("button", { name: "Compacto" });
    fireEvent.click(compactButton);

    await waitFor(() => {
      expect(window.localStorage.getItem(DASHBOARD_CARD_DENSITY_KEY)).toBe("compact");
    });
  });

  it("uses compact density from localStorage on first render", async () => {
    window.localStorage.setItem(DASHBOARD_CARD_DENSITY_KEY, "compact");
    renderDashboard();

    await waitFor(() => {
      const actionsSection = getActionsSection();
      expect(actionsSection).not.toBeNull();
      expect(actionsSection?.className).toContain("gap-2");
    });
  });

  it("switches from compact to comfortable and updates layout class", async () => {
    window.localStorage.setItem(DASHBOARD_CARD_DENSITY_KEY, "compact");
    renderDashboard();

    const settingsButton = await screen.findByRole("button", { name: "Widgets y densidad" });
    fireEvent.click(settingsButton);
    const comfortableButton = await screen.findByRole("button", { name: "Comodo" });
    fireEvent.click(comfortableButton);

    await waitFor(() => {
      const actionsSection = getActionsSection();
      expect(actionsSection).not.toBeNull();
      expect(actionsSection?.className).toContain("gap-3");
      expect(window.localStorage.getItem(DASHBOARD_CARD_DENSITY_KEY)).toBe("comfortable");
    });
  });
});
