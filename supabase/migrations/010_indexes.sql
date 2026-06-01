-- SAM&ZO migration 010: performance- en integriteitsindexes.
-- Doel: indexes toevoegen voor RLS-performance, profiel/groep-zichtbaarheid, actieve unieke relaties en veelgebruikte filters.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, RLS, policies, helperfuncties, seeddata, triggers of RPC's.
-- Indexes bepalen geen rechten. Ze ondersteunen alleen performance en relationele integriteit.
-- Tags, tijdlijnkoppelingen, signaalkoppelingen en documentkoppelingen blijven geen toegangsbewijs.
-- Begeleidingsnotitie-indexes zijn alleen performance; zichtbaarheid moet later via strenge RLS.

-- 1. Identiteit, profiel en groepen
create index if not exists profieltoegangen_persoon_status_idx
  on profieltoegangen (persoon_id, status);

create index if not exists profieltoegangen_profiel_status_idx
  on profieltoegangen (profiel_id, status);

create unique index if not exists profieltoegangen_actief_uniek_idx
  on profieltoegangen (persoon_id, profiel_id)
  where status = 'actief';

create index if not exists groepslidmaatschappen_profiel_status_idx
  on groepslidmaatschappen (profiel_id, status);

create index if not exists groepslidmaatschappen_groep_status_idx
  on groepslidmaatschappen (groep_id, status);

create unique index if not exists groepslidmaatschappen_actief_uniek_idx
  on groepslidmaatschappen (groep_id, profiel_id)
  where status = 'actief';

create index if not exists groepsrollen_groep_profiel_idx
  on groepsrollen (groep_id, profiel_id);

-- 2. Categorieen
create index if not exists categorieen_entiteit_status_idx
  on categorieen (entiteit_type, status);

-- 3. Momenten, deelname, rollen en beschikbaarheid
create index if not exists momenten_start_at_idx
  on momenten (start_at);

create index if not exists momenten_status_idx
  on momenten (status);

create index if not exists momenten_categorie_status_idx
  on momenten (categorie_id, status);

create index if not exists momenten_eigenaar_profiel_idx
  on momenten (eigenaar_profiel_id);

create index if not exists momenten_eigenaar_groep_idx
  on momenten (eigenaar_groep_id);

create index if not exists momenten_gasttoegang_status_idx
  on momenten (gasttoegang, status);

create index if not exists moment_groepen_groep_moment_idx
  on moment_groepen (groep_id, moment_id);

create index if not exists deelnames_profiel_status_idx
  on deelnames (profiel_id, status);

create index if not exists deelnames_moment_status_idx
  on deelnames (moment_id, status);

create unique index if not exists deelnames_actief_uniek_idx
  on deelnames (moment_id, profiel_id)
  where status in ('voorgesteld', 'uitgenodigd', 'geaccepteerd', 'ingeschreven', 'wachtlijst');

create index if not exists momentrollen_moment_status_idx
  on momentrollen (moment_id, status);

create index if not exists momentrollen_roltype_status_idx
  on momentrollen (roltype, status);

create index if not exists rolbezettingen_profiel_status_idx
  on rolbezettingen (profiel_id, status);

create index if not exists rolbezettingen_momentrol_status_idx
  on rolbezettingen (momentrol_id, status);

create unique index if not exists rolbezettingen_actief_uniek_idx
  on rolbezettingen (momentrol_id, profiel_id)
  where status = 'actief';

create index if not exists beschikbaarheden_profiel_status_idx
  on beschikbaarheden (profiel_id, status);

create index if not exists beschikbaarheden_start_eind_idx
  on beschikbaarheden (start_at, eind_at);

-- 4. Doelen, lijsten en taken
create index if not exists doelen_eigenaar_profiel_status_idx
  on doelen (eigenaar_profiel_id, status);

create index if not exists doelen_eigenaar_groep_status_idx
  on doelen (eigenaar_groep_id, status);

create index if not exists doelacceptaties_profiel_status_idx
  on doelacceptaties (profiel_id, status);

create index if not exists doelacceptaties_doel_status_idx
  on doelacceptaties (doel_id, status);

create unique index if not exists doelacceptaties_actief_uniek_idx
  on doelacceptaties (doel_id, profiel_id)
  where status in ('voorgesteld', 'geaccepteerd', 'later_bekijken');

create index if not exists doel_koppelingen_type_id_idx
  on doel_koppelingen (gekoppeld_type, gekoppeld_id);

create index if not exists lijsten_eigenaar_profiel_status_idx
  on lijsten (eigenaar_profiel_id, status);

create index if not exists lijsten_eigenaar_groep_status_idx
  on lijsten (eigenaar_groep_id, status);

create index if not exists lijsten_gekoppeld_moment_idx
  on lijsten (gekoppeld_moment_id);

create index if not exists lijsten_gekoppeld_doel_idx
  on lijsten (gekoppeld_doel_id);

create index if not exists lijst_groepen_groep_lijst_idx
  on lijst_groepen (groep_id, lijst_id);

create index if not exists taken_lijst_status_idx
  on taken (lijst_id, status);

create index if not exists taken_deadline_at_idx
  on taken (deadline_at);

create index if not exists taakuitvoerders_profiel_status_idx
  on taakuitvoerders (profiel_id, status);

create index if not exists taakuitvoerders_taak_status_idx
  on taakuitvoerders (taak_id, status);

create unique index if not exists taakuitvoerders_actief_uniek_idx
  on taakuitvoerders (taak_id, profiel_id)
  where status in ('voorgesteld', 'actief');

-- 5. Documenten en begeleidingsnotities
create index if not exists documenten_eigenaar_profiel_status_idx
  on documenten (eigenaar_profiel_id, status);

create index if not exists documenten_eigenaar_groep_status_idx
  on documenten (eigenaar_groep_id, status);

create index if not exists documenten_categorie_status_idx
  on documenten (categorie_id, status);

create index if not exists document_groepen_groep_document_idx
  on document_groepen (groep_id, document_id);

create index if not exists document_koppelingen_type_id_idx
  on document_koppelingen (gekoppeld_type, gekoppeld_id);

create index if not exists begeleidingsnotities_moment_status_idx
  on begeleidingsnotities (moment_id, status);

create index if not exists begeleidingsnotities_lijst_status_idx
  on begeleidingsnotities (lijst_id, status);

create index if not exists begeleidingsnotities_taak_status_idx
  on begeleidingsnotities (taak_id, status);

create index if not exists begeleidingsnotities_betrokken_profiel_status_idx
  on begeleidingsnotities (betrokken_profiel_id, status);

-- 6. Voorstellen, tijdlijn, support, signalen en notificatiestatussen
create index if not exists voorstellen_ontvangend_profiel_status_idx
  on voorstellen (ontvangend_profiel_id, status);

create index if not exists voorstellen_voorgesteld_door_persoon_idx
  on voorstellen (voorgesteld_door_persoon_id);

create index if not exists voorstellen_type_id_idx
  on voorstellen (gekoppeld_type, gekoppeld_id);

create index if not exists supportvragen_status_idx
  on supportvragen (status);

create index if not exists supportvragen_aangemaakt_vanuit_profiel_status_idx
  on supportvragen (aangemaakt_vanuit_profiel_id, status);

create index if not exists signalen_gericht_profiel_status_idx
  on signalen (gericht_aan_profiel_id, status);

create index if not exists signalen_gericht_groep_status_idx
  on signalen (gericht_aan_groep_id, status);

create index if not exists signalen_type_id_idx
  on signalen (gekoppeld_type, gekoppeld_id);

create index if not exists tijdlijnberichten_gericht_profiel_status_idx
  on tijdlijnberichten (gericht_aan_profiel_id, status);

create index if not exists tijdlijnberichten_gericht_groep_status_idx
  on tijdlijnberichten (gericht_aan_groep_id, status);

create index if not exists tijdlijnberichten_created_at_idx
  on tijdlijnberichten (created_at);

create index if not exists tijdlijnberichten_voorstel_idx
  on tijdlijnberichten (voorstel_id);

create index if not exists tijdlijnberichten_supportvraag_idx
  on tijdlijnberichten (supportvraag_id);

create index if not exists tijdlijnberichten_signaal_idx
  on tijdlijnberichten (signaal_id);

create index if not exists notificatiestatussen_profiel_status_idx
  on notificatiestatussen (profiel_id, status);

create index if not exists notificatiestatussen_tijdlijnbericht_idx
  on notificatiestatussen (tijdlijnbericht_id);

create unique index if not exists notificatiestatussen_tijdlijn_profiel_uniek_idx
  on notificatiestatussen (tijdlijnbericht_id, profiel_id);

-- 7. Tags en templates
create index if not exists tag_koppelingen_tag_idx
  on tag_koppelingen (tag_id);

create index if not exists tag_koppelingen_type_id_idx
  on tag_koppelingen (gekoppeld_type, gekoppeld_id);

create index if not exists templates_categorie_status_idx
  on templates (categorie_id, status);

create index if not exists templates_entiteit_status_idx
  on templates (entiteit_type, status);
