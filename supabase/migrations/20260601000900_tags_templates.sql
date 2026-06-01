-- SAM&ZO migration 009: tags en templates.
-- Doel: lichte vindbaarheid via tags en eenvoudige templatevoorbereiding zonder rechten-, gedrags- of workflowmacht.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata, triggers, RPC's of handmatige indexes.
-- Tags zijn alleen voor zoeken, filteren en vindbaarheid. Tags geven geen toegang tot gekoppelde items.
-- Templates zijn MVP-light/V1-voorbereiding en vervangen categorieen niet.
-- Begeleidingsnotities blijven buiten tags en templates.

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  beschrijving text,
  status text not null default 'actief',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint tags_naam_uniek unique (naam)
);

create table if not exists tag_koppelingen (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  gekoppeld_type text not null,
  gekoppeld_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  beschrijving text,
  categorie_id uuid references categorieen(id),
  entiteit_type categorie_entiteit_type not null,
  template_data jsonb not null default '{}'::jsonb,
  status text not null default 'actief',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id)
);
