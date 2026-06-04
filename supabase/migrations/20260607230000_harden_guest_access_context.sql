-- SAM&ZO migration 023: Gasttoegang expliciet afbakenen in profiel- en momentzicht.
-- Doel: guest-rollen hebben alleen toegang waar gasttoegang expliciet geldt.
-- Geen schemawijzigingen, geen service_role en geen publieke gegevens in policies.

-- Gastmodus op basis van systeemrol.
create or replace function app_private.is_guest_session()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_systeemrol() = 'gast', false);
$$;

revoke all on function app_private.is_guest_session() from public;
grant execute on function app_private.is_guest_session() to authenticated;

-- Gastprofielen mogen alleen profielen zien die expliciet als gast-zichtbaar zijn
-- en in een gedeelde actieve zichtbare groep liggen met hun actieve profiel.
drop policy if exists profielen_select_basis_slice_1 on public.profielen;
create policy profielen_select_basis_slice_1
on public.profielen
for select
to authenticated
using (
  id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(id)
  or app_private.is_systeembeheerder()
  or (
    zichtbaar_voor_leden = true
    and exists (
      select 1
      from public.groepslidmaatschappen target_gl
      join public.groepslidmaatschappen current_gl
        on current_gl.groep_id = target_gl.groep_id
      join public.groepen g
        on g.id = target_gl.groep_id
      where target_gl.profiel_id = profielen.id
        and target_gl.status = 'actief'
        and current_gl.profiel_id = app_private.current_profiel_id()
        and current_gl.status = 'actief'
        and g.status = 'actief'
    )
  )
  or (
    app_private.is_guest_session()
    and zichtbaar_voor_gasten = true
    and exists (
      select 1
      from public.groepslidmaatschappen target_gl
      join public.groepslidmaatschappen current_gl
        on current_gl.groep_id = target_gl.groep_id
      join public.groepen g
        on g.id = target_gl.groep_id
      where target_gl.profiel_id = profielen.id
        and target_gl.status = 'actief'
        and current_gl.profiel_id = app_private.current_profiel_id()
        and current_gl.status = 'actief'
        and g.status = 'actief'
        and g.zichtbaarheid = 'zichtbaar'
    )
  )
);

-- Gasttoegang bij momentzicht:
-- Guest-session krijgt alleen toegang tot momenten met expliciete gasttoegang
-- binnen een reeds toegestane context (groep/eigen profiel/rol/participatie).
create or replace function app_private.can_view_moment(target_moment_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.momenten m
    where m.id = target_moment_id
      and m.status <> 'gearchiveerd'
      and (
        not app_private.is_guest_session()
        or m.gasttoegang = true
      )
      and (
        app_private.is_systeembeheerder()
        or m.eigenaar_profiel_id = app_private.current_profiel_id()
        or (
          m.eigenaar_profiel_id is not null
          and app_private.has_profieltoegang(m.eigenaar_profiel_id)
        )
        or (
          m.eigenaar_groep_id is not null
          and app_private.current_profiel_is_lid_van_groep(m.eigenaar_groep_id)
        )
        or exists (
          select 1
          from public.moment_groepen mg
          where mg.moment_id = m.id
            and app_private.current_profiel_is_lid_van_groep(mg.groep_id)
        )
        or exists (
          select 1
          from public.deelnames d
          where d.moment_id = m.id
            and d.profiel_id = app_private.current_profiel_id()
            and d.status in (
              'voorgesteld',
              'uitgenodigd',
              'geaccepteerd',
              'ingeschreven',
              'wachtlijst',
              'afgemeld',
              'geweigerd'
            )
        )
        or exists (
          select 1
          from public.momentrollen mr
          join public.rolbezettingen rb on rb.momentrol_id = mr.id
          where mr.moment_id = m.id
            and rb.profiel_id = app_private.current_profiel_id()
            and rb.status = 'actief'
        )
      )
  );
end;
$$;

revoke all on function app_private.can_view_moment(uuid) from public;
grant execute on function app_private.can_view_moment(uuid) to authenticated;
