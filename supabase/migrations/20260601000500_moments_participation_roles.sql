-- SAM&ZO migration 005: momenten, deelname, momentrollen, rolbezettingen en beschikbaarheden.
-- Doel: basislaag voor Planning als gemeenschappelijke werkelijkheid en Mijn dag-bronnen via Profiel.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata of handmatige indexes.
-- Deelnames en rolbezettingen hangen aan Profielen, niet aan Personen. Actorvelden verwijzen naar Personen.
-- Voorstellen zelf worden later gebouwd; deze migratie voegt geen voorstel-FK toe.

create table if not exists momenten (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  beschrijving text,
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  start_at timestamptz,
  eind_at timestamptz,
  hele_dag boolean not null default false,
  locatie text,
  status moment_status not null default 'concept',
  inschrijving_open boolean not null default false,
  inschrijfdeadline_at timestamptz,
  capaciteit integer,
  gasttoegang boolean not null default false,
  zichtbaar_vanaf_at timestamptz,
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
    start_at is null or eind_at is null or eind_at > start_at
  ),
  constraint momenten_capaciteit_check check (
    capaciteit is null or capaciteit >= 0
  )
);

create table if not exists moment_groepen (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references momenten(id) on delete cascade,
  groep_id uuid not null references groepen(id) on delete cascade,
  context_type text,
  created_at timestamptz not null default now(),
  constraint moment_groepen_moment_groep_uniek unique (moment_id, groep_id)
);

create table if not exists deelnames (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references momenten(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status deelname_status not null default 'voorgesteld',
  aangemeld_door_persoon_id uuid references personen(id),
  aangemeld_vanuit_profiel_id uuid references profielen(id),
  status_updated_at timestamptz,
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  afgemeld_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz
);

create table if not exists momentrollen (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references momenten(id) on delete cascade,
  roltype momentrol_type not null,
  titel text,
  omschrijving text,
  minimum_aantal integer not null default 0,
  maximum_aantal integer,
  zichtbaar_voor_groep_id uuid references groepen(id),
  verplicht_voor_doorgang boolean not null default false,
  escalatie_at timestamptz,
  status momentrol_status not null default 'open',
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  archived_at timestamptz,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists beschikbaarheden (
  id uuid primary key default gen_random_uuid(),
  profiel_id uuid not null references profielen(id) on delete cascade,
  type beschikbaarheid_type not null,
  status beschikbaarheid_status not null default 'actief',
  start_at timestamptz not null,
  eind_at timestamptz,
  reden text,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint beschikbaarheden_tijd_check check (
    eind_at is null or eind_at > start_at
  )
);
