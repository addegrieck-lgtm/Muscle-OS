import { describe, expect, it, vi } from "vitest";
import { forget, memo } from "@/lib/services/ttl-memo";

describe("mémoire courte des données publiques", () => {
  it("relit la base au plus une fois par minute, jamais après une erreur", async () => {
    forget();
    const load = vi.fn(async () => "catalogue");
    expect(await memo("public:t", load, 60_000, 0)).toBe("catalogue");
    expect(await memo("public:t", load, 60_000, 30_000)).toBe("catalogue");
    expect(load).toHaveBeenCalledTimes(1);
    await memo("public:t", load, 60_000, 61_000);
    expect(load).toHaveBeenCalledTimes(2);

    const failing = vi.fn(async () => {
      throw new Error("base indisponible");
    });
    await expect(memo("public:e", failing, 60_000, 0)).rejects.toThrow();
    await expect(memo("public:e", failing, 60_000, 1)).rejects.toThrow();
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("se vide après une modification", async () => {
    forget();
    const load = vi.fn(async () => 1);
    await memo("public:x", load, 60_000, 0);
    forget("public:");
    await memo("public:x", load, 60_000, 1);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
