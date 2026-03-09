import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListBodyMetricsByRange = vi.fn();
const mockGetGuestBodyMetrics = vi.fn(() => []);
const mockGetGuestWeightGoal = vi.fn(() => ({
  target_weight_kg: null,
  target_date: null,
  start_weight_kg: null,
  goal_direction: null,
}));
const mockGetWeightTrendAnalysis = vi.fn(() =>
  Promise.resolve({
    latest: null,
    weeklyChange: null,
    movingAvg7: null,
    prevMovingAvg7: null,
    trend: "stable",
  }),
);
const mockGetSleepGoal = vi.fn(() => Promise.resolve({ sleep_goal_minutes: 480 }));
const mockGetSleepRangeTotals = vi.fn(() => Promise.resolve([]));
const mockGetBiofeedbackWeeklyAverages = vi.fn(() =>
  Promise.resolve({
    days_logged: 0,
    avg_sleep_quality: 0,
    avg_energy: 0,
    avg_stress: 0,
    avg_training_energy: 0,
  }),
);
const mockGetBiofeedbackRange = vi.fn(() => Promise.resolve([]));
const mockGetLatestBodyMeasurement = vi.fn(() => Promise.resolve(null));
const mockGetBodyMeasurementsRange = vi.fn(() => Promise.resolve([]));
const mockGetWeeklyReviewSummary = vi.fn(() =>
  Promise.resolve({
    weekStart: new Date("2026-03-02T00:00:00.000Z"),
    weekEnd: new Date("2026-03-08T00:00:00.000Z"),
    waterDaysMet: 0,
    waterDaysTotal: 7,
    avgSleepMinutes: 0,
    avgBioSleepQuality: 0,
    avgBioEnergy: 0,
    avgBioStress: 0,
    weightWeeklyChange: null,
    weightTrend: "stable",
    weightMovingAvg7: null,
    activeDays: 0,
  }),
);

const mockUseAuth = vi.fn();

vi.mock("@/services/bodyMetrics", () => ({
  listBodyMetricsByRange: (...args: any[]) => mockListBodyMetricsByRange(...args),
  getGuestBodyMetrics: () => mockGetGuestBodyMetrics(),
  getGuestWeightGoal: () => mockGetGuestWeightGoal(),
  getWeightTrendAnalysis: (...args: any[]) => mockGetWeightTrendAnalysis(...args),
}));

vi.mock("@/services/sleep", () => ({
  getSleepGoal: (...args: any[]) => mockGetSleepGoal(...args),
  getSleepRangeTotals: (...args: any[]) => mockGetSleepRangeTotals(...args),
}));

vi.mock("@/services/dailyBiofeedback", () => ({
  getBiofeedbackWeeklyAverages: (...args: any[]) => mockGetBiofeedbackWeeklyAverages(...args),
  getBiofeedbackRange: (...args: any[]) => mockGetBiofeedbackRange(...args),
}));

vi.mock("@/services/bodyMeasurements", () => ({
  getLatestBodyMeasurement: (...args: any[]) => mockGetLatestBodyMeasurement(...args),
  getBodyMeasurementsRange: (...args: any[]) => mockGetBodyMeasurementsRange(...args),
}));

vi.mock("@/services/weeklyReview", () => ({
  getWeeklyReviewSummary: (...args: any[]) => mockGetWeeklyReviewSummary(...args),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/GuestWarningBanner", () => ({
  default: () => null,
}));

import Stats from "@/pages/Stats";

const renderStats = () => {
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
        <Stats />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("Stats page", () => {
  beforeEach(() => {
    mockListBodyMetricsByRange.mockReset();
    mockGetGuestBodyMetrics.mockReset();
    mockGetGuestBodyMetrics.mockReturnValue([]);
    mockGetGuestWeightGoal.mockReset();
    mockGetGuestWeightGoal.mockReturnValue({
      target_weight_kg: null,
      target_date: null,
      start_weight_kg: null,
      goal_direction: null,
    });
    mockGetWeightTrendAnalysis.mockClear();
    mockGetSleepGoal.mockClear();
    mockGetSleepRangeTotals.mockClear();
    mockGetBiofeedbackWeeklyAverages.mockClear();
    mockGetBiofeedbackRange.mockClear();
    mockGetLatestBodyMeasurement.mockClear();
    mockGetBodyMeasurementsRange.mockClear();
    mockGetWeeklyReviewSummary.mockClear();

    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      isGuest: false,
      profile: {
        weight: 81.5,
        target_weight_kg: 75,
        target_date: "2026-07-01",
        start_weight_kg: 84,
        goal_direction: "lose",
      },
    });
  });

  it("renders current, initial and target weights", async () => {
    mockListBodyMetricsByRange.mockImplementation((_userId: string, range: string) => {
      if (range === "all") {
        return Promise.resolve([
          { id: "1", measured_at: "2026-01-01", weight_kg: 84.0 },
          { id: "2", measured_at: "2026-02-01", weight_kg: 82.0 },
          { id: "3", measured_at: "2026-03-01", weight_kg: 80.0 },
        ]);
      }
      return Promise.resolve([]);
    });

    renderStats();

    expect(await screen.findByText("Resumen de meta de peso")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText("Inicial")).toBeInTheDocument();
    expect(screen.getByText("Objetivo")).toBeInTheDocument();
    expect(screen.getByText("80.0 kg")).toBeInTheDocument();
    expect(screen.getByText("84.0 kg")).toBeInTheDocument();
    expect(screen.getByText("75.0 kg")).toBeInTheDocument();
  });

  it("shows fallback and CTA when initial weight is missing", async () => {
    mockListBodyMetricsByRange.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      isGuest: false,
      profile: {
        weight: null,
        target_weight_kg: null,
        target_date: null,
        start_weight_kg: null,
        goal_direction: null,
      },
    });

    renderStats();

    expect(await screen.findByText("Aún no definido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar peso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completar onboarding" })).toBeInTheDocument();
  });
});
