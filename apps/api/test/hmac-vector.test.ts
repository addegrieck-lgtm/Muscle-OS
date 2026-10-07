import { describe, expect, it } from "vitest";
import { signPayload } from "../src/lib/hmac";

// Même vecteur que plugins/vaeloria-bridge/src/test/java/fr/vaeloria/bridge/SignerTest.java
describe("contrat de signature Node ↔ Java", () => {
  it("produit la signature de référence", () => {
    expect(signPayload("s".repeat(64), "1700000000000", "nonce-0123456789abcdef", '{"events":[]}')).toBe(
      "3c42a376341546d040cd59c2d02b4b2e4c1737cbbc6b8be9170d5149a9038e15",
    );
  });
});
