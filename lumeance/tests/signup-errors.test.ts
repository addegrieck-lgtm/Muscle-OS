import { describe, expect, it } from "vitest";
import { signupErrorMessage } from "@/lib/services/signup-errors";

describe("erreurs d'inscription", () => {
  it("traduit les erreurs connues de Supabase", () => {
    expect(
      signupErrorMessage("over_email_send_rate_limit", "email rate limit exceeded")?.message,
    ).toMatch(/une heure/);
    expect(signupErrorMessage("email_address_not_authorized", "x")?.errors?.email).toBeDefined();
    expect(signupErrorMessage(undefined, "Error sending confirmation email")?.message).toMatch(
      /e-mail de confirmation/,
    );
    expect(signupErrorMessage("unexpected_failure", "boom")).toBeNull();
  });
});
