-- SAM&ZO migration: first safe task claim/release action.
-- Taakuitvoerders remain one current state row per taak/profiel. This does
-- not add completing, editing, deleting, reset, or admin override behavior.

with ranked_taakuitvoerders as (
  select
    id,
    row_number() over (
      partition by taak_id, profiel_id
      order by
        case status
          when 'actief' then 1
          when 'voorgesteld' then 2
          when 'afgerond' then 3
          when 'overgedragen' then 4
          when 'geweigerd' then 5
          when 'vervallen' then 6
          else 99
        end,
        coalesce(updated_at, geclaimd_at, afgerond_at, created_at) desc,
        id
    ) as rn
  from public.taakuitvoerders
)
delete from public.taakuitvoerders tu
using ranked_taakuitvoerders ranked
where tu.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists taakuitvoerders_taak_profiel_uniek_idx
  on public.taakuitvoerders (taak_id, profiel_id);

revoke insert, update, delete on public.taakuitvoerders from anon, authenticated;

grant insert (
  taak_id,
  profiel_id,
  status,
  geclaimd_door_persoon_id,
  geclaimd_at,
  updated_at
) on public.taakuitvoerders to authenticated;

grant update (
  status,
  geclaimd_door_persoon_id,
  geclaimd_at,
  afgerond_at,
  updated_at
) on public.taakuitvoerders to authenticated;

drop policy if exists taakuitvoerders_insert_eigen_claim on public.taakuitvoerders;
create policy taakuitvoerders_insert_eigen_claim
on public.taakuitvoerders
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'actief'
  and geclaimd_door_persoon_id = app_private.current_persoon_id()
  and geclaimd_at is not null
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = taakuitvoerders.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.taken t
    where t.id = taakuitvoerders.taak_id
      and t.archived_at is null
      and t.status in ('open', 'geaccepteerd', 'bezig')
      and app_private.can_view_lijst(t.lijst_id)
  )
  and not exists (
    select 1
    from public.taakuitvoerders existing
    where existing.taak_id = taakuitvoerders.taak_id
      and existing.status = 'actief'
  )
);

drop policy if exists taakuitvoerders_update_eigen_claim_of_vrijgeven on public.taakuitvoerders;
create policy taakuitvoerders_update_eigen_claim_of_vrijgeven
on public.taakuitvoerders
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and status in ('actief', 'vervallen')
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = taakuitvoerders.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.taken t
    where t.id = taakuitvoerders.taak_id
      and t.archived_at is null
      and app_private.can_view_lijst(t.lijst_id)
  )
)
with check (
  profiel_id = app_private.current_profiel_id()
  and updated_at is not null
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = taakuitvoerders.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and (
    (
      status = 'actief'
      and geclaimd_door_persoon_id = app_private.current_persoon_id()
      and geclaimd_at is not null
      and afgerond_at is null
      and exists (
        select 1
        from public.taken t
        where t.id = taakuitvoerders.taak_id
          and t.archived_at is null
          and t.status in ('open', 'geaccepteerd', 'bezig')
          and app_private.can_view_lijst(t.lijst_id)
      )
      and not exists (
        select 1
        from public.taakuitvoerders existing
        where existing.taak_id = taakuitvoerders.taak_id
          and existing.status = 'actief'
          and existing.id <> taakuitvoerders.id
      )
    )
    or
    (
      status = 'vervallen'
      and geclaimd_door_persoon_id is null
      and geclaimd_at is null
      and afgerond_at is null
      and exists (
        select 1
        from public.taken t
        where t.id = taakuitvoerders.taak_id
          and t.archived_at is null
          and app_private.can_view_lijst(t.lijst_id)
      )
    )
  )
);
