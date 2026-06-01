-- SAM&ZO migration 016: RLS slice 4 voor documenten, begeleidingsnotities, tags en templates.
-- Doel: conservatieve policies voor informerende documenten, strikt afgeschermde begeleidingsnotities en lichte vindbaarheid.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, helperfuncties, seeddata, triggers, RPC's of delete-policies.
-- Documenten informeren en zijn geen persoonlijke documentenbibliotheek, zorgdossier, formulierensysteem, rapportage of begeleidingsnotitie.
-- Begeleidingsnotities zijn geen Documenten, hebben geen categorie en worden niet zichtbaar via Documenten, Tags of gewone groepstoegang.
-- Tags en tagkoppelingen bepalen geen gedrag, rechten of toegang tot gekoppelde items.

-- Documenten
drop policy if exists documenten_select_context_gepubliceerd_of_beheer on public.documenten;
create policy documenten_select_context_gepubliceerd_of_beheer
on public.documenten
for select
to authenticated
using (
  app_private.is_systeembeheerder()
  or eigenaar_profiel_id = app_private.current_profiel_id()
  or (
    status = 'gepubliceerd'
    and (
      (
        eigenaar_profiel_id is not null
        and app_private.has_profieltoegang(eigenaar_profiel_id)
      )
      or (
        eigenaar_groep_id is not null
        and app_private.current_profiel_is_lid_van_groep(eigenaar_groep_id)
      )
    )
  )
);

drop policy if exists documenten_insert_systeembeheerder on public.documenten;
create policy documenten_insert_systeembeheerder
on public.documenten
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists documenten_update_systeembeheerder on public.documenten;
create policy documenten_update_systeembeheerder
on public.documenten
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Document-groep-koppelingen
drop policy if exists document_groepen_select_documentzichtbaar_of_beheer on public.document_groepen;
create policy document_groepen_select_documentzichtbaar_of_beheer
on public.document_groepen
for select
to authenticated
using (
  app_private.is_systeembeheerder()
  or exists (
    select 1
    from public.documenten d
    where d.id = document_groepen.document_id
  )
);

drop policy if exists document_groepen_insert_systeembeheerder on public.document_groepen;
create policy document_groepen_insert_systeembeheerder
on public.document_groepen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists document_groepen_update_systeembeheerder on public.document_groepen;
create policy document_groepen_update_systeembeheerder
on public.document_groepen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Document-koppelingen
drop policy if exists document_koppelingen_select_documentzichtbaar_of_beheer on public.document_koppelingen;
create policy document_koppelingen_select_documentzichtbaar_of_beheer
on public.document_koppelingen
for select
to authenticated
using (
  app_private.is_systeembeheerder()
  or exists (
    select 1
    from public.documenten d
    where d.id = document_koppelingen.document_id
  )
);

drop policy if exists document_koppelingen_insert_systeembeheerder on public.document_koppelingen;
create policy document_koppelingen_insert_systeembeheerder
on public.document_koppelingen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists document_koppelingen_update_systeembeheerder on public.document_koppelingen;
create policy document_koppelingen_update_systeembeheerder
on public.document_koppelingen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Begeleidingsnotities
drop policy if exists begeleidingsnotities_select_systeembeheerder on public.begeleidingsnotities;
create policy begeleidingsnotities_select_systeembeheerder
on public.begeleidingsnotities
for select
to authenticated
using (
  app_private.is_systeembeheerder()
);

drop policy if exists begeleidingsnotities_insert_systeembeheerder on public.begeleidingsnotities;
create policy begeleidingsnotities_insert_systeembeheerder
on public.begeleidingsnotities
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists begeleidingsnotities_update_systeembeheerder on public.begeleidingsnotities;
create policy begeleidingsnotities_update_systeembeheerder
on public.begeleidingsnotities
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Tags
drop policy if exists tags_select_actief_of_beheer on public.tags;
create policy tags_select_actief_of_beheer
on public.tags
for select
to authenticated
using (
  status = 'actief'
  or app_private.is_systeembeheerder()
);

drop policy if exists tags_insert_systeembeheerder on public.tags;
create policy tags_insert_systeembeheerder
on public.tags
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists tags_update_systeembeheerder on public.tags;
create policy tags_update_systeembeheerder
on public.tags
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Tag-koppelingen
drop policy if exists tag_koppelingen_select_systeembeheerder on public.tag_koppelingen;
create policy tag_koppelingen_select_systeembeheerder
on public.tag_koppelingen
for select
to authenticated
using (
  app_private.is_systeembeheerder()
);

drop policy if exists tag_koppelingen_insert_systeembeheerder on public.tag_koppelingen;
create policy tag_koppelingen_insert_systeembeheerder
on public.tag_koppelingen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists tag_koppelingen_update_systeembeheerder on public.tag_koppelingen;
create policy tag_koppelingen_update_systeembeheerder
on public.tag_koppelingen
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

-- Templates
drop policy if exists templates_select_actief_categorie_of_beheer on public.templates;
create policy templates_select_actief_categorie_of_beheer
on public.templates
for select
to authenticated
using (
  app_private.is_systeembeheerder()
  or (
    status = 'actief'
    and (
      categorie_id is null
      or exists (
        select 1
        from public.categorieen c
        where c.id = templates.categorie_id
          and c.status = 'actief'
      )
    )
  )
);

drop policy if exists templates_insert_systeembeheerder on public.templates;
create policy templates_insert_systeembeheerder
on public.templates
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists templates_update_systeembeheerder on public.templates;
create policy templates_update_systeembeheerder
on public.templates
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);
