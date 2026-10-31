-- Changement de statut avec note d'historique, en une transaction, soumis à la RLS de l'appelant.
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status,
  p_note text default null) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('lumeance.status_note', coalesce(p_note, ''), true);
  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception 'Commande introuvable';
  end if;
end $$;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;
