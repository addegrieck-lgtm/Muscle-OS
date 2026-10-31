-- Tests RLS et règles métier. Chaque bloc lève une exception si une règle est violée.
\set ON_ERROR_STOP 1

-- Données : un super admin, un gestionnaire de commandes, un produit publié, un brouillon.
insert into public.admin_users (auth_user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'super_admin'),
  ('00000000-0000-0000-0000-00000000000b', 'order_manager');
insert into public.products (slug, name, reference, price, status, stock_quantity, category_id)
select 'piece-publiee', 'Pièce publiée', 'REF-1', 50000, 'published', 3, id from categories where slug = 'lustres';
insert into public.products (slug, name, reference, price, status)
values ('piece-brouillon', 'Pièce brouillon', 'REF-2', 30000, 'draft');
insert into public.customers (email, first_name) values ('client@example.test', 'Client');
insert into public.orders (customer_id, status, subtotal, total)
select id, 'pending_payment', 50000, 50000 from customers;

-- ── Anonyme ─────────────────────────────────────────────────────────────────
set role anon;
do $$ begin
  if (select count(*) from public.products) <> 1 then raise exception 'anon voit un brouillon'; end if;
  if exists (select 1 from public.site_settings where not is_public) then raise exception 'réglage privé visible'; end if;
end $$;
do $$ begin
  perform * from public.orders;
  raise exception 'anon lit les commandes';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform * from public.customers;
  raise exception 'anon lit les clients';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.newsletter_subscribers (email, consent_timestamp, consent_source)
  values ('x@y.fr', now(), 'test');
  raise exception 'anon écrit directement la newsletter';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Utilisateur authentifié non administrateur ─────────────────────────────
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ff';
do $$ begin
  if (select count(*) from public.orders) <> 0 then raise exception 'non-admin voit des commandes'; end if;
  if (select count(*) from public.customers) <> 0 then raise exception 'non-admin voit des clients'; end if;
  if (select count(*) from public.products) <> 1 then raise exception 'non-admin voit un brouillon'; end if;
end $$;
do $$ begin
  insert into public.admin_users (auth_user_id, role) values ('00000000-0000-0000-0000-0000000000ff', 'super_admin');
  raise exception 'auto-promotion administrateur possible';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.products set price = 1;
  if exists (select 1 from public.products where price = 1) then raise exception 'non-admin modifie un prix'; end if;
end $$;
do $$ begin
  perform public.admin_dashboard_stats();
  raise exception 'statistiques accessibles sans droits';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Gestionnaire de commandes ─────────────────────────────────────────────
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.orders) <> 1 then raise exception 'gestionnaire ne voit pas les commandes'; end if;
  update public.orders set status = 'cancelled';
  update public.products set price = 2;
  if exists (select 1 from public.products where price = 2) then raise exception 'gestionnaire modifie le catalogue'; end if;
end $$;
reset role;

-- ── Super administrateur ───────────────────────────────────────────────────
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.products) <> 2 then raise exception 'admin ne voit pas les brouillons'; end if;
  update public.products set price = 60000 where reference = 'REF-1';
end $$;
-- Une commande ne peut pas être marquée payée sans paiement confirmé.
update public.orders set status = 'pending_payment';
do $$ begin
  update public.orders set payment_status = 'paid', status = 'paid';
  raise exception 'commande payée sans transaction';
exception when check_violation then null; end $$;
-- Ni créée payée.
do $$ begin
  insert into public.orders (status, payment_status, subtotal, total) values ('paid', 'paid', 100, 100);
  raise exception 'commande créée payée';
exception when check_violation then null; end $$;
-- Paiement manuel enregistré -> payée, historique et journal alimentés.
do $$
declare oid uuid;
begin
  select id into oid from public.orders limit 1;
  perform public.record_manual_payment(oid, 50000, 'VIR-TEST', 'Virement reçu');
  if (select payment_status from public.orders where id = oid) <> 'paid' then
    raise exception 'paiement manuel non appliqué';
  end if;
  if (select (public.admin_dashboard_stats() ->> 'revenue_collected')::bigint) <> 50000 then
    raise exception 'chiffre d''affaires incorrect';
  end if;
  if (select count(*) from public.order_status_history where order_id = oid) < 4 then
    raise exception 'historique de statut incomplet: %', (select string_agg(coalesce(previous_status::text,'-')||'>'||new_status, ', ') from public.order_status_history);
  end if;
  if not exists (select 1 from public.admin_activity_log where entity_type = 'products' and action = 'update') then
    raise exception 'journal d''activité vide';
  end if;
end $$;
-- Le dernier super administrateur ne peut pas être retiré.
do $$ begin
  update public.admin_users set active = false where role = 'super_admin';
  raise exception 'dernier super admin désactivable';
exception when check_violation then null; end $$;
-- Le journal n'est pas modifiable.
do $$ begin
  delete from public.admin_activity_log;
  if not exists (select 1 from public.admin_activity_log) then raise exception 'journal effaçable'; end if;
end $$;
reset role;

-- Changement de statut avec note (gestionnaire de commandes).
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare oid uuid;
begin
  insert into public.orders (subtotal, total) values (1000, 1000) returning id into oid;
  perform public.admin_set_order_status(oid, 'pending_payment', 'Devis envoyé');
  if not exists (select 1 from public.order_status_history where order_id = oid and note = 'Devis envoyé'
                 and new_status = 'pending_payment') then
    raise exception 'note d''historique absente';
  end if;
end $$;
reset role;
set role anon;
do $$ begin
  perform public.admin_set_order_status(gen_random_uuid(), 'cancelled', null);
  raise exception 'anon peut changer un statut';
exception when insufficient_privilege then null; end $$;
reset role;

-- Cohérence des montants.
do $$ begin
  insert into public.orders (subtotal, shipping_amount, total) values (100, 10, 50);
  raise exception 'total incohérent accepté';
exception when check_violation then null; end $$;
\echo '  sécurité et règles métier : OK'
