-- SAM&ZO hotfix: maak persoonsbeheerdersinsert op momenten robuuster voor huidige profielcontext.
-- Doel: RLS-check laat invoeging door eigen actieve profielcontext deterministischer doorlopen.

drop policy if exists momenten_insert_eigen_profiel_of_systeembeheerder on public.momenten;
create policy momenten_insert_eigen_profiel_of_systeembeheerder
on public.momenten
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
  or eigenaar_profiel_id = app_private.current_profiel_id()
  or (
    eigenaar_profiel_id is not null
    and app_private.current_persoon_id() is not null
    and exists (
      select 1
      from public.profielen pr
      where pr.id = eigenaar_profiel_id
        and pr.persoon_id = app_private.current_persoon_id()
    )
  )
);
