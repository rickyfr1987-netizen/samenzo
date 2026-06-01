-- SAM&ZO migration 008: voorstellen, tijdlijn, supportvragen, signalen en notificatiestatussen.
-- Doel: communicatielaag voorbereiden zonder chat, ticketmodule, acceptatielogica, RLS of automatische toegang via koppelingen.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen RLS, policies, helperfuncties, seeddata, triggers, RPC's of handmatige indexes.
-- Voorstellen beschermen persoonlijke regie. Alleen het ontvangende Profiel mag later persoonlijke voorstellen accepteren of weigeren.
-- Tijdlijnberichten en signalen richten aandacht, maar geven later nooit automatisch leesrecht op gekoppelde items.

create table if not exists voorstellen (
  id uuid primary key default gen_random_uuid(),
  type voorstel_type not null,
  status voorstel_status not null default 'open',
  ontvangend_profiel_id uuid not null references profielen(id) on delete cascade,
  voorgesteld_door_persoon_id uuid not null references personen(id),
  voorgesteld_vanuit_profiel_id uuid references profielen(id),
  titel text,
  toelichting text,
  gekoppeld_type text not null,
  gekoppeld_id uuid not null,
  verloopt_at timestamptz,
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  ingetrokken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists supportvragen (
  id uuid primary key default gen_random_uuid(),
  aangemaakt_door_persoon_id uuid references personen(id),
  aangemaakt_vanuit_profiel_id uuid not null references profielen(id) on delete cascade,
  onderwerp text not null,
  omschrijving text not null,
  status supportvraag_status not null default 'nieuw',
  toegewezen_aan_persoon_id uuid references personen(id),
  behandeld_door_persoon_id uuid references personen(id),
  afgehandeld_at timestamptz,
  gesloten_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists signalen (
  id uuid primary key default gen_random_uuid(),
  niveau signaal_niveau not null default 'informatief',
  status signaal_status not null default 'nieuw',
  titel text not null,
  omschrijving text,
  gericht_aan_profiel_id uuid references profielen(id),
  gericht_aan_groep_id uuid references groepen(id),
  gekoppeld_type text,
  gekoppeld_id uuid,
  created_at timestamptz not null default now(),
  created_by_persoon_id uuid references personen(id),
  afgehandeld_at timestamptz,
  afgehandeld_door_persoon_id uuid references personen(id),
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint signalen_exact_een_ontvanger check (
    (gericht_aan_profiel_id is not null and gericht_aan_groep_id is null)
    or
    (gericht_aan_profiel_id is null and gericht_aan_groep_id is not null)
  )
);

create table if not exists tijdlijnberichten (
  id uuid primary key default gen_random_uuid(),
  type tijdlijnbericht_type not null,
  status tijdlijnbericht_status not null default 'nieuw',
  titel text not null,
  inhoud text,
  afzender_persoon_id uuid references personen(id),
  afzender_profiel_id uuid references profielen(id),
  gericht_aan_profiel_id uuid references profielen(id),
  gericht_aan_groep_id uuid references groepen(id),
  voorstel_id uuid references voorstellen(id),
  supportvraag_id uuid references supportvragen(id),
  signaal_id uuid references signalen(id),
  gekoppeld_type text,
  gekoppeld_id uuid,
  urgent boolean not null default false,
  zichtbaar_vanaf_at timestamptz,
  verloopt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz,
  archived_by_persoon_id uuid references personen(id),
  constraint tijdlijnberichten_exact_een_ontvanger check (
    (gericht_aan_profiel_id is not null and gericht_aan_groep_id is null)
    or
    (gericht_aan_profiel_id is null and gericht_aan_groep_id is not null)
  )
);

create table if not exists notificatiestatussen (
  id uuid primary key default gen_random_uuid(),
  tijdlijnbericht_id uuid not null references tijdlijnberichten(id) on delete cascade,
  profiel_id uuid not null references profielen(id) on delete cascade,
  status tijdlijnbericht_status not null default 'nieuw',
  gelezen_at timestamptz,
  afgehandeld_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
