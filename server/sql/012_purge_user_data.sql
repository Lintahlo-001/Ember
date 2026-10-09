create or replace function public.purge_user_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ownership_entries where user_id = p_user;
  delete from public.wishlist_entries  where user_id = p_user;
  delete from public.favorite_sets     where user_id = p_user;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'applied_ops' and column_name = 'user_id') then
    execute 'delete from public.applied_ops where user_id = $1' using p_user;
  end if;
end;
$$;

revoke all on function public.purge_user_data(uuid) from public, anon, authenticated;
grant execute on function public.purge_user_data(uuid) to service_role;