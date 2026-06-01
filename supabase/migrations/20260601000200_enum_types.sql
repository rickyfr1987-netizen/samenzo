-- SAM&ZO migration 002: enumtypes voor de MVP-basis.
-- Doel: alleen vaste Postgres enumtypes uit het logisch schema en SQL v0.2.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen tabellen, indexes, functies, policies of seeddata.
-- Tags krijgen bewust geen enum of rechtenbetekenis.
-- Begeleidingsnotities krijgen geen categorie-enum en gebruiken geen documentstatus.

do $$ begin
  create type systeemrol_type as enum (
    'gast',
    'lid',
    'medewerker',
    'systeemondersteuner',
    'systeembeheerder'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type account_status as enum (
    'uitgenodigd',
    'actief',
    'gedeactiveerd',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type profiel_status as enum (
    'actief',
    'verborgen',
    'gedeactiveerd',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type profieltoegang_status as enum (
    'aangevraagd',
    'actief',
    'geweigerd',
    'ingetrokken',
    'verlopen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type groep_status as enum (
    'actief',
    'verborgen',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type groep_zichtbaarheid_type as enum (
    'zichtbaar',
    'verborgen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type categorie_entiteit_type as enum (
    'moment',
    'lijst',
    'document',
    'doel',
    'tijdlijnbericht',
    'signaal'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type categorie_status as enum (
    'concept',
    'actief',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type moment_status as enum (
    'concept',
    'gepland',
    'open',
    'vol',
    'gewijzigd',
    'geannuleerd',
    'afgerond',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type deelname_status as enum (
    'voorgesteld',
    'uitgenodigd',
    'geaccepteerd',
    'ingeschreven',
    'afgemeld',
    'geweigerd',
    'wachtlijst',
    'geannuleerd',
    'verlopen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type momentrol_type as enum (
    'deelnemer',
    'uitvoerder',
    'ondersteuner',
    'begeleider',
    'organisator'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type momentrol_status as enum (
    'open',
    'gevuld',
    'incompleet',
    'geannuleerd',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type rolbezetting_status as enum (
    'actief',
    'afgemeld',
    'vervangen',
    'geannuleerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type beschikbaarheid_type as enum (
    'beschikbaar',
    'niet_beschikbaar'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type beschikbaarheid_status as enum (
    'actief',
    'verlopen',
    'ingetrokken',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lijst_status as enum (
    'open',
    'bezig',
    'afgerond',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type taak_status as enum (
    'open',
    'voorgesteld',
    'geaccepteerd',
    'bezig',
    'afgerond',
    'geweigerd',
    'overgedragen',
    'vervallen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type taakuitvoerder_status as enum (
    'voorgesteld',
    'actief',
    'geweigerd',
    'afgerond',
    'overgedragen',
    'vervallen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type document_status as enum (
    'concept',
    'gepubliceerd',
    'vervangen',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type begeleidingsnotitie_status as enum (
    'actief',
    'bewerkt',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type doel_status as enum (
    'actief',
    'onder_de_aandacht',
    'gepauzeerd',
    'afgerond',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type doelacceptatie_status as enum (
    'voorgesteld',
    'geaccepteerd',
    'geweigerd',
    'later_bekijken',
    'verlopen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type voorstel_status as enum (
    'open',
    'geaccepteerd',
    'geweigerd',
    'later_bekijken',
    'verlopen',
    'ingetrokken',
    'afgehandeld'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type voorstel_type as enum (
    'deelname_aan_moment',
    'uitnodiging_moment',
    'taak',
    'doel',
    'document_onder_de_aandacht',
    'persoonlijk_moment'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tijdlijnbericht_type as enum (
    'algemeen_bericht',
    'voorstel',
    'uitnodiging',
    'melding',
    'urgent_signaal',
    'supportvraag',
    'open_rol',
    'document_onder_de_aandacht',
    'wijziging_annulering'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tijdlijnbericht_status as enum (
    'nieuw',
    'gelezen',
    'actie_nodig',
    'afgehandeld',
    'gesloten',
    'verlopen',
    'ingetrokken',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type supportvraag_status as enum (
    'nieuw',
    'in_behandeling',
    'actie_nodig',
    'afgehandeld',
    'gesloten'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type signaal_niveau as enum (
    'informatief',
    'aandacht_nodig',
    'actie_nodig',
    'urgent',
    'escalatie'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type signaal_status as enum (
    'nieuw',
    'zichtbaar',
    'actie_nodig',
    'afgehandeld',
    'verlopen',
    'gearchiveerd'
  );
exception when duplicate_object then null;
end $$;
