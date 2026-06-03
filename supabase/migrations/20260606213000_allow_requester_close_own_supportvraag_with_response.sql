-- SAM&ZO: requester mag eigen supportvraag als opgelost markeren na supportantwoord.
-- Doel: smalle aanvulling op de bestaande supportvragen-updatepolicy.
-- Geen service_role, geen brede statusupdates, geen rechten voor andere profielen.

begin;

drop policy if exists supportvragen_update_requester_close_own_with_response
on public.supportvragen;

create policy supportvragen_update_requester_close_own_with_response
on public.supportvragen
for update
to authenticated
using (
  aangemaakt_door_persoon_id = app_private.current_persoon_id()
  and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  and exists (
    select 1
    from public.supportvraag_reacties sr
    where sr.supportvraag_id = public.supportvragen.id
      and sr.is_support_antwoord = true
  )
)
with check (
  aangemaakt_door_persoon_id = app_private.current_persoon_id()
  and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  and status = 'gesloten'
  and exists (
    select 1
    from public.supportvraag_reacties sr
    where sr.supportvraag_id = public.supportvragen.id
      and sr.is_support_antwoord = true
  )
);

commit;
