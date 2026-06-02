-- SAM&ZO migration: prevent role claims while the current profile has a
-- current non-active deelname for the same moment.
-- This narrows the existing rolbezettingen insert policy; it does not add
-- service-role behavior, admin override behavior, or proposal handling.

drop policy if exists rolbezettingen_insert_geen_blokkerende_deelname
on public.rolbezettingen;

create policy rolbezettingen_insert_geen_blokkerende_deelname
on public.rolbezettingen
as restrictive
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'actief'
  and not exists (
    select 1
    from public.momentrollen mr
    join public.deelnames d on d.moment_id = mr.moment_id
    where mr.id = rolbezettingen.momentrol_id
      and d.profiel_id = rolbezettingen.profiel_id
      and d.profiel_id = app_private.current_profiel_id()
      and d.archived_at is null
      and d.status in (
        'voorgesteld',
        'uitgenodigd',
        'wachtlijst',
        'afgemeld',
        'geweigerd',
        'geannuleerd',
        'verlopen'
      )
  )
);
