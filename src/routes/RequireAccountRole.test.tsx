import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import RequireAccountRole from "@/routes/RequireAccountRole";

function renderRequireAccountRole(initialPath = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RequireAccountRole allowedRoles={["admin_manager", "super_admin"]} />}>
          <Route path="/admin" element={<div>Admin dashboard</div>} />
        </Route>
        <Route path="/auth" element={<div>Auth page</div>} />
        <Route path="/today" element={<div>User dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAccountRole", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("shows a loading spinner while auth is resolving", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isGuest: false,
      accountRole: "member",
    });

    const { container } = renderRequireAccountRole();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects guests and unauthenticated users to auth", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isGuest: true,
      accountRole: "member",
    });

    renderRequireAccountRole();

    expect(screen.getByText("Auth page")).toBeInTheDocument();
  });

  it("redirects members back to the main app", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
      isGuest: false,
      accountRole: "member",
    });

    renderRequireAccountRole();

    expect(screen.getByText("User dashboard")).toBeInTheDocument();
  });

  it("allows admin roles into the admin area", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-2" },
      loading: false,
      isGuest: false,
      accountRole: "admin_manager",
    });

    renderRequireAccountRole();

    expect(screen.getByText("Admin dashboard")).toBeInTheDocument();
  });
});
