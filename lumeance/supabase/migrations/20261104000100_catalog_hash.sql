-- LUMÉANCE — empreinte de la version du catalogue (code) appliquée à chaque pièce.
-- Idempotent. Le bandeau « changements préparés » de l'administration ne propose une mise à jour
-- que si le catalogue a changé depuis la dernière importation ou mise à jour : les modifications
-- faites ensuite dans l'administration ne sont pas signalées comme des écarts.
alter table public.products add column if not exists catalog_hash text;
