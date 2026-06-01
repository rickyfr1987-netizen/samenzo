-- SAM&ZO migration 015: RLS slice 3 voor voorstellen, tijdlijn, support en signalen.
-- Doel: conservatieve policies voor persoonlijke regie, aandacht en lichte supportcommunicatie.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, helperfuncties, seeddata, triggers, RPC's of delete-policies.
-- Voorstellen beschermen persoonlijke regie: accepteren, weigeren en intrekken volgen later via gecontroleerde statusworkflow/RPC.
-- Tijdlijnberichten, signalen, voorstellen en generieke gekoppelde items zijn geen toegangsbewijs.
-- Support loopt via Tijdlijn, maar Tijdlijn is geen chat, ticketmodule, threadlaag of rechtenbron.

-- Voorstellen
drop policy if exists voorstellen_select_betrokken_of_beheer on public.voorstellen;
create policy voorstellen_select_betrokken_of_beheer
on public.voorstellen
for select
to authenticated
using (
  ontvangend_profiel_id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(ontvangend_profiel_id)
  or voorgesteld_door_persoon_id = app_private.current_persoon_id()
  or voorgesteld_vanuit_profiel_id = app_private.current_profiel_id()
  or app_private.is_systeembeheerder()
);

drop policy if exists voorstellen_insert_open_betrokken_of_beheer on public.voorstellen;
create policy voorstellen_insert_open_betrokken_of_beheer
on public.voorstellen
for insert
to authenticated
with check (
  status = 'open'
  and voorgesteld_door_persoon_id = app_private.current_persoon_id()
  and geaccepteerd_at is null
  and geweigerd_at is null
  and ingetrokken_at is null
  and (
    ontvangend_profiel_id = app_private.current_profiel_id()
    or app_private.has_profieltoegang(ontvangend_profiel_id)
    or app_private.is_systeembeheerder()
  )
  and (
    voorgesteld_vanuit_profiel_id is null
    or voorgesteld_vanuit_profiel_id = app_private.current_profiel_id()
    or app_private.is_systeembeheerder()
  )
);

-- Supportvragen
drop policy if exists supportvragen_select_context_of_support on public.supportvragen;
create policy supportvragen_select_context_of_support
on public.supportvragen
for select
to authenticated
using (
  aangemaakt_door_persoon_id = app_private.current_persoon_id()
  or aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(aangemaakt_vanuit_profiel_id)
  or app_private.is_systeemondersteuner()
);

drop policy if exists supportvragen_insert_eigen_profiel_nieuw on public.supportvragen;
create policy supportvragen_insert_eigen_profiel_nieuw
on public.supportvragen
for insert
to authenticated
with check (
  aangemaakt_door_persoon_id = app_private.current_persoon_id()
  and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  and status = 'nieuw'
  and toegewezen_aan_persoon_id is null
  and behandeld_door_persoon_id is null
  and afgehandeld_at is null
  and gesloten_at is null
);

drop policy if exists supportvragen_update_support on public.supportvragen;
create policy supportvragen_update_support
on public.supportvragen
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
)
with check (
  app_private.is_systeemondersteuner()
);

-- Signalen
drop policy if exists signalen_select_ontvanger_of_support on public.signalen;
create policy signalen_select_ontvanger_of_support
on public.signalen
for select
to authenticated
using (
  gericht_aan_profiel_id = app_private.current_profiel_id()
  or (
    gericht_aan_groep_id is not null
    and app_private.current_profiel_is_lid_van_groep(gericht_aan_groep_id)
  )
  or app_private.is_systeemondersteuner()
);

drop policy if exists signalen_insert_support on public.signalen;
create policy signalen_insert_support
on public.signalen
for insert
to authenticated
with check (
  app_private.is_systeemondersteuner()
);

drop policy if exists signalen_update_support on public.signalen;
create policy signalen_update_support
on public.signalen
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
)
with check (
  app_private.is_systeemondersteuner()
);

-- Tijdlijnberichten
drop policy if exists tijdlijnberichten_select_ontvanger_afzender_of_support on public.tijdlijnberichten;
create policy tijdlijnberichten_select_ontvanger_afzender_of_support
on public.tijdlijnberichten
for select
to authenticated
using (
  gericht_aan_profiel_id = app_private.current_profiel_id()
  or (
    gericht_aan_groep_id is not null
    and app_private.current_profiel_is_lid_van_groep(gericht_aan_groep_id)
  )
  or afzender_persoon_id = app_private.current_persoon_id()
  or app_private.is_systeemondersteuner()
);

drop policy if exists tijdlijnberichten_insert_support on public.tijdlijnberichten;
create policy tijdlijnberichten_insert_support
on public.tijdlijnberichten
for insert
to authenticated
with check (
  app_private.is_systeemondersteuner()
  and (
    afzender_persoon_id is null
    or afzender_persoon_id = app_private.current_persoon_id()
    or app_private.is_systeembeheerder()
  )
);

drop policy if exists tijdlijnberichten_update_support on public.tijdlijnberichten;
create policy tijdlijnberichten_update_support
on public.tijdlijnberichten
for update
to authenticated
using (
  app_private.is_systeemondersteuner()
)
with check (
  app_private.is_systeemondersteuner()
);

-- Notificatiestatussen
drop policy if exists notificatiestatussen_select_eigen_profiel_of_beheer on public.notificatiestatussen;
create policy notificatiestatussen_select_eigen_profiel_of_beheer
on public.notificatiestatussen
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.is_systeembeheerder()
);

drop policy if exists notificatiestatussen_insert_eigen_profiel on public.notificatiestatussen;
create policy notificatiestatussen_insert_eigen_profiel
on public.notificatiestatussen
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
);

drop policy if exists notificatiestatussen_update_eigen_profiel on public.notificatiestatussen;
create policy notificatiestatussen_update_eigen_profiel
on public.notificatiestatussen
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
)
with check (
  profiel_id = app_private.current_profiel_id()
);
