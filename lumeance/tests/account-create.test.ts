import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { profileFromUser, profileMetadata, referralCode } from "@/lib/services/account-create";

describe("fiche client recréée depuis le compte", () => {
  it("relit un particulier", () => {
    const p = profileFromUser({
      email: "a@b.fr",
      user_metadata: profileMetadata({
        first_name: "Ada",
        last_name: "L",
        phone: null,
        account_type: "particulier",
        company_name: null,
        siret: null,
        vat_number: null,
        referral: "abcd2345",
      }),
    });
    expect(p).toMatchObject({
      email: "a@b.fr",
      first_name: "Ada",
      account_type: "particulier",
      referral: "ABCD2345",
    });
  });

  it("garde une entreprise seulement avec un SIRET valide", () => {
    const base = {
      account_type: "entreprise",
      company_name: "Atelier",
      vat_number: "fr12345678901",
    };
    const ok = profileFromUser({
      email: "a@b.fr",
      user_metadata: { ...base, siret: "732 829 320 00074" },
    });
    expect(ok).toMatchObject({
      account_type: "entreprise",
      siret: "73282932000074",
      vat_number: "FR12345678901",
      referral: null,
    });
    const bad = profileFromUser({ email: "a@b.fr", user_metadata: { ...base, siret: "123" } });
    expect(bad).toMatchObject({ account_type: "particulier", company_name: null, siret: null });
  });

  it("accepte un compte ancien sans métadonnées, refuse sans e-mail", () => {
    expect(profileFromUser({ email: "a@b.fr", user_metadata: {} })?.account_type).toBe(
      "particulier",
    );
    expect(profileFromUser({ email: undefined, user_metadata: {} })).toBeNull();
    expect(referralCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});
