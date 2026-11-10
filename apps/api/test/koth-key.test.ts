import { describe, expect, it } from "vitest";
import { kothZoneKey } from "../src/services/kothKey";

describe("kothZoneKey", () => {
  it("garde un nom déjà propre", () => {
    expect(kothZoneKey("gouffre")).toBe("gouffre");
    expect(kothZoneKey("citadelle")).toBe("citadelle");
  });

  it("retire le préfixe envoyé par VaeloriaFactions 1.3.0", () => {
    expect(kothZoneKey("KOTH gouffre")).toBe("gouffre");
    expect(kothZoneKey("Totem rubis")).toBe("rubis");
    expect(kothZoneKey("KOTH — Gouffre de Vælor")).toBe("gouffre-de-vaelor");
  });

  it("ne coupe pas un nom qui commence seulement par les mêmes lettres", () => {
    expect(kothZoneKey("kothar")).toBe("kothar");
    expect(kothZoneKey("totemique")).toBe("totemique");
  });

  it("renvoie null quand rien d'exploitable ne reste", () => {
    expect(kothZoneKey("KOTH")).toBeNull();
    expect(kothZoneKey("  ")).toBeNull();
  });
});
