-- SAM&ZO Fase 2 Stap 2G: minimale RLS voor doelacceptaties.
-- Doelacceptaties raken persoonlijke werkelijkheid. Deze migratie opent alleen
-- het eigen-profiel pad en bouwt geen aanmaakflow, RPC of doelenkaart.

drop policy if exists doelacceptaties_select_eigen_profiel on public.doelacceptaties;
create policy doelacceptaties_select_eigen_profiel
on public.doelacceptaties
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and app_private.can_view_doel(doel_id)
);

drop policy if exists doelacceptaties_update_eigen_voorgesteld on public.doelacceptaties;
create policy doelacceptaties_update_eigen_voorgesteld
on public.doelacceptaties
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and app_private.can_view_doel(doel_id)
  and status = 'voorgesteld'
)
with check (
  profiel_id = app_private.current_profiel_id()
  and app_private.can_view_doel(doel_id)
  and (
    (
      status = 'geaccepteerd'
      and geaccepteerd_at is not null
      and geweigerd_at is null
      and later_bekijken_at is null
    )
    or (
      status = 'geweigerd'
      and geaccepteerd_at is null
      and geweigerd_at is not null
      and later_bekijken_at is null
    )
    or (
      status = 'later_bekijken'
      and geaccepteerd_at is null
      and geweigerd_at is null
      and later_bekijken_at is not null
    )
  )
);
