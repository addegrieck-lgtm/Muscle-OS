/** Concatène des classes en ignorant les valeurs falsy (évite une dépendance type clsx). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
