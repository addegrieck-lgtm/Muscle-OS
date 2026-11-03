import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/services/account";

export const dynamic = "force-dynamic";

/** État minimal du compte pour l'interface (en-tête, affichage HT). Jamais mis en cache. */
export async function GET() {
  const a = await getCurrentAccount();
  return NextResponse.json(
    a
      ? {
          loggedIn: true,
          firstName: a.firstName,
          pro: a.type === "entreprise" && a.proStatus === "approved",
        }
      : { loggedIn: false, firstName: null, pro: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
