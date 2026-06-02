-- SAM&ZO migration: first read-only RLS layer for Lijsten and Taken.
-- Lijsten helpen uitvoeren. Taken are practical execution items.
-- This migration only adds authenticated SELECT visibility and a private
-- helper. It does not add create/update/delete/task-action behavior.

create or replace function app_private.can_view_lijst(target_lijst_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.lijsten l
    where l.id = target_lijst_id
      and l.archived_at is null
      and l.status <> 'gearchiveerd'
      and (
        app_private.is_systeembeheerder()
        or l.eigenaar_profiel_id = app_private.current_profiel_id()
        or (
          l.eigenaar_profiel_id is not null
          and app_private.has_profieltoegang(l.eigenaar_profiel_id)
        )
        or (
          l.eigenaar_groep_id is not null
          and app_private.current_profiel_is_lid_van_groep(l.eigenaar_groep_id)
        )
        or (
          l.gekoppeld_moment_id is not null
          and app_private.can_view_moment(l.gekoppeld_moment_id)
        )
        or exists (
          select 1
          from public.lijst_groepen lg
          where lg.lijst_id = l.id
            and app_private.current_profiel_is_lid_van_groep(lg.groep_id)
        )
        or exists (
          select 1
          from public.taken t
          join public.taakuitvoerders tu on tu.taak_id = t.id
          where t.lijst_id = l.id
            and t.archived_at is null
            and tu.profiel_id = app_private.current_profiel_id()
            and tu.status in ('voorgesteld', 'actief', 'afgerond')
        )
      )
  );
$$;

revoke all on function app_private.can_view_lijst(uuid) from public;
grant execute on function app_private.can_view_lijst(uuid) to authenticated;

drop policy if exists lijsten_select_can_view_lijst on public.lijsten;
create policy lijsten_select_can_view_lijst
on public.lijsten
for select
to authenticated
using (
  app_private.can_view_lijst(id)
);

drop policy if exists lijst_groepen_select_can_view_lijst on public.lijst_groepen;
create policy lijst_groepen_select_can_view_lijst
on public.lijst_groepen
for select
to authenticated
using (
  app_private.can_view_lijst(lijst_id)
);

drop policy if exists taken_select_can_view_lijst on public.taken;
create policy taken_select_can_view_lijst
on public.taken
for select
to authenticated
using (
  archived_at is null
  and app_private.can_view_lijst(lijst_id)
);

drop policy if exists taakuitvoerders_select_zichtbare_taak on public.taakuitvoerders;
create policy taakuitvoerders_select_zichtbare_taak
on public.taakuitvoerders
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(profiel_id)
  or app_private.is_systeembeheerder()
  or exists (
    select 1
    from public.taken t
    where t.id = taakuitvoerders.taak_id
      and t.archived_at is null
      and app_private.can_view_lijst(t.lijst_id)
  )
);
