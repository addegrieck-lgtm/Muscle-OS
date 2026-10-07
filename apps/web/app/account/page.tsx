import { redirect } from "next/navigation";

// Tant que l'authentification (Phase 7) n'est pas livrée, l'espace compte renvoie vers /login.
export default function AccountPage() {
  redirect("/login");
}
