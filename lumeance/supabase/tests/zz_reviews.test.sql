-- Avis vérifiés : tables inaccessibles aux visiteurs, vue publique limitée aux avis publiés.
begin;
insert into public.customers (email, first_name) values ('avis@example.test', 'Marie') on conflict do nothing;
-- Commande expédiée fictive : gardes de paiement contournées pour le test uniquement.
set local session_replication_role = replica;
insert into public.orders (order_number, customer_id, status, payment_status, subtotal, total)
select 'AVIS-1', id, 'shipped', 'paid', 10000, 10000 from public.customers where email = 'avis@example.test';
set local session_replication_role = origin;
insert into public.review_requests (order_id, token_hash)
select id, repeat('a', 64) from public.orders where order_number = 'AVIS-1';
insert into public.product_reviews (request_id, order_id, product_id, author_name, rating, body, purchased_at, status)
select rr.id, rr.order_id, (select id from public.products where reference = 'REF-1'), 'Marie D.', 5,
       'Superbe lustre, très bien emballé.', now(), 'published'
  from public.review_requests rr;
insert into public.product_reviews (request_id, order_id, product_id, author_name, rating, body, purchased_at)
select rr.id, rr.order_id, (select id from public.products where reference = 'REF-2'), 'Paul R.', 2,
       'Avis en attente de relecture.', now()
  from public.review_requests rr;
set local role anon;
do $$ begin
  if (select count(*) from public.published_reviews) <> 1 then raise exception 'vue publique : %', (select count(*) from public.published_reviews); end if;
  begin
    perform 1 from public.product_reviews;
    raise exception 'anon ne doit pas lire product_reviews';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.review_requests;
    raise exception 'anon ne doit pas lire review_requests';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.product_reviews) <> 2 then raise exception 'admin : avis'; end if;
  update public.product_reviews set status = 'published' where author_name = 'Paul R.';
end $$;
reset role;
-- Une seule note entre 1 et 5, un seul avis par pièce et par demande.
do $$ begin
  begin
    insert into public.product_reviews (request_id, order_id, product_id, author_name, rating, body, purchased_at)
    select rr.id, rr.order_id, (select id from public.products where reference = 'REF-1'), 'X Y', 5, 'Doublon interdit ici.', now()
      from public.review_requests rr;
    raise exception 'doublon accepté';
  exception when unique_violation then null;
  end;
  begin
    update public.product_reviews set rating = 6;
    raise exception 'note 6 acceptée';
  exception when check_violation then null;
  end;
end $$;
rollback;
