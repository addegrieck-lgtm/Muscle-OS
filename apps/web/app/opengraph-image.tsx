import { ImageResponse } from "next/og";
import { BRAND } from "@vaeloria/config";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Image de partage générée au build (TikTok, Discord, X…) — aucun fichier lourd à maintenir. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at top, #2a2214 0%, #0a0a0b 60%)", color: "#f4f4f5" }}>
        <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: 18, color: "#e4e4e7" }}>VÆLORIA</div>
        <div style={{ fontSize: 40, letterSpacing: 8, marginTop: 12, color: "#c9a45c" }}>{BRAND.tagline}</div>
        <div style={{ fontSize: 28, marginTop: 48, color: "#a1a1aa" }}>{`Minecraft ${BRAND.minecraftVersion} · PvP inspiré du 1.8 · Faction · ${BRAND.serverIp}`}</div>
      </div>
    ),
    size,
  );
}
