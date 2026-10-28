-- CAP 52 — schéma serveur initial.
-- Principes :
--   * RLS activée sur toutes les tables exposées ; chaque utilisateur ne voit que ses données.
--   * Les colonnes des tables synchronisées reprennent celles de la base locale SQLite (même nommage).
--   * Les droits premium et les quotas IA ne sont modifiables que par le serveur (service_role).
--   * Les données sociales passent par des fonctions SECURITY DEFINER qui vérifient l'appartenance.

-- ── Données personnelles synchronisées ─────────────────────────────────────

create table public.challenges (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  type text not null check (type in ('classic', 'reverse', 'free', 'custom')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  target_cents bigint not null check (target_cents >= 0),
  unit_cents bigint not null check (unit_cents > 0),
  week_count integer not null check (week_count between 1 and 260),
  start_date date not null,
  strategy text check (strategy is null or strategy in ('equal', 'increasing', 'decreasing')),
  icon text not null check (char_length(icon) <= 32),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index challenges_owner_idx on public.challenges (owner_id);

create table public.challenge_weeks (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  week_index integer not null check (week_index between 1 and 260),
  planned_cents bigint check (planned_cents is null or planned_cents >= 0),
  skipped boolean not null default false,
  updated_at timestamptz not null,
  primary key (challenge_id, week_index)
);
create index challenge_weeks_owner_idx on public.challenge_weeks (owner_id);

create table public.deposits (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  week_index integer not null check (week_index between 1 and 260),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  deposited_on date not null,
  status text not null check (status in ('active', 'cancelled')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index deposits_owner_idx on public.deposits (owner_id);
create index deposits_challenge_idx on public.deposits (challenge_id, week_index);

alter table public.challenges enable row level security;
alter table public.challenge_weeks enable row level security;
alter table public.deposits enable row level security;

create policy "challenges: lecture par le propriétaire" on public.challenges
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "challenges: création par le propriétaire" on public.challenges
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "challenges: modification par le propriétaire" on public.challenges
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "challenges: suppression par le propriétaire" on public.challenges
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Semaines et versements : propriétaire ET challenge appartenant au même propriétaire.
create policy "weeks: lecture" on public.challenge_weeks
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "weeks: création" on public.challenge_weeks
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = (select auth.uid()))
  );
create policy "weeks: modification" on public.challenge_weeks
  for update to authenticated using (owner_id = (select auth.uid())) with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = (select auth.uid()))
  );
create policy "weeks: suppression" on public.challenge_weeks
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "deposits: lecture" on public.deposits
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "deposits: création" on public.deposits
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = (select auth.uid()))
  );
create policy "deposits: modification" on public.deposits
  for update to authenticated using (owner_id = (select auth.uid())) with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.owner_id = (select auth.uid()))
  );
create policy "deposits: suppression" on public.deposits
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ── Droits premium (écrits uniquement par le webhook RevenueCat, en service_role) ──

create table public.subscription_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null,
  active boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscription_entitlements enable row level security;
create policy "entitlements: lecture de son propre droit" on public.subscription_entitlements
  for select to authenticated using (user_id = (select auth.uid()));
-- Aucune politique d'écriture : seul service_role (qui contourne RLS) peut modifier.

create or replace function public.has_premium(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscription_entitlements e
    where e.user_id = p_user and e.active and (e.expires_at is null or e.expires_at > now())
  );
$$;
revoke all on function public.has_premium(uuid) from public, anon, authenticated;

-- ── Quotas du coach IA ─────────────────────────────────────────────────────

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage: lecture de son propre quota" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- Incrément atomique, appelé par l'Edge Function « coach » avec la clé service_role.
create or replace function public.consume_ai_quota(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  where public.ai_usage.count < p_limit
  returning count into v_count;
  return coalesce(v_count, -1); -- -1 : quota atteint
end;
$$;
revoke all on function public.consume_ai_quota(uuid, integer) from public, anon, authenticated;

-- Conservation limitée : les compteurs de plus de 30 jours sont supprimés.
create or replace function public.purge_old_ai_usage()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_usage where day < current_date - 30;
$$;
revoke all on function public.purge_old_ai_usage() from public, anon, authenticated;

-- ── Défis entre amis ───────────────────────────────────────────────────────
-- Partagé par défaut : pseudo et progression en %. Le montant n'est visible que si
-- le membre active share_amount. Les autres membres n'ont jamais d'accès direct aux tables.

create table public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{8}$'),
  invite_expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.friend_challenge_members (
  challenge_id uuid not null references public.friend_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  share_amount boolean not null default false,
  progress_bp integer not null default 0 check (progress_bp between 0 and 10000),
  saved_cents bigint not null default 0 check (saved_cents >= 0),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index friend_members_user_idx on public.friend_challenge_members (user_id);

alter table public.friend_challenges enable row level security;
alter table public.friend_challenge_members enable row level security;

create policy "friend_challenges: lecture par le propriétaire" on public.friend_challenges
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "friend_members: lecture de sa propre ligne" on public.friend_challenge_members
  for select to authenticated using (user_id = (select auth.uid()));
-- Écritures exclusivement via les fonctions ci-dessous.

create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sans 0/O/1/I ambigus
  code text := '';
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

create or replace function public.create_friend_challenge(p_name text, p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.has_premium(v_user) then raise exception 'premium_required' using errcode = '42501'; end if;
  if (select count(*) from public.friend_challenges where owner_id = v_user) >= 10 then
    raise exception 'too_many_challenges' using errcode = '54000';
  end if;
  insert into public.friend_challenges (owner_id, name, invite_code, invite_expires_at)
  values (v_user, trim(p_name), public.new_invite_code(), now() + interval '7 days')
  returning id into v_id;
  insert into public.friend_challenge_members (challenge_id, user_id, nickname)
  values (v_id, v_user, trim(p_nickname));
  return v_id;
end;
$$;

create or replace function public.join_friend_challenge(p_code text, p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_challenge public.friend_challenges%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_challenge from public.friend_challenges where invite_code = upper(trim(p_code));
  if not found or v_challenge.invite_expires_at < now() then
    raise exception 'invalid_or_expired_code' using errcode = 'P0002';
  end if;
  if (select count(*) from public.friend_challenge_members where challenge_id = v_challenge.id) >= 20 then
    raise exception 'challenge_full' using errcode = '54000';
  end if;
  insert into public.friend_challenge_members (challenge_id, user_id, nickname)
  values (v_challenge.id, v_user, trim(p_nickname))
  on conflict (challenge_id, user_id) do nothing;
  return v_challenge.id;
end;
$$;

create or replace function public.update_my_friend_progress(
  p_challenge_id uuid, p_progress_bp integer, p_saved_cents bigint, p_share_amount boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.friend_challenge_members
  set progress_bp = greatest(0, least(10000, p_progress_bp)),
      saved_cents = greatest(0, p_saved_cents),
      share_amount = p_share_amount,
      updated_at = now()
  where challenge_id = p_challenge_id and user_id = auth.uid();
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;
end;
$$;

create or replace function public.list_my_friend_challenges()
returns table (id uuid, name text, is_owner boolean, invite_code text, invite_expires_at timestamptz, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select fc.id, fc.name, fc.owner_id = auth.uid(),
         case when fc.owner_id = auth.uid() then fc.invite_code end,
         case when fc.owner_id = auth.uid() then fc.invite_expires_at end,
         (select count(*) from public.friend_challenge_members m2 where m2.challenge_id = fc.id)
  from public.friend_challenges fc
  join public.friend_challenge_members m on m.challenge_id = fc.id and m.user_id = auth.uid()
  order by fc.created_at desc;
$$;

create or replace function public.get_friend_board(p_challenge_id uuid)
returns table (nickname text, progress_bp integer, saved_cents bigint, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.friend_challenge_members where challenge_id = p_challenge_id and user_id = auth.uid()
  ) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return query
    select m.nickname, m.progress_bp,
           case when m.share_amount or m.user_id = auth.uid() then m.saved_cents end,
           m.user_id = auth.uid()
    from public.friend_challenge_members m
    where m.challenge_id = p_challenge_id
    order by m.progress_bp desc, m.joined_at asc;
end;
$$;

create or replace function public.leave_friend_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- Le propriétaire qui quitte supprime le défi (les autres membres en sont retirés).
  delete from public.friend_challenges where id = p_challenge_id and owner_id = auth.uid();
  if not found then
    delete from public.friend_challenge_members where challenge_id = p_challenge_id and user_id = auth.uid();
  end if;
end;
$$;

create or replace function public.renew_friend_invite(p_challenge_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := public.new_invite_code();
begin
  update public.friend_challenges
  set invite_code = v_code, invite_expires_at = now() + interval '7 days'
  where id = p_challenge_id and owner_id = auth.uid();
  if not found then raise exception 'not_owner' using errcode = '42501'; end if;
  return v_code;
end;
$$;

revoke all on function public.create_friend_challenge(text, text) from public, anon;
revoke all on function public.join_friend_challenge(text, text) from public, anon;
revoke all on function public.update_my_friend_progress(uuid, integer, bigint, boolean) from public, anon;
revoke all on function public.list_my_friend_challenges() from public, anon;
revoke all on function public.get_friend_board(uuid) from public, anon;
revoke all on function public.leave_friend_challenge(uuid) from public, anon;
revoke all on function public.renew_friend_invite(uuid) from public, anon;
grant execute on function public.create_friend_challenge(text, text) to authenticated;
grant execute on function public.join_friend_challenge(text, text) to authenticated;
grant execute on function public.update_my_friend_progress(uuid, integer, bigint, boolean) to authenticated;
grant execute on function public.list_my_friend_challenges() to authenticated;
grant execute on function public.get_friend_board(uuid) to authenticated;
grant execute on function public.leave_friend_challenge(uuid) to authenticated;
grant execute on function public.renew_friend_invite(uuid) to authenticated;
