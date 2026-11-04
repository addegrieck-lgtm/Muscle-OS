/**
 * Erreurs connues de Supabase Auth à l'inscription, traduites pour le visiteur (sans révéler si
 * l'adresse est déjà inscrite). Les autres restent génériques et sont journalisées.
 */
export function signupErrorMessage(
  code: string | undefined,
  message: string,
): { message: string; errors?: Record<string, string> } | null {
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(message))
    return {
      message:
        "Trop d’inscriptions en peu de temps : l’e-mail de confirmation n’a pas pu partir. Merci de réessayer dans une heure.",
    };
  if (code === "email_address_invalid" || code === "email_address_not_authorized")
    return {
      message: "Cette adresse e-mail n’est pas acceptée. Merci d’en essayer une autre.",
      errors: { email: "Adresse non acceptée" },
    };
  if (code === "signup_disabled")
    return {
      message: "Les inscriptions sont momentanément fermées. Merci de réessayer plus tard.",
    };
  if (/sending (confirmation )?email|smtp/i.test(message))
    return {
      message:
        "L’e-mail de confirmation n’a pas pu être envoyé. Merci de réessayer plus tard ou de nous écrire.",
    };
  return null;
}
