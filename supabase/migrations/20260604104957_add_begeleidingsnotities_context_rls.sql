-- SAM&ZO migration: contextgebonden RLS voor begeleidingsnotities.
-- Begeleidingsnotities zijn geen Documenten, geen Tijdlijn en geen Tags.
-- Geen DELETE-policy: archiveren loopt via status/archived_at.

create or replace function app_private.begeleidingsnotitie_context_is_valid(
  target_moment_id uuid,
  target_lijst_id uuid,
  target_taak_id uuid,
  target_zichtbaar_voor_roltype public.momentrol_type
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    (
      ((target_moment_id is not null)::int
      + (target_lijst_id is not null)::int
      + (target_taak_id is not null)::int) = 1
    )
    and (
      target_zichtbaar_voor_roltype is null
      or (
        target_moment_id is not null
        and target_lijst_id is null
        and target_taak_id is null
      )
    );
$$;

create or replace function app_private.begeleidingsnotitie_betrokken_profiel_allowed(
  target_profiel_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    target_profiel_id is null
    or app_private.is_systeembeheerder()
    or target_profiel_id = app_private.current_profiel_id()
    or app_private.has_profieltoegang(target_profiel_id);
$$;

create or replace function app_private.begeleidingsnotitie_context_is_visible(
  target_moment_id uuid,
  target_lijst_id uuid,
  target_taak_id uuid,
  target_zichtbaar_voor_roltype public.momentrol_type
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    app_private.begeleidingsnotitie_context_is_valid(
      target_moment_id,
      target_lijst_id,
      target_taak_id,
      target_zichtbaar_voor_roltype
    )
    and (
      (
        target_moment_id is not null
        and app_private.can_view_moment(target_moment_id)
      )
      or (
        target_lijst_id is not null
        and app_private.can_view_lijst(target_lijst_id)
      )
      or (
        target_taak_id is not null
        and exists (
          select 1
          from public.taken t
          where t.id = target_taak_id
            and t.archived_at is null
            and app_private.can_view_lijst(t.lijst_id)
        )
      )
    );
$$;

create or replace function app_private.current_profiel_has_active_momentrol(
  target_moment_id uuid,
  target_roltype public.momentrol_type
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.momentrollen mr
    join public.rolbezettingen rb on rb.momentrol_id = mr.id
    where mr.moment_id = target_moment_id
      and mr.roltype = target_roltype
      and mr.status not in ('geannuleerd', 'gearchiveerd')
      and rb.profiel_id = app_private.current_profiel_id()
      and rb.status = 'actief'
  );
$$;

create or replace function app_private.can_manage_begeleidingsnotitie_moment(
  target_moment_id uuid
)
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
        m.eigenaar_profiel_id = app_private.current_profiel_id()
        or m.created_by_persoon_id = app_private.current_persoon_id()
        or (
          app_private.is_medewerker()
          and app_private.current_profiel_has_active_momentrol(
            m.id,
            'organisator'
          )
        )
      )
  );
$$;

create or replace function app_private.can_manage_begeleidingsnotitie_context(
  target_moment_id uuid,
  target_lijst_id uuid,
  target_taak_id uuid,
  target_betrokken_profiel_id uuid,
  target_zichtbaar_voor_roltype public.momentrol_type
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    app_private.current_persoon_id() is not null
    and app_private.begeleidingsnotitie_context_is_valid(
      target_moment_id,
      target_lijst_id,
      target_taak_id,
      target_zichtbaar_voor_roltype
    )
    and (
      app_private.is_systeembeheerder()
      or (
        coalesce(app_private.current_systeemrol() <> 'gast', false)
        and app_private.begeleidingsnotitie_betrokken_profiel_allowed(
          target_betrokken_profiel_id
        )
        and (
          (
            target_moment_id is not null
            and app_private.can_manage_begeleidingsnotitie_moment(
              target_moment_id
            )
          )
          or (
            app_private.is_medewerker()
            and app_private.begeleidingsnotitie_context_is_visible(
              target_moment_id,
              target_lijst_id,
              target_taak_id,
              target_zichtbaar_voor_roltype
            )
          )
        )
      )
    );
$$;

create or replace function app_private.can_view_begeleidingsnotitie(
  target_notitie_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.begeleidingsnotities bn
    where bn.id = target_notitie_id
      and bn.status <> 'gearchiveerd'
      and app_private.begeleidingsnotitie_context_is_valid(
        bn.moment_id,
        bn.lijst_id,
        bn.taak_id,
        bn.zichtbaar_voor_roltype
      )
      and (
        app_private.can_manage_begeleidingsnotitie_context(
          bn.moment_id,
          bn.lijst_id,
          bn.taak_id,
          bn.betrokken_profiel_id,
          bn.zichtbaar_voor_roltype
        )
        or (
          coalesce(app_private.current_systeemrol() <> 'gast', false)
          and bn.moment_id is not null
          and bn.zichtbaar_voor_roltype is not null
          and app_private.begeleidingsnotitie_betrokken_profiel_allowed(
            bn.betrokken_profiel_id
          )
          and app_private.current_profiel_has_active_momentrol(
            bn.moment_id,
            bn.zichtbaar_voor_roltype
          )
        )
      )
  );
$$;

create or replace function app_private.guard_begeleidingsnotitie_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not app_private.begeleidingsnotitie_context_is_valid(
    new.moment_id,
    new.lijst_id,
    new.taak_id,
    new.zichtbaar_voor_roltype
  ) then
    raise exception 'Ongeldige begeleidingsnotitie-context.';
  end if;

  if new.created_at is distinct from old.created_at
    or new.created_by_persoon_id is distinct from old.created_by_persoon_id
  then
    raise exception 'Aanmaken-metadata van begeleidingsnotities mag niet wijzigen.';
  end if;

  if not app_private.is_systeembeheerder()
    and (
      new.moment_id is distinct from old.moment_id
      or new.lijst_id is distinct from old.lijst_id
      or new.taak_id is distinct from old.taak_id
      or new.betrokken_profiel_id is distinct from old.betrokken_profiel_id
      or new.zichtbaar_voor_roltype is distinct from old.zichtbaar_voor_roltype
    )
  then
    raise exception 'Begeleidingsnotities mogen niet naar een andere context worden verplaatst.';
  end if;

  if old.status = 'gearchiveerd'
    and not app_private.is_systeembeheerder()
  then
    raise exception 'Gearchiveerde begeleidingsnotities zijn alleen door systeembeheer te wijzigen.';
  end if;

  if new.inhoud is distinct from old.inhoud
    or new.status is distinct from old.status
    or new.archived_at is distinct from old.archived_at
    or new.archived_by_persoon_id is distinct from old.archived_by_persoon_id
  then
    if new.updated_by_persoon_id is distinct from app_private.current_persoon_id()
      or new.updated_at is null
    then
      raise exception 'Wijzigingen aan begeleidingsnotities moeten de huidige persoon als bewerker vastleggen.';
    end if;
  end if;

  if new.status = 'gearchiveerd'
    and (
      new.archived_at is null
      or new.archived_by_persoon_id is distinct from app_private.current_persoon_id()
    )
  then
    raise exception 'Archiveren vereist archived_at en archived_by_persoon_id voor de huidige persoon.';
  end if;

  if new.status <> 'gearchiveerd'
    and (
      new.archived_at is not null
      or new.archived_by_persoon_id is not null
    )
  then
    raise exception 'Archiveervelden mogen alleen gevuld zijn bij status gearchiveerd.';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'begeleidingsnotities_roltype_alleen_moment_context'
      and conrelid = 'public.begeleidingsnotities'::regclass
  ) then
    alter table public.begeleidingsnotities
      add constraint begeleidingsnotities_roltype_alleen_moment_context
      check (
        zichtbaar_voor_roltype is null
        or (
          moment_id is not null
          and lijst_id is null
          and taak_id is null
        )
      )
      not valid;
  end if;
end $$;

alter table public.begeleidingsnotities
  validate constraint begeleidingsnotities_roltype_alleen_moment_context;

drop trigger if exists begeleidingsnotities_guard_update
on public.begeleidingsnotities;

create trigger begeleidingsnotities_guard_update
before update on public.begeleidingsnotities
for each row
execute function app_private.guard_begeleidingsnotitie_update();

drop policy if exists begeleidingsnotities_select_systeembeheerder
on public.begeleidingsnotities;
drop policy if exists begeleidingsnotities_insert_systeembeheerder
on public.begeleidingsnotities;
drop policy if exists begeleidingsnotities_update_systeembeheerder
on public.begeleidingsnotities;

drop policy if exists begeleidingsnotities_select_context_bound
on public.begeleidingsnotities;
create policy begeleidingsnotities_select_context_bound
on public.begeleidingsnotities
for select
to authenticated
using (
  app_private.can_view_begeleidingsnotitie(id)
);

drop policy if exists begeleidingsnotities_insert_context_bound
on public.begeleidingsnotities;
create policy begeleidingsnotities_insert_context_bound
on public.begeleidingsnotities
for insert
to authenticated
with check (
  app_private.can_manage_begeleidingsnotitie_context(
    moment_id,
    lijst_id,
    taak_id,
    betrokken_profiel_id,
    zichtbaar_voor_roltype
  )
  and created_by_persoon_id = app_private.current_persoon_id()
  and status = 'actief'
  and archived_at is null
  and archived_by_persoon_id is null
);

drop policy if exists begeleidingsnotities_update_context_bound
on public.begeleidingsnotities;
create policy begeleidingsnotities_update_context_bound
on public.begeleidingsnotities
for update
to authenticated
using (
  app_private.can_manage_begeleidingsnotitie_context(
    moment_id,
    lijst_id,
    taak_id,
    betrokken_profiel_id,
    zichtbaar_voor_roltype
  )
)
with check (
  app_private.can_manage_begeleidingsnotitie_context(
    moment_id,
    lijst_id,
    taak_id,
    betrokken_profiel_id,
    zichtbaar_voor_roltype
  )
  and updated_by_persoon_id = app_private.current_persoon_id()
  and updated_at is not null
);

revoke all on function app_private.begeleidingsnotitie_context_is_valid(
  uuid,
  uuid,
  uuid,
  public.momentrol_type
) from public;
revoke all on function app_private.begeleidingsnotitie_betrokken_profiel_allowed(uuid) from public;
revoke all on function app_private.begeleidingsnotitie_context_is_visible(
  uuid,
  uuid,
  uuid,
  public.momentrol_type
) from public;
revoke all on function app_private.current_profiel_has_active_momentrol(
  uuid,
  public.momentrol_type
) from public;
revoke all on function app_private.can_manage_begeleidingsnotitie_moment(uuid) from public;
revoke all on function app_private.can_manage_begeleidingsnotitie_context(
  uuid,
  uuid,
  uuid,
  uuid,
  public.momentrol_type
) from public;
revoke all on function app_private.can_view_begeleidingsnotitie(uuid) from public;
revoke all on function app_private.guard_begeleidingsnotitie_update() from public;

grant execute on function app_private.begeleidingsnotitie_context_is_valid(
  uuid,
  uuid,
  uuid,
  public.momentrol_type
) to authenticated;
grant execute on function app_private.begeleidingsnotitie_betrokken_profiel_allowed(uuid) to authenticated;
grant execute on function app_private.begeleidingsnotitie_context_is_visible(
  uuid,
  uuid,
  uuid,
  public.momentrol_type
) to authenticated;
grant execute on function app_private.current_profiel_has_active_momentrol(
  uuid,
  public.momentrol_type
) to authenticated;
grant execute on function app_private.can_manage_begeleidingsnotitie_moment(uuid) to authenticated;
grant execute on function app_private.can_manage_begeleidingsnotitie_context(
  uuid,
  uuid,
  uuid,
  uuid,
  public.momentrol_type
) to authenticated;
grant execute on function app_private.can_view_begeleidingsnotitie(uuid) to authenticated;
