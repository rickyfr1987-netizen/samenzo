-- ============================================================
-- SAM&ZO Supabase SQL-migratie v0.2
-- Doel: eerste MVP-basis voor schema, constraints, indexes en RLS-start
-- Status: aangescherpte conceptmigratie na SQL-review
-- Let op: dit bestand is bedoeld als eerste technische basis, maar nog niet als definitieve productie-migratie.
-- Belangrijk: Supabase-migrations worden normaal één keer uitgevoerd. Dit script gebruikt deels IF NOT EXISTS,
-- maar create policy en sommige ALTER TABLE constraints zijn niet volledig rerun-safe zonder voorafgaande DROP POLICY/constraint-checks.
-- ============================================================

-- ============================================================
-- 0. Reviewconclusies v0.2
-- ============================================================

-- Deze v0.2 verwerkt de belangrijkste reviewpunten op v0.1:
--
-- 1. Het schema is logisch compleet genoeg voor de MVP-basis, maar nog te breed als directe productiemigratie.
-- 2. RLS staat terecht vroeg aan, maar sommige policies zijn bewust nog ruim en moeten per slice worden aangescherpt.
-- 3. De helperfuncties zijn noodzakelijk, maar security definer-functies vragen extra review bij echte productie.
-- 4. Policies rond momenten, deelnemers en rollen zijn richtinggevend, maar organisatorrechten zijn nog te grof.
-- 5. Policies voor documenten, lijsten, doelen en koppeltabellen zijn nog niet volledig uitgewerkt.
-- 6. Begeleidingsnotities zijn terecht apart gezet, maar de select-policy is in v0.1 nog te breed: medewerkerstatus alleen is niet genoeg.
-- 7. Voorstelacceptatie vraagt later een RPC/functie, zodat acceptatie en onderliggende statuswijziging atomair gebeuren.
-- 8. Directe client-updates op gevoelige statusvelden moeten later worden vervangen door gecontroleerde RPC’s.
-- 9. De migratie moet vóór uitvoering worden gesplitst in meerdere migrations: types, schema, functies, RLS, seeddata.
-- 10. SQL v0.2 blijft dus een technische blauwdruk, geen finale copy-paste productiefile.

-- ============================================================
-- 0b. Extensions
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Enumtypes
-- ============================================================

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

-- ============================================================
-- 2. Tabellencluster A - identiteit en profiel
-- ============================================================

create table if not exists personen (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  accountnaam text,
  systeemrol systeemrol_type not null default 'lid',
  status account_status not null default 'uitgenodigd',
  laatst_actief_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists profielen (
  id uuid primary key default gen_random_uuid(),
  persoon_id uuid unique references personen(id) on delete set null,
  weergavenaam text not null,
  avatar_url text,
  kennismakingstekst text,
  status profiel_status not null default 'actief',
  zichtbaar_voor_leden boolean not null default true,
  zichtbaar_voor_gasten boolean not null default false,
  contactgegevens_zichtbaar boolean not null default false,
  telefoon text,
  email_contact text,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id)
);

create table if not exists profielinstellingen (
  id uuid primary key default gen_random_uuid(),
  profiel_id uuid unique not null references profielen(id) on delete cascade,
  notificatie_voorkeuren jsonb,
  toegankelijkheids_voorkeuren jsonb,
  default_startscherm text not null default 'mijn_dag',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists profieltoegangen (
  id uuid primary key default gen_random_uuid(),
  persoon_id uuid not null references personen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  toegangstype text not null default 'meekijken',
  status profieltoegang_status not null default 'actief',
  verleend_door_persoon_id uuid references personen(id),
  verleend_at timestamptz,
  ingetrokken_at timestamptz,
  ingetrokken_door_persoon_id uuid references personen(id),
  supportvraag_id uuid null,
  created_at timestamptz not null default now(),
  constraint profieltoegangen_niet_eigen_profiel check (true)
);

create unique index if not exists profieltoegangen_actief_uniek
  on profieltoegangen (persoon_id, profiel_id)
  where status = 'actief';

-- ============================================================
-- 3. Tabellencluster B - groepen en lidmaatschap
-- ============================================================

create table if not exists groepen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  beschrijving text,
  zichtbaarheid groep_zichtbaarheid_type not null default 'zichtbaar',
  groepstype text,
  status groep_status not null default 'actief',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id)
);

create table if not exists groepslidmaatschappen (
  id uuid primary key default gen_random_uuid(),
  groep_id uuid not null references groepen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status text not null default 'actief',
  toegevoegd_door_persoon_id uuid references personen(id),
  toegevoegd_at timestamptz not null default now(),
  verwijderd_at timestamptz
);

create unique index if not exists groepslidmaatschappen_actief_uniek
  on groepslidmaatschappen (groep_id, profiel_id)
  where status = 'actief';

create table if not exists groepsrollen (
  id uuid primary key default gen_random_uuid(),
  groep_id uuid not null references groepen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  rolnaam text not null,
  icoon text,
  zichtbaar boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. Tabellencluster C - categorieën en configuratie
-- ============================================================

create table if not exists categorieen (
  id uuid primary key default gen_random_uuid(),
  entiteit_type categorie_entiteit_type not null,
  naam text not null,
  beschrijving text,
  icoon text,
  kleur text,
  status categorie_status not null default 'actief',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id)
);

create unique index if not exists categorieen_actief_naam_uniek
  on categorieen (entiteit_type, lower(naam))
  where status = 'actief';

create table if not exists categorie_configuraties (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid unique not null references categorieen(id) on delete cascade,
  zichtbare_velden jsonb not null default '[]'::jsonb,
  verplichte_velden jsonb not null default '[]'::jsonb,
  optionele_velden jsonb not null default '[]'::jsonb,
  toegestane_acties jsonb not null default '[]'::jsonb,
  toegestane_statussen jsonb not null default '[]'::jsonb,
  relevante_momentrollen jsonb not null default '[]'::jsonb,
  signalen jsonb not null default '[]'::jsonb,
  gasttoegang_mogelijk boolean not null default false,
  inschrijving_mogelijk boolean not null default false,
  uitnodigingen_mogelijk boolean not null default false,
  capaciteit_mogelijk boolean not null default false,
  beschikbaarheid_checken boolean not null default false,
  open_rol_escalatie_mogelijk boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ============================================================
-- 5. Tabellencluster D - momenten, deelname en rollen
-- ============================================================

create table if not exists momenten (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  titel text not null,
  beschrijving text,
  datum date,
  starttijd time,
  eindtijd time,
  locatie text,
  status moment_status not null default 'concept',
  capaciteit_totaal integer,
  inschrijving_open boolean not null default false,
  inschrijfdeadline timestamptz,
  gasttoegang boolean not null default false,
  zichtbaar_vanaf timestamptz,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint momenten_exact_een_eigenaar check (
    (eigenaar_profiel_id is not null and eigenaar_groep_id is null)
    or
    (eigenaar_profiel_id is null and eigenaar_groep_id is not null)
  ),
  constraint momenten_tijd_volgorde check (
    starttijd is null or eindtijd is null or eindtijd > starttijd
  ),
  constraint momenten_capaciteit_check check (
    capaciteit_totaal is null or capaciteit_totaal >= 0
  )
);

create table if not exists moment_groepen (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references momenten(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  contexttype text,
  created_at timestamptz not null default now(),
  unique (moment_id, groep_id)
);

create table if not exists deelnames (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references momenten(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status deelname_status not null default 'voorgesteld',
  deelname_type text default 'deelnemer',
  aangemaakt_door_persoon_id uuid references personen(id),
  aangemaakt_vanuit_profiel_id uuid references profielen(id),
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  afgemeld_at timestamptz,
  voorstel_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index if not exists deelnames_actief_uniek
  on deelnames (moment_id, profiel_id)
  where status in ('voorgesteld', 'uitgenodigd', 'geaccepteerd', 'ingeschreven', 'wachtlijst');

create table if not exists momentrollen (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references momenten(id) on delete cascade,
  roltype momentrol_type not null,
  rolduiding text,
  minimum_aantal integer not null default 0,
  maximum_aantal integer,
  zichtbaar_voor_groep_id uuid references groepen(id),
  verplicht_voor_doorgang boolean not null default false,
  escalatie_tijdstip timestamptz,
  status momentrol_status not null default 'open',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  constraint momentrollen_aantallen_check check (
    minimum_aantal >= 0
    and (maximum_aantal is null or maximum_aantal >= minimum_aantal)
  )
);

create table if not exists rolbezettingen (
  id uuid primary key default gen_random_uuid(),
  momentrol_id uuid not null references momentrollen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status rolbezetting_status not null default 'actief',
  geclaimd_door_persoon_id uuid references personen(id),
  geclaimd_at timestamptz not null default now(),
  afgemeld_at timestamptz,
  vervangen_door_rolbezetting_id uuid references rolbezettingen(id)
);

create unique index if not exists rolbezettingen_actief_uniek
  on rolbezettingen (momentrol_id, profiel_id)
  where status = 'actief';

create table if not exists beschikbaarheden (
  id uuid primary key default gen_random_uuid(),
  profiel_id uuid not null references profielen(id) on delete cascade,
  type beschikbaarheid_type not null,
  datum date not null,
  starttijd time,
  eindtijd time,
  reden_label text,
  zichtbaarheid text not null default 'beperkt',
  status beschikbaarheid_status not null default 'actief',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  constraint beschikbaarheden_tijd_check check (
    starttijd is null or eindtijd is null or eindtijd > starttijd
  )
);

-- ============================================================
-- 6. Tabellencluster E - doelen, lijsten en taken
-- Doelen staan vóór lijsten zodat lijsten optioneel naar doelen kunnen verwijzen.
-- ============================================================

create table if not exists doelen (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  titel text not null,
  beschrijving text,
  status doel_status not null default 'actief',
  startdatum date,
  einddatum date,
  voortgang_type text,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint doelen_exact_een_eigenaar check (
    (eigenaar_profiel_id is not null and eigenaar_groep_id is null)
    or
    (eigenaar_profiel_id is null and eigenaar_groep_id is not null)
  ),
  constraint doelen_datums_check check (
    startdatum is null or einddatum is null or einddatum >= startdatum
  )
);

create table if not exists lijsten (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  titel text not null,
  beschrijving text,
  status lijst_status not null default 'open',
  gekoppeld_moment_id uuid references momenten(id),
  gekoppeld_doel_id uuid references doelen(id),
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint lijsten_exact_een_eigenaar check (
    (eigenaar_profiel_id is not null and eigenaar_groep_id is null)
    or
    (eigenaar_profiel_id is null and eigenaar_groep_id is not null)
  )
);

create table if not exists lijst_groepen (
  id uuid primary key default gen_random_uuid(),
  lijst_id uuid not null references lijsten(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  contexttype text,
  created_at timestamptz not null default now(),
  unique (lijst_id, groep_id)
);

create table if not exists taken (
  id uuid primary key default gen_random_uuid(),
  lijst_id uuid not null references lijsten(id) on delete cascade,
  titel text not null,
  beschrijving text,
  type text not null default 'taak',
  datum date,
  starttijd time,
  eindtijd time,
  status taak_status not null default 'open',
  volgorde integer,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  constraint taken_tijd_check check (
    starttijd is null or eindtijd is null or eindtijd > starttijd
  )
);

create table if not exists taakuitvoerders (
  id uuid primary key default gen_random_uuid(),
  taak_id uuid not null references taken(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  rol_in_taak text,
  status taakuitvoerder_status not null default 'actief',
  voorstel_id uuid null,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  afgerond_at timestamptz
);

create unique index if not exists taakuitvoerders_actief_uniek
  on taakuitvoerders (taak_id, profiel_id)
  where status in ('voorgesteld', 'actief');

-- ============================================================
-- 7. Tabellencluster F - documenten en begeleidingsnotities
-- ============================================================

create table if not exists documenten (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  titel text not null,
  inhoud text not null,
  status document_status not null default 'concept',
  publicatiedatum timestamptz,
  vervangen_door_document_id uuid references documenten(id),
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint documenten_exact_een_eigenaar check (
    (eigenaar_profiel_id is not null and eigenaar_groep_id is null)
    or
    (eigenaar_profiel_id is null and eigenaar_groep_id is not null)
  )
);

create table if not exists document_groepen (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documenten(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  contexttype text,
  created_at timestamptz not null default now(),
  unique (document_id, groep_id)
);

create table if not exists document_koppelingen (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documenten(id) on delete cascade,
  moment_id uuid references momenten(id) on delete cascade,
  lijst_id uuid references lijsten(id) on delete cascade,
  doel_id uuid references doelen(id) on delete cascade,
  contexttype text,
  created_at timestamptz not null default now(),
  constraint document_koppelingen_exact_een_context check (
    ((moment_id is not null)::int + (lijst_id is not null)::int + (doel_id is not null)::int) = 1
  )
);

create table if not exists begeleidingsnotities (
  id uuid primary key default gen_random_uuid(),
  tekst text not null,
  moment_id uuid references momenten(id) on delete cascade,
  lijst_id uuid references lijsten(id) on delete cascade,
  taak_id uuid references taken(id) on delete cascade,
  deelname_id uuid references deelnames(id) on delete cascade,
  rolbezetting_id uuid references rolbezettingen(id) on delete cascade,
  zichtbaar_voor_medewerkers boolean not null default true,
  zichtbaar_voor_momentrol_types jsonb not null default '[]'::jsonb,
  status begeleidingsnotitie_status not null default 'actief',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint begeleidingsnotities_exact_een_context check (
    ((moment_id is not null)::int + (lijst_id is not null)::int + (taak_id is not null)::int + (deelname_id is not null)::int + (rolbezetting_id is not null)::int) = 1
  )
);

-- ============================================================
-- 8. Tabellencluster G - doelrelaties
-- ============================================================

create table if not exists doel_groepen (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  contexttype text,
  created_at timestamptz not null default now(),
  unique (doel_id, groep_id)
);

create table if not exists doel_koppelingen (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  moment_id uuid references momenten(id) on delete cascade,
  lijst_id uuid references lijsten(id) on delete cascade,
  document_id uuid references documenten(id) on delete cascade,
  contexttype text,
  created_at timestamptz not null default now(),
  constraint doel_koppelingen_exact_een_context check (
    ((moment_id is not null)::int + (lijst_id is not null)::int + (document_id is not null)::int) = 1
  )
);

create table if not exists doel_groepsvoorstellen (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  rapportage_groep_id uuid references groepen(id),
  anonieme_rapportage_gevraagd boolean not null default false,
  status text not null default 'actief',
  voorgesteld_door_persoon_id uuid references personen(id),
  created_at timestamptz not null default now()
);

create table if not exists doelacceptaties (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  voorstel_id uuid null,
  status doelacceptatie_status not null default 'voorgesteld',
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists doelacceptaties_actief_uniek
  on doelacceptaties (doel_id, profiel_id)
  where status in ('voorgesteld', 'geaccepteerd', 'later_bekijken');

create table if not exists rapportage_toestemmingen (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  rapportage_groep_id uuid not null references groepen(id) on delete cascade,
  toestemming_gegeven boolean not null default false,
  toestemming_at timestamptz,
  ingetrokken_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. Tabellencluster H - voorstellen, tijdlijn, support en signalen
-- Sommige FK's naar voorstellen/support/signalen worden later wederzijds gekoppeld.
-- ============================================================

create table if not exists voorstellen (
  id uuid primary key default gen_random_uuid(),
  ontvanger_profiel_id uuid not null references profielen(id) on delete cascade,
  voorgesteld_door_persoon_id uuid not null references personen(id),
  voorgesteld_vanuit_profiel_id uuid references profielen(id),
  type voorstel_type not null,
  status voorstel_status not null default 'open',
  deelname_id uuid references deelnames(id) on delete cascade,
  taakuitvoerder_id uuid references taakuitvoerders(id) on delete cascade,
  doelacceptatie_id uuid references doelacceptaties(id) on delete cascade,
  document_id uuid references documenten(id) on delete cascade,
  persoonlijk_moment_id uuid references momenten(id) on delete cascade,
  titel text,
  toelichting text,
  created_at timestamptz not null default now(),
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  verloopt_at timestamptz,
  afgehandeld_at timestamptz,
  constraint voorstellen_exact_een_koppeling check (
    ((deelname_id is not null)::int + (taakuitvoerder_id is not null)::int + (doelacceptatie_id is not null)::int + (document_id is not null)::int + (persoonlijk_moment_id is not null)::int) = 1
  )
);

alter table deelnames
  add constraint deelnames_voorstel_fk
  foreign key (voorstel_id) references voorstellen(id)
  deferrable initially deferred;

alter table taakuitvoerders
  add constraint taakuitvoerders_voorstel_fk
  foreign key (voorstel_id) references voorstellen(id)
  deferrable initially deferred;

alter table doelacceptaties
  add constraint doelacceptaties_voorstel_fk
  foreign key (voorstel_id) references voorstellen(id)
  deferrable initially deferred;

create table if not exists supportvragen (
  id uuid primary key default gen_random_uuid(),
  vraagsteller_profiel_id uuid not null references profielen(id) on delete cascade,
  vraagsteller_persoon_id uuid references personen(id),
  tekst text not null,
  status supportvraag_status not null default 'nieuw',
  behandeld_door_persoon_id uuid references personen(id),
  moment_id uuid references momenten(id),
  lijst_id uuid references lijsten(id),
  document_id uuid references documenten(id),
  doel_id uuid references doelen(id),
  profiel_id uuid references profielen(id),
  created_at timestamptz not null default now(),
  gesloten_at timestamptz
);

alter table profieltoegangen
  add constraint profieltoegangen_supportvraag_fk
  foreign key (supportvraag_id) references supportvragen(id)
  deferrable initially deferred;

create table if not exists signalen (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  niveau signaal_niveau not null default 'informatief',
  status signaal_status not null default 'nieuw',
  doelgroep_profiel_id uuid references profielen(id),
  doelgroep_groep_id uuid references groepen(id),
  moment_id uuid references momenten(id),
  momentrol_id uuid references momentrollen(id),
  taak_id uuid references taken(id),
  voorstel_id uuid references voorstellen(id),
  zichtbaar_vanaf timestamptz,
  verloopt_at timestamptz,
  created_at timestamptz not null default now(),
  constraint signalen_doelgroep_check check (
    doelgroep_profiel_id is not null or doelgroep_groep_id is not null
  )
);

create table if not exists tijdlijnberichten (
  id uuid primary key default gen_random_uuid(),
  type tijdlijnbericht_type not null,
  afzender_persoon_id uuid references personen(id),
  afzender_profiel_id uuid references profielen(id),
  doelgroep_profiel_id uuid references profielen(id),
  doelgroep_groep_id uuid references groepen(id),
  titel text not null,
  tekst text,
  status tijdlijnbericht_status not null default 'nieuw',
  urgentie signaal_niveau default 'informatief',
  voorstel_id uuid references voorstellen(id),
  supportvraag_id uuid references supportvragen(id),
  signaal_id uuid references signalen(id),
  moment_id uuid references momenten(id),
  lijst_id uuid references lijsten(id),
  document_id uuid references documenten(id),
  doel_id uuid references doelen(id),
  created_at timestamptz not null default now(),
  constraint tijdlijn_doelgroep_check check (
    doelgroep_profiel_id is not null or doelgroep_groep_id is not null
  )
);

create table if not exists notificatiestatussen (
  id uuid primary key default gen_random_uuid(),
  profiel_id uuid not null references profielen(id) on delete cascade,
  tijdlijnbericht_id uuid references tijdlijnberichten(id) on delete cascade,
  signaal_id uuid references signalen(id) on delete cascade,
  gelezen_at timestamptz,
  afgehandeld_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notificatiestatus_exact_een_context check (
    ((tijdlijnbericht_id is not null)::int + (signaal_id is not null)::int) = 1
  )
);

create unique index if not exists notificatiestatus_tijdlijn_uniek
  on notificatiestatussen (profiel_id, tijdlijnbericht_id)
  where tijdlijnbericht_id is not null;

create unique index if not exists notificatiestatus_signaal_uniek
  on notificatiestatussen (profiel_id, signaal_id)
  where signaal_id is not null;

-- ============================================================
-- 10. Tabellencluster I - tags en templates
-- ============================================================

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  naam text not null unique,
  kleur text,
  omschrijving text,
  status text not null default 'actief',
  created_at timestamptz not null default now()
);

create table if not exists tag_koppelingen (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  moment_id uuid references momenten(id) on delete cascade,
  lijst_id uuid references lijsten(id) on delete cascade,
  document_id uuid references documenten(id) on delete cascade,
  doel_id uuid references doelen(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint tag_koppelingen_exact_een_item check (
    ((moment_id is not null)::int + (lijst_id is not null)::int + (document_id is not null)::int + (doel_id is not null)::int) = 1
  )
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  entiteit_type categorie_entiteit_type not null,
  categorie_id uuid references categorieen(id),
  standaardwaarden jsonb not null default '{}'::jsonb,
  status text not null default 'actief',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id)
);

-- ============================================================
-- 11. Indexes
-- ============================================================

create index if not exists personen_auth_user_id_idx on personen(auth_user_id);
create index if not exists personen_systeemrol_idx on personen(systeemrol);
create index if not exists profielen_persoon_id_idx on profielen(persoon_id);
create index if not exists profielen_status_idx on profielen(status);
create index if not exists profieltoegangen_persoon_status_idx on profieltoegangen(persoon_id, status);
create index if not exists profieltoegangen_profiel_status_idx on profieltoegangen(profiel_id, status);

create index if not exists groepen_status_zichtbaarheid_idx on groepen(status, zichtbaarheid);
create index if not exists groepslidmaatschappen_profiel_status_idx on groepslidmaatschappen(profiel_id, status);
create index if not exists groepslidmaatschappen_groep_status_idx on groepslidmaatschappen(groep_id, status);

create index if not exists categorieen_entiteit_status_idx on categorieen(entiteit_type, status);

create index if not exists momenten_categorie_status_idx on momenten(categorie_id, status);
create index if not exists momenten_datum_starttijd_idx on momenten(datum, starttijd);
create index if not exists momenten_eigenaar_profiel_idx on momenten(eigenaar_profiel_id);
create index if not exists momenten_eigenaar_groep_idx on momenten(eigenaar_groep_id);
create index if not exists moment_groepen_groep_moment_idx on moment_groepen(groep_id, moment_id);
create index if not exists deelnames_profiel_status_idx on deelnames(profiel_id, status);
create index if not exists deelnames_moment_status_idx on deelnames(moment_id, status);
create index if not exists momentrollen_moment_status_idx on momentrollen(moment_id, status);
create index if not exists rolbezettingen_profiel_status_idx on rolbezettingen(profiel_id, status);
create index if not exists rolbezettingen_momentrol_status_idx on rolbezettingen(momentrol_id, status);
create index if not exists beschikbaarheden_profiel_datum_idx on beschikbaarheden(profiel_id, datum, status);

create index if not exists lijsten_eigenaar_profiel_status_idx on lijsten(eigenaar_profiel_id, status);
create index if not exists lijsten_eigenaar_groep_status_idx on lijsten(eigenaar_groep_id, status);
create index if not exists lijst_groepen_groep_lijst_idx on lijst_groepen(groep_id, lijst_id);
create index if not exists taken_lijst_status_idx on taken(lijst_id, status);
create index if not exists taken_datum_status_idx on taken(datum, status);
create index if not exists taakuitvoerders_profiel_status_idx on taakuitvoerders(profiel_id, status);
create index if not exists taakuitvoerders_taak_status_idx on taakuitvoerders(taak_id, status);

create index if not exists document_groepen_groep_document_idx on document_groepen(groep_id, document_id);
create index if not exists documenten_categorie_status_idx on documenten(categorie_id, status);
create index if not exists document_koppelingen_moment_idx on document_koppelingen(moment_id);
create index if not exists document_koppelingen_lijst_idx on document_koppelingen(lijst_id);
create index if not exists document_koppelingen_doel_idx on document_koppelingen(doel_id);
create index if not exists begeleidingsnotities_moment_idx on begeleidingsnotities(moment_id) where moment_id is not null;
create index if not exists begeleidingsnotities_taak_idx on begeleidingsnotities(taak_id) where taak_id is not null;

create index if not exists doelen_eigenaar_profiel_status_idx on doelen(eigenaar_profiel_id, status);
create index if not exists doelen_eigenaar_groep_status_idx on doelen(eigenaar_groep_id, status);
create index if not exists doelacceptaties_profiel_status_idx on doelacceptaties(profiel_id, status);
create index if not exists doel_groepen_groep_doel_idx on doel_groepen(groep_id, doel_id);

create index if not exists voorstellen_ontvanger_status_idx on voorstellen(ontvanger_profiel_id, status);
create index if not exists tijdlijnberichten_profiel_status_created_idx on tijdlijnberichten(doelgroep_profiel_id, status, created_at desc);
create index if not exists tijdlijnberichten_groep_status_created_idx on tijdlijnberichten(doelgroep_groep_id, status, created_at desc);
create index if not exists supportvragen_status_created_idx on supportvragen(status, created_at desc);
create index if not exists signalen_status_niveau_idx on signalen(status, niveau, zichtbaar_vanaf);

-- ============================================================
-- 12. Helperfuncties voor RLS
-- ============================================================

-- Review v0.2:
-- Deze helperfuncties zijn nuttig, maar in productie moeten we controleren:
-- - eigenaar van de functies;
-- - search_path;
-- - execute-rechten;
-- - of security definer niet onbedoeld te veel omzeilt;
-- - of functies geen recursieve RLS-problemen veroorzaken.
--
-- Aanbevolen productierichting:
-- 1. Plaats helperfuncties eventueel in schema `private` of `app_private`.
-- 2. Geef alleen execute aan authenticated waar nodig.
-- 3. Houd functies klein en read-only.
-- 4. Gebruik RPC’s voor gevoelige statusovergangen zoals voorstel accepteren.

create or replace function current_persoon_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from personen p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function current_profiel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pr.id
  from profielen pr
  join personen p on p.id = pr.persoon_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function current_systeemrol()
returns systeemrol_type
language sql
stable
security definer
set search_path = public
as $$
  select p.systeemrol
  from personen p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function is_systeembeheerder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_systeemrol() = 'systeembeheerder', false);
$$;

create or replace function is_systeemondersteuner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_systeemrol() in ('systeemondersteuner', 'systeembeheerder'), false);
$$;

create or replace function is_medewerker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_systeemrol() in ('medewerker', 'systeemondersteuner', 'systeembeheerder'), false);
$$;

create or replace function is_eigen_profiel(target_profiel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_profiel_id() = target_profiel_id, false);
$$;

create or replace function has_profieltoegang(target_profiel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profieltoegangen pt
    where pt.persoon_id = current_persoon_id()
      and pt.profiel_id = target_profiel_id
      and pt.status = 'actief'
  );
$$;

create or replace function profiel_is_lid_van_groep(target_profiel_id uuid, target_groep_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from groepslidmaatschappen gl
    where gl.profiel_id = target_profiel_id
      and gl.groep_id = target_groep_id
      and gl.status = 'actief'
  );
$$;

create or replace function current_profiel_is_lid_van_groep(target_groep_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select profiel_is_lid_van_groep(current_profiel_id(), target_groep_id);
$$;

create or replace function can_view_moment(target_moment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from momenten m
    where m.id = target_moment_id
      and (
        is_systeemondersteuner()
        or m.eigenaar_profiel_id = current_profiel_id()
        or (m.eigenaar_groep_id is not null and current_profiel_is_lid_van_groep(m.eigenaar_groep_id))
        or exists (
          select 1 from moment_groepen mg
          where mg.moment_id = m.id
            and current_profiel_is_lid_van_groep(mg.groep_id)
        )
        or exists (
          select 1 from deelnames d
          where d.moment_id = m.id
            and d.profiel_id = current_profiel_id()
            and d.status in ('voorgesteld', 'uitgenodigd', 'geaccepteerd', 'ingeschreven', 'wachtlijst')
        )
        or exists (
          select 1
          from momentrollen mr
          join rolbezettingen rb on rb.momentrol_id = mr.id
          where mr.moment_id = m.id
            and rb.profiel_id = current_profiel_id()
            and rb.status = 'actief'
        )
        or (
          current_systeemrol() = 'gast'
          and m.gasttoegang = true
          and exists (
            select 1 from moment_groepen mg
            where mg.moment_id = m.id
              and current_profiel_is_lid_van_groep(mg.groep_id)
          )
        )
      )
  );
$$;

-- ============================================================
-- 13. RLS inschakelen
-- ============================================================

alter table personen enable row level security;
alter table profielen enable row level security;
alter table profielinstellingen enable row level security;
alter table profieltoegangen enable row level security;
alter table groepen enable row level security;
alter table groepslidmaatschappen enable row level security;
alter table groepsrollen enable row level security;
alter table categorieen enable row level security;
alter table categorie_configuraties enable row level security;
alter table momenten enable row level security;
alter table moment_groepen enable row level security;
alter table deelnames enable row level security;
alter table momentrollen enable row level security;
alter table rolbezettingen enable row level security;
alter table beschikbaarheden enable row level security;
alter table doelen enable row level security;
alter table lijsten enable row level security;
alter table lijst_groepen enable row level security;
alter table taken enable row level security;
alter table taakuitvoerders enable row level security;
alter table documenten enable row level security;
alter table document_groepen enable row level security;
alter table document_koppelingen enable row level security;
alter table begeleidingsnotities enable row level security;
alter table doel_groepen enable row level security;
alter table doel_koppelingen enable row level security;
alter table doel_groepsvoorstellen enable row level security;
alter table doelacceptaties enable row level security;
alter table rapportage_toestemmingen enable row level security;
alter table voorstellen enable row level security;
alter table supportvragen enable row level security;
alter table signalen enable row level security;
alter table tijdlijnberichten enable row level security;
alter table notificatiestatussen enable row level security;
alter table tags enable row level security;
alter table tag_koppelingen enable row level security;
alter table templates enable row level security;

-- ============================================================
-- 14. Basispolicies slice 1 - Personen, Profielen, Groepen
-- Deze policies zijn bewust minimaal. Verdere verfijning volgt in RLS v0.2.
-- ============================================================

-- Personen
create policy personen_select_eigen_of_beheer
on personen for select
using (
  id = current_persoon_id()
  or is_systeembeheerder()
);

create policy personen_update_eigen_beperkt_of_beheer
on personen for update
using (
  id = current_persoon_id()
  or is_systeembeheerder()
)
with check (
  id = current_persoon_id()
  or is_systeembeheerder()
);

-- Review v0.2:
-- Deze policy is functioneel te breed voor productie, omdat PostgreSQL RLS geen kolomniveau afdwingt.
-- Een gewone gebruiker zou via deze policy mogelijk velden kunnen wijzigen die alleen beheer mag wijzigen,
-- zoals systeemrol of status, tenzij de API-laag dit blokkeert.
--
-- Aanscherping voor echte migratie:
-- - gewone gebruikers wijzigen eigen accountvelden via een RPC of aparte update-route;
-- - systeemrol/status alleen via beheer-RPC;
-- - overweeg aparte tabel voor publieke accountvelden of gebruik column privileges.

-- Profielen
create policy profielen_select_basis
on profielen for select
using (
  persoon_id = current_persoon_id()
  or has_profieltoegang(id)
  or is_systeemondersteuner()
  or (
    zichtbaar_voor_leden = true
    and current_systeemrol() in ('lid', 'medewerker', 'systeemondersteuner', 'systeembeheerder')
  )
  or (
    zichtbaar_voor_gasten = true
    and current_systeemrol() = 'gast'
  )
);

create policy profielen_update_eigen_of_beheer
on profielen for update
using (
  persoon_id = current_persoon_id()
  or is_systeembeheerder()
)
with check (
  persoon_id = current_persoon_id()
  or is_systeembeheerder()
);

-- Review v0.2:
-- Ook deze update-policy is voor productie te breed als gewone gebruikers alle kolommen kunnen wijzigen.
-- Profieleigenaar mag bijvoorbeeld wel kennismakingstekst, avatar en contactzichtbaarheid wijzigen,
-- maar niet zomaar status, persoon_id, archivevelden of beheergerelateerde velden.
--
-- Aanscherping voor echte migratie:
-- - profielupdates door gebruiker via RPC `update_eigen_profiel(...)`;
-- - beheerupdates via aparte RPC;
-- - of column privileges strikt instellen.

-- Profieltoegangen
create policy profieltoegangen_select_betrokken
on profieltoegangen for select
using (
  persoon_id = current_persoon_id()
  or is_eigen_profiel(profiel_id)
  or is_systeemondersteuner()
);

create policy profieltoegangen_insert_beheer
on profieltoegangen for insert
with check (
  is_systeemondersteuner()
);

create policy profieltoegangen_update_betrokken_of_beheer
on profieltoegangen for update
using (
  is_eigen_profiel(profiel_id)
  or is_systeemondersteuner()
)
with check (
  is_eigen_profiel(profiel_id)
  or is_systeemondersteuner()
);

-- Groepen
create policy groepen_select_basis
on groepen for select
using (
  status = 'actief'
  and (
    zichtbaarheid = 'zichtbaar'
    or is_systeemondersteuner()
    or exists (
      select 1 from groepslidmaatschappen gl
      where gl.groep_id = groepen.id
        and gl.profiel_id = current_profiel_id()
        and gl.status = 'actief'
    )
  )
);

create policy groepen_insert_systeembeheerder
on groepen for insert
with check (is_systeembeheerder());

create policy groepen_update_systeembeheerder
on groepen for update
using (is_systeembeheerder())
with check (is_systeembeheerder());

-- Groepslidmaatschappen
create policy groepslidmaatschappen_select_basis
on groepslidmaatschappen for select
using (
  profiel_id = current_profiel_id()
  or is_systeemondersteuner()
  or current_profiel_is_lid_van_groep(groep_id)
);

create policy groepslidmaatschappen_insert_ondersteuner_of_beheerder
on groepslidmaatschappen for insert
with check (is_systeemondersteuner());

create policy groepslidmaatschappen_update_ondersteuner_of_beheerder
on groepslidmaatschappen for update
using (is_systeemondersteuner())
with check (is_systeemondersteuner());

-- Categorieën
create policy categorieen_select_actief_of_beheer
on categorieen for select
using (
  status = 'actief'
  or is_systeembeheerder()
);

create policy categorieen_insert_beheerder
on categorieen for insert
with check (is_systeembeheerder());

create policy categorieen_update_beheerder
on categorieen for update
using (is_systeembeheerder())
with check (is_systeembeheerder());

create policy categorie_configuraties_select
on categorie_configuraties for select
using (
  is_systeembeheerder()
  or exists (
    select 1 from categorieen c
    where c.id = categorie_configuraties.categorie_id
      and c.status = 'actief'
  )
);

create policy categorie_configuraties_insert_beheerder
on categorie_configuraties for insert
with check (is_systeembeheerder());

create policy categorie_configuraties_update_beheerder
on categorie_configuraties for update
using (is_systeembeheerder())
with check (is_systeembeheerder());

-- ============================================================
-- 15. Basispolicies slice 2 - Momenten, deelname en rollen
-- ============================================================

create policy momenten_select_can_view
on momenten for select
using (can_view_moment(id));

create policy momenten_insert_beheer_of_eigenaar
on momenten for insert
with check (
  is_systeemondersteuner()
  or eigenaar_profiel_id = current_profiel_id()
  or (eigenaar_groep_id is not null and current_profiel_is_lid_van_groep(eigenaar_groep_id))
);

-- Review v0.2:
-- Deze insert-policy is bewust ruim voor conceptfase.
-- Alleen groepslidmaatschap is waarschijnlijk onvoldoende om namens een Groep een Moment te maken.
-- In het functionele model bepalen categorie, eigenaar, systeemrol en eventuele organisator-/beheerrechten dit.
--
-- Aanscherping voor echte migratie:
-- - maak helper `can_create_moment_for_groep(groep_id, categorie_id)`;
-- - gewone leden mogen niet automatisch voor elke groep Momenten aanmaken;
-- - maak eventueel aparte beheer-/organisatorrelatie als groepslidmaatschap te grof blijkt.

create policy momenten_update_beheer_of_eigenaar
on momenten for update
using (
  is_systeemondersteuner()
  or eigenaar_profiel_id = current_profiel_id()
  or (eigenaar_groep_id is not null and current_profiel_is_lid_van_groep(eigenaar_groep_id))
)
with check (
  is_systeemondersteuner()
  or eigenaar_profiel_id = current_profiel_id()
  or (eigenaar_groep_id is not null and current_profiel_is_lid_van_groep(eigenaar_groep_id))
);

create policy moment_groepen_select_can_view_moment
on moment_groepen for select
using (
  can_view_moment(moment_id)
  or current_profiel_is_lid_van_groep(groep_id)
  or is_systeemondersteuner()
);

create policy moment_groepen_insert_beheer
on moment_groepen for insert
with check (is_systeemondersteuner());

create policy moment_groepen_update_beheer
on moment_groepen for update
using (is_systeemondersteuner())
with check (is_systeemondersteuner());

create policy deelnames_select_betrokken
on deelnames for select
using (
  profiel_id = current_profiel_id()
  or has_profieltoegang(profiel_id)
  or is_systeemondersteuner()
  or can_view_moment(moment_id)
);

create policy deelnames_insert_eigen_of_voorstel
on deelnames for insert
with check (
  -- Eigen profiel mag directe deelname aanmaken.
  profiel_id = current_profiel_id()
  or
  -- Voor ander profiel alleen voorlopig.
  (
    has_profieltoegang(profiel_id)
    and status in ('voorgesteld', 'uitgenodigd')
  )
  or is_systeemondersteuner()
);

create policy deelnames_update_betrokken_of_beheer
on deelnames for update
using (
  profiel_id = current_profiel_id()
  or has_profieltoegang(profiel_id)
  or is_systeemondersteuner()
)
with check (
  -- Eigen profiel mag eigen status verwerken.
  profiel_id = current_profiel_id()
  or
  -- Ander profiel blijft voorlopig, tenzij systeemondersteuner/beheer expliciet corrigeert.
  (has_profieltoegang(profiel_id) and status in ('voorgesteld', 'uitgenodigd', 'geweigerd', 'verlopen'))
  or is_systeemondersteuner()
);

-- Review v0.2:
-- Deze policy is inhoudelijk in de goede richting, maar voor productie moeten gevoelige statusovergangen
-- niet via vrije table update lopen. Accepteren/weigeren moet via RPC, bijvoorbeeld:
-- - accept_voorstel(voorstel_id)
-- - weiger_voorstel(voorstel_id)
--
-- Reden:
-- Acceptatie moet tegelijk het Voorstel, de Deelname en het Tijdlijnbericht bijwerken.
-- Dat moet atomair gebeuren en niet via losse client-updates.

create policy momentrollen_select_can_view_moment
on momentrollen for select
using (can_view_moment(moment_id));

create policy momentrollen_insert_beheer
on momentrollen for insert
with check (is_systeemondersteuner() or can_view_moment(moment_id));

-- Review v0.2:
-- `can_view_moment(moment_id)` is niet streng genoeg voor insert/update van Momentrollen.
-- Iemand die een Moment kan zien, mag niet automatisch rollen toevoegen of aanpassen.
--
-- Aanscherping voor echte migratie:
-- - vervang door `can_manage_moment(moment_id)`;
-- - can_manage_moment controleert eigenaar, organisatorrecht, systeembeheerder en status;
-- - tot die helper bestaat: beperk insert/update van momentrollen tot systeemondersteuner/systeembeheerder.

create policy momentrollen_update_beheer
on momentrollen for update
using (is_systeemondersteuner() or can_view_moment(moment_id))
with check (is_systeemondersteuner() or can_view_moment(moment_id));

-- Review v0.2:
-- Zelfde aandachtspunt als hierboven: voor productie moet dit `can_manage_moment` worden,
-- niet `can_view_moment`.

create policy rolbezettingen_select_betrokken
on rolbezettingen for select
using (
  profiel_id = current_profiel_id()
  or has_profieltoegang(profiel_id)
  or is_systeemondersteuner()
  or exists (
    select 1
    from momentrollen mr
    where mr.id = rolbezettingen.momentrol_id
      and can_view_moment(mr.moment_id)
  )
);

create policy rolbezettingen_insert_eigen_claim
on rolbezettingen for insert
with check (
  profiel_id = current_profiel_id()
  and status = 'actief'
  and exists (
    select 1
    from momentrollen mr
    where mr.id = rolbezettingen.momentrol_id
      and can_view_moment(mr.moment_id)
      and mr.status in ('open', 'incompleet')
  )
);

create policy rolbezettingen_update_eigen_of_beheer
on rolbezettingen for update
using (
  profiel_id = current_profiel_id()
  or is_systeemondersteuner()
)
with check (
  profiel_id = current_profiel_id()
  or is_systeemondersteuner()
);

-- ============================================================
-- 16. Basispolicies privacygevoelig: begeleidingsnotities
-- Verdere contextchecks worden in RLS v0.2 aangescherpt.
-- ============================================================

create policy begeleidingsnotities_select_medewerker
on begeleidingsnotities for select
using (
  is_medewerker()
);

-- Review v0.2:
-- Deze policy is expres minimaal, maar voor productie te breed.
-- Medewerkerstatus alleen is onvoldoende: een medewerker mag niet automatisch alle begeleidingsnotities zien.
-- Er moet ook contexttoegang zijn tot het gekoppelde Moment, de Taak, Deelname of Rolbezetting.
--
-- Aanscherping voor echte migratie:
-- - maak helper `can_view_begeleidingsnotitie(id)`;
-- - controleer medewerkerstatus én gekoppelde context;
-- - controleer eventueel roltype via `zichtbaar_voor_momentrol_types`;
-- - gewone leden en gasten blijven altijd uitgesloten.

create policy begeleidingsnotities_insert_medewerker
on begeleidingsnotities for insert
with check (
  is_medewerker()
);

create policy begeleidingsnotities_update_medewerker
on begeleidingsnotities for update
using (is_medewerker())
with check (is_medewerker());

-- ============================================================
-- 17. Basispolicies overige tabellen: tijdelijke MVP-start
-- Deze zijn bewust beperkt of beheergericht en moeten per slice verfijnd worden.
-- ============================================================

-- Tags: zichtbaar, maar geen gedrag/rechten.
create policy tags_select_actief
on tags for select
using (status = 'actief' or is_systeembeheerder());

create policy tags_beheerder_write
on tags for all
using (is_systeembeheerder())
with check (is_systeembeheerder());

-- Templates: beheer.
create policy templates_select_beheer
on templates for select
using (is_systeembeheerder());

create policy templates_write_beheer
on templates for all
using (is_systeembeheerder())
with check (is_systeembeheerder());

-- Supportvragen: vraagsteller en support.
create policy supportvragen_select_betrokken
on supportvragen for select
using (
  vraagsteller_profiel_id = current_profiel_id()
  or is_systeemondersteuner()
);

create policy supportvragen_insert_eigen
on supportvragen for insert
with check (
  vraagsteller_profiel_id = current_profiel_id()
);

create policy supportvragen_update_support
on supportvragen for update
using (is_systeemondersteuner())
with check (is_systeemondersteuner());

-- Voorstellen: ontvanger, voorsteller beperkt en beheer.
create policy voorstellen_select_betrokken
on voorstellen for select
using (
  ontvanger_profiel_id = current_profiel_id()
  or voorgesteld_door_persoon_id = current_persoon_id()
  or is_systeemondersteuner()
);

create policy voorstellen_insert_bevoegd
on voorstellen for insert
with check (
  voorgesteld_door_persoon_id = current_persoon_id()
  or is_systeemondersteuner()
);

create policy voorstellen_update_ontvanger_of_intrekker
on voorstellen for update
using (
  ontvanger_profiel_id = current_profiel_id()
  or voorgesteld_door_persoon_id = current_persoon_id()
  or is_systeemondersteuner()
)
with check (
  ontvanger_profiel_id = current_profiel_id()
  or voorgesteld_door_persoon_id = current_persoon_id()
  or is_systeemondersteuner()
);

-- Review v0.2:
-- Deze policy is te breed voor productie, omdat voorsteller en systeemondersteuner hiermee mogelijk
-- voorstelstatus kunnen wijzigen. Functioneel mag alleen het ontvangende Profiel accepteren/weigeren.
-- De voorsteller mag hoogstens intrekken. Systeemondersteuner mag niet namens ontvanger accepteren.
--
-- Aanscherping voor echte migratie:
-- - accepteer/weiger via RPC en check `ontvanger_profiel_id = current_profiel_id()`;
-- - intrekken via aparte RPC voor `voorgesteld_door_persoon_id`;
-- - support/beheer mag administratief sluiten, maar niet inhoudelijk accepteren namens Profiel.

-- Tijdlijn: basis op doelgroep Profiel/Groep.
create policy tijdlijnberichten_select_doelgroep
on tijdlijnberichten for select
using (
  doelgroep_profiel_id = current_profiel_id()
  or (doelgroep_groep_id is not null and current_profiel_is_lid_van_groep(doelgroep_groep_id))
  or is_systeemondersteuner()
);

create policy tijdlijnberichten_insert_beheer_of_eigen
on tijdlijnberichten for insert
with check (
  afzender_persoon_id = current_persoon_id()
  or is_systeemondersteuner()
);

-- Notificatiestatus: eigen profiel.
create policy notificatiestatussen_select_eigen
on notificatiestatussen for select
using (profiel_id = current_profiel_id() or is_systeemondersteuner());

create policy notificatiestatussen_insert_eigen
on notificatiestatussen for insert
with check (profiel_id = current_profiel_id() or is_systeemondersteuner());

create policy notificatiestatussen_update_eigen
on notificatiestatussen for update
using (profiel_id = current_profiel_id() or is_systeemondersteuner())
with check (profiel_id = current_profiel_id() or is_systeemondersteuner());

-- Signalen: doelgroep Profiel/Groep.
create policy signalen_select_doelgroep
on signalen for select
using (
  doelgroep_profiel_id = current_profiel_id()
  or (doelgroep_groep_id is not null and current_profiel_is_lid_van_groep(doelgroep_groep_id))
  or is_systeemondersteuner()
);

create policy signalen_write_support
on signalen for all
using (is_systeemondersteuner())
with check (is_systeemondersteuner());

-- ============================================================
-- 18. Einde migratie v0.1
-- ============================================================

-- Nog niet volledig uitgewerkt in deze migratie:
-- - RLS voor alle Doelen/Lijsten/Documenten-koppeltabellen per context.
-- - Strengere column-level bescherming voor systeemrolwijzigingen.
-- - RPC's voor profielupdates, systeemrolbeheer, voorstelacceptatie en voorstelweigering.
-- - Helper `can_manage_moment(moment_id)`.
-- - Helper `can_view_begeleidingsnotitie(notitie_id)`.
-- - Triggers voor updated_at.
-- - Triggers/applicatiechecks om actieve taken altijd uitvoerder te laten hebben.
-- - Trigger/procedure voor voorstelacceptatie die onderliggende deelname/taak/doel activeert.
-- - Complexe capaciteit/wachtlijstregels.
-- - GDPR-bewaartermijnen en geautomatiseerde archivering.
--
-- ============================================================
-- 19. Besluit na review v0.2
-- ============================================================
--
-- Deze migratie is goed als technische blauwdruk, maar moet vóór uitvoering worden opgesplitst:
--
-- 001_types.sql
-- 002_tables_core.sql
-- 003_tables_workflows.sql
-- 004_indexes.sql
-- 005_rls_helpers.sql
-- 006_rls_policies_slice_1.sql
-- 007_rls_policies_slice_2.sql
-- 008_seeddata_dev.sql
--
-- Daarna volgt pas Codex-bouwpakket.
--
-- Aanbevolen eerstvolgende deliverable:
-- Codex + Supabase bouwpakket v0.1, met gefaseerde taken en expliciete waarschuwing
-- dat SQL v0.2 nog technische review nodig heeft voordat het in een echte Supabase-projectomgeving draait.
