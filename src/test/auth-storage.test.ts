import { beforeEach, describe, expect, it } from "vitest";
import { isolatedAuthStorage } from "@/lib/auth-storage";

describe("independent CASAS authentication sessions", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  it("never reads another account from the previous shared localStorage session", async () => {
    const key="sb-casas-auth-token";
    window.localStorage.setItem(key, '{"user":"gestor"}');
    const auth=isolatedAuthStorage()!;
    expect(await auth.getItem(key)).toBeNull();
    await auth.setItem(key,'{"user":"corretor"}');
    expect(await auth.getItem(key)).toBe('{"user":"corretor"}');
    expect(window.localStorage.getItem(key)).toBe('{"user":"gestor"}');
  });
  it("persists sign-in only for the current tab and deletes the current tab's token", async () => {
    const auth=isolatedAuthStorage()!;
    await auth.setItem("auth","conta-a");
    expect(window.sessionStorage.getItem("auth")).toBe("conta-a");
    await auth.removeItem("auth");
    expect(await auth.getItem("auth")).toBeNull();
  });
});
