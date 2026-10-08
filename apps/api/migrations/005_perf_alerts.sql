-- Surveillance des performances du serveur Minecraft (MSPT envoyé par le heartbeat VæloriaBridge).

-- Début de l'épisode de lag en cours (MSPT au-dessus du seuil), NULL quand le serveur est sain.
ALTER TABLE server_status ADD COLUMN lag_since timestamptz;
-- Pic de MSPT par tranche de 5 minutes.
ALTER TABLE server_status_history ADD COLUMN mspt numeric(8,2);

-- Un épisode de lag soutenu = une alerte, ouverte puis résolue.
CREATE TABLE server_alerts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server                text NOT NULL,
  started_at            timestamptz NOT NULL,
  resolved_at           timestamptz,
  peak_mspt             numeric(8,2) NOT NULL,
  min_tps               numeric(4,2),
  notified_at           timestamptz,   -- ouverture envoyée sur Discord
  resolved_notified_at  timestamptz    -- résolution envoyée sur Discord
);
-- Au plus une alerte ouverte par serveur.
CREATE UNIQUE INDEX server_alerts_open ON server_alerts (server) WHERE resolved_at IS NULL;
CREATE INDEX server_alerts_started ON server_alerts (started_at DESC);
