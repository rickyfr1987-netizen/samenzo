-- SAM&ZO migration 020: herstel supportvraag-statusupdates via steun- en verzoekerpad.
-- Doel: support blijft verantwoordelijk voor behandelingsstappen,
-- verzoekers behouden beperkte updaterechten op hun eigen supportvraag.

begin;

drop policy if exists supportvragen_update_requester_response_or_close on public.supportvragen;
drop policy if exists supportvragen_update_support on public.supportvragen;

drop policy if exists supportvragen_update_support_and_requester on public.supportvragen;
create policy supportvragen_update_support_and_requester
on public.supportvragen
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
  or (
    aangemaakt_door_persoon_id = app_private.current_persoon_id()
    and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  )
)
with check (
  (
    app_private.is_systeemondersteuner()
    and status in ('in_behandeling', 'actie_nodig', 'afgehandeld', 'gesloten')
  )
  or (
    aangemaakt_door_persoon_id = app_private.current_persoon_id()
    and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
    and status in ('actie_nodig', 'gesloten')
  )
);

commit;
