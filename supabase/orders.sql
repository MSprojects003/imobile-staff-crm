-- Transactional cart checkout, order notifications, SMS logs, and Realtime.
-- Requires public.orders, public.order_items, public.sub_order_items,
-- public.notifications, public.sms, and the functions in cart.sql/shops.sql.

create sequence if not exists public.orders_order_id_seq;

alter table public.orders
  add column if not exists order_id text;

do $$
declare
  v_max_order_number bigint;
  v_sequence_last_value bigint;
  v_sequence_is_called boolean;
begin
  select coalesce(
    max(substring(order_id from '^ORD_([0-9]+)$')::bigint),
    0
  )
  into v_max_order_number
  from public.orders;

  select last_value, is_called
  into v_sequence_last_value, v_sequence_is_called
  from public.orders_order_id_seq;

  if v_max_order_number > 0 then
    perform setval(
      'public.orders_order_id_seq',
      greatest(v_max_order_number, v_sequence_last_value),
      true
    );
  elsif not v_sequence_is_called then
    perform setval('public.orders_order_id_seq', 1, false);
  end if;
end;
$$;

update public.orders
set order_id = 'ORD_' || lpad(
  nextval('public.orders_order_id_seq'::regclass)::text,
  6,
  '0'
)
where order_id is null;

do $$
declare
  v_max_order_number bigint;
  v_sequence_last_value bigint;
  v_sequence_is_called boolean;
begin
  select coalesce(
    max(substring(order_id from '^ORD_([0-9]+)$')::bigint),
    0
  )
  into v_max_order_number
  from public.orders;

  select last_value, is_called
  into v_sequence_last_value, v_sequence_is_called
  from public.orders_order_id_seq;

  if v_max_order_number > 0 then
    perform setval(
      'public.orders_order_id_seq',
      greatest(v_max_order_number, v_sequence_last_value),
      true
    );
  elsif not v_sequence_is_called then
    perform setval('public.orders_order_id_seq', 1, false);
  end if;
end;
$$;

alter table public.orders
  alter column order_id set default (
    'ORD_' || lpad(nextval('public.orders_order_id_seq'::regclass)::text, 6, '0')
  ),
  alter column order_id set not null;

create unique index if not exists orders_order_id_key
  on public.orders (order_id);

create table if not exists public.cart_items_backup (
  id uuid not null,
  user_id uuid not null,
  product_id uuid not null,
  models text[] not null default '{}'::text[],
  colors text[] not null default '{}'::text[],
  selection_key text not null,
  quantity integer not null,
  subtotal numeric(12, 2) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  order_id uuid not null,
  archived_at timestamptz not null default now()
);

alter table public.cart_items_backup
  add column if not exists order_id uuid,
  add column if not exists archived_at timestamptz not null default now();

drop function if exists public.create_order_from_cart(
  uuid,
  uuid,
  uuid,
  boolean,
  numeric,
  text
);

create or replace function public.create_order_from_cart(
  p_staff_id uuid,
  p_user_id uuid,
  p_shop_id uuid,
  p_is_negotiable_price boolean,
  p_deducted_amount numeric,
  p_negotiable_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users%rowtype;
  v_staff public.staff%rowtype;
  v_shop public.shops%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_admin_contact text;
  v_products_count integer;
  v_estimated_total numeric(12, 2);
  v_full_total numeric(12, 2);
  v_deducted_amount numeric(12, 2);
  v_final_total numeric(12, 2);
  v_tax numeric(12, 2);
  v_admin_message text;
  v_shop_message text;
  v_sms_messages jsonb;
  v_archived_cart_rows integer;
begin
  if p_staff_id is null or p_user_id is null or p_shop_id is null then
    raise exception 'Staff, user, and shop IDs are required';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select *
  into v_actor
  from public.users u
  where u.id = p_user_id
    and u.status = true;

  if not found then
    raise exception 'The signed-in user does not exist or is inactive';
  end if;

  select *
  into v_staff
  from public.staff s
  where s.id = p_staff_id
    and s.user_id = p_user_id
    and s.is_active = true
    and s.is_deleted = false;

  if not found then
    raise exception 'The staff record is not linked to the signed-in user';
  end if;

  select *
  into v_shop
  from public.shops s
  where s.id = p_shop_id
    and s.is_active = true
    and s.is_deleted = false;

  if not found then
    raise exception 'The selected shop does not exist or is inactive';
  end if;

  if nullif(btrim(v_shop.phone_number), '') is null then
    raise exception 'The selected shop has no phone number for SMS delivery';
  end if;

  if coalesce(p_is_negotiable_price, false)
     and nullif(btrim(p_negotiable_reason), '') is null then
    raise exception 'A reason is required when the price is negotiable';
  end if;

  with product_totals as (
    select ci.product_id, sum(ci.quantity)::integer as total_quantity
    from public.cart_items ci
    where ci.user_id = p_user_id
      and ci."isCleared" = false
    group by ci.product_id
  ),
  priced_rows as (
    select
      ci.quantity,
      public.cart_unit_price(ci.product_id, pt.total_quantity) * ci.quantity
        as row_subtotal
    from public.cart_items ci
    join product_totals pt on pt.product_id = ci.product_id
    where ci.user_id = p_user_id
      and ci."isCleared" = false
  )
  select
    coalesce(sum(quantity), 0)::integer,
    coalesce(sum(row_subtotal), 0)::numeric(12, 2)
  into v_products_count, v_estimated_total
  from priced_rows;

  if v_products_count = 0 then
    raise exception 'Your cart is empty';
  end if;

  v_tax := ceil(v_estimated_total * 0.15);
  v_full_total := v_estimated_total + 350 + v_tax;
  v_deducted_amount := case
    when p_is_negotiable_price then coalesce(p_deducted_amount, 0)
    else 0
  end;

  if v_deducted_amount < 0 or v_deducted_amount > v_full_total then
    raise exception 'The negotiated deduction must be between zero and the order total';
  end if;

  v_final_total := v_full_total - v_deducted_amount;

  insert into public.orders (
    user_id,
    shop_id,
    estimated_total,
    products_count,
    full_total,
    is_negotiable_price,
    negotiable_reason,
    status,
    deducted_amount
  )
  values (
    p_staff_id,
    p_shop_id,
    v_estimated_total,
    v_products_count,
    v_full_total,
    coalesce(p_is_negotiable_price, false),
    case
      when p_is_negotiable_price then nullif(btrim(p_negotiable_reason), '')
      else null
    end,
    'pending',
    v_deducted_amount
  )
  returning id, order_id into v_order_id, v_order_number;

  with product_totals as (
    select ci.product_id, sum(ci.quantity)::integer as total_quantity
    from public.cart_items ci
    where ci.user_id = p_user_id
      and ci."isCleared" = false
    group by ci.product_id
  ),
  priced_rows as (
    select
      ci.product_id,
      ci.quantity,
      public.cart_unit_price(ci.product_id, pt.total_quantity) as unit_price
    from public.cart_items ci
    join product_totals pt on pt.product_id = ci.product_id
    where ci.user_id = p_user_id
      and ci."isCleared" = false
  )
  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    product_image,
    quantity,
    subtotal
  )
  select
    v_order_id,
    pr.product_id,
    p.name,
    p.images[1],
    sum(pr.quantity)::integer,
    sum(pr.unit_price * pr.quantity)::numeric(12, 2)
  from priced_rows pr
  join public.products p on p.id = pr.product_id
  group by pr.product_id, p.name, p.images;

  with product_totals as (
    select ci.product_id, sum(ci.quantity)::integer as total_quantity
    from public.cart_items ci
    where ci.user_id = p_user_id
      and ci."isCleared" = false
    group by ci.product_id
  )
  insert into public.sub_order_items (
    order_item_id,
    models,
    colors,
    quantity,
    unit_price,
    subtotal
  )
  select
    oi.id,
    ci.models,
    ci.colors,
    ci.quantity,
    public.cart_unit_price(ci.product_id, pt.total_quantity),
    public.cart_unit_price(ci.product_id, pt.total_quantity) * ci.quantity
  from public.cart_items ci
  join product_totals pt on pt.product_id = ci.product_id
  join public.order_items oi
    on oi.order_id = v_order_id
    and oi.product_id = ci.product_id
  where ci.user_id = p_user_id
    and ci."isCleared" = false;

  select u.phone
  into v_admin_contact
  from public.users u
  where u.is_admin = true
    and u.status = true
    and nullif(btrim(u.phone), '') is not null
  order by u.created_at nulls last, u.id
  limit 1;

  v_admin_message := format(
    'New order received (%s): %s (@%s, phone %s) placed an order with %s, %s. Products/units: %s. Total payable: Rs. %s. Please review and process this order.',
    v_order_number,
    v_actor.full_name,
    v_actor.username,
    coalesce(nullif(btrim(v_actor.phone), ''), 'not provided'),
    v_shop.name,
    v_shop.area,
    v_products_count,
    to_char(v_final_total, 'FM999,999,990.00')
  );
  v_shop_message := format(
    'Thank you for your order with iMobile Supreme. Order ID: %s. Shop: %s. Products/units: %s. Total payable: Rs. %s. Placed by staff %s (@%s), phone %s. For assistance, contact the staff member or admin at %s.',
    v_order_number,
    v_shop.name,
    v_products_count,
    to_char(v_final_total, 'FM999,999,990.00'),
    v_actor.full_name,
    v_actor.username,
    coalesce(nullif(btrim(v_actor.phone), ''), 'not provided'),
    coalesce(v_admin_contact, 'the iMobile admin team')
  );

  insert into public.notifications (
    title,
    message,
    type,
    from_user_id,
    to_user_id,
    is_to_all,
    is_read,
    content_id,
    link
  )
  select
    'New order received',
    format(
      'Order %s: %s (@%s) placed an order with %s (%s). Products/units: %s. Total payable: Rs. %s.',
      v_order_number,
      v_actor.full_name,
      v_actor.username,
      v_shop.name,
      v_shop.area,
      v_products_count,
      to_char(v_final_total, 'FM999,999,990.00')
    ),
    'order_created',
    p_user_id,
    admins.id,
    false,
    false,
    v_order_id,
    null
  from public.users admins
  where admins.is_admin = true
    and admins.status = true;

  insert into public.sms (body, user_id, shop_id, type)
  select v_admin_message, admins.id, null, 'order_created'
  from public.users admins
  where admins.is_admin = true
    and admins.status = true;

  insert into public.sms (body, user_id, shop_id, type)
  values (v_shop_message, null, p_shop_id, 'order_created');

  with admin_sms as (
    select jsonb_build_object(
      'kind', 'admin',
      'phone', admins.phone,
      'user_id', admins.id,
      'body', v_admin_message
    ) as payload
    from public.users admins
    where admins.is_admin = true
      and admins.status = true
  )
  select coalesce(jsonb_agg(payload), '[]'::jsonb)
  into v_sms_messages
  from admin_sms;

  v_sms_messages := v_sms_messages || jsonb_build_array(
    jsonb_build_object(
      'kind', 'shop',
      'phone', v_shop.phone_number,
      'shop_id', v_shop.id,
      'body', v_shop_message
    )
  );

  insert into public.cart_items_backup (
    id,
    user_id,
    product_id,
    models,
    colors,
    selection_key,
    quantity,
    subtotal,
    created_at,
    updated_at,
    order_id,
    archived_at
  )
  select
    ci.id,
    ci.user_id,
    ci.product_id,
    ci.models,
    ci.colors,
    ci.selection_key,
    ci.quantity,
    ci.subtotal,
    ci.created_at,
    ci.updated_at,
    v_order_id,
    now()
  from public.cart_items ci
  where ci.user_id = p_user_id
    and ci."isCleared" = false;

  get diagnostics v_archived_cart_rows = row_count;
  if v_archived_cart_rows = 0 then
    raise exception 'No active cart items were available to archive';
  end if;

  delete from public.cart_items
  where user_id = p_user_id;

  return jsonb_build_object(
    'order_id', v_order_number,
    'shop_name', v_shop.name,
    'estimated_total', v_estimated_total,
    'full_total', v_full_total,
    'deducted_amount', v_deducted_amount,
    'final_total', v_final_total,
    'products_count', v_products_count,
    'sms_messages', v_sms_messages
  );
end;
$$;

revoke all on function public.create_order_from_cart(
  uuid,
  uuid,
  uuid,
  boolean,
  numeric,
  text
) from public, anon, authenticated;

grant execute on function public.create_order_from_cart(
  uuid,
  uuid,
  uuid,
  boolean,
  numeric,
  text
) to service_role;
