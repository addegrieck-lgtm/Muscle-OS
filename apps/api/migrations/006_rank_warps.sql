-- Avantage « warp farm » de chaque grade (schématiques : minecraft/warps-farm). N'écrase pas des
-- avantages déjà saisis dans l'admin : ne remplit que les grades dont la liste est encore vide.
UPDATE rank_thresholds r SET perks = v.perks
FROM (VALUES
  ('guerrier',  '["Warp /warp farm-guerrier : spawners Squelette et Zombie"]'::jsonb),
  ('seigneur',  '["Warp /warp farm-seigneur : spawners Pigman, Squelette et Zombie", "Accès aux warps farm inférieurs"]'::jsonb),
  ('roi',       '["Warp /warp farm-roi : spawners Creeper, Pigman et Squelette", "Accès aux warps farm inférieurs"]'::jsonb),
  ('vaelorian', '["Warp /warp farm-vaelorian : spawners Enderman, Creeper et Pigman", "Accès à tous les warps farm"]'::jsonb)
) AS v(key, perks)
WHERE r.key = v.key AND r.perks = '[]'::jsonb;
