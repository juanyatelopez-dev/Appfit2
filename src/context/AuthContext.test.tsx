import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn();

const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      limit: () => ({
        maybeSingle: mockMaybeSingle,
      }),
    }),
  }),
  update: (payload: unknown) => ({
    eq: (column: string, value: string) => mockUpdateEq(payload, column, value),
  }),
}));

vi.mock("@/services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from "@/context/AuthContext";

function AuthHarness() {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <div data-testid="isGuest">{String(auth.isGuest)}</div>
      <div data-testid="user">{auth.user?.id ?? "none"}</div>
      <div data-testid="onboarding">{String(auth.onboardingCompleted)}</div>
      <button type="button" onClick={() => auth.continueAsGuest()}>continue-guest</button>
      <button type="button" onClick={() => auth.exitGuest()}>exit-guest</button>
      <button type="button" onClick={() => auth.signUp("user@test.com", "secret123")}>signup</button>
      <button type="button" onClick={() => auth.completeOnboarding()}>complete-onboarding</button>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockSignOut.mockReset();
    mockMaybeSingle.mockReset();
    mockUpdateEq.mockReset();

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    mockMaybeSingle.mockResolvedValue({
      data: {
        full_name: "Test User",
        onboarding_completed: false,
      },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it("enters and exits guest mode locally", async () => {
    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByText("continue-guest"));

    expect(screen.getByTestId("isGuest")).toHaveTextContent("true");
    expect(screen.getByTestId("onboarding")).toHaveTextContent("true");
    expect(localStorage.getItem("appfit_is_guest")).toBe("true");

    fireEvent.click(screen.getByText("exit-guest"));

    expect(screen.getByTestId("isGuest")).toHaveTextContent("false");
    expect(localStorage.getItem("appfit_is_guest")).toBeNull();
  });

  it("signs up and clears guest mode when email confirmation is required", async () => {
    localStorage.setItem("appfit_is_guest", "true");

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByText("signup"));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret123",
      });
    });

    expect(localStorage.getItem("appfit_is_guest")).toBeNull();
    expect(screen.getByTestId("isGuest")).toHaveTextContent("false");
  });

  it("completes onboarding for authenticated users and caches the result", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1" },
        },
      },
    });

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("user")).toHaveTextContent("user-1");
    });

    fireEvent.click(screen.getByText("complete-onboarding"));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalled();
      expect(screen.getByTestId("onboarding")).toHaveTextContent("true");
    });

    expect(localStorage.getItem("appfit_onboarding_completed_user-1")).toBe("true");
  });
});
