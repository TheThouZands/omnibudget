import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ request: vi.fn(), navigate: vi.fn(), busy: vi.fn(), failed: vi.fn() }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "es" }));
vi.mock("@/i18n/navigation", () => ({ getPathname: () => "/es" }));
vi.mock("@/modules/auth/client/account-client", () => ({ accountRequest: state.request }));

import { useState } from "react";
import { LogoutButton } from "./logout-button";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useState).mockReturnValueOnce([false, state.busy]).mockReturnValueOnce([false, state.failed]);
  vi.stubGlobal("window", { location: { replace: state.navigate } });
});
afterEach(() => vi.unstubAllGlobals());

function button() {
  return LogoutButton({ className: "logout" }).props.children[0] as ReactElement<{
    onClick: () => Promise<void>; className: string;
  }>;
}

describe("logout navigation", () => {
  it("waits for server revocation before loading a fresh landing page", async () => {
    let finish!: () => void;
    state.request.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const control = button();
    expect(control.props.className).toBe("logout");
    const pending = control.props.onClick();
    expect(state.request).toHaveBeenCalledWith("logout", "POST");
    expect(state.busy).toHaveBeenCalledWith(true);
    expect(state.navigate).not.toHaveBeenCalled();
    finish();
    await pending;
    expect(state.navigate).toHaveBeenCalledWith("/es");
  });

  it("keeps the current page and permits a retry if logout fails", async () => {
    state.request.mockRejectedValue(new Error("Network unavailable"));
    await button().props.onClick();
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.failed).toHaveBeenLastCalledWith(true);
    expect(state.busy).toHaveBeenLastCalledWith(false);
  });
});
