-- SAM&ZO: fix planning momentbeheer RPC visibility under RLS.
-- Keep the route security-invoker, but avoid INSERT ... RETURNING on momenten:
-- the SELECT policy checks app_private.can_view_moment(id), which cannot see
-- the just-inserted row from inside the RETURNING visibility check.
-- Systeembeheerder also needs existing archived moments for management/audit,
-- while normal active visibility remains closed for archived moments.

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
      and (
        app_private.is_systeembeheerder()
        or (
          m.status <> 'gearchiveerd'
          and (
            not app_private.is_guest_session()
            or m.gasttoegang = true
          )
          and (
            m.eigenaar_profiel_id = app_private.current_profiel_id()
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
        )
      )
  );
end;
$$;

revoke all on function app_private.can_view_moment(uuid) from public;
grant execute on function app_private.can_view_moment(uuid) to authenticated;

grant insert (id) on public.momenten to authenticated;

create or replace function public.maak_groep_moment(
  target_groep_id uuid,
  target_categorie_id uuid,
  target_titel text,
  target_beschrijving text,
  target_start_at timestamptz,
  target_eind_at timestamptz,
  target_hele_dag boolean,
  target_locatie text,
  target_capaciteit integer,
  target_inschrijving_open boolean,
  target_gasttoegang boolean
)
returns table (
  moment_id uuid,
  titel text,
  status public.moment_status,
  eigenaar_groep_id uuid,
  start_at timestamptz,
  eind_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_moment_id uuid := gen_random_uuid();
  v_moment public.momenten%rowtype;
  v_status public.moment_status;
begin
  if v_current_persoon_id is null then
    raise exception 'Planningmomentbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag planningmomenten beheren.'
      using errcode = '42501';
  end if;

  if not app_private.can_create_planning_moment_for_group(target_groep_id) then
    raise exception 'Planningmoment vereist een actieve groep.'
      using errcode = '42501';
  end if;

  if target_categorie_id is null or not exists (
    select 1
    from public.categorieen c
    where c.id = target_categorie_id
      and c.entiteit_type = 'moment'
      and c.status = 'actief'
  ) then
    raise exception 'Planningmoment vereist een actieve momentcategorie.'
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(target_titel, '')), '') is null then
    raise exception 'Momenttitel is verplicht.'
      using errcode = '22023';
  end if;

  if target_start_at is null then
    raise exception 'Starttijd is verplicht.'
      using errcode = '22023';
  end if;

  if target_eind_at is not null and target_eind_at <= target_start_at then
    raise exception 'Eindtijd moet na starttijd liggen.'
      using errcode = '22023';
  end if;

  if target_capaciteit is not null and target_capaciteit < 0 then
    raise exception 'Capaciteit mag niet negatief zijn.'
      using errcode = '22023';
  end if;

  if coalesce(target_gasttoegang, false)
     and not app_private.planning_group_allows_guest_access(target_groep_id) then
    raise exception 'Gasttoegang is alleen toegestaan voor de gastgroep.'
      using errcode = '42501';
  end if;

  v_status := case
    when coalesce(target_inschrijving_open, false) then 'open'::public.moment_status
    else 'gepland'::public.moment_status
  end;

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    hele_dag,
    locatie,
    status,
    inschrijving_open,
    capaciteit,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  ) values (
    v_moment_id,
    btrim(target_titel),
    nullif(btrim(coalesce(target_beschrijving, '')), ''),
    target_categorie_id,
    null,
    target_groep_id,
    target_start_at,
    target_eind_at,
    coalesce(target_hele_dag, false),
    nullif(btrim(coalesce(target_locatie, '')), ''),
    v_status,
    coalesce(target_inschrijving_open, false),
    target_capaciteit,
    coalesce(target_gasttoegang, false),
    target_start_at,
    v_current_persoon_id
  );

  insert into public.moment_groepen (
    moment_id,
    groep_id,
    context_type
  ) values (
    v_moment_id,
    target_groep_id,
    'eigenaar'
  );

  select *
    into v_moment
  from public.momenten m
  where m.id = v_moment_id;

  if v_moment.id is null then
    raise exception 'Planningmoment is niet zichtbaar na aanmaken.'
      using errcode = '42501';
  end if;

  return query
  select
    v_moment.id,
    v_moment.titel,
    v_moment.status,
    v_moment.eigenaar_groep_id,
    v_moment.start_at,
    v_moment.eind_at;
end;
$$;

revoke all on function public.maak_groep_moment(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  text,
  integer,
  boolean,
  boolean
) from public;

revoke all on function public.maak_groep_moment(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  text,
  integer,
  boolean,
  boolean
) from anon;

revoke all on function public.wijzig_groep_moment(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  text,
  integer,
  boolean,
  boolean,
  public.moment_status
) from anon;

revoke all on function public.archiveer_groep_moment(uuid) from anon;

grant execute on function public.maak_groep_moment(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  text,
  integer,
  boolean,
  boolean
) to authenticated;
