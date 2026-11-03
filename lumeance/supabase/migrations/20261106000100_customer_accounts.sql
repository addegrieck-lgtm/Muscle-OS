-- LUMÉANCE — comptes clients : particuliers et entreprises, Cercle (cumul d'achats), parrainage.
-- Idempotent : peut être rejoué sans risque.
--
-- • Un compte = un utilisateur Supabase Auth (auth.users) relié à une fiche `customers`.
-- • Entreprise : raison sociale + SIRET ; la remise professionnelle n'est active qu'après
--   validation par un administrateur (pro_status = 'approved'). Le client ne peut pas modifier
--   ce statut : aucune politique d'écriture ne lui est ouverte (création par le serveur, avec la
--   clé de service, après contrôle des champs).
-- • Parrainage : code personnel ; le filleul bénéficie d'une remise sur sa 1re commande
--   (calculée par l'application) ; à la 1re commande PAYÉE du filleul, le parrain reçoit un
--   avoir (referral_credits), créé par déclencheur.

do $$ begin
  create type public.account_type as enum ('particulier', 'entreprise');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.pro_status as enum ('none', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.customer_accounts (
  auth_user_id uuid primary key, -- auth.users.id (pas de FK : schéma auth géré par Supabase)
  customer_id uuid not null unique references public.customers (id) on delete cascade,
  account_type public.account_type not null default 'particulier',
  company_name text check (company_name is null or length(company_name) between 2 and 160),
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  vat_number text check (vat_number is null or vat_number ~ '^[A-Z]{2}[A-Z0-9]{2,13}$'),
  pro_status public.pro_status not null default 'none',
  pro_reviewed_at timestamptz,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,12}$'),
  referred_by uuid references public.customer_accounts (auth_user_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_accounts_company check (
    account_type = 'particulier' or (company_name is not null and siret is not null)
  ),
  constraint customer_accounts_pro_status check (account_type = 'entreprise' or pro_status = 'none'),
  constraint customer_accounts_no_self_referral check (referred_by is distinct from auth_user_id)
);
create index if not exists customer_accounts_pro_pending
  on public.customer_accounts (created_at) where pro_status = 'pending';

-- Avoirs de parrainage (montant TTC en centimes), utilisables une fois.
create table if not exists public.referral_credits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts (auth_user_id) on delete cascade,
  amount bigint not null check (amount > 0),
  reason text not null check (reason in ('parrainage')),
  source_order_id uuid unique references public.orders (id) on delete set null,
  used_order_id uuid references public.orders (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referral_credits_used check ((used_at is null) = (used_order_id is null))
);
create index if not exists referral_credits_account on public.referral_credits (account_id);

-- ── Sécurité ────────────────────────────────────────────────────────────────
alter table public.customer_accounts enable row level security;
alter table public.referral_credits enable row level security;
revoke all on public.customer_accounts, public.referral_credits from anon;

drop policy if exists customer_accounts_read on public.customer_accounts;
create policy customer_accounts_read on public.customer_accounts for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());
drop policy if exists customer_accounts_admin_write on public.customer_accounts;
create policy customer_accounts_admin_write on public.customer_accounts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists referral_credits_read on public.referral_credits;
create policy referral_credits_read on public.referral_credits for select to authenticated
  using (account_id = auth.uid() or public.is_admin());
drop policy if exists referral_credits_admin_write on public.referral_credits;
create policy referral_credits_admin_write on public.referral_credits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Le client lit sa propre fiche (nom, téléphone) ; l'administration garde tous les droits.
drop policy if exists customers_owner_read on public.customers;
create policy customers_owner_read on public.customers for select to authenticated
  using (exists (select 1 from public.customer_accounts a
                 where a.customer_id = customers.id and a.auth_user_id = auth.uid()));

-- Journal d'activité (actions des administrateurs : validation d'un compte pro, avoirs).
drop trigger if exists customer_accounts_audit on public.customer_accounts;
create trigger customer_accounts_audit after insert or update or delete on public.customer_accounts
  for each row execute function public.log_admin_activity();
drop trigger if exists referral_credits_audit on public.referral_credits;
create trigger referral_credits_audit after insert or update or delete on public.referral_credits
  for each row execute function public.log_admin_activity();

-- ── Parrainage : avoir du parrain à la 1re commande payée du filleul ────────
-- Montant et minimum de commande : à garder identiques à lib/catalog/loyalty.ts
-- (REFERRAL_AMOUNT = 30 €, REFERRAL_MIN_ORDER = 300 € de pièces).
create or replace function public.grant_referral_credit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sponsor uuid;
begin
  if new.payment_status not in ('paid', 'partially_refunded')
     or old.payment_status in ('paid', 'partially_refunded')
     or new.customer_id is null or new.subtotal < 30000 then
    return new;
  end if;
  select referred_by into sponsor from public.customer_accounts where customer_id = new.customer_id;
  if sponsor is null then return new; end if;
  -- 1re commande payée du filleul uniquement.
  if exists (select 1 from public.orders o where o.customer_id = new.customer_id and o.id <> new.id
             and o.payment_status in ('paid', 'partially_refunded')) then
    return new;
  end if;
  insert into public.referral_credits (account_id, amount, reason, source_order_id)
  values (sponsor, 3000, 'parrainage', new.id)
  on conflict (source_order_id) do nothing;
  return new;
end $$;

drop trigger if exists orders_referral_credit on public.orders;
create trigger orders_referral_credit after update of payment_status on public.orders
  for each row execute function public.grant_referral_credit();
