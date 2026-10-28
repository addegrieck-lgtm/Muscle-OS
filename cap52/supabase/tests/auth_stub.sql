-- Simulation minimale de l'environnement Supabase pour tester les migrations et RLS
-- sur un Postgres nu. N'est JAMAIS appliqué sur un vrai projet Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- Privilèges par défaut identiques à ceux de Supabase : tout est accordé, RLS fait le tri.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
