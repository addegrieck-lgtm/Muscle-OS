-- LUMÉANCE — rôles, Row Level Security, journalisation.
-- Principe : tout est fermé par défaut. Le public lit uniquement le catalogue publié et les
-- contenus marqués publics. Aucune donnée client, commande ou paiement n'est lisible anonymement.

-- ── Fonctions d'autorisation ───────────────────────────────────────────────
create or replace function public.current_admin_role() returns public.admin_role
language sql stable security definer set search_path = public as $$
  select role from public.admin_users where auth_user_id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where auth_user_id = auth.uid() and active)
$$;

/** Rôles autorisés à modifier le catalogue, les contenus et les réglages. */
create or replace function public.is_catalog_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() in ('super_admin', 'admin'), false)
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

revoke all on function public.current_admin_role(), public.is_admin(), public.is_catalog_admin(),
  public.is_super_admin() from public;
grant execute on function public.current_admin_role(), public.is_admin(), public.is_catalog_admin(),
  public.is_super_admin() to anon, authenticated, service_role;

-- ── Activation RLS sur toutes les tables ───────────────────────────────────
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.media_assets enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_activity_log enable row level security;

-- ── Catalogue : lecture publique restreinte, écriture admin ────────────────
create policy categories_public_read on public.categories for select
  using (active or public.is_admin());
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy products_public_read on public.products for select
  using (status = 'published' or public.is_admin());
create policy products_admin_write on public.products for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy product_images_public_read on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id
                 and (p.status = 'published' or public.is_admin())));
create policy product_images_admin_write on public.product_images for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy product_variants_public_read on public.product_variants for select
  using ((active and exists (select 1 from public.products p where p.id = product_id
                             and p.status = 'published')) or public.is_admin());
create policy product_variants_admin_write on public.product_variants for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy media_public_read on public.media_assets for select using (true);
create policy media_admin_write on public.media_assets for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

-- ── Clients et commandes : administrateurs uniquement ─────────────────────
create policy customers_admin_read on public.customers for select to authenticated
  using (public.is_admin());
create policy customers_admin_write on public.customers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy customer_addresses_admin_read on public.customer_addresses for select to authenticated
  using (public.is_admin());
create policy customer_addresses_admin_write on public.customer_addresses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy orders_admin_read on public.orders for select to authenticated
  using (public.is_admin());
create policy orders_admin_insert on public.orders for insert to authenticated
  with check (public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Suppression réservée aux brouillons, par un administrateur catalogue.
create policy orders_admin_delete on public.orders for delete to authenticated
  using (public.is_catalog_admin() and status = 'draft');

create policy order_items_admin_read on public.order_items for select to authenticated
  using (public.is_admin());
create policy order_items_admin_write on public.order_items for all to authenticated
  using (public.is_admin() and exists (select 1 from public.orders o where o.id = order_id
                                        and o.status in ('draft', 'pending_payment')))
  with check (public.is_admin() and exists (select 1 from public.orders o where o.id = order_id
                                             and o.status in ('draft', 'pending_payment')));

create policy order_status_history_admin_read on public.order_status_history for select
  to authenticated using (public.is_admin());

-- Paiements : lecture admin ; écriture via le serveur (service_role) ou enregistrement manuel
-- par un administrateur catalogue (virement reçu, etc.), toujours journalisé.
create policy payment_transactions_admin_read on public.payment_transactions for select
  to authenticated using (public.is_admin());
create policy payment_transactions_manual_insert on public.payment_transactions for insert
  to authenticated with check (public.is_catalog_admin() and provider = 'manual'
                               and recorded_by = auth.uid());
create policy payment_webhook_events_admin_read on public.payment_webhook_events for select
  to authenticated using (public.is_super_admin());

-- ── Administration ─────────────────────────────────────────────────────────
create policy admin_users_read on public.admin_users for select to authenticated
  using (auth_user_id = auth.uid() or public.is_super_admin());
create policy admin_users_super_write on public.admin_users for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy site_settings_public_read on public.site_settings for select
  using (is_public or public.is_admin());
create policy site_settings_admin_write on public.site_settings for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy newsletter_admin_read on public.newsletter_subscribers for select to authenticated
  using (public.is_catalog_admin());
create policy newsletter_admin_write on public.newsletter_subscribers for update to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());
create policy newsletter_admin_delete on public.newsletter_subscribers for delete to authenticated
  using (public.is_catalog_admin());

create policy contact_admin_read on public.contact_messages for select to authenticated
  using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy activity_log_read on public.admin_activity_log for select to authenticated
  using (public.is_catalog_admin());
-- Aucune politique d'écriture : seuls les déclencheurs (security definer) écrivent le journal.

-- Les rôles API n'ont aucun droit sur les séquences et tables hors politiques ci-dessus.
revoke all on public.payment_webhook_events from anon;
revoke all on all tables in schema public from anon;
grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.media_assets, public.site_settings to anon;
grant usage on sequence public.order_number_seq to authenticated, service_role;

-- ── Garde-fous sur les administrateurs ─────────────────────────────────────
create or replace function public.admin_users_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.role = 'super_admin' and old.active)
     or (tg_op = 'UPDATE' and old.role = 'super_admin' and old.active
         and (new.role <> 'super_admin' or not new.active)) then
    if (select count(*) from public.admin_users where role = 'super_admin' and active) <= 1 then
      raise exception 'Impossible de retirer le dernier super administrateur'
        using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger admin_users_guard before update or delete on public.admin_users
  for each row execute function public.admin_users_guard();

-- ── Historique des statuts de commande ─────────────────────────────────────
create or replace function public.orders_log_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), 'Création');
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by,
                                             note)
    values (new.id, old.status, new.status, auth.uid(),
            nullif(current_setting('lumeance.status_note', true), ''));
  end if;
  return new;
end $$;
create trigger orders_status_history after insert or update of status on public.orders
  for each row execute function public.orders_log_status();

-- ── Journal d'activité (déclencheurs, impossible à contourner côté client) ─
create or replace function public.log_admin_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  admin_id uuid;
  rec jsonb;
  changed text[];
begin
  if auth.uid() is null then
    return coalesce(new, old); -- opérations système (migrations, service_role)
  end if;
  select id into admin_id from public.admin_users where auth_user_id = auth.uid();
  rec := to_jsonb(coalesce(new, old));
  if tg_op = 'UPDATE' then
    select array_agg(key) into changed
      from jsonb_each(to_jsonb(new)) n
     where n.value is distinct from (to_jsonb(old) -> n.key) and key <> 'updated_at';
  end if;
  insert into public.admin_activity_log (admin_user_id, action, entity_type, entity_id, metadata)
  values (admin_id, lower(tg_op), tg_table_name, rec ->> 'id',
          jsonb_strip_nulls(jsonb_build_object(
            'label', coalesce(rec ->> 'name', rec ->> 'order_number', rec ->> 'setting_key',
                              rec ->> 'storage_path', rec ->> 'email'),
            'changed', to_jsonb(changed))));
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['categories', 'products', 'product_images', 'product_variants',
    'media_assets', 'customers', 'orders', 'payment_transactions', 'admin_users',
    'site_settings', 'newsletter_subscribers'] loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.log_admin_activity()', t || '_audit', t);
  end loop;
end $$;

-- ── Statistiques du tableau de bord ────────────────────────────────────────
-- Le chiffre d'affaires encaissé ne compte QUE les paiements confirmés (payment_transactions).
create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  select jsonb_build_object(
    'orders_total', (select count(*) from orders where status <> 'draft'),
    'orders_pending', (select count(*) from orders where status = 'pending_payment'),
    'orders_preparing', (select count(*) from orders where status = 'preparing'),
    'orders_shipped', (select count(*) from orders where status = 'shipped'),
    'revenue_collected', (
      select coalesce(sum(case when kind = 'payment' then amount else -amount end), 0)
        from payment_transactions where status = 'succeeded'),
    'paid_orders', (select count(*) from orders where payment_status in ('paid', 'partially_refunded')),
    'products_available', (select count(*) from products where status = 'published' and stock_quantity > 0),
    'low_stock', (select count(*) from products where status = 'published' and stock_quantity <= 2)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- ── Enregistrement manuel d'un paiement reçu (virement, etc.) ──────────────
-- Seule voie, avec le webhook du prestataire (service_role), pour passer une commande « payée ».
create or replace function public.record_manual_payment(p_order_id uuid, p_amount bigint,
  p_reference text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  if not public.is_catalog_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if p_amount <= 0 then raise exception 'Montant invalide'; end if;
  insert into public.payment_transactions (order_id, provider, kind, status, amount, currency,
    provider_reference, idempotency_key, recorded_by, note)
  values (o.id, 'manual', 'payment', 'succeeded', p_amount, o.currency, p_reference,
          'manual:' || o.id || ':' || coalesce(p_reference, gen_random_uuid()::text),
          auth.uid(), p_note);
  if (select coalesce(sum(amount), 0) from public.payment_transactions
       where order_id = o.id and kind = 'payment' and status = 'succeeded') >= o.total then
    perform set_config('lumeance.status_note', 'Paiement manuel enregistré', true);
    update public.orders set payment_status = 'paid', payment_method = 'manual',
      status = case when status in ('draft', 'pending_payment') then 'paid' else status end
     where id = o.id;
  end if;
end $$;
revoke all on function public.record_manual_payment(uuid, bigint, text, text) from public, anon;
grant execute on function public.record_manual_payment(uuid, bigint, text, text) to authenticated;
