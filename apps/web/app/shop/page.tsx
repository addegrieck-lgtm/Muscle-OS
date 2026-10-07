import { redirect } from "next/navigation";

// Ancienne adresse de la boutique.
export default function ShopRedirect() {
  redirect("/boutique");
}
