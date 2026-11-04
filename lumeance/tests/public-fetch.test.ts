import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchPublic, isPublicHttpsUrl } from "@/lib/services/public-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("lecture de pages publiques (veille, liens externes)", () => {
  it("refuse http, IP, ports et noms internes", () => {
    expect(isPublicHttpsUrl("https://exemple-deco.fr/article")).toBe(true);
    for (const bad of [
      "http://exemple.fr/",
      "https://127.0.0.1/",
      "https://192.168.0.1/admin",
      "https://localhost/",
      "https://exemple.fr:8443/",
      "https://intranet.local/",
      "file:///etc/passwd",
    ])
      expect(isPublicHttpsUrl(bad), bad).toBe(false);
  });

  it("revérifie chaque redirection et refuse une redirection vers une adresse interne", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url === "https://exemple.fr/a")
          return new Response(null, {
            status: 301,
            headers: { location: "https://127.0.0.1/secret" },
          });
        return new Response("ok", { status: 200 });
      }),
    );
    expect(await fetchPublic("https://exemple.fr/a")).toBeNull();
    expect(calls).toEqual(["https://exemple.fr/a"]);
  });

  it("suit une redirection publique et lit la page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/a")
          ? new Response(null, { status: 302, headers: { location: "/b" } })
          : new Response("<title>B</title>", { status: 200 }),
      ),
    );
    expect(await fetchPublic("https://exemple.fr/a")).toEqual({
      status: 200,
      text: "<title>B</title>",
    });
  });
});
