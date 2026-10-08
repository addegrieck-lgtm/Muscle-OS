import { redirect } from "next/navigation";

// Ancienne adresse : l'espace joueur est désormais /compte.
export default function AccountRedirect() {
  redirect("/compte");
}
