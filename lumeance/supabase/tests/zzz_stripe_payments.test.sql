-- Paiement en ligne : fonctions réservées au serveur, idempotence, garde « payée », avoirs.
\set ON_ERROR_STOP 1
begin;

-- Un compte client avec un avoir de parrainage disponible.
insert into public.customers (email, first_name) values ('acheteur@example.test', 'Acheteur');
insert into public.customer_accounts (auth_user_id, customer_id, referral_code)
select '00000000-0000-0000-0000-0000000000e1', id, 'ACHETEUR1' from public.customers
 where email = 'acheteur@example.test';
insert into public.referral_credits (id, account_id, amount, reason)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 3000,
        'parrainage');

-- ── Visiteurs et comptes connectés : aucun accès ───────────────────────────
set local role anon;
do $$ begin
  perform public.record_provider_payment(gen_random_uuid(), 'stripe', 100, 'EUR', 'pi_x', '{}');
  raise exception 'anon appelle record_provider_payment';
exception when insufficient_privilege then null; end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  perform public.create_checkout_order(null, 'x@example.test', 'X', 'Y', '', '{}', '[]', 0, 0, 0,
    0, null, '');
  raise exception 'authenticated appelle create_checkout_order';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.release_checkout_order(gen_random_uuid(), false, 'x');
  raise exception 'authenticated appelle release_checkout_order';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Serveur (service_role) : parcours complet ──────────────────────────────
set local role service_role;
do $$
declare
  c uuid := (select id from public.customers where email = 'acheteur@example.test');
  o record;
  o2 record;
  r text;
begin
  -- Commande de 2 × 500 € − 30 € d'avoir = 970 €, avec réservation de l'avoir.
  select * into o from public.create_checkout_order(c, 'acheteur@example.test', 'Acheteur', 'Test',
    '0600000000', '{"city": "Paris"}',
    '[{"product_id": null, "name": "Aube", "reference": "LUM-T-1", "unit_price": 50000,
       "quantity": 2, "total": 100000, "variant": null}]',
    100000, 0, 3000, 97000, '00000000-0000-0000-0000-0000000000f1', 'Remise : avoir');
  if (select status::text || '/' || payment_status::text from public.orders where id = o.order_id)
     <> 'pending_payment/pending' then raise exception 'statut initial inattendu'; end if;
  if o.order_number not like 'LUM-%' then raise exception 'numéro : %', o.order_number; end if;
  if (select used_order_id from public.referral_credits
       where id = '00000000-0000-0000-0000-0000000000f1') is distinct from o.order_id then
    raise exception 'avoir non réservé';
  end if;

  -- L'avoir ne peut pas servir deux fois.
  begin
    perform public.create_checkout_order(c, 'acheteur@example.test', 'A', 'T', '', '{}',
      '[{"product_id": null, "name": "Aube", "reference": "R", "unit_price": 1000, "quantity": 1,
         "total": 1000, "variant": null}]', 1000, 0, 0, 1000,
      '00000000-0000-0000-0000-0000000000f1', '');
    raise exception 'avoir utilisé deux fois';
  exception when check_violation then null; end;

  -- Montant insuffisant : reste en attente.
  r := public.record_provider_payment(o.order_id, 'stripe', 50000, 'eur', 'pi_part', '{}');
  if r <> 'partial' then raise exception 'paiement partiel : %', r; end if;
  if (select payment_status from public.orders where id = o.order_id) <> 'pending' then
    raise exception 'payée sans couverture';
  end if;
  -- Devise inattendue refusée.
  begin
    perform public.record_provider_payment(o.order_id, 'stripe', 97000, 'usd', 'pi_usd', '{}');
    raise exception 'devise acceptée';
  exception when check_violation then null; end;
  -- Complément : payée ; rejouer le même paiement ne change rien.
  r := public.record_provider_payment(o.order_id, 'stripe', 47000, 'eur', 'pi_rest', '{}');
  if r <> 'paid' then raise exception 'paiement : %', r; end if;
  r := public.record_provider_payment(o.order_id, 'stripe', 47000, 'eur', 'pi_rest', '{}');
  if r <> 'duplicate' then raise exception 'rejeu : %', r; end if;
  if (select status::text || '/' || payment_status::text from public.orders where id = o.order_id)
     <> 'paid/paid' then raise exception 'commande non payée'; end if;
  if (select count(*) from public.order_status_history where order_id = o.order_id
       and new_status = 'paid' and note = 'Paiement en ligne confirmé') <> 1 then
    raise exception 'historique absent';
  end if;
  -- Une commande payée ne peut plus être annulée par expiration.
  if public.release_checkout_order(o.order_id, false, 'x') <> 'ignored' then
    raise exception 'commande payée annulée';
  end if;

  -- Remboursements : partiel puis total.
  r := public.record_provider_refund(o.order_id, 'stripe', 10000, 're_1', null, 'geste');
  if r <> 'partially_refunded' then raise exception 'remboursement partiel : %', r; end if;
  r := public.record_provider_refund(o.order_id, 'stripe', 10000, 're_1', null, 'geste');
  if r <> 'duplicate' then raise exception 'rejeu remboursement : %', r; end if;
  begin
    perform public.record_provider_refund(o.order_id, 'stripe', 90000, 're_trop', null, '');
    raise exception 'remboursement excessif accepté';
  exception when check_violation then null; end;
  r := public.record_provider_refund(o.order_id, 'stripe', 87000, 're_2', null, '');
  if r <> 'refunded' then raise exception 'remboursement total : %', r; end if;
  if (select status::text || '/' || payment_status::text from public.orders where id = o.order_id)
     <> 'refunded/refunded' then raise exception 'commande non remboursée'; end if;

  -- Paiement expiré : commande annulée, avoir libéré.
  update public.referral_credits set used_order_id = null, used_at = null
   where id = '00000000-0000-0000-0000-0000000000f1';
  select * into o2 from public.create_checkout_order(null, 'invite@example.test', 'Invité', 'Test',
    '', '{}', '[{"product_id": null, "name": "Halo", "reference": "R", "unit_price": 40000,
    "quantity": 1, "total": 40000, "variant": {"id": null, "name": "Laiton"}}]', 40000, 0, 3000,
    37000, '00000000-0000-0000-0000-0000000000f1', '');
  if not exists (select 1 from public.customers where email = 'invite@example.test') then
    raise exception 'client invité non créé';
  end if;
  r := public.release_checkout_order(o2.order_id, false, 'Paiement non effectué (expiré)');
  if r <> 'cancelled' then raise exception 'expiration : %', r; end if;
  if (select status::text || '/' || payment_status::text from public.orders where id = o2.order_id)
     <> 'cancelled/unpaid' then raise exception 'commande expirée non annulée'; end if;
  if (select used_at from public.referral_credits
       where id = '00000000-0000-0000-0000-0000000000f1') is not null then
    raise exception 'avoir non libéré';
  end if;
end $$;
reset role;

rollback;
