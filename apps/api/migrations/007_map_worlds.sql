-- Carte multi-mondes : chaque zone appartient à un monde Minecraft ; liste des mondes affichés (clé = nom du dossier du monde).
ALTER TABLE map_zones ADD COLUMN world text NOT NULL DEFAULT 'world';
INSERT INTO site_settings (key, value) VALUES ('map.worlds', '[{"key":"world","name":"Monde principal"}]') ON CONFLICT DO NOTHING;
