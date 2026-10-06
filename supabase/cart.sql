-- =====================================================================
-- cart_items: full schema, RLS, pricing, add_cart_item, cleanup, realtime
-- Rule: each (model + color) combination exists ONCE per user + product.
--   * existing combination  -> quantity is added to that row
--   * new combination       -> inserted as its own row
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  models text[] not null default '{}',
  colors text[] not null default '{}',
  selection_key text not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "isCleared" boolean not null default false,
  unique (user_id, selection_key)
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cart_items'
      and column_name = 'is_active'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cart_items'
      and column_name = 'isCleared'
  ) then
    alter table public.cart_items rename column is_active to "isCleared";
    alter table public.cart_items
      alter column "isCleared" set default false,
      alter column "isCleared" set not null;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cart_items'
      and column_name = 'isCleared'
  ) then
    alter table public.cart_items
      add column "isCleared" boolean not null default false;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. MIGRATE auth user IDs -> public.users IDs (for older data)
-- ---------------------------------------------------------------------
alter table public.cart_items
  drop constraint if exists cart_items_user_id_fkey;

update public.cart_items c
set user_id = public_user.id
from auth.users auth_user
join public.users public_user
  on regexp_replace(coalesce(auth_user.phone, ''), '\D', '', 'g') =
     regexp_replace(coalesce(public_user.phone, ''), '\D', '', 'g')
where c.user_id = auth_user.id
  and coalesce(auth_user.phone, '') <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_user_id_fkey'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. CURRENT PUBLIC USER HELPER
-- ---------------------------------------------------------------------
create or replace function public.current_public_user_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select u.id
  from public.users u
  join auth.users a
    on regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') =
       regexp_replace(coalesce(a.phone, ''), '\D', '', 'g')
  where a.id = auth.uid()
    and coalesce(a.phone, '') <> ''
    and u.status = true
    and u.is_rep = true
    and u.is_admin = false
    and u.is_sub_admin = false
    and u.is_shop = false
  limit 1;
$$;

revoke all on function public.current_public_user_id() from public, anon;
grant execute on function public.current_public_user_id() to authenticated;

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.cart_items enable row level security;
grant select on public.cart_items to authenticated;

drop policy if exists "Users can read their cart items" on public.cart_items;
create policy "Users can read their cart items"
  on public.cart_items for select
  using (public.current_public_user_id() = user_id);

drop policy if exists "Users can insert their cart items" on public.cart_items;
create policy "Users can insert their cart items"
  on public.cart_items for insert
  with check (public.current_public_user_id() = user_id);

drop policy if exists "Users can update their cart items" on public.cart_items;
create policy "Users can update their cart items"
  on public.cart_items for update
  using (public.current_public_user_id() = user_id)
  with check (public.current_public_user_id() = user_id);

drop policy if exists "Users can delete their cart items" on public.cart_items;
create policy "Users can delete their cart items"
  on public.cart_items for delete
  using (public.current_public_user_id() = user_id);

-- ---------------------------------------------------------------------
-- 5. PRICING FUNCTION (unchanged)
-- ---------------------------------------------------------------------
create or replace function public.cart_unit_price(
  p_product_id uuid,
  p_quantity integer
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pricing_type text;
  v_fixed_price numeric;
  v_price_tiers jsonb;
  v_unit_price numeric;
begin
  select pricing_type, fixed_price, coalesce(price_tiers, '[]'::jsonb)
  into v_pricing_type, v_fixed_price, v_price_tiers
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Product % does not exist', p_product_id;
  end if;

  if v_pricing_type <> 'bulk' then
    if v_fixed_price is null then
      raise exception 'Fixed price is missing for product %', p_product_id;
    end if;
    return v_fixed_price;
  end if;

  select nullif(tier->>'price', '')::numeric
  into v_unit_price
  from jsonb_array_elements(v_price_tiers) with ordinality as tiers(tier, ordinal)
  where (
    nullif(coalesce(
      tier->>'min_quantity',
      tier->>'min',
      tier->>'from',
      tier->>'startQty'
    ), '')::integer is null
    or p_quantity >= nullif(coalesce(
      tier->>'min_quantity',
      tier->>'min',
      tier->>'from',
      tier->>'startQty'
    ), '')::integer
  )
  and (
      nullif(coalesce(
        tier->>'max_quantity',
        tier->>'max',
        tier->>'to',
        tier->>'endQty'
      ), '')::integer is null
      or p_quantity <= nullif(coalesce(
        tier->>'max_quantity',
        tier->>'max',
        tier->>'to',
        tier->>'endQty'
      ), '')::integer
    )
  order by ordinal
  limit 1;

  if v_unit_price is null then
    select nullif(tier->>'price', '')::numeric
    into v_unit_price
    from jsonb_array_elements(v_price_tiers) with ordinality as tiers(tier, ordinal)
    where nullif(coalesce(
        tier->>'min_quantity',
        tier->>'min',
        tier->>'from',
        tier->>'startQty'
      ), '')::integer is null
      or p_quantity >= nullif(coalesce(
        tier->>'min_quantity',
        tier->>'min',
        tier->>'from',
        tier->>'startQty'
      ), '')::integer
    order by ordinal desc
    limit 1;
  end if;

  if v_unit_price is null then
    select nullif(tier->>'price', '')::numeric
    into v_unit_price
    from jsonb_array_elements(v_price_tiers) with ordinality as tiers(tier, ordinal)
    order by ordinal
    limit 1;
  end if;

  if v_unit_price is null then
    raise exception 'Bulk price tiers are missing or invalid for product %', p_product_id;
  end if;

  return v_unit_price;
end;
$$;

revoke all on function public.cart_unit_price(uuid, integer) from public, anon, authenticated;

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
      and subtotal is distinct from
        v_unit_price * quantity;
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

-- ---------------------------------------------------------------------
-- 6. add_cart_item  (one row per model + color combination)
-- ---------------------------------------------------------------------
-- Drop first so a previously deployed version (any return type) can never
-- block the replacement.
drop function if exists public.add_cart_item(uuid, text[], text[], integer, numeric);

create or replace function public.add_cart_item(
  p_product_id uuid,
  p_models text[],
  p_colors text[],
  p_quantity integer,
  p_subtotal numeric
)
returns setof public.cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_user_id uuid;
  v_models text[];
  v_colors text[];
  v_model text;
  v_color text;
  v_key text;
  v_item public.cart_items;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_public_user_id := public.current_public_user_id();
  if v_public_user_id is null then
    raise exception 'No active public user profile is associated with this login';
  end if;

  if p_product_id is null
     or p_quantity is null or p_quantity <= 0
     or p_subtotal is null or p_subtotal < 0 then
    raise exception 'Invalid cart quantity or subtotal';
  end if;

  -- unique, non-null values only
  v_models := array(
    select distinct m
    from unnest(coalesce(p_models, '{}'::text[])) as m
    where m is not null
    order by m
  );
  v_colors := array(
    select distinct c
    from unnest(coalesce(p_colors, '{}'::text[])) as c
    where c is not null
    order by c
  );

  -- Serialise concurrent adds for the same user + product
  perform pg_advisory_xact_lock(
    hashtextextended(v_public_user_id::text || p_product_id::text, 0)
  );

  -- If no models (or no colors) were chosen, use a single "empty" slot
  foreach v_model in array
    (case when cardinality(v_models) = 0 then array[null]::text[] else v_models end)
  loop
    foreach v_color in array
      (case when cardinality(v_colors) = 0 then array[null]::text[] else v_colors end)
    loop
      v_key := md5(
        jsonb_build_object(
          'product_id', p_product_id,
          'models', case when v_model is null then '[]'::jsonb
                         else jsonb_build_array(v_model) end,
          'colors', case when v_color is null then '[]'::jsonb
                         else jsonb_build_array(v_color) end
        )::text
      );

      insert into public.cart_items (
        user_id, product_id, models, colors, selection_key, quantity, subtotal
      )
      values (
        v_public_user_id,
        p_product_id,
        case when v_model is null then '{}'::text[] else array[v_model] end,
        case when v_color is null then '{}'::text[] else array[v_color] end,
        v_key,
        p_quantity,
        public.cart_unit_price(p_product_id, p_quantity) * p_quantity
      )
      on conflict (user_id, selection_key) do update
        set quantity   = case
              when public.cart_items."isCleared" then excluded.quantity
              else public.cart_items.quantity + excluded.quantity
            end,
            subtotal   = excluded.subtotal,
            "isCleared" = false,
            updated_at = now()
      returning * into v_item;
    end loop;
  end loop;

  perform public.reprice_cart_product(v_public_user_id, p_product_id);

  return query
    select *
    from public.cart_items
    where user_id = v_public_user_id
      and product_id = p_product_id
      and "isCleared" = false;

  return;
end;
$$;

revoke all on function public.add_cart_item(uuid, text[], text[], integer, numeric)
  from public, anon;
grant execute on function public.add_cart_item(uuid, text[], text[], integer, numeric)
  to authenticated;

create or replace function public.update_cart_item_quantity(
  p_cart_item_id uuid,
  p_quantity integer
)
returns setof public.cart_items
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

  if p_cart_item_id is null or p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid cart item or quantity';
  end if;

  select product_id
  into v_product_id
  from public.cart_items
  where id = p_cart_item_id
    and user_id = v_public_user_id
    and "isCleared" = false;

  if not found then
    raise exception 'Cart item was not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_public_user_id::text || v_product_id::text, 0)
  );

  update public.cart_items
  set quantity = p_quantity,
      updated_at = now()
  where id = p_cart_item_id
    and user_id = v_public_user_id
    and "isCleared" = false;

  perform public.reprice_cart_product(v_public_user_id, v_product_id);

  return query
    select *
    from public.cart_items
    where id = p_cart_item_id
      and user_id = v_public_user_id
      and "isCleared" = false;
end;
$$;

revoke all on function public.update_cart_item_quantity(uuid, integer)
  from public, anon;
grant execute on function public.update_cart_item_quantity(uuid, integer)
  to authenticated;

create or replace function public.remove_cart_item(p_cart_item_id uuid)
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
  if p_cart_item_id is null then
    raise exception 'Invalid cart item';
  end if;

  select product_id
  into v_product_id
  from public.cart_items
  where id = p_cart_item_id
    and user_id = v_public_user_id
    and "isCleared" = false;

  if not found then
    raise exception 'Cart item was not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_public_user_id::text || v_product_id::text, 0)
  );

  delete from public.cart_items
  where id = p_cart_item_id
    and user_id = v_public_user_id
    and "isCleared" = false;

  perform public.reprice_cart_product(v_public_user_id, v_product_id);
end;
$$;

revoke all on function public.remove_cart_item(uuid) from public, anon;
grant execute on function public.remove_cart_item(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. ONE-TIME DATA CLEANUP
--    Splits any multi-model / multi-color row into single-combination rows
--    and merges duplicates (quantities are summed). Runs only if such rows
--    exist, so re-running this script is safe and will not touch clean data.
--    A backup copy is kept in public.cart_items_backup.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.cart_items
    where cardinality(models) > 1
       or cardinality(colors) > 1
  ) then

    create table if not exists public.cart_items_backup as
    select * from public.cart_items;

    drop table if exists _cart_fixed;
    create temp table _cart_fixed on commit drop as
    select
      c.user_id,
      c.product_id,
      m.model,
      col.color,
      sum(c.quantity)::int as quantity,
      bool_and(c."isCleared") as is_cleared,
      min(c.created_at)    as created_at
    from public.cart_items c
    cross join lateral unnest(
      case when cardinality(c.models) = 0 then array[null]::text[] else c.models end
    ) as m(model)
    cross join lateral unnest(
      case when cardinality(c.colors) = 0 then array[null]::text[] else c.colors end
    ) as col(color)
    group by c.user_id, c.product_id, m.model, col.color;

    delete from public.cart_items;

    insert into public.cart_items (
      user_id, product_id, models, colors, selection_key,
      quantity, subtotal, "isCleared", created_at, updated_at
    )
    select
      f.user_id,
      f.product_id,
      case when f.model is null then '{}'::text[] else array[f.model] end,
      case when f.color is null then '{}'::text[] else array[f.color] end,
      md5(jsonb_build_object(
        'product_id', f.product_id,
        'models', case when f.model is null then '[]'::jsonb
                       else jsonb_build_array(f.model) end,
        'colors', case when f.color is null then '[]'::jsonb
                       else jsonb_build_array(f.color) end
      )::text),
      f.quantity,
      public.cart_unit_price(f.product_id, f.quantity) * f.quantity,
      f.is_cleared,
      f.created_at,
      now()
    from _cart_fixed f;

  end if;
end;
$$;

drop policy if exists "Users can receive their cart broadcasts"
  on realtime.messages;
create policy "Users can receive their cart broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() =
      'cart:' || public.current_public_user_id()::text
  );

create or replace function public.broadcast_cart_item_changes()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  v_user_id uuid;
begin
  v_user_id := case when TG_OP = 'DELETE' then OLD.user_id else NEW.user_id end;

  perform realtime.broadcast_changes(
    'cart:' || v_user_id::text,
    'cart_changed',
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

revoke all on function public.broadcast_cart_item_changes()
  from public, anon, authenticated;

drop trigger if exists broadcast_cart_item_changes
  on public.cart_items;
create trigger broadcast_cart_item_changes
  after insert or update or delete on public.cart_items
  for each row
  execute function public.broadcast_cart_item_changes();

-- ---------------------------------------------------------------------
-- 8. REALTIME (full row data on UPDATE / DELETE events)
-- ---------------------------------------------------------------------
alter table public.cart_items replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cart_items'
  ) then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end;
$$;