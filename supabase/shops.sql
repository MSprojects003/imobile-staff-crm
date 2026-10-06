-- Shop creation, admin notification/SMS logging, and private Realtime broadcasts.
-- Run this script in the Supabase SQL Editor before using shop creation.

drop function if exists public.create_shop_with_broadcast(
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text[],
  uuid
);

drop function if exists public.create_shop_with_broadcast(
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text[],
  uuid,
  uuid
);

drop function if exists public.create_shop_with_broadcast(
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text[],
  uuid,
  uuid,
  text
);

drop function if exists public.create_shop_with_broadcast(
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text[],
  uuid,
  uuid,
  text,
  text
);

alter table public.sms
  alter column user_id drop not null;

alter table public.sms
  add column if not exists shop_id uuid
    references public.shops(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sms_exactly_one_recipient_check'
      and conrelid = 'public.sms'::regclass
  ) then
    alter table public.sms
      add constraint sms_exactly_one_recipient_check
      check ((user_id is not null) <> (shop_id is not null));
  end if;
end;
$$;

create or replace function public.create_shop_with_broadcast(
  p_name character varying,
  p_owner character varying,
  p_address1 character varying,
  p_area character varying,
  p_phone_number character varying,
  p_email character varying,
  p_images text[],
  p_created_by_staff_id uuid,
  p_created_by_user_id uuid,
  p_admin_sms_body text,
  p_shop_sms_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.shops%rowtype;
  v_actor public.users%rowtype;
begin
  if nullif(btrim(p_name), '') is null
    or nullif(btrim(p_owner), '') is null
    or nullif(btrim(p_address1), '') is null
    or nullif(btrim(p_area), '') is null
    or nullif(btrim(p_phone_number), '') is null
  then
    raise exception 'Shop name, owner, address, area, and phone number are required';
  end if;

  select *
  into v_actor
  from public.users u
  where u.id = p_created_by_user_id
    and u.status = true;

  if not found then
    raise exception 'The signed-in public user does not exist or is inactive';
  end if;

  if not exists (
    select 1
    from public.staff s
    where s.id = p_created_by_staff_id
      and s.user_id = p_created_by_user_id
  ) then
    raise exception 'The staff record is not linked to the signed-in public user';
  end if;

  insert into public.shops (
    name,
    owner,
    address1,
    area,
    phone_number,
    email,
    images,
    created_by_staff_id
  )
  values (
    btrim(p_name),
    btrim(p_owner),
    btrim(p_address1),
    btrim(p_area),
    btrim(p_phone_number),
    nullif(btrim(p_email), ''),
    coalesce(p_images, '{}'::text[]),
    p_created_by_staff_id
  )
  returning * into v_shop;

  with recipients as (
    select distinct u.id, u.id = p_created_by_user_id as is_creator
    from public.users u
    where u.status = true
      and (
        u.id = p_created_by_user_id
        or u.is_admin = true
      )
  )
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
    case
      when recipients.is_creator then 'Shop created successfully'
      else 'New shop added'
    end,
    case
      when recipients.is_creator then format(
        'You successfully created the shop "%s", owned by %s, located at %s, %s.',
        v_shop.name,
        v_shop.owner,
        v_shop.address1,
        v_shop.area
      )
      else format(
        '%s (@%s) successfully created the shop "%s", owned by %s, located at %s, %s.',
        v_actor.full_name,
        v_actor.username,
        v_shop.name,
        v_shop.owner,
        v_shop.address1,
        v_shop.area
      )
    end,
    'shop_created',
    p_created_by_user_id,
    recipients.id,
    false,
    false,
    v_shop.id,
    null
  from recipients;

  insert into public.sms (
    body,
    user_id,
    shop_id,
    type
  )
  select
    p_admin_sms_body,
    recipients.id,
    null,
    'shop_created'
  from public.users recipients
  where recipients.status = true
    and recipients.is_admin = true;

  insert into public.sms (
    body,
    user_id,
    shop_id,
    type
  )
  values (
    p_shop_sms_body,
    null,
    v_shop.id,
    'shop_welcome'
  );

  return jsonb_build_object(
    'id', v_shop.id,
    'name', v_shop.name
  );
end;
$$;

revoke all on function public.create_shop_with_broadcast(
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text[],
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_shop_with_broadcast(
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  character varying,
  text[],
  uuid,
  uuid,
  text,
  text
) to service_role;

create or replace function public.current_notification_user_id()
returns uuid
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.id
  from public.users u
  join auth.users a
    on regexp_replace(coalesce(a.phone, ''), '\D', '', 'g') =
       regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
  where a.id = auth.uid()
    and coalesce(a.phone, '') <> ''
    and u.status = true
  limit 1;
$$;

revoke all on function public.current_notification_user_id()
  from public, anon;
grant execute on function public.current_notification_user_id()
  to authenticated;

drop policy if exists "Authenticated users can receive shop broadcasts"
  on realtime.messages;
create policy "Authenticated users can receive shop broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (realtime.topic() = 'shops');

drop policy if exists "Users can receive their notifications"
  on realtime.messages;
create policy "Users can receive their notifications"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() =
      'notifications:' || public.current_notification_user_id()::text
  );

drop policy if exists "Users can receive their SMS logs"
  on realtime.messages;
create policy "Users can receive their SMS logs"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() =
      'sms:' || public.current_notification_user_id()::text
  );

drop policy if exists "Shop users can receive shop SMS logs"
  on realtime.messages;
create policy "Shop users can receive shop SMS logs"
  on realtime.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shops s
      join public.users shop_user
        on regexp_replace(coalesce(shop_user.phone, ''), '\D', '', 'g') =
           regexp_replace(coalesce(s.phone_number, ''), '\D', '', 'g')
      where realtime.topic() = 'sms:shop:' || s.id::text
        and shop_user.id = public.current_notification_user_id()
        and shop_user.is_shop = true
        and shop_user.status = true
    )
  );

create or replace function public.broadcast_shop_changes()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.broadcast_changes(
    'shops',
    'shop_created',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

revoke all on function public.broadcast_shop_changes()
  from public, anon, authenticated;

drop trigger if exists broadcast_shop_changes on public.shops;
create trigger broadcast_shop_changes
  after insert on public.shops
  for each row
  execute function public.broadcast_shop_changes();

create or replace function public.broadcast_notification_changes()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.broadcast_changes(
    'notifications:' || new.to_user_id::text,
    'notification_created',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

revoke all on function public.broadcast_notification_changes()
  from public, anon, authenticated;

drop trigger if exists broadcast_notification_changes
  on public.notifications;
create trigger broadcast_notification_changes
  after insert on public.notifications
  for each row
  execute function public.broadcast_notification_changes();

create or replace function public.broadcast_sms_changes()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.broadcast_changes(
    case
      when new.user_id is not null then 'sms:' || new.user_id::text
      else 'sms:shop:' || new.shop_id::text
    end,
    'sms_logged',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

revoke all on function public.broadcast_sms_changes()
  from public, anon, authenticated;

drop trigger if exists broadcast_sms_changes on public.sms;
create trigger broadcast_sms_changes
  after insert on public.sms
  for each row
  execute function public.broadcast_sms_changes();
