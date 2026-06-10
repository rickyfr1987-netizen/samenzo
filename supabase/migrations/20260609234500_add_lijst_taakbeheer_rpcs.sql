-- SAM&ZO Fase 4B: groepseigen lijst- en taakbeheer MVP-smal.
-- Lijsten/taken worden beheerd als gemeenschappelijke werkcontext.
-- Taakuitvoerderschap blijft persoonlijke werkelijkheid en wordt hier niet
-- aangemaakt of gewijzigd.

create or replace function app_private.can_view_lijst(target_lijst_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.lijsten l
    where l.id = target_lijst_id
      and (
        app_private.is_systeembeheerder()
        or (
          l.archived_at is null
          and l.status <> 'gearchiveerd'
          and (
            l.eigenaar_profiel_id = app_private.current_profiel_id()
            or (
              l.eigenaar_profiel_id is not null
              and app_private.has_profieltoegang(l.eigenaar_profiel_id)
            )
            or (
              l.eigenaar_groep_id is not null
              and app_private.current_profiel_is_lid_van_groep(l.eigenaar_groep_id)
            )
            or (
              l.gekoppeld_moment_id is not null
              and app_private.can_view_moment(l.gekoppeld_moment_id)
            )
            or exists (
              select 1
              from public.lijst_groepen lg
              where lg.lijst_id = l.id
                and app_private.current_profiel_is_lid_van_groep(lg.groep_id)
            )
          )
        )
      )
  );
$$;

create or replace function app_private.can_create_lijst_for_group(
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

create or replace function app_private.can_manage_groep_lijst(
  target_lijst_id uuid
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
      from public.lijsten l
      where l.id = target_lijst_id
        and l.eigenaar_groep_id is not null
        and l.eigenaar_profiel_id is null
        and l.archived_at is null
        and l.status <> 'gearchiveerd'
    );
$$;

revoke all on function app_private.can_view_lijst(uuid) from public;
revoke all on function app_private.can_create_lijst_for_group(uuid) from public;
revoke all on function app_private.can_manage_groep_lijst(uuid) from public;

grant execute on function app_private.can_view_lijst(uuid) to authenticated;
grant execute on function app_private.can_create_lijst_for_group(uuid) to authenticated;
grant execute on function app_private.can_manage_groep_lijst(uuid) to authenticated;

grant select on public.personen to authenticated;
grant select on public.groepen to authenticated;
grant select on public.categorieen to authenticated;
grant select on public.momenten to authenticated;
grant select on public.lijsten to authenticated;
grant select on public.lijst_groepen to authenticated;
grant select on public.taken to authenticated;
grant select on public.taakuitvoerders to authenticated;

grant insert (
  id,
  titel,
  beschrijving,
  categorie_id,
  eigenaar_profiel_id,
  eigenaar_groep_id,
  gekoppeld_moment_id,
  gekoppeld_doel_id,
  status,
  created_by_persoon_id
) on public.lijsten to authenticated;

grant update (
  titel,
  beschrijving,
  categorie_id,
  gekoppeld_moment_id,
  status,
  updated_at,
  updated_by_persoon_id,
  archived_at,
  archived_by_persoon_id
) on public.lijsten to authenticated;

grant insert (
  lijst_id,
  groep_id
) on public.lijst_groepen to authenticated;

grant insert (
  id,
  lijst_id,
  titel,
  beschrijving,
  status,
  sort_order,
  deadline_at,
  created_by_persoon_id
) on public.taken to authenticated;

grant update (
  titel,
  beschrijving,
  status,
  sort_order,
  deadline_at,
  afgerond_at,
  updated_at,
  updated_by_persoon_id,
  archived_at,
  archived_by_persoon_id
) on public.taken to authenticated;

drop policy if exists lijsten_insert_systeembeheerder on public.lijsten;
create policy lijsten_insert_systeembeheerder
on public.lijsten
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists lijsten_update_systeembeheerder on public.lijsten;
create policy lijsten_update_systeembeheerder
on public.lijsten
for update
to authenticated
using (
  app_private.is_systeembeheerder()
)
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists lijst_groepen_insert_systeembeheerder on public.lijst_groepen;
create policy lijst_groepen_insert_systeembeheerder
on public.lijst_groepen
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
);

drop policy if exists taken_select_can_view_lijst on public.taken;
create policy taken_select_can_view_lijst
on public.taken
for select
to authenticated
using (
  app_private.is_systeembeheerder()
  or (
    archived_at is null
    and app_private.can_view_lijst(lijst_id)
  )
);

drop policy if exists taken_insert_systeembeheerder on public.taken;
create policy taken_insert_systeembeheerder
on public.taken
for insert
to authenticated
with check (
  app_private.is_systeembeheerder()
  and app_private.can_manage_groep_lijst(lijst_id)
);

drop policy if exists taken_update_systeembeheerder on public.taken;
create policy taken_update_systeembeheerder
on public.taken
for update
to authenticated
using (
  app_private.is_systeembeheerder()
  and app_private.can_manage_groep_lijst(lijst_id)
)
with check (
  app_private.is_systeembeheerder()
);

create or replace function public.maak_groep_lijst(
  target_groep_id uuid,
  target_categorie_id uuid,
  target_titel text,
  target_beschrijving text,
  target_gekoppeld_moment_id uuid
)
returns table (
  lijst_id uuid,
  titel text,
  status public.lijst_status,
  eigenaar_groep_id uuid,
  gekoppeld_moment_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_lijst_id uuid := gen_random_uuid();
  v_lijst public.lijsten%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Lijstbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag lijsten beheren.'
      using errcode = '42501';
  end if;

  if not app_private.can_create_lijst_for_group(target_groep_id) then
    raise exception 'Groepslijst vereist een actieve groep.'
      using errcode = '42501';
  end if;

  if target_categorie_id is null or not exists (
    select 1
    from public.categorieen c
    where c.id = target_categorie_id
      and c.entiteit_type = 'lijst'
      and c.status = 'actief'
  ) then
    raise exception 'Groepslijst vereist een actieve lijstcategorie.'
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(target_titel, '')), '') is null then
    raise exception 'Lijsttitel is verplicht.'
      using errcode = '22023';
  end if;

  if target_gekoppeld_moment_id is not null and not exists (
    select 1
    from public.momenten m
    where m.id = target_gekoppeld_moment_id
      and m.status <> 'gearchiveerd'
      and app_private.can_view_moment(m.id)
  ) then
    raise exception 'Gekoppeld moment is niet zichtbaar of gearchiveerd.'
      using errcode = '42501';
  end if;

  insert into public.lijsten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    gekoppeld_moment_id,
    gekoppeld_doel_id,
    status,
    created_by_persoon_id
  ) values (
    v_lijst_id,
    btrim(target_titel),
    nullif(btrim(coalesce(target_beschrijving, '')), ''),
    target_categorie_id,
    null,
    target_groep_id,
    target_gekoppeld_moment_id,
    null,
    'open',
    v_current_persoon_id
  );

  insert into public.lijst_groepen (
    lijst_id,
    groep_id
  ) values (
    v_lijst_id,
    target_groep_id
  );

  select *
    into v_lijst
  from public.lijsten l
  where l.id = v_lijst_id;

  if v_lijst.id is null then
    raise exception 'Groepslijst is niet zichtbaar na aanmaken.'
      using errcode = '42501';
  end if;

  return query
  select
    v_lijst.id,
    v_lijst.titel,
    v_lijst.status,
    v_lijst.eigenaar_groep_id,
    v_lijst.gekoppeld_moment_id;
end;
$$;

create or replace function public.wijzig_groep_lijst(
  target_lijst_id uuid,
  target_categorie_id uuid,
  target_titel text,
  target_beschrijving text,
  target_gekoppeld_moment_id uuid,
  target_status public.lijst_status
)
returns table (
  lijst_id uuid,
  titel text,
  status public.lijst_status,
  eigenaar_groep_id uuid,
  gekoppeld_moment_id uuid,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_lijst public.lijsten%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Lijstbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag lijsten beheren.'
      using errcode = '42501';
  end if;

  if target_lijst_id is null then
    raise exception 'Groepslijst ontbreekt.'
      using errcode = '22023';
  end if;

  if not app_private.can_manage_groep_lijst(target_lijst_id) then
    raise exception 'Groepslijst is niet beheerbaar via deze route.'
      using errcode = '42501';
  end if;

  if target_categorie_id is null or not exists (
    select 1
    from public.categorieen c
    where c.id = target_categorie_id
      and c.entiteit_type = 'lijst'
      and c.status = 'actief'
  ) then
    raise exception 'Groepslijst vereist een actieve lijstcategorie.'
      using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(target_titel, '')), '') is null then
    raise exception 'Lijsttitel is verplicht.'
      using errcode = '22023';
  end if;

  if target_status not in (
    'open'::public.lijst_status,
    'bezig'::public.lijst_status,
    'afgerond'::public.lijst_status
  ) then
    raise exception 'Deze lijststatus is niet toegestaan via bewerken.'
      using errcode = '22023';
  end if;

  if target_gekoppeld_moment_id is not null and not exists (
    select 1
    from public.momenten m
    where m.id = target_gekoppeld_moment_id
      and m.status <> 'gearchiveerd'
      and app_private.can_view_moment(m.id)
  ) then
    raise exception 'Gekoppeld moment is niet zichtbaar of gearchiveerd.'
      using errcode = '42501';
  end if;

  update public.lijsten l
  set
    titel = btrim(target_titel),
    beschrijving = nullif(btrim(coalesce(target_beschrijving, '')), ''),
    categorie_id = target_categorie_id,
    gekoppeld_moment_id = target_gekoppeld_moment_id,
    status = target_status,
    updated_at = now(),
    updated_by_persoon_id = v_current_persoon_id
  where l.id = target_lijst_id
    and l.eigenaar_groep_id is not null
    and l.eigenaar_profiel_id is null
    and l.archived_at is null
    and l.status <> 'gearchiveerd'
  returning *
  into v_lijst;

  if not found then
    raise exception 'Groepslijst kon niet worden bijgewerkt.'
      using errcode = '42501';
  end if;

  return query
  select
    v_lijst.id,
    v_lijst.titel,
    v_lijst.status,
    v_lijst.eigenaar_groep_id,
    v_lijst.gekoppeld_moment_id,
    v_lijst.updated_at;
end;
$$;

create or replace function public.archiveer_groep_lijst(
  target_lijst_id uuid
)
returns table (
  lijst_id uuid,
  status public.lijst_status,
  archived_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_lijst public.lijsten%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Lijstbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag lijsten beheren.'
      using errcode = '42501';
  end if;

  if target_lijst_id is null then
    raise exception 'Groepslijst ontbreekt.'
      using errcode = '22023';
  end if;

  if not app_private.can_manage_groep_lijst(target_lijst_id) then
    raise exception 'Groepslijst is niet beheerbaar via deze route.'
      using errcode = '42501';
  end if;

  update public.lijsten l
  set
    status = 'gearchiveerd',
    archived_at = now(),
    archived_by_persoon_id = v_current_persoon_id,
    updated_at = now(),
    updated_by_persoon_id = v_current_persoon_id
  where l.id = target_lijst_id
    and l.eigenaar_groep_id is not null
    and l.eigenaar_profiel_id is null
    and l.archived_at is null
    and l.status <> 'gearchiveerd'
  returning *
  into v_lijst;

  if not found then
    raise exception 'Groepslijst is niet zichtbaar of al gearchiveerd.'
      using errcode = '42501';
  end if;

  return query
  select
    v_lijst.id,
    v_lijst.status,
    v_lijst.archived_at;
end;
$$;

create or replace function public.maak_lijst_taak(
  target_lijst_id uuid,
  target_titel text,
  target_beschrijving text,
  target_sort_order integer,
  target_deadline_at timestamptz
)
returns table (
  taak_id uuid,
  lijst_id uuid,
  titel text,
  status public.taak_status,
  sort_order integer,
  deadline_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_taak_id uuid := gen_random_uuid();
  v_taak public.taken%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Taakbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag taken beheren.'
      using errcode = '42501';
  end if;

  if target_lijst_id is null or not app_private.can_manage_groep_lijst(target_lijst_id) then
    raise exception 'Taak vereist een beheerbare groepslijst.'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(target_titel, '')), '') is null then
    raise exception 'Taaktitel is verplicht.'
      using errcode = '22023';
  end if;

  insert into public.taken (
    id,
    lijst_id,
    titel,
    beschrijving,
    status,
    sort_order,
    deadline_at,
    created_by_persoon_id
  ) values (
    v_taak_id,
    target_lijst_id,
    btrim(target_titel),
    nullif(btrim(coalesce(target_beschrijving, '')), ''),
    'open',
    target_sort_order,
    target_deadline_at,
    v_current_persoon_id
  );

  select *
    into v_taak
  from public.taken t
  where t.id = v_taak_id;

  if v_taak.id is null then
    raise exception 'Taak is niet zichtbaar na aanmaken.'
      using errcode = '42501';
  end if;

  return query
  select
    v_taak.id,
    v_taak.lijst_id,
    v_taak.titel,
    v_taak.status,
    v_taak.sort_order,
    v_taak.deadline_at;
end;
$$;

create or replace function public.wijzig_lijst_taak(
  target_taak_id uuid,
  target_titel text,
  target_beschrijving text,
  target_sort_order integer,
  target_deadline_at timestamptz,
  target_status public.taak_status
)
returns table (
  taak_id uuid,
  lijst_id uuid,
  titel text,
  status public.taak_status,
  sort_order integer,
  deadline_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_existing public.taken%rowtype;
  v_taak public.taken%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Taakbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag taken beheren.'
      using errcode = '42501';
  end if;

  if target_taak_id is null then
    raise exception 'Taak ontbreekt.'
      using errcode = '22023';
  end if;

  select *
    into v_existing
  from public.taken t
  where t.id = target_taak_id
    and t.archived_at is null
  for update;

  if v_existing.id is null or not app_private.can_manage_groep_lijst(v_existing.lijst_id) then
    raise exception 'Taak is niet beheerbaar via deze route.'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(target_titel, '')), '') is null then
    raise exception 'Taaktitel is verplicht.'
      using errcode = '22023';
  end if;

  if target_status not in (
    'open'::public.taak_status,
    'bezig'::public.taak_status,
    'afgerond'::public.taak_status,
    'vervallen'::public.taak_status
  ) then
    raise exception 'Deze taakstatus is niet toegestaan via beheer.'
      using errcode = '22023';
  end if;

  update public.taken t
  set
    titel = btrim(target_titel),
    beschrijving = nullif(btrim(coalesce(target_beschrijving, '')), ''),
    sort_order = target_sort_order,
    deadline_at = target_deadline_at,
    status = target_status,
    afgerond_at = case
      when target_status = 'afgerond'::public.taak_status then coalesce(t.afgerond_at, now())
      else null
    end,
    updated_at = now(),
    updated_by_persoon_id = v_current_persoon_id
  where t.id = target_taak_id
    and t.archived_at is null
  returning *
  into v_taak;

  if not found then
    raise exception 'Taak kon niet worden bijgewerkt.'
      using errcode = '42501';
  end if;

  return query
  select
    v_taak.id,
    v_taak.lijst_id,
    v_taak.titel,
    v_taak.status,
    v_taak.sort_order,
    v_taak.deadline_at,
    v_taak.updated_at;
end;
$$;

create or replace function public.archiveer_lijst_taak(
  target_taak_id uuid
)
returns table (
  taak_id uuid,
  status public.taak_status,
  archived_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_existing public.taken%rowtype;
  v_taak public.taken%rowtype;
begin
  if v_current_persoon_id is null then
    raise exception 'Taakbeheer vereist een actieve persoon.'
      using errcode = '28000';
  end if;

  if not app_private.is_systeembeheerder() then
    raise exception 'Alleen systeembeheerder mag taken beheren.'
      using errcode = '42501';
  end if;

  if target_taak_id is null then
    raise exception 'Taak ontbreekt.'
      using errcode = '22023';
  end if;

  select *
    into v_existing
  from public.taken t
  where t.id = target_taak_id
    and t.archived_at is null
  for update;

  if v_existing.id is null or not app_private.can_manage_groep_lijst(v_existing.lijst_id) then
    raise exception 'Taak is niet beheerbaar via deze route.'
      using errcode = '42501';
  end if;

  update public.taken t
  set
    status = 'vervallen',
    archived_at = now(),
    archived_by_persoon_id = v_current_persoon_id,
    updated_at = now(),
    updated_by_persoon_id = v_current_persoon_id
  where t.id = target_taak_id
    and t.archived_at is null
  returning *
  into v_taak;

  if not found then
    raise exception 'Taak is niet zichtbaar of al gearchiveerd.'
      using errcode = '42501';
  end if;

  return query
  select
    v_taak.id,
    v_taak.status,
    v_taak.archived_at;
end;
$$;

revoke all on function public.maak_groep_lijst(uuid, uuid, text, text, uuid) from public;
revoke all on function public.wijzig_groep_lijst(uuid, uuid, text, text, uuid, public.lijst_status) from public;
revoke all on function public.archiveer_groep_lijst(uuid) from public;
revoke all on function public.maak_lijst_taak(uuid, text, text, integer, timestamptz) from public;
revoke all on function public.wijzig_lijst_taak(uuid, text, text, integer, timestamptz, public.taak_status) from public;
revoke all on function public.archiveer_lijst_taak(uuid) from public;

revoke all on function public.maak_groep_lijst(uuid, uuid, text, text, uuid) from anon;
revoke all on function public.wijzig_groep_lijst(uuid, uuid, text, text, uuid, public.lijst_status) from anon;
revoke all on function public.archiveer_groep_lijst(uuid) from anon;
revoke all on function public.maak_lijst_taak(uuid, text, text, integer, timestamptz) from anon;
revoke all on function public.wijzig_lijst_taak(uuid, text, text, integer, timestamptz, public.taak_status) from anon;
revoke all on function public.archiveer_lijst_taak(uuid) from anon;

grant execute on function public.maak_groep_lijst(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function public.wijzig_groep_lijst(uuid, uuid, text, text, uuid, public.lijst_status) to authenticated;
grant execute on function public.archiveer_groep_lijst(uuid) to authenticated;
grant execute on function public.maak_lijst_taak(uuid, text, text, integer, timestamptz) to authenticated;
grant execute on function public.wijzig_lijst_taak(uuid, text, text, integer, timestamptz, public.taak_status) to authenticated;
grant execute on function public.archiveer_lijst_taak(uuid) to authenticated;
