-- SAM&ZO migration 011: read-only RLS-helperfuncties.
-- Doel: kleine helperfuncties voorbereiden voor latere policies.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, RLS enablement, policies, seeddata, triggers of status-RPC's.
-- RLS blijft later de echte beveiligingslaag. Deze helpers mogen persoonlijke regie niet overrulen.
-- Tijdlijnberichten, signalen, tagkoppelingen en generieke gekoppelde items zijn geen toegangsbewijs.

create schema if not exists app_private;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

-- Veiligheidskritisch: auth.uid() wordt vertaald naar de eigen Persoon.
create or replace function app_private.current_persoon_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
  from public.personen p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

-- Veiligheidskritisch: Profiel is de functionele appwerkelijkheid, niet auth.uid().
create or replace function app_private.current_profiel_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pr.id
  from public.profielen pr
  join public.personen p on p.id = pr.persoon_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.current_systeemrol()
returns public.systeemrol_type
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.systeemrol
  from public.personen p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.is_systeembeheerder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_systeemrol() = 'systeembeheerder', false);
$$;

create or replace function app_private.is_systeemondersteuner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_systeemrol() in ('systeemondersteuner', 'systeembeheerder'), false);
$$;

-- Medewerkerstatus geeft geen recht om voorstellen namens een Profiel te accepteren.
create or replace function app_private.is_medewerker()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_systeemrol() in ('medewerker', 'systeemondersteuner', 'systeembeheerder'), false);
$$;

create or replace function app_private.is_eigen_profiel(target_profiel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_profiel_id() = target_profiel_id, false);
$$;

-- Profieltoegang geeft zicht/handelingsruimte, geen mandaat voor definitieve persoonlijke mutaties.
create or replace function app_private.has_profieltoegang(target_profiel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profieltoegangen pt
    where pt.persoon_id = app_private.current_persoon_id()
      and pt.profiel_id = target_profiel_id
      and pt.status = 'actief'
  );
$$;

create or replace function app_private.profiel_is_lid_van_groep(
  target_profiel_id uuid,
  target_groep_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.groepslidmaatschappen gl
    where gl.profiel_id = target_profiel_id
      and gl.groep_id = target_groep_id
      and gl.status = 'actief'
  );
$$;

create or replace function app_private.current_profiel_is_lid_van_groep(target_groep_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.profiel_is_lid_van_groep(
    app_private.current_profiel_id(),
    target_groep_id
  );
$$;

-- Conservatieve view-helper: alleen bekijken, niet beheren.
-- Gasttoegang, supportcontext, Tijdlijn en Signalen blijven buiten deze helper tot policy-review.
create or replace function app_private.can_view_moment(target_moment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.momenten m
    where m.id = target_moment_id
      and m.status <> 'gearchiveerd'
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
            and d.status in ('voorgesteld', 'uitgenodigd', 'geaccepteerd', 'ingeschreven', 'wachtlijst')
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
$$;

revoke all on function app_private.current_persoon_id() from public;
revoke all on function app_private.current_profiel_id() from public;
revoke all on function app_private.current_systeemrol() from public;
revoke all on function app_private.is_systeembeheerder() from public;
revoke all on function app_private.is_systeemondersteuner() from public;
revoke all on function app_private.is_medewerker() from public;
revoke all on function app_private.is_eigen_profiel(uuid) from public;
revoke all on function app_private.has_profieltoegang(uuid) from public;
revoke all on function app_private.profiel_is_lid_van_groep(uuid, uuid) from public;
revoke all on function app_private.current_profiel_is_lid_van_groep(uuid) from public;
revoke all on function app_private.can_view_moment(uuid) from public;

grant execute on function app_private.current_persoon_id() to authenticated;
grant execute on function app_private.current_profiel_id() to authenticated;
grant execute on function app_private.current_systeemrol() to authenticated;
grant execute on function app_private.is_systeembeheerder() to authenticated;
grant execute on function app_private.is_systeemondersteuner() to authenticated;
grant execute on function app_private.is_medewerker() to authenticated;
grant execute on function app_private.is_eigen_profiel(uuid) to authenticated;
grant execute on function app_private.has_profieltoegang(uuid) to authenticated;
grant execute on function app_private.profiel_is_lid_van_groep(uuid, uuid) to authenticated;
grant execute on function app_private.current_profiel_is_lid_van_groep(uuid) to authenticated;
grant execute on function app_private.can_view_moment(uuid) to authenticated;
