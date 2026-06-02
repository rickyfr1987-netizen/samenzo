-- SAM&ZO migration: make role claimability follow active occupancy.
-- A released/inactive rolbezetting must not keep a role filled. Claim RLS no
-- longer relies on the stored momentrollen.status, because that status can be
-- stale after a safe release.

create or replace function app_private.momentrol_actieve_bezetting_count(
  target_momentrol_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.rolbezettingen rb
  where rb.momentrol_id = target_momentrol_id
    and rb.status = 'actief';
$$;

revoke all on function app_private.momentrol_actieve_bezetting_count(uuid) from public;
grant execute on function app_private.momentrol_actieve_bezetting_count(uuid) to authenticated;

create or replace function app_private.momentrol_heeft_claimruimte(
  target_momentrol_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.momentrollen mr
    where mr.id = target_momentrol_id
      and mr.status not in ('geannuleerd', 'gearchiveerd')
      and (
        mr.maximum_aantal is null
        or app_private.momentrol_actieve_bezetting_count(mr.id) < mr.maximum_aantal
      )
  );
$$;

revoke all on function app_private.momentrol_heeft_claimruimte(uuid) from public;
grant execute on function app_private.momentrol_heeft_claimruimte(uuid) to authenticated;

drop policy if exists rolbezettingen_insert_eigen_claim on public.rolbezettingen;
create policy rolbezettingen_insert_eigen_claim
on public.rolbezettingen
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'actief'
  and app_private.momentrol_heeft_claimruimte(momentrol_id)
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = rolbezettingen.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.momentrollen mr
    where mr.id = rolbezettingen.momentrol_id
      and app_private.can_view_moment(mr.moment_id)
      and exists (
        select 1
        from public.deelnames d
        where d.moment_id = mr.moment_id
          and d.profiel_id = rolbezettingen.profiel_id
          and d.profiel_id = app_private.current_profiel_id()
          and d.archived_at is null
          and d.status in ('geaccepteerd', 'ingeschreven')
      )
  )
);
