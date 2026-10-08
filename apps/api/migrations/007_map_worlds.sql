-- Carte multi-mondes : chaque zone appartient à un monde Minecraft ; liste des mondes affichés (clé = nom du dossier du monde, ici « vaeloria »).
ALTER TABLE map_zones ADD COLUMN world text NOT NULL DEFAULT 'vaeloria';
INSERT INTO site_settings (key, value) VALUES ('map.worlds', '[{"key":"vaeloria","name":"VÆLORIA"}]') ON CONFLICT DO NOTHING;
