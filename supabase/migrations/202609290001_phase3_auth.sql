-- Apply as the trusted database operator, never through the application role.
begin;
create schema if not exists gethired_private;
revoke all on schema gethired_private from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'gethired_runtime') then
    create role gethired_runtime nologin nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end $$;
grant usage on schema gethired_private to gethired_runtime;

create table gethired_private.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id),
  email text not null check (length(email) between 3 and 254),
  display_name text not null check (length(display_name) between 1 and 240),
  role text not null check (role in ('student', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive'))
);
create unique index accounts_email_unique on gethired_private.accounts (lower(email));
create table gethired_private.student_profiles (
  account_id uuid primary key references gethired_private.accounts(id),
  student_number text not null unique check (student_number ~ '^[0-9]{8}$'),
  first_name text not null,
  last_name text not null,
  course text not null,
  year_level text not null
);
create table gethired_private.sessions (
  id uuid primary key,
  account_id uuid not null references gethired_private.accounts(id),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  last_activity_at timestamptz not null default clock_timestamp(),
  remember_me boolean not null,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '30 days')
);
create index sessions_account on gethired_private.sessions(account_id);
-- Contains identifiers only, never access or refresh credentials.
create table gethired_private.provider_cleanup (
  session_id uuid primary key,
  auth_user_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);
create table gethired_private.auth_limits (
  key text primary key,
  count integer not null check (count >= 0),
  expires_at timestamptz not null
);

-- A narrowly scoped bridge to provider state; exposes no Auth records or credentials.
create function gethired_private.provider_session_live(p_session uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s join auth.users u on u.id = s.user_id
    where s.id = p_session and s.user_id = p_user
      and (s.not_after is null or s.not_after > now())
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and exists (select 1 from auth.refresh_tokens r where r.session_id = s.id and not r.revoked)
  );
$$;
revoke all on function gethired_private.provider_session_live(uuid, uuid) from public, anon, authenticated;
grant execute on function gethired_private.provider_session_live(uuid, uuid) to gethired_runtime;

-- Row locks require UPDATE privilege; this bridge avoids granting account edits to runtime.
create function gethired_private.lock_account(p_account uuid, p_exclusive boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_exclusive then
    perform id from gethired_private.accounts where id = p_account for update;
  else
    perform id from gethired_private.accounts where id = p_account for share;
  end if;
end;
$$;
revoke all on function gethired_private.lock_account(uuid, boolean) from public, anon, authenticated;
grant execute on function gethired_private.lock_account(uuid, boolean) to gethired_runtime;

-- Deactivation and role changes cannot resurrect old sessions after reactivation.
create function gethired_private.revoke_changed_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.role is distinct from old.role then
    update gethired_private.sessions set revoked_at = coalesce(revoked_at, clock_timestamp()) where account_id = new.id;
    insert into gethired_private.provider_cleanup(session_id, auth_user_id)
      select id, new.auth_user_id from gethired_private.sessions where account_id = new.id
      on conflict (session_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function gethired_private.revoke_changed_account() from public, anon, authenticated;
create trigger account_security_change after update of status, role on gethired_private.accounts
for each row execute function gethired_private.revoke_changed_account();

-- Operator-only retry worker. An HTTP logout normally completes the task first.
-- Review provider schema compatibility when upgrading Supabase Auth.
create function gethired_private.process_provider_cleanup(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = '' as $$
declare task record; processed integer := 0;
begin
  if p_limit < 1 or p_limit > 1000 then raise exception 'Invalid batch size'; end if;
  for task in select * from gethired_private.provider_cleanup where completed_at is null
    order by created_at limit p_limit for update skip locked
  loop
    delete from auth.refresh_tokens where session_id = task.session_id
      and exists (select 1 from auth.sessions where id = task.session_id and user_id = task.auth_user_id);
    delete from auth.sessions where id = task.session_id and user_id = task.auth_user_id;
    update gethired_private.provider_cleanup set completed_at = clock_timestamp() where session_id = task.session_id;
    processed := processed + 1;
  end loop;
  return processed;
end;
$$;
revoke all on function gethired_private.process_provider_cleanup(integer) from public, anon, authenticated, gethired_runtime;

revoke all on all tables in schema gethired_private from public, anon, authenticated;
grant select on gethired_private.accounts, gethired_private.student_profiles to gethired_runtime;
grant select, insert, update on gethired_private.sessions, gethired_private.provider_cleanup, gethired_private.auth_limits to gethired_runtime;
-- This schema must never be added to Supabase exposed schemas or Realtime publications.
commit;
