-- SAM&ZO migration 004: categorieen en categorie_configuraties.
-- Doel: beheerbare categoriegedragslaag voorbereiden zonder categorieen als rechtenmodel te gebruiken.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata of handmatige indexes.
-- Categorieen bepalen UI-gedrag. RLS blijft later de aparte beveiligingslaag.
-- Tags en begeleidingsnotities blijven volledig buiten deze categoriegedragslaag.

create table if not exists categorieen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  beschrijving text,
  entiteit_type categorie_entiteit_type not null,
  status categorie_status not null default 'actief',
  is_systeem_default boolean not null default false,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id)
);

create table if not exists categorie_configuraties (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references categorieen(id) on delete cascade,
  velden_config jsonb not null default '{}'::jsonb,
  acties_config jsonb not null default '{}'::jsonb,
  statussen_config jsonb not null default '{}'::jsonb,
  rollen_config jsonb not null default '{}'::jsonb,
  signalen_config jsonb not null default '{}'::jsonb,
  zichtbaarheid_config jsonb not null default '{}'::jsonb,
  koppelingen_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint categorie_configuraties_categorie_id_uniek unique (categorie_id)
);
