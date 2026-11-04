-- Liste d'envies : chacun ne lit que la sienne ; aucune écriture directe des clients.
\set ON_ERROR_STOP 1
begin;
insert into public.wishlist_items (auth_user_id, product_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'lum-lus-001'),
  ('00000000-0000-0000-0000-0000000000a2', 'lum-lus-002');

set local role anon;
do $$ begin
  perform * from public.wishlist_items;
  raise exception 'anon lit les envies';
exception when insufficient_privilege then null; end $$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  if (select count(*) from public.wishlist_items) <> 1 then
    raise exception 'un client voit les envies d''un autre';
  end if;
  begin
    insert into public.wishlist_items (auth_user_id, product_id)
    values ('00000000-0000-0000-0000-0000000000a1', 'x');
    raise exception 'écriture directe acceptée';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  insert into public.wishlist_items (auth_user_id, product_id)
  values ('00000000-0000-0000-0000-0000000000a1', 'lum-lus-001');
  raise exception 'doublon accepté';
exception when unique_violation then null; end $$;
rollback;
