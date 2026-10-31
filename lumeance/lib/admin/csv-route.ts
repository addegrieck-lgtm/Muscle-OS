import "server-only";
import { NextResponse } from "next/server";
import { getAdminSession, type AdminRole } from "@/lib/auth/admin";
import { toCsv } from "@/lib/services/orders";

/** Réponse CSV protégée : vérifie le rôle côté serveur avant toute lecture. */
export async function csvResponse(
  roles: AdminRole[] | null,
  filename: string,
  build: () => Promise<{ header: string[]; rows: unknown[][] }>,
) {
  const session = await getAdminSession();
  if (!session || (roles && !roles.includes(session.role))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { header, rows } = await build();
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
