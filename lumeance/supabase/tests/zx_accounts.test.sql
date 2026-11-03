-- Comptes clients : isolement des données, statut pro non modifiable par le client, parrainage.
\set ON_ERROR_STOP 1

-- Données : un administrateur, un parrain (particulier), un filleul, une entreprise en attente.
insert into public.admin_users (auth_user_id, role)
values ('00000000-0000-0000-0000-0000000000ad', 'super_admin') on conflict do nothing;
insert into public.customers (email, first_name) values
  ('parrain@example.test', 'Parrain'), ('filleul@example.test', 'Filleul'),
  ('pro@example.test', 'Pro');
insert into public.customer_accounts (auth_user_id, customer_id, referral_code)
select '00000000-0000-0000-0000-0000000000c1', id, 'PARRAIN1' from customers where email = 'parrain@example.test';
insert into public.customer_accounts (auth_user_id, customer_id, referral_code, referred_by)
select '00000000-0000-0000-0000-0000000000c2', id, 'FILLEUL1', '00000000-0000-0000-0000-0000000000c1'
  from customers where email = 'filleul@example.test';
insert into public.customer_accounts (auth_user_id, customer_id, referral_code, account_type,
  company_name, siret, pro_status)
select '00000000-0000-0000-0000-0000000000c3', id, 'PRO00001', 'entreprise', 'Bistrot Test',
  '12345678901234', 'pending' from customers where email = 'pro@example.test';

-- Contraintes.
do $$ begin
  insert into public.customer_accounts (auth_user_id, customer_id, referral_code, account_type)
  select gen_random_uuid(), id, 'SANSSIRET', 'entreprise' from customers where email = 'pro@example.test';
  raise exception 'entreprise sans SIRET acceptée';
exception when check_violation then null; end $$;
do $$ begin
  update public.customer_accounts set pro_status = 'approved'
   where auth_user_id = '00000000-0000-0000-0000-0000000000c1';
  raise exception 'statut pro sur un particulier accepté';
exception when check_violation then null; end $$;

-- ── Anonyme : rien ──────────────────────────────────────────────────────────
set role anon;
do $$ begin
  perform * from public.customer_accounts;
  raise exception 'anon lit les comptes';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Le client pro : voit son compte seulement, ne peut pas se valider ──────
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
do $$ begin
  if (select count(*) from public.customer_accounts) <> 1 then raise exception 'client voit d''autres comptes'; end if;
  if (select count(*) from public.customers) <> 1 then raise exception 'client voit d''autres fiches'; end if;
  if exists (select 1 from public.orders) then raise exception 'client lit les commandes'; end if;
  update public.customer_accounts set pro_status = 'approved';
  if (select pro_status from public.customer_accounts) <> 'pending' then raise exception 'auto-validation pro'; end if;
end $$;
do $$ begin
  insert into public.referral_credits (account_id, amount, reason)
  values ('00000000-0000-0000-0000-0000000000c3', 100000, 'parrainage');
  raise exception 'client se crée un avoir';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Administrateur : valide le compte pro ──────────────────────────────────
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad';
update public.customer_accounts set pro_status = 'approved', pro_reviewed_at = now()
 where auth_user_id = '00000000-0000-0000-0000-0000000000c3';
reset role;
do $$ begin
  if (select pro_status from public.customer_accounts where auth_user_id = '00000000-0000-0000-0000-0000000000c3') <> 'approved'
  then raise exception 'validation pro refusée à l''admin'; end if;
end $$;

-- ── Parrainage : avoir du parrain à la 1re commande payée du filleul ───────
-- Paiement confirmé (exigé par orders_guard_payment_status) : transaction réussie, puis statut.
create function pg_temp.pay(p_email text, p_subtotal bigint) returns void language plpgsql as $$
declare oid uuid;
begin
  select o.id into oid from public.orders o join public.customers c on c.id = o.customer_id
   where c.email = p_email and o.subtotal = p_subtotal and o.payment_status = 'unpaid' limit 1;
  insert into public.payment_transactions (order_id, provider, kind, status, amount, idempotency_key)
  values (oid, 'manual', 'payment', 'succeeded', p_subtotal, 'test-' || oid);
  update public.orders set payment_status = 'paid' where id = oid;
end $$;
insert into public.orders (customer_id, status, subtotal, total)
select id, 'pending_payment', 25000, 25000 from customers where email = 'filleul@example.test';
insert into public.orders (customer_id, status, subtotal, total)
select id, 'pending_payment', 40000, 40000 from customers where email = 'filleul@example.test';
-- Commande sous 300 € payée : pas d'avoir.
select pg_temp.pay('filleul@example.test', 25000);
do $$ begin
  if exists (select 1 from public.referral_credits) then raise exception 'avoir sous le minimum'; end if;
end $$;
-- La 1re commande payée était sous le minimum : la suivante n'est plus la 1re, pas d'avoir.
select pg_temp.pay('filleul@example.test', 40000);
do $$ begin
  if exists (select 1 from public.referral_credits) then raise exception 'avoir sur une 2e commande'; end if;
end $$;

-- Nouveau filleul, 1re commande de 400 € payée : avoir de 30 € au parrain, une seule fois.
insert into public.customers (email) values ('filleul2@example.test');
insert into public.customer_accounts (auth_user_id, customer_id, referral_code, referred_by)
select '00000000-0000-0000-0000-0000000000c4', id, 'FILLEUL2', '00000000-0000-0000-0000-0000000000c1'
  from customers where email = 'filleul2@example.test';
insert into public.orders (customer_id, status, subtotal, total)
select id, 'pending_payment', 40000, 40000 from customers where email = 'filleul2@example.test';
select pg_temp.pay('filleul2@example.test', 40000);
-- Un nouvel enregistrement de paiement sur la même commande ne crée pas de 2e avoir.
update public.orders set payment_status = 'unpaid'
 where customer_id = (select id from customers where email = 'filleul2@example.test');
update public.orders set payment_status = 'paid'
 where customer_id = (select id from customers where email = 'filleul2@example.test');
do $$ begin
  if (select count(*) from public.referral_credits where account_id = '00000000-0000-0000-0000-0000000000c1'
      and amount = 3000) <> 1 then raise exception 'avoir de parrainage absent ou en double'; end if;
end $$;

-- Le parrain voit son avoir, pas le filleul.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  if (select count(*) from public.referral_credits) <> 1 then raise exception 'parrain ne voit pas son avoir'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c4';
do $$ begin
  if exists (select 1 from public.referral_credits) then raise exception 'filleul voit l''avoir du parrain'; end if;
end $$;
reset role;
\echo '  comptes clients, pros et parrainage : OK'
