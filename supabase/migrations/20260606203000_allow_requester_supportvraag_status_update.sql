-- SAM&ZO migration 019: supportvragen statusupdates vanuit supportreactie.
-- Doel: veilige heropening/sluiting door verzoeker binnen eigen supportvraagcontext.

begin;

drop policy if exists supportvragen_update_requester_response_or_close on public.supportvragen;
create policy supportvragen_update_requester_response_or_close
on public.supportvragen
for update
to authenticated
using (
  aangemaakt_door_persoon_id = app_private.current_persoon_id()
  and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
)
with check (
  (status = 'actie_nodig' and behandeld_door_persoon_id = app_private.current_persoon_id())
  or (status = 'gesloten' and behandeld_door_persoon_id = app_private.current_persoon_id())
);

commit;
