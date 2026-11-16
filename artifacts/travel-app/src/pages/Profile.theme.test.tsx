import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import Profile from "./Profile";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@clerk/react", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({
    isLoaded: true,
    user: {
      fullName: "Theme Tester",
      primaryEmailAddress: { emailAddress: "theme@example.com" },
    },
  }),
}));

function renderProfile() {
  return create(
    <ThemeProvider>
      <Profile />
    </ThemeProvider>,
  );
}

describe("Profile theme persistence", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  it.each(["system", "light", "dark"] as const)("keeps %s selected after reload", async (theme) => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = renderProfile();
    });

    act(() => renderer.root.findByProps({ "data-testid": `button-theme-${theme}` }).props.onClick());
    expect(localStorage.getItem("vite-ui-theme")).toBe(theme);

    act(() => renderer.unmount());
    await act(async () => {
      renderer = renderProfile();
    });

    expect(renderer.root.findByProps({ "data-testid": `button-theme-${theme}` }).props["aria-pressed"]).toBe(true);
    expect(document.documentElement.classList.contains(theme === "system" ? "light" : theme)).toBe(true);
  });
});