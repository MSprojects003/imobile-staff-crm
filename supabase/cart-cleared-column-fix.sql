-- Apply in the Supabase SQL Editor when cart_items uses "isCleared".
-- Keep these definitions aligned with supabase/cart.sql.

create or replace function public.reprice_cart_product(
  p_user_id uuid,
  p_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_quantity integer;
  v_unit_price numeric;
begin
  select coalesce(sum(quantity), 0)::integer
  into v_total_quantity
  from public.cart_items
  where user_id = p_user_id
    and product_id = p_product_id
    and "isCleared" = false;

  if v_total_quantity > 0 then
    v_unit_price := public.cart_unit_price(p_product_id, v_total_quantity);

    update public.cart_items
    set subtotal = v_unit_price * quantity,
        updated_at = now()
    where user_id = p_user_id
      and product_id = p_product_id
      and "isCleared" = false
      and subtotal is distinct from v_unit_price * quantity;
  end if;
end;
$$;

revoke all on function public.reprice_cart_product(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.refresh_cart_prices()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_user_id uuid;
  v_product_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_public_user_id := public.current_public_user_id();
  if v_public_user_id is null then
    raise exception 'No active public user profile is associated with this login';
  end if;

  for v_product_id in
    select distinct product_id
    from public.cart_items
    where user_id = v_public_user_id
      and "isCleared" = false
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(v_public_user_id::text || v_product_id::text, 0)
    );
    perform public.reprice_cart_product(v_public_user_id, v_product_id);
  end loop;
end;
$$;

revoke all on function public.refresh_cart_prices() from public, anon;
grant execute on function public.refresh_cart_prices() to authenticated;
