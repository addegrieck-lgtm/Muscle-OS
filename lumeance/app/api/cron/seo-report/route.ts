import { NextResponse } from "next/server";
import { validCronToken } from "@/lib/seo/report";
import { generateSeoReport } from "@/lib/services/seo-report";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Tâche hebdomadaire (GitHub Actions, voir .github/workflows/lumeance-seo-report.yml) :
 * POST avec « Authorization: Bearer <CRON_SECRET> ». Sans secret configuré, la route est fermée.
 */
export async function POST(req: Request) {
  if (!validCronToken(req.headers.get("authorization"), process.env.CRON_SECRET))
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  const db = createSupabaseServiceClient();
  if (!db) return NextResponse.json({ error: "base indisponible" }, { status: 503 });
  try {
    const { id, alerts } = await generateSeoReport(db, "planifie");
    return NextResponse.json({ id, alerts: alerts.length });
  } catch (e) {
    console.error("cron seo-report:", (e as Error).message);
    return NextResponse.json({ error: "échec du rapport" }, { status: 500 });
  }
}
