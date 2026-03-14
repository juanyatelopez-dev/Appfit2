import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import RequireOnboarding from "@/routes/RequireOnboarding";

function renderRequireOnboarding(initialPath = "/today") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RequireOnboarding />}>
          <Route path="/today" element={<div>App shell</div>} />
          <Route path="/onboarding" element={<div>Onboarding page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireOnboarding", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders nested content for guest users", () => {
    mockUseAuth.mockReturnValue({
      isGuest: true,
      onboardingCompleted: null,
    });

    renderRequireOnboarding();

    expect(screen.getByText("App shell")).toBeInTheDocument();
  });

  it("shows a loading spinner while onboarding state is unresolved", () => {
    mockUseAuth.mockReturnValue({
      isGuest: false,
      onboardingCompleted: null,
    });

    const { container } = renderRequireOnboarding();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects users without onboarding to /onboarding", () => {
    mockUseAuth.mockReturnValue({
      isGuest: false,
      onboardingCompleted: false,
    });

    renderRequireOnboarding("/today");

    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("keeps users on onboarding while onboarding is incomplete", () => {
    mockUseAuth.mockReturnValue({
      isGuest: false,
      onboardingCompleted: false,
    });

    renderRequireOnboarding("/onboarding");

    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("redirects completed users away from /onboarding", () => {
    mockUseAuth.mockReturnValue({
      isGuest: false,
      onboardingCompleted: true,
    });

    renderRequireOnboarding("/onboarding");

    expect(screen.getByText("App shell")).toBeInTheDocument();
  });

  it("renders nested content once onboarding is completed", () => {
    mockUseAuth.mockReturnValue({
      isGuest: false,
      onboardingCompleted: true,
    });

    renderRequireOnboarding("/today");

    expect(screen.getByText("App shell")).toBeInTheDocument();
  });
});
