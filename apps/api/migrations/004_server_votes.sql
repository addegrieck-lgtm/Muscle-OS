-- Votes pour le serveur sur les sites de classement (serveur-prive.net, serveur-minecraft.com,
-- liste-serveurs-minecraft.org…). Deux canaux, un seul grand livre :
--   - « J'ai voté » sur /vote : l'API interroge le site de vote avec l'IP du joueur ;
--   - Votifier / NuVotifier en jeu : le plugin VæloriaBridge transmet l'événement SERVER_VOTE.
-- Un vote n'est compté qu'une fois par site, par joueur et par délai de revote, quel que soit le canal.

CREATE TABLE vote_sites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key               text NOT NULL UNIQUE CHECK (key ~ '^[a-z0-9-]{2,40}$'),
  name              text NOT NULL,
  vote_url          text NOT NULL,           -- page de vote de VÆLORIA sur le site
  -- Vérification « J'ai voté » par IP ('none' = Votifier uniquement)
  verifier          text NOT NULL DEFAULT 'none'
                    CHECK (verifier IN ('none','serveur-prive.net','serveur-minecraft.com','liste-serveurs-minecraft.org')),
  verification_key  text,                    -- identifiant ou jeton API du serveur sur le site (jamais exposé)
  votifier_service  text,                    -- nom du service transmis par Votifier
  cooldown_minutes  integer NOT NULL DEFAULT 180 CHECK (cooldown_minutes BETWEEN 30 AND 10080),
  reward_label      text NOT NULL DEFAULT '', -- récompense affichée sur /vote
  reward_command    text,                    -- commande en jeu ({username}, {uuid}), exécutée joueur connecté
  position          integer NOT NULL DEFAULT 0,
  active            boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Inactifs tant que la fiche du serveur n'existe pas sur le site : URL de vote et clé à renseigner dans l'admin.
INSERT INTO vote_sites (key, name, vote_url, verifier, votifier_service, cooldown_minutes, position) VALUES
  ('serveur-prive', 'Serveur-Privé', 'https://serveur-prive.net/', 'serveur-prive.net', 'serveur-prive.net', 90, 1),
  ('serveur-minecraft', 'Serveur-Minecraft', 'https://serveur-minecraft.com/', 'serveur-minecraft.com', 'serveur-minecraft.com', 180, 2),
  ('liste-serveurs-minecraft', 'Liste-Serveurs-Minecraft', 'https://www.liste-serveurs-minecraft.org/', 'liste-serveurs-minecraft.org', 'liste-serveurs-minecraft.org', 180, 3);

CREATE TABLE server_votes (
  id           bigserial PRIMARY KEY,
  site_id      uuid NOT NULL REFERENCES vote_sites(id) ON DELETE CASCADE,
  player_uuid  uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  username     text NOT NULL,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  source       text NOT NULL CHECK (source IN ('web','votifier','admin')),
  ip_hash      text,                         -- empreinte de l'IP (anti-partage d'un même vote), jamais l'IP
  external_id  text UNIQUE,                  -- identifiant de l'événement bridge (idempotence)
  voted_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX server_votes_player_idx ON server_votes (site_id, player_uuid, voted_at DESC);
CREATE INDEX server_votes_ip_idx ON server_votes (site_id, ip_hash, voted_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX server_votes_month_idx ON server_votes (voted_at);

INSERT INTO influence_rules (kind, label, points, daily_cap, once_per_user, requires_linked) VALUES
  ('server_vote', 'Voter pour VÆLORIA', 2, 8, false, true)
ON CONFLICT (kind) DO NOTHING;
