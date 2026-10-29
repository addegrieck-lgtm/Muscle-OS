-- Tests d'isolation des données (exécutés par run-rls-tests.sh).
-- Chaque échec lève une exception et interrompt le script avec un code d'erreur.

\set A '''aaaaaaaa-0000-0000-0000-00000000000a'''
\set B '''bbbbbbbb-0000-0000-0000-00000000000b'''
\set C '''cccccccc-0000-0000-0000-00000000000c'''

insert into auth.users (id, email) values (:A, 'a@example.com'), (:B, 'b@example.com'), (:C, 'c@example.com');
insert into public.subscription_entitlements (user_id, entitlement, active) values (:A, 'premium', true);

-- Outils de test
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, false);
  execute 'set role authenticated';
end $$;

create function pg_temp.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm !~* p_pattern then
      raise exception 'Erreur inattendue pour [%] : % (attendu : %)', p_sql, sqlerrm, p_pattern;
    end if;
    return;
  end;
  raise exception 'Une erreur était attendue pour : %', p_sql;
end $$;

create function pg_temp.expect_eq(p_actual bigint, p_expected bigint, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ÉCHEC % : obtenu %, attendu %', p_label, p_actual, p_expected;
  end if;
end $$;

-- ── A crée ses données ─────────────────────────────────────────────────────
select pg_temp.act_as(:A);
insert into public.challenges (id, owner_id, name, type, currency, target_cents, unit_cents, week_count, start_date,
  strategy, icon, color, status, created_at, updated_at)
values ('11111111-0000-0000-0000-000000000001', :A, 'Vacances', 'classic', 'EUR', 137800, 100, 52, '2027-01-04',
  null, 'plane', '#D9F99D', 'active', now(), now());
insert into public.challenge_weeks (challenge_id, owner_id, week_index, planned_cents, skipped, updated_at)
values ('11111111-0000-0000-0000-000000000001', :A, 1, 100, false, now());
insert into public.deposits (id, owner_id, challenge_id, week_index, amount_cents, deposited_on, status, created_at, updated_at)
values ('22222222-0000-0000-0000-000000000001', :A, '11111111-0000-0000-0000-000000000001', 1, 100, '2027-01-05', 'active', now(), now());
select pg_temp.expect_eq((select count(*) from public.challenges), 1, 'A voit son challenge');
reset role;

-- ── B ne peut ni lire ni modifier les données de A ─────────────────────────
select pg_temp.act_as(:B);
select pg_temp.expect_eq((select count(*) from public.challenges), 0, 'B ne lit pas les challenges de A');
select pg_temp.expect_eq((select count(*) from public.challenge_weeks), 0, 'B ne lit pas les semaines de A');
select pg_temp.expect_eq((select count(*) from public.deposits), 0, 'B ne lit pas les versements de A');

with u as (update public.deposits set amount_cents = 999 returning 1) select pg_temp.expect_eq((select count(*) from u), 0, 'B ne modifie pas les versements de A');
with d as (delete from public.challenges returning 1) select pg_temp.expect_eq((select count(*) from d), 0, 'B ne supprime pas les challenges de A');

-- Usurpation du propriétaire
select pg_temp.expect_error($$insert into public.challenges (id, owner_id, name, type, currency, target_cents, unit_cents,
  week_count, start_date, icon, color, status, created_at, updated_at) values ('11111111-0000-0000-0000-000000000009',
  'aaaaaaaa-0000-0000-0000-00000000000a', 'x', 'classic', 'EUR', 1, 1, 1, '2027-01-04', 'target', '#D9F99D', 'active', now(), now())$$,
  'row-level security');
-- Versement rattaché au challenge de A, même en se déclarant propriétaire
select pg_temp.expect_error($$insert into public.deposits (id, owner_id, challenge_id, week_index, amount_cents, deposited_on,
  status, created_at, updated_at) values ('22222222-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-00000000000b',
  '11111111-0000-0000-0000-000000000001', 1, 100, '2027-01-05', 'active', now(), now())$$, 'row-level security');

-- Droits premium : ni écriture, ni lecture de ceux des autres, ni appel des fonctions internes
select pg_temp.expect_error($$insert into public.subscription_entitlements (user_id, entitlement, active)
  values ('bbbbbbbb-0000-0000-0000-00000000000b', 'premium', true)$$, 'row-level security');
with u as (update public.subscription_entitlements set active = true returning 1) select pg_temp.expect_eq((select count(*) from u), 0, 'B ne modifie aucun droit premium');
select pg_temp.expect_eq((select count(*) from public.subscription_entitlements), 0, 'B ne lit pas le droit de A');
select pg_temp.expect_error($$select public.has_premium('bbbbbbbb-0000-0000-0000-00000000000b')$$, 'permission denied');
select pg_temp.expect_error($$select public.consume_ai_quota('bbbbbbbb-0000-0000-0000-00000000000b', 1000)$$, 'permission denied');
select pg_temp.expect_error($$insert into public.ai_usage (user_id, day, count) values ('bbbbbbbb-0000-0000-0000-00000000000b', current_date, 0)$$, 'row-level security');

-- B n'est pas premium : il ne peut pas créer de défi
select pg_temp.expect_error($$select public.create_friend_challenge('Défi B', 'Bob')$$, 'premium_required');
-- Écriture directe dans les tables sociales interdite
select pg_temp.expect_error($$insert into public.friend_challenges (owner_id, name, invite_code, invite_expires_at)
  values ('bbbbbbbb-0000-0000-0000-00000000000b', 'x', 'ABCDEFGH', now() + interval '1 day')$$, 'row-level security');
reset role;

-- ── Défis entre amis ───────────────────────────────────────────────────────
select pg_temp.act_as(:A);
select public.create_friend_challenge('Défi de A', 'Alice') as fc \gset
select public.update_my_friend_progress(:'fc', 2500, 34450, false);
select invite_code as code from public.list_my_friend_challenges() \gset
reset role;

select pg_temp.act_as(:B);
select pg_temp.expect_error($$select public.join_friend_challenge('ZZZZZZZZ', 'Bob')$$, 'invalid_or_expired_code');
select public.join_friend_challenge(:'code', 'Bob');
select public.update_my_friend_progress(:'fc', 1000, 5000, false);
-- B voit le défi, mais pas le code d'invitation ni le montant de A
select pg_temp.expect_eq((select count(*) from public.list_my_friend_challenges()), 1, 'B voit le défi rejoint');
select pg_temp.expect_eq((select count(*) from public.list_my_friend_challenges() where invite_code is not null), 0, 'B ne voit pas le code');
select pg_temp.expect_eq((select count(*) from public.get_friend_board(:'fc')), 2, 'tableau à 2 membres');
select pg_temp.expect_eq((select count(*) from public.get_friend_board(:'fc') where not is_me and saved_cents is not null), 0, 'montant de A masqué');
select pg_temp.expect_eq((select count(*) from public.get_friend_board(:'fc') where is_me and saved_cents = 5000), 1, 'B voit son propre montant');
-- Accès direct aux lignes des autres membres impossible
select pg_temp.expect_eq((select count(*) from public.friend_challenge_members), 1, 'B ne lit que sa propre ligne');
select pg_temp.expect_eq((select count(*) from public.friend_challenges), 0, 'B ne lit pas la table des défis');
-- B ne peut pas renouveler l'invitation ni modifier la progression d'un autre
select pg_temp.expect_error(format('select public.renew_friend_invite(%L)', :'fc'), 'not_owner');
with u as (update public.friend_challenge_members set progress_bp = 10000 where user_id <> auth.uid() returning 1)
  select pg_temp.expect_eq((select count(*) from u), 0, 'B ne modifie pas la progression de A');
reset role;

select pg_temp.act_as(:A);
select public.update_my_friend_progress(:'fc', 2500, 34450, true);
reset role;
select pg_temp.act_as(:B);
select pg_temp.expect_eq((select count(*) from public.get_friend_board(:'fc') where not is_me and saved_cents = 34450), 1, 'montant de A visible après consentement');
reset role;

-- C, non membre, n'a accès à rien
select pg_temp.act_as(:C);
select pg_temp.expect_error(format('select * from public.get_friend_board(%L)', :'fc'), 'not_a_member');
select pg_temp.expect_error(format('select public.update_my_friend_progress(%L, 1, 1, true)', :'fc'), 'not_a_member');
select pg_temp.expect_eq((select count(*) from public.list_my_friend_challenges()), 0, 'C ne voit aucun défi');
reset role;

-- Invitation expirée
update public.friend_challenges set invite_expires_at = now() - interval '1 minute' where id = :'fc';
select pg_temp.act_as(:C);
select pg_temp.expect_error(format('select public.join_friend_challenge(%L, %L)', :'code', 'Carl'), 'invalid_or_expired_code');
reset role;

-- B quitte ; A (propriétaire) quitte → le défi est supprimé
select pg_temp.act_as(:B);
select public.leave_friend_challenge(:'fc');
select pg_temp.expect_eq((select count(*) from public.list_my_friend_challenges()), 0, 'B a quitté');
reset role;
select pg_temp.act_as(:A);
select public.leave_friend_challenge(:'fc');
reset role;
select pg_temp.expect_eq((select count(*) from public.friend_challenges), 0, 'défi supprimé par son propriétaire');

-- ── Anonyme : aucun accès ──────────────────────────────────────────────────
set role anon;
select pg_temp.expect_eq((select count(*) from public.challenges), 0, 'anon ne lit rien');
select pg_temp.expect_error($$select public.list_my_friend_challenges()$$, 'permission denied');
reset role;

-- ── Quotas IA (service_role) ───────────────────────────────────────────────
select pg_temp.expect_eq(public.consume_ai_quota(:A, 2), 1, 'quota 1');
select pg_temp.expect_eq(public.consume_ai_quota(:A, 2), 2, 'quota 2');
select pg_temp.expect_eq(public.consume_ai_quota(:A, 2), -1, 'quota atteint');

-- ── Suppression de compte : toutes les données suivent ─────────────────────
delete from auth.users where id = :A;
select pg_temp.expect_eq((select count(*) from public.challenges), 0, 'challenges supprimés avec le compte');
select pg_temp.expect_eq((select count(*) from public.deposits), 0, 'versements supprimés avec le compte');
select pg_temp.expect_eq((select count(*) from public.ai_usage), 0, 'quotas supprimés avec le compte');
