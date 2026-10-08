-- Votes (plugin VaeloriaVote) et rang de marchand (plugin VaeloriaShop), reçus par VæloriaBridge.

CREATE TABLE votes (
  event_id     uuid PRIMARY KEY,                -- id de l'événement bridge : un vote renvoyé n'est compté qu'une fois
  player_uuid  uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  site         text NOT NULL,
  voted_at     timestamptz NOT NULL
);
CREATE INDEX votes_voted_at ON votes (voted_at DESC);
CREATE INDEX votes_player ON votes (player_uuid, voted_at DESC);

ALTER TABLE players ADD COLUMN merchant_level int;
ALTER TABLE players ADD COLUMN merchant_rank text;
