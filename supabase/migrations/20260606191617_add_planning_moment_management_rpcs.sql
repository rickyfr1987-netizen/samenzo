-- SAM&ZO Fase 3C: Planning momentbeheer MVP-smal.
-- Doel: groepgerichte momenten gecontroleerd maken, wijzigen en archiveren
-- via security-invoker RPC's, zonder service-role, UI of persoonlijke
-- Mijn dag-mutaties.

create or replace function app_private.can_manage_planning_moment(
  target_moment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.is_systeembeheerder(), false)
    and exists (
      select 1
      from public.momenten m
      where m.id = target_moment_id
        and m.eigenaar_groep_id is not null
        and m.eigenaar_profiel_id is null
    );
$$;

create or replace function app_private.can_create_planning_moment_for_group(
  target_groep_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.is_systeembeheerder(), false)
    and exists (
      select 1
      from public.groepen g
      where g.id = target_groep_id
        and g.status = 'actief'
    );
$$;

create or replace function app_private.planning_group_allows_guest_access(
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
    from public.groepen g
    where g.id = target_groep_id
      and g.status = 'actief'
      and g.zichtbaarheid = 'zichtbaar'
      and g.groepstype = 'gastgroep'
  );
$$;

revoke all on function app_private.can_manage_planning_moment(uuid) from public;
revoke all on function app_private.can_create_planning_moment_for_group(uuid) from public;
revoke all on function app_private.planning_group_allows_guest_access(uuid) from public;

grant execute on function app_private.can_manage_planning_moment(uuid) to authenticated;
grant execute on function app_private.can_create_planning_moment_for_group(uuid) to authenticated;
grant execute on function app_private.planning_group_allows_guest_access(uuid) to authenticated;

-- De route is security-invoker. Authenticated heeft daarom smalle tabelgrants
-- nodig, terwijl RLS de rijgrenzen blijft afdwingen.
grant select on public.personen to authenticated;
grant select on public.groepen to authenticated;
grant select on public.categorieen to authenticated;
grant select on public.momenten to authenticated;
grant select on public.moment_groepen to authenticated;

grant insert (
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
) on public.momenten to authenticated;

grant update (
  titel,
  beschrijving,
  categorie_id,
  start_at,
  eind_at,
  hele_dag,
  locatie,
  status,
  inschrijving_open,
  capaciteit,
  gasttoegang,
  updated_at,
  updated_by_persoon_id,
  archived_at,
  archived_by_persoon_id
) on public.momenten to authenticated;

grant insert (
  moment_id,
  groep_id,
  context_type
) on public.moment_groepen to authenticated;

drop policy if exists momenten_insert_eigen_profiel_of_systeembeheerder on public.momenten;
drop policy if exists momenten_insert_systeembeheerder on public.momenten;
create policy momenten_insert_systeembeheerder
on public.momenten
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop function if exists public.maak_groep_moment(
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
);

create function public.maak_groep_moment(
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
  )
  returning *
  into v_moment;

  insert into public.moment_groepen (
    moment_id,
    groep_id,
    context_type
  ) values (
    v_moment.id,
    target_groep_id,
    'eigenaar'
  );

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

drop function if exists public.wijzig_groep_moment(
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
);

create function public.wijzig_groep_moment(
  target_moment_id uuid,
  target_categorie_id uuid,
  target_titel text,
  target_beschrijving text,
  target_start_at timestamptz,
  target_eind_at timestamptz,
  target_hele_dag boolean,
  target_locatie text,
  target_capaciteit integer,
  target_inschrijving_open boolean,
  target_gasttoegang boolean,
  target_status public.moment_status
)
returns table (
  moment_id uuid,
  titel text,
  status public.moment_status,
  eigenaar_groep_id uuid,
  start_at timestamptz,
  eind_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_existing public.momenten%rowtype;
  v_moment public.momenten%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Planningmomentbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag planningmomenten beheren.'
      using errcode = '42501';
  end if;

  if target_moment_id is null then
    raise exception 'Planningmoment ontbreekt.'
      using errcode = '22023';
  end if;

  if not app_private.can_manage_planning_moment(target_moment_id) then
    raise exception 'Planningmoment is niet beheerbaar via deze route.'
      using errcode = '42501';
  end if;

  select *
    into v_existing
  from public.momenten m
  where m.id = target_moment_id
    and m.eigenaar_groep_id is not null
    and m.eigenaar_profiel_id is null
    and m.status <> 'gearchiveerd'
  for update;

  if v_existing.id is null then
    raise exception 'Planningmoment is niet zichtbaar of al gearchiveerd.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.moment_groepen mg
    where mg.moment_id = target_moment_id
      and mg.groep_id = v_existing.eigenaar_groep_id
      and mg.context_type = 'eigenaar'
  ) then
    raise exception 'Planningmoment mist primaire groepskoppeling.'
      using errcode = '23514';
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

  if target_status not in (
    'gepland'::public.moment_status,
    'open'::public.moment_status,
    'gewijzigd'::public.moment_status,
    'geannuleerd'::public.moment_status
  ) then
    raise exception 'Deze momentstatus is niet toegestaan via bewerken.'
      using errcode = '22023';
  end if;

  if target_status = 'open'::public.moment_status
     and not coalesce(target_inschrijving_open, false) then
    raise exception 'Status open vereist open inschrijving.'
      using errcode = '22023';
  end if;

  if coalesce(target_gasttoegang, false)
     and not app_private.planning_group_allows_guest_access(v_existing.eigenaar_groep_id) then
    raise exception 'Gasttoegang is alleen toegestaan voor de gastgroep.'
      using errcode = '42501';
  end if;

  update public.momenten m
  set
    titel = btrim(target_titel),
    beschrijving = nullif(btrim(coalesce(target_beschrijving, '')), ''),
    categorie_id = target_categorie_id,
    start_at = target_start_at,
    eind_at = target_eind_at,
    hele_dag = coalesce(target_hele_dag, false),
    locatie = nullif(btrim(coalesce(target_locatie, '')), ''),
    capaciteit = target_capaciteit,
    inschrijving_open = coalesce(target_inschrijving_open, false),
    gasttoegang = coalesce(target_gasttoegang, false),
    status = target_status,
    updated_at = now(),
    updated_by_persoon_id = v_current_persoon_id
  where m.id = target_moment_id
  returning *
  into v_moment;

  if not found then
    raise exception 'Planningmoment kon niet worden bijgewerkt.'
      using errcode = '42501';
  end if;

  return query
  select
    v_moment.id,
    v_moment.titel,
    v_moment.status,
    v_moment.eigenaar_groep_id,
    v_moment.start_at,
    v_moment.eind_at,
    v_moment.updated_at;
end;
$$;

drop function if exists public.archiveer_groep_moment(uuid);

create function public.archiveer_groep_moment(
  target_moment_id uuid
)
returns table (
  moment_id uuid,
  status public.moment_status,
  archived_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_moment public.momenten%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Planningmomentbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag planningmomenten beheren.'
      using errcode = '42501';
  end if;

  if target_moment_id is null then
    raise exception 'Planningmoment ontbreekt.'
      using errcode = '22023';
  end if;

  if not app_private.can_manage_planning_moment(target_moment_id) then
    raise exception 'Planningmoment is niet beheerbaar via deze route.'
      using errcode = '42501';
  end if;

  update public.momenten m
  set
    status = 'gearchiveerd',
    archived_at = now(),
    archived_by_persoon_id = v_current_persoon_id,
    updated_at = now(),
    updated_by_persoon_id = v_current_persoon_id
  where m.id = target_moment_id
    and m.eigenaar_groep_id is not null
    and m.eigenaar_profiel_id is null
    and m.status <> 'gearchiveerd'
  returning *
  into v_moment;

  if not found then
    raise exception 'Planningmoment is niet zichtbaar of al gearchiveerd.'
      using errcode = '42501';
  end if;

  return query
  select
    v_moment.id,
    v_moment.status,
    v_moment.archived_at;
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
) from public;

revoke all on function public.archiveer_groep_moment(uuid) from public;

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

grant execute on function public.wijzig_groep_moment(
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
) to authenticated;

grant execute on function public.archiveer_groep_moment(uuid) to authenticated;
