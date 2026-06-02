-- SAM&ZO migration 020: RLS updatepolicy voor voorstellen (antwoord-acties).
-- Doel: alleen ontvangers (of met juiste rechten) kunnen voorstelstatussen verder zetten.
-- Beperk actief tot acties op nog open voorstellen (bijv. accepteren/afwijzen via UI).

drop policy if exists voorstellen_update_status_bij_ontvanger on public.voorstellen;
create policy voorstellen_update_status_bij_ontvanger
on public.voorstellen
for update
to authenticated
using (
  status = 'open'
  and (
    ontvangend_profiel_id = app_private.current_profiel_id()
    or app_private.has_profieltoegang(ontvangend_profiel_id)
    or app_private.is_systeembeheerder()
    or app_private.is_systeemondersteuner()
  )
)
with check (
  (
    status in ('open', 'geaccepteerd', 'geweigerd', 'later_bekijken', 'verlopen')
  )
  and (
    ontvangend_profiel_id = app_private.current_profiel_id()
    or app_private.has_profieltoegang(ontvangend_profiel_id)
    or app_private.is_systeembeheerder()
    or app_private.is_systeemondersteuner()
  )
);
