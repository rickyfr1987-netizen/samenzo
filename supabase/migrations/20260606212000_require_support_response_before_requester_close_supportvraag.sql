-- SAM&ZO migration 021: vraag sluiting door aanvrager pas na supportantwoord.
-- Doel: verzoekers mogen een supportvraag naar 'gesloten' zetten
-- alleen als er bewijs is van een supportreactie.

begin;

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
    and (
      status <> 'gesloten'
      or exists (
        select 1
        from public.supportvraag_reacties sr
        where sr.supportvraag_id = id
          and sr.is_support_antwoord = true
      )
    )
  )
);

commit;
