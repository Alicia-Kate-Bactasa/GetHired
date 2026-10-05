begin;
create table gethired_private.schema_versions (
  version text primary key,
  applied_at timestamptz not null default clock_timestamp()
);
revoke all on gethired_private.schema_versions from public, anon, authenticated;
grant select on gethired_private.schema_versions to gethired_runtime;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'gethired_maintenance') then
    create role gethired_maintenance nologin nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end $$;
grant usage on schema gethired_private to gethired_maintenance;
grant execute on function gethired_private.process_provider_cleanup(integer) to gethired_maintenance;

create function gethired_private.prune_auth_limits(p_limit integer default 1000)
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  if p_limit < 1 or p_limit > 10000 then raise exception 'Invalid batch size'; end if;
  with expired as (
    select key from gethired_private.auth_limits where expires_at < now()
    order by expires_at limit p_limit for update skip locked
  ) delete from gethired_private.auth_limits where key in (select key from expired);
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function gethired_private.prune_auth_limits(integer) from public, anon, authenticated, gethired_runtime;
grant execute on function gethired_private.prune_auth_limits(integer) to gethired_maintenance;
insert into gethired_private.schema_versions(version) values ('202610050001');
commit;
