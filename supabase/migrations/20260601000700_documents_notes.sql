-- SAM&ZO migration 007: documenten en begeleidingsnotities.
-- Doel: informatielaag voor Documenten en aparte, strikt afgeschermde contextnotities voorbereiden.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata of handmatige indexes.
-- Documenten informeren en zijn geen persoonlijke documentenbibliotheek, zorgdossier, formulierensysteem, rapportage of begeleidingsnotitie.
-- Begeleidingsnotities zijn geen Documenten, hebben geen categorie en moeten later strenger worden afgeschermd dan Documenten.
-- Documentkoppelingen zijn lichte verwijzingen en geven later nooit automatisch leesrecht op gekoppelde items.

create table if not exists documenten (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  samenvatting text,
  inhoud text not null,
  categorie_id uuid not null references categorieen(id),
  eigenaar_profiel_id uuid references profielen(id),
  eigenaar_groep_id uuid references groepen(id),
  status document_status not null default 'concept',
  gepubliceerd_at timestamptz,
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
  created_at timestamptz not null default now(),
  constraint document_groepen_document_groep_uniek unique (document_id, groep_id)
);

create table if not exists document_koppelingen (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documenten(id) on delete cascade,
  gekoppeld_type text not null,
  gekoppeld_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists begeleidingsnotities (
  id uuid primary key default gen_random_uuid(),
  inhoud text not null,
  status begeleidingsnotitie_status not null default 'actief',
  moment_id uuid references momenten(id),
  lijst_id uuid references lijsten(id),
  taak_id uuid references taken(id),
  betrokken_profiel_id uuid references profielen(id),
  zichtbaar_voor_roltype momentrol_type,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  updated_at timestamptz,
  updated_by_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint begeleidingsnotities_exact_een_context check (
    ((moment_id is not null)::int + (lijst_id is not null)::int + (taak_id is not null)::int) = 1
  )
);
