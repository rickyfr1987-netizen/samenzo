-- SAM&ZO migration 014: RLS slice 2 voor momenten, deelname, rollen en beschikbaarheid.
-- Doel: conservatieve policies voor Planning, Momenten, deelname, momentrollen, rolbezettingen en beschikbaarheden.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, helperfuncties, seeddata, triggers, RPC's of delete-policies.
-- Mijn dag = persoonlijke werkelijkheid. Planning = gemeenschappelijke werkelijkheid.
-- Profieltoegang mag niet gebruikt worden om iemand anders definitief in te schrijven of actief te laten claimen.
-- Tijdlijn, Signalen en Voorstellen zijn geen toegangsbewijs.

-- Momenten
drop policy if exists momenten_select_can_view on public.momenten;
create policy momenten_select_can_view
on public.momenten
for select
to authenticated
using (
  app_private.can_view_moment(id)
);

drop policy if exists momenten_insert_eigen_profiel_of_systeembeheerder on public.momenten;
create policy momenten_insert_eigen_profiel_of_systeembeheerder
on public.momenten
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
  or eigenaar_profiel_id = app_private.current_profiel_id()
);

drop policy if exists momenten_update_systeembeheerder on public.momenten;
create policy momenten_update_systeembeheerder
on public.momenten
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Moment-groep-koppelingen
drop policy if exists moment_groepen_select_can_view_moment on public.moment_groepen;
create policy moment_groepen_select_can_view_moment
on public.moment_groepen
for select
to authenticated
using (
  app_private.can_view_moment(moment_id)
);

drop policy if exists moment_groepen_insert_systeembeheerder on public.moment_groepen;
create policy moment_groepen_insert_systeembeheerder
on public.moment_groepen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists moment_groepen_update_systeembeheerder on public.moment_groepen;
create policy moment_groepen_update_systeembeheerder
on public.moment_groepen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Deelnames
drop policy if exists deelnames_select_eigen_profieltoegang_of_beheer on public.deelnames;
create policy deelnames_select_eigen_profieltoegang_of_beheer
on public.deelnames
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(profiel_id)
  or app_private.is_systeembeheerder()
);

drop policy if exists deelnames_insert_eigen_of_voorlopig_via_profieltoegang on public.deelnames;
create policy deelnames_insert_eigen_of_voorlopig_via_profieltoegang
on public.deelnames
for insert
to authenticated
with check (
  (
    profiel_id = app_private.current_profiel_id()
    and status in ('voorgesteld', 'ingeschreven')
    and app_private.can_view_moment(moment_id)
  )
  or (
    app_private.has_profieltoegang(profiel_id)
    and status in ('voorgesteld', 'uitgenodigd')
    and app_private.can_view_moment(moment_id)
  )
  or (
    app_private.is_systeembeheerder()
    and status in ('voorgesteld', 'uitgenodigd')
  )
);

-- Momentrollen
drop policy if exists momentrollen_select_can_view_moment on public.momentrollen;
create policy momentrollen_select_can_view_moment
on public.momentrollen
for select
to authenticated
using (
  app_private.can_view_moment(moment_id)
);

drop policy if exists momentrollen_insert_systeembeheerder on public.momentrollen;
create policy momentrollen_insert_systeembeheerder
on public.momentrollen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists momentrollen_update_systeembeheerder on public.momentrollen;
create policy momentrollen_update_systeembeheerder
on public.momentrollen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Rolbezettingen
drop policy if exists rolbezettingen_select_eigen_of_momentzichtbaar on public.rolbezettingen;
create policy rolbezettingen_select_eigen_of_momentzichtbaar
on public.rolbezettingen
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.is_systeembeheerder()
  or exists (
    select 1
    from public.momentrollen mr
    where mr.id = rolbezettingen.momentrol_id
      and app_private.can_view_moment(mr.moment_id)
  )
);

drop policy if exists rolbezettingen_insert_eigen_claim on public.rolbezettingen;
create policy rolbezettingen_insert_eigen_claim
on public.rolbezettingen
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'actief'
  and exists (
    select 1
    from public.momentrollen mr
    where mr.id = rolbezettingen.momentrol_id
      and mr.status in ('open', 'incompleet')
      and app_private.can_view_moment(mr.moment_id)
  )
);

-- Beschikbaarheden
drop policy if exists beschikbaarheden_select_eigen_profieltoegang_of_beheer on public.beschikbaarheden;
create policy beschikbaarheden_select_eigen_profieltoegang_of_beheer
on public.beschikbaarheden
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(profiel_id)
  or app_private.is_systeembeheerder()
);

drop policy if exists beschikbaarheden_insert_eigen_profiel on public.beschikbaarheden;
create policy beschikbaarheden_insert_eigen_profiel
on public.beschikbaarheden
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
);

drop policy if exists beschikbaarheden_update_eigen_profiel on public.beschikbaarheden;
create policy beschikbaarheden_update_eigen_profiel
on public.beschikbaarheden
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
)
with check (
  profiel_id = app_private.current_profiel_id()
);
