-- SAM&ZO migration 013: RLS slice 1 voor identiteit, profielen, groepen en categorieen.
-- Doel: conservatieve eerste policies voor Slice 1-tabellen.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, helperfuncties, seeddata, triggers, RPC's of delete-policies.
-- Persoon = account/authenticatie/actor. Profiel = functionele appwerkelijkheid.
-- Profieltoegang geeft zicht/handelingsruimte, geen mandaat voor definitieve persoonlijke mutaties.
-- Groepsrollen en categorieen zijn geen technische rechtenbron.

-- Personen
drop policy if exists personen_select_eigen_of_systeembeheerder on public.personen;
create policy personen_select_eigen_of_systeembeheerder
on public.personen
for select
to authenticated
using (
  id = app_private.current_persoon_id()
  or app_private.is_systeembeheerder()
);

drop policy if exists personen_insert_systeembeheerder on public.personen;
create policy personen_insert_systeembeheerder
on public.personen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists personen_update_systeembeheerder on public.personen;
create policy personen_update_systeembeheerder
on public.personen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Profielen
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
);

drop policy if exists profielen_insert_systeembeheerder on public.profielen;
create policy profielen_insert_systeembeheerder
on public.profielen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists profielen_update_systeembeheerder on public.profielen;
create policy profielen_update_systeembeheerder
on public.profielen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Profielinstellingen
drop policy if exists profielinstellingen_select_eigen_of_beheer on public.profielinstellingen;
create policy profielinstellingen_select_eigen_of_beheer
on public.profielinstellingen
for select
to authenticated
using (
  app_private.is_eigen_profiel(profiel_id)
  or app_private.is_systeembeheerder()
);

drop policy if exists profielinstellingen_insert_eigen_of_beheer on public.profielinstellingen;
create policy profielinstellingen_insert_eigen_of_beheer
on public.profielinstellingen
for insert
to authenticated
with check (
  app_private.is_eigen_profiel(profiel_id)
  or app_private.is_systeembeheerder()
);

drop policy if exists profielinstellingen_update_eigen_of_beheer on public.profielinstellingen;
create policy profielinstellingen_update_eigen_of_beheer
on public.profielinstellingen
for update
to authenticated
using (
  app_private.is_eigen_profiel(profiel_id)
  or app_private.is_systeembeheerder()
)
with check (
  app_private.is_eigen_profiel(profiel_id)
  or app_private.is_systeembeheerder()
);

-- Profieltoegangen
drop policy if exists profieltoegangen_select_betrokken_of_support on public.profieltoegangen;
create policy profieltoegangen_select_betrokken_of_support
on public.profieltoegangen
for select
to authenticated
using (
  persoon_id = app_private.current_persoon_id()
  or app_private.is_eigen_profiel(profiel_id)
  or app_private.is_systeemondersteuner()
);

drop policy if exists profieltoegangen_insert_support on public.profieltoegangen;
create policy profieltoegangen_insert_support
on public.profieltoegangen
for insert
to authenticated
with check (
  app_private.is_systeemondersteuner()
);

drop policy if exists profieltoegangen_update_support on public.profieltoegangen;
create policy profieltoegangen_update_support
on public.profieltoegangen
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
)
with check (
  app_private.is_systeemondersteuner()
);

-- Groepen
drop policy if exists groepen_select_zichtbaar_lid_of_beheer on public.groepen;
create policy groepen_select_zichtbaar_lid_of_beheer
on public.groepen
for select
to authenticated
using (
  app_private.is_systeemondersteuner()
  or (
    status = 'actief'
    and (
      zichtbaarheid = 'zichtbaar'
      or app_private.current_profiel_is_lid_van_groep(id)
    )
  )
);

drop policy if exists groepen_insert_systeembeheerder on public.groepen;
create policy groepen_insert_systeembeheerder
on public.groepen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists groepen_update_systeembeheerder on public.groepen;
create policy groepen_update_systeembeheerder
on public.groepen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Groepslidmaatschappen
drop policy if exists groepslidmaatschappen_select_context_of_beheer on public.groepslidmaatschappen;
create policy groepslidmaatschappen_select_context_of_beheer
on public.groepslidmaatschappen
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.current_profiel_is_lid_van_groep(groep_id)
  or app_private.is_systeemondersteuner()
);

drop policy if exists groepslidmaatschappen_insert_support on public.groepslidmaatschappen;
create policy groepslidmaatschappen_insert_support
on public.groepslidmaatschappen
for insert
to authenticated
with check (
  app_private.is_systeemondersteuner()
);

drop policy if exists groepslidmaatschappen_update_support on public.groepslidmaatschappen;
create policy groepslidmaatschappen_update_support
on public.groepslidmaatschappen
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
)
with check (
  app_private.is_systeemondersteuner()
);

-- Groepsrollen
drop policy if exists groepsrollen_select_context_of_beheer on public.groepsrollen;
create policy groepsrollen_select_context_of_beheer
on public.groepsrollen
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.current_profiel_is_lid_van_groep(groep_id)
  or app_private.is_systeemondersteuner()
);

drop policy if exists groepsrollen_insert_support on public.groepsrollen;
create policy groepsrollen_insert_support
on public.groepsrollen
for insert
to authenticated
with check (
  app_private.is_systeemondersteuner()
);

drop policy if exists groepsrollen_update_support on public.groepsrollen;
create policy groepsrollen_update_support
on public.groepsrollen
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
)
with check (
  app_private.is_systeemondersteuner()
);

-- Categorieen
drop policy if exists categorieen_select_actief_of_systeembeheerder on public.categorieen;
create policy categorieen_select_actief_of_systeembeheerder
on public.categorieen
for select
to authenticated
using (
  status = 'actief'
  or app_private.is_systeembeheerder()
);

drop policy if exists categorieen_insert_systeembeheerder on public.categorieen;
create policy categorieen_insert_systeembeheerder
on public.categorieen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists categorieen_update_systeembeheerder on public.categorieen;
create policy categorieen_update_systeembeheerder
on public.categorieen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Categorieconfiguraties
drop policy if exists categorie_configuraties_select_actief_of_systeembeheerder on public.categorie_configuraties;
create policy categorie_configuraties_select_actief_of_systeembeheerder
on public.categorie_configuraties
for select
to authenticated
using (
  app_private.is_systeembeheerder()
  or exists (
    select 1
    from public.categorieen c
    where c.id = categorie_configuraties.categorie_id
      and c.status = 'actief'
  )
);

drop policy if exists categorie_configuraties_insert_systeembeheerder on public.categorie_configuraties;
create policy categorie_configuraties_insert_systeembeheerder
on public.categorie_configuraties
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists categorie_configuraties_update_systeembeheerder on public.categorie_configuraties;
create policy categorie_configuraties_update_systeembeheerder
on public.categorie_configuraties
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);
