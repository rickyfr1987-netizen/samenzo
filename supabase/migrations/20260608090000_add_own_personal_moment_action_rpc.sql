-- SAM&ZO Fase 2 Stap 2O-b: smalle actie-RPC voor eigen persoonlijk moment.
-- Doel: RLS-first eigen persoonlijke momentaanmaak vanuit Mijn dag.
-- Deze route afdwingt eigenaarschap in SQL (geen directe clientinsert).

drop function if exists public.maak_persoonlijk_moment(
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  boolean
);

create function public.maak_persoonlijk_moment(
  target_profiel_id uuid,
  target_titel text,
  target_categorie_id uuid,
  target_start_at timestamptz,
  target_eind_at timestamptz default null,
  target_beschrijving text default null,
  target_locatie text default null,
  target_hele_dag boolean default false
)
returns table (
  moment_id uuid,
  eigenaar_profiel_id uuid,
  eigenaar_groep_id uuid,
  titel text,
  start_at timestamptz,
  eind_at timestamptz,
  status moment_status
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_profiel_id uuid := app_private.current_profiel_id();
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_titel text := nullif(btrim(target_titel), '');
  v_beschrijving text := nullif(btrim(target_beschrijving), '');
  v_locatie text := nullif(btrim(target_locatie), '');
  v_moment public.momenten%rowtype;
begin
  if target_profiel_id is null or target_categorie_id is null then
    raise exception 'Persoonlijk moment vereist een doelprofiel en categorie.'
      using errcode = '22023';
  end if;

  if target_titel is null or v_titel is null then
    raise exception 'Titel is verplicht.'
      using errcode = '22023';
  end if;

  if target_start_at is null then
    raise exception 'Starttijd is verplicht.'
      using errcode = '22023';
  end if;

  if target_eind_at is not null and target_eind_at <= target_start_at then
    raise exception 'Eindtijd moet later zijn dan starttijd.'
      using errcode = '23514';
  end if;

  if v_current_profiel_id is null or v_current_persoon_id is null then
    raise exception 'Persoonlijk moment kan alleen met een actief profiel worden aangemaakt.'
      using errcode = '28000';
  end if;

  if target_profiel_id <> v_current_profiel_id then
    raise exception 'Persoonlijk moment kan alleen voor het eigen actieve profiel worden aangemaakt.'
      using errcode = '42501';
  end if;

  insert into public.momenten (
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    hele_dag,
    status,
    inschrijving_open,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  )
  values (
    v_titel,
    v_beschrijving,
    target_categorie_id,
    v_current_profiel_id,
    null,
    target_start_at,
    target_eind_at,
    v_locatie,
    coalesce(target_hele_dag, false),
    'gepland'::public.moment_status,
    false,
    now(),
    v_current_persoon_id
  )
  returning * into v_moment;

  return query
  select
    v_moment.id,
    v_moment.eigenaar_profiel_id,
    v_moment.eigenaar_groep_id,
    v_moment.titel,
    v_moment.start_at,
    v_moment.eind_at,
    v_moment.status;
end;
$$;

revoke all on function public.maak_persoonlijk_moment(
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  boolean
) from public;
grant execute on function public.maak_persoonlijk_moment(
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  boolean
) to authenticated;
