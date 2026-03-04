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

const mockUseAuth = vi.fn();

vi.mock("@/services/bodyMetrics", () => ({
  listBodyMetricsByRange: (...args: any[]) => mockListBodyMetricsByRange(...args),
  getGuestBodyMetrics: () => mockGetGuestBodyMetrics(),
  getGuestWeightGoal: () => mockGetGuestWeightGoal(),
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

    expect(await screen.findByText("Weight Goal Summary")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Initial")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
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

    expect(await screen.findByText("Not defined yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register weight" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete onboarding" })).toBeInTheDocument();
  });
});
