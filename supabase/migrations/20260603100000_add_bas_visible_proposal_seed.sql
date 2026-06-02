-- SAM&ZO migration: ensure Bas Beheerder has at least one test proposal visible.

do $$
declare
  bas_persoon uuid;
  bas_profiel uuid;
  sanne_persoon uuid;
  sanne_profiel uuid;
begin
  select p.id, pr.id
  into bas_persoon, bas_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'bas.beheerder@example.test'
  limit 1;

  select p.id, pr.id
  into sanne_persoon, sanne_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'sanne.support@example.test'
  limit 1;

  if bas_persoon is null or bas_profiel is null then
    raise exception 'Missing required development person/profile for bas.beheerder@example.test';
  end if;

  if sanne_persoon is null or sanne_profiel is null then
    raise exception 'Missing required development person/profile for sanne.support@example.test';
  end if;

  if exists (
    select 1
    from public.voorstellen
    where ontvangend_profiel_id = bas_profiel
      and status = 'open'
      and gekoppeld_id = '45000000-0000-4000-8000-000000000003'
      and type = 'deelname_aan_moment'
  ) then
    raise notice 'Visible Bas proposal already exists, skipping.';
    return;
  end if;

  insert into public.voorstellen (
    id,
    type,
    status,
    ontvangend_profiel_id,
    voorgesteld_door_persoon_id,
    voorgesteld_vanuit_profiel_id,
    titel,
    toelichting,
    gekoppeld_type,
    gekoppeld_id
  ) values (
    '45600000-0000-4000-8000-000000000001',
    'deelname_aan_moment',
    'open',
    bas_profiel,
    sanne_persoon,
    sanne_profiel,
    'Dienstplanning aanmelding',
    'Open voorstel voor een medewerker-moment om het zicht op proposals te testen.',
    'moment',
    '45000000-0000-4000-8000-000000000003'
  )
  on conflict (id) do update set
    type = excluded.type,
    status = excluded.status,
    ontvangend_profiel_id = excluded.ontvangend_profiel_id,
    voorgesteld_door_persoon_id = excluded.voorgesteld_door_persoon_id,
    voorgesteld_vanuit_profiel_id = excluded.voorgesteld_vanuit_profiel_id,
    titel = excluded.titel,
    toelichting = excluded.toelichting,
    gekoppeld_type = excluded.gekoppeld_type,
    gekoppeld_id = excluded.gekoppeld_id,
    updated_at = now();
end $$;
