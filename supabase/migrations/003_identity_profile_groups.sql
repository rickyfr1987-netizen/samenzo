-- SAM&ZO migration 003: identiteit, profielen en groepen.
-- Doel: eerste kernlaag voor account/actor, functionele appwerkelijkheid en groepscontext.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata of handmatige indexes.
-- Persoon = account/authenticatie/actor. Profiel = functionele appwerkelijkheid.
-- Groepsrollen zijn vrije, informatieve tekst en hebben geen technische rechtenbetekenis.

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
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

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
  verwijderd_at timestamptz,
  updated_at timestamptz
);

create table if not exists groepsrollen (
  id uuid primary key default gen_random_uuid(),
  groep_id uuid not null references groepen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  rolnaam text not null,
  icoon text,
  zichtbaar boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
