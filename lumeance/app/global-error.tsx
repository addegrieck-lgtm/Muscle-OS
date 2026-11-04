"use client";

import { useEffect } from "react";
import { reloadOnChunkError } from "@/lib/chunk-reload";

/**
 * Dernier recours si une erreur échappe aux autres limites (ex. fichier de la mise en page
 * introuvable après un déploiement) : rechargement automatique, sinon message sobre.
 */
export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    reloadOnChunkError(error);
  }, [error]);
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1ece4",
          color: "#3b2f27",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: "0 16px",
        }}
      >
        <p style={{ letterSpacing: "0.3em", fontSize: 12, color: "#a8875a" }}>LUMÉANCE</p>
        <h1 style={{ fontWeight: 400, fontSize: 32, margin: "16px 0" }}>
          Un instant, la lumière revient.
        </h1>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 24,
            padding: "14px 32px",
            border: "1px solid rgba(59,47,39,.3)",
            background: "transparent",
            color: "inherit",
            letterSpacing: "0.2em",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          RECHARGER LA PAGE
        </button>
      </body>
    </html>
  );
}
