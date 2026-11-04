-- LUMÉANCE — paiement en ligne (Stripe Checkout). Idempotent : peut être rejoué sans risque.
--
-- Toutes ces fonctions sont réservées au serveur (clé service_role) :
-- • create_checkout_order : crée atomiquement client, commande « en attente de paiement » et
--   lignes, avec des montants DÉJÀ RECALCULÉS par le serveur (lib/services/pricing.ts) ;
-- • record_provider_payment : appelée par le webhook SIGNÉ du prestataire ; enregistre la
--   transaction (idempotente) puis passe la commande « payée » si le total est couvert ;
-- • record_provider_refund : enregistre un remboursement confirmé par le prestataire ;
-- • release_checkout_order : annule une commande dont le paiement a expiré ou échoué et libère
--   l'avoir de parrainage réservé.

-- ── Création d'une commande en ligne ───────────────────────────────────────
create or replace function public.create_checkout_order(
  p_customer_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_address jsonb,
  p_items jsonb,
  p_subtotal bigint,
  p_shipping bigint,
  p_discount bigint,
  p_total bigint,
  p_credit_id uuid,
  p_note text
) returns table (order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := p_customer_id;
  o public.orders;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Commande vide' using errcode = 'check_violation';
  end if;
  if cid is null then
    insert into public.customers (email, first_name, last_name, phone)
    values (p_email, p_first_name, p_last_name, nullif(p_phone, ''))
    on conflict (email) do update
      set first_name = coalesce(customers.first_name, excluded.first_name),
          last_name = coalesce(customers.last_name, excluded.last_name),
          phone = coalesce(customers.phone, excluded.phone)
    returning id into cid;
  end if;

  perform set_config('lumeance.status_note', 'Commande en ligne', true);
  insert into public.orders (customer_id, status, payment_status, payment_method, subtotal,
    shipping_amount, discount_amount, total, shipping_address_snapshot, billing_address_snapshot,
    admin_notes)
  values (cid, 'pending_payment', 'pending', 'stripe', p_subtotal, p_shipping, p_discount, p_total,
    p_address, p_address, nullif(p_note, ''))
  returning * into o;

  insert into public.order_items (order_id, product_id, product_name_snapshot,
    product_reference_snapshot, unit_price, quantity, variant_snapshot, total)
  select o.id, (i ->> 'product_id')::uuid, i ->> 'name', i ->> 'reference',
         (i ->> 'unit_price')::bigint, (i ->> 'quantity')::integer,
         nullif(i -> 'variant', 'null'::jsonb), (i ->> 'total')::bigint
    from jsonb_array_elements(p_items) as i;

  -- Avoir de parrainage : réservé pour cette commande, libéré si le paiement n'aboutit pas.
  if p_credit_id is not null then
    update public.referral_credits set used_order_id = o.id, used_at = now()
     where id = p_credit_id and used_at is null;
    if not found then
      raise exception 'Avoir déjà utilisé' using errcode = 'check_violation';
    end if;
  end if;

  return query select o.id, o.order_number;
end $$;

-- ── Paiement confirmé par le prestataire (webhook signé) ───────────────────
create or replace function public.record_provider_payment(
  p_order_id uuid,
  p_provider text,
  p_amount bigint,
  p_currency text,
  p_reference text,
  p_raw jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  inserted int;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable : %', p_order_id; end if;
  if upper(p_currency) <> o.currency then
    raise exception 'Devise inattendue : %', p_currency using errcode = 'check_violation';
  end if;

  insert into public.payment_transactions (order_id, provider, kind, status, amount, currency,
    provider_reference, idempotency_key, raw_event)
  values (o.id, p_provider, 'payment', 'succeeded', p_amount, o.currency, p_reference,
          p_provider || ':payment:' || p_reference, p_raw)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;

  if o.payment_status in ('paid', 'partially_refunded', 'refunded') then
    return 'already_paid';
  end if;
  if (select coalesce(sum(amount), 0) from public.payment_transactions
       where order_id = o.id and kind = 'payment' and status = 'succeeded') < o.total then
    return 'partial';
  end if;
  perform set_config('lumeance.status_note', 'Paiement en ligne confirmé', true);
  -- Une commande annulée entre-temps (paiement arrivé après expiration) reste annulée mais
  -- payée : visible dans l'administration pour remboursement ou réactivation.
  update public.orders set payment_status = 'paid', payment_method = p_provider,
    status = case when status in ('draft', 'pending_payment') then 'paid' else status end
   where id = o.id;
  return case when o.status = 'cancelled' then 'paid_after_cancel' else 'paid' end;
end $$;

-- ── Remboursement confirmé par le prestataire ──────────────────────────────
create or replace function public.record_provider_refund(
  p_order_id uuid,
  p_provider text,
  p_amount bigint,
  p_reference text,
  p_recorded_by uuid,
  p_note text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  inserted int;
  paid bigint;
  refunded bigint;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable : %', p_order_id; end if;

  insert into public.payment_transactions (order_id, provider, kind, status, amount, currency,
    provider_reference, idempotency_key, recorded_by, note)
  values (o.id, p_provider, 'refund', 'succeeded', p_amount, o.currency, p_reference,
          p_provider || ':refund:' || p_reference, p_recorded_by, nullif(p_note, ''))
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;

  select coalesce(sum(amount) filter (where kind = 'payment'), 0),
         coalesce(sum(amount) filter (where kind = 'refund'), 0)
    into paid, refunded
    from public.payment_transactions where order_id = o.id and status = 'succeeded';
  if refunded > paid then
    raise exception 'Remboursement supérieur aux paiements' using errcode = 'check_violation';
  end if;
  perform set_config('lumeance.status_note',
    case when refunded >= paid then 'Remboursement total' else 'Remboursement partiel' end, true);
  update public.orders
     set payment_status = case when refunded >= paid then 'refunded' else 'partially_refunded' end
             ::public.payment_status,
         status = case when refunded >= paid then 'refunded' else status end
   where id = o.id;
  return case when refunded >= paid then 'refunded' else 'partially_refunded' end;
end $$;

-- ── Paiement expiré ou échoué : annulation et libération de l'avoir ────────
create or replace function public.release_checkout_order(p_order_id uuid, p_failed boolean,
  p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return 'not_found'; end if;
  if o.status <> 'pending_payment' or o.payment_status not in ('unpaid', 'pending', 'failed') then
    return 'ignored';
  end if;
  perform set_config('lumeance.status_note', p_note, true);
  update public.orders
     set status = 'cancelled',
         payment_status = case when p_failed then 'failed' else 'unpaid' end::public.payment_status
   where id = o.id;
  update public.referral_credits set used_order_id = null, used_at = null
   where used_order_id = o.id;
  return 'cancelled';
end $$;

-- Réservées au serveur : ni les visiteurs ni les comptes connectés ne peuvent les appeler.
revoke all on function public.create_checkout_order(uuid, text, text, text, text, jsonb, jsonb,
  bigint, bigint, bigint, bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.record_provider_payment(uuid, text, bigint, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.record_provider_refund(uuid, text, bigint, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.release_checkout_order(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(uuid, text, text, text, text, jsonb, jsonb,
  bigint, bigint, bigint, bigint, uuid, text) to service_role;
grant execute on function public.record_provider_payment(uuid, text, bigint, text, text, jsonb)
  to service_role;
grant execute on function public.record_provider_refund(uuid, text, bigint, text, uuid, text)
  to service_role;
grant execute on function public.release_checkout_order(uuid, boolean, text) to service_role;
