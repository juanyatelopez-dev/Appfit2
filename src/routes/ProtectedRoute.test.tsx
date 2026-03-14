import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import ProtectedRoute from "@/routes/ProtectedRoute";

function renderProtectedRoute(initialPath = "/today") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/today" element={<div>Protected content</div>} />
        </Route>
        <Route path="/auth" element={<div>Auth page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders nested content for guest users", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isGuest: true,
    });

    renderProtectedRoute();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("shows a loading spinner while auth is resolving", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isGuest: false,
    });

    const { container } = renderProtectedRoute();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isGuest: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Auth page")).toBeInTheDocument();
  });

  it("renders nested content for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
      isGuest: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
