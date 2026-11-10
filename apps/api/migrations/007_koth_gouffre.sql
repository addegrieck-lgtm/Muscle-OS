-- KOTH « Gouffre de Vælor » (minecraft/koth-volcan) : zone de carte « gouffre ».
-- Collé dans le monde du spawn, pieds en X 1000 Y 120 Z 0 ; la map s'étend de X 900 à 1100 et de Z -100 à 100.
-- Le plugin VaeloriaFactions émet KOTH_START / KOTH_CAPTURE avec koth = "gouffre" (ou "KOTH gouffre" avant 1.3.1,
-- normalisé par l'API). N'écrase pas une zone déjà retouchée dans l'admin.
INSERT INTO map_zones (key, name, kind, x1, z1, x2, z2, description) VALUES
  ('gouffre', 'Gouffre de Vælor', 'koth', 900, -100, 1100, 100,
   'KOTH volcanique coupé par un gouffre de lave. Monde du spawn : accès par /warp (4 entrées, une faction par col).')
ON CONFLICT (key) DO NOTHING;
