-- SAM&ZO migration 006: doelen, lijsten en taken.
-- Doel: lichte doelenlaag en praktische uitvoeringslaag zonder prestatiedashboard.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata of handmatige indexes.
-- Doelen geven richting. Lijsten en taken helpen uitvoeren. Taakuitvoerders hangen aan Profielen, niet aan Personen.
-- Voorstellen zelf worden later gebouwd; deze migratie voegt geen voorstel-FK toe.

create table if not exists doelen (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  beschrijving text,
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  status doel_status not null default 'actief',
  start_at timestamptz,
  eind_at timestamptz,
  afgerond_at timestamptz,
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
  constraint doelen_tijd_check check (
    start_at is null or eind_at is null or eind_at >= start_at
  )
);

create table if not exists doelacceptaties (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status doelacceptatie_status not null default 'voorgesteld',
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  later_bekijken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists lijsten (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  beschrijving text,
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  gekoppeld_moment_id uuid references momenten(id),
  gekoppeld_doel_id uuid references doelen(id),
  status lijst_status not null default 'open',
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

create table if not exists doel_koppelingen (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references doelen(id) on delete cascade,
  gekoppeld_type text not null,
  gekoppeld_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists lijst_groepen (
  id uuid primary key default gen_random_uuid(),
  lijst_id uuid not null references lijsten(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint lijst_groepen_lijst_groep_uniek unique (lijst_id, groep_id)
);

create table if not exists taken (
  id uuid primary key default gen_random_uuid(),
  lijst_id uuid not null references lijsten(id) on delete cascade,
  titel text not null,
  beschrijving text,
  status taak_status not null default 'open',
  sort_order integer,
  deadline_at timestamptz,
  afgerond_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id)
);

create table if not exists taakuitvoerders (
  id uuid primary key default gen_random_uuid(),
  taak_id uuid not null references taken(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status taakuitvoerder_status not null default 'actief',
  geclaimd_door_persoon_id uuid references personen(id),
  geclaimd_at timestamptz,
  afgerond_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
