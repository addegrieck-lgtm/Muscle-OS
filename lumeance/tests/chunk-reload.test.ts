import { afterEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, reloadOnChunkError } from "@/lib/chunk-reload";

describe("rechargement après déploiement", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reconnaît les erreurs de fichier JavaScript introuvable", () => {
    const named = Object.assign(new Error("x"), { name: "ChunkLoadError" });
    expect(isChunkLoadError(named)).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 7687 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk app-layout failed"))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it("recharge une seule fois par minute", () => {
    const store = new Map<string, string>();
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const err = new Error("Loading chunk 1 failed.");
    expect(reloadOnChunkError(err, 1_000_000)).toBe(true);
    expect(reloadOnChunkError(err, 1_030_000)).toBe(false);
    expect(reloadOnChunkError(err, 1_070_000)).toBe(true);
    expect(reloadOnChunkError(new Error("autre"), 2_000_000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
