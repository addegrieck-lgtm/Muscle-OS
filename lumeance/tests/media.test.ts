import { describe, expect, it } from "vitest";
import { checkUpload, sniffImageType, storagePath } from "@/lib/services/media";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe("contrôle des imports", () => {
  it("reconnaît les vraies signatures d'images", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe("image/png");
    expect(sniffImageType(ascii("RIFF....WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(ascii("....ftypavif"))).toBe("image/avif");
  });
  it("refuse SVG, HTML et exécutables même renommés", () => {
    expect(sniffImageType(ascii("<svg xmlns="))).toBeNull();
    expect(sniffImageType(ascii("<!DOCTYPE html>"))).toBeNull();
    expect(sniffImageType(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
  });
  it("limite la taille", () => {
    expect(checkUpload(11 * 1024 * 1024, bytes(0xff, 0xd8, 0xff)).ok).toBe(false);
    expect(checkUpload(0, bytes(0xff, 0xd8, 0xff)).ok).toBe(false);
    expect(checkUpload(1000, bytes(0xff, 0xd8, 0xff))).toMatchObject({
      ok: true,
      extension: "jpg",
    });
  });
  it("ne dérive jamais le chemin du nom fourni", () => {
    expect(storagePath("produits", "jpg", "abc")).toMatch(/^produits\/\d{4}\/\d{2}\/abc\.jpg$/);
  });
});
