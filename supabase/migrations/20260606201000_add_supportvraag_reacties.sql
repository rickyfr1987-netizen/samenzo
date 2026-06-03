-- SAM&ZO migration 017: beperkte reacties op supportvragen.
-- Doel: één supportvraag-item met praktische terugkoppeling via response-rij,
-- zonder chat-/ticketmodule.

begin;

create table if not exists supportvraag_reacties (
  id uuid primary key default gen_random_uuid(),
  supportvraag_id uuid not null references supportvragen(id) on delete cascade,
  aangemaakt_door_persoon_id uuid not null references personen(id),
  aangemaakt_vanuit_profiel_id uuid not null references profielen(id) on delete cascade,
  inhoud text not null,
  is_support_antwoord boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.supportvraag_reacties enable row level security;

create index if not exists supportvraag_reacties_supportvraag_idx
  on supportvraag_reacties (supportvraag_id);

create index if not exists supportvraag_reacties_supportvraag_created_at_idx
  on supportvraag_reacties (supportvraag_id, created_at desc);

drop policy if exists supportvraag_reacties_select_context_or_support on public.supportvraag_reacties;
create policy supportvraag_reacties_select_context_or_support
on public.supportvraag_reacties
for select
to authenticated
using (
  aangemaakt_door_persoon_id = app_private.current_persoon_id()
  or aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  or app_private.is_systeemondersteuner()
  or exists (
    select 1
    from public.supportvragen sv
    where sv.id = supportvraag_id
      and (
        sv.aangemaakt_door_persoon_id = app_private.current_persoon_id()
        or sv.aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
      )
  )
);

drop policy if exists supportvraag_reacties_insert_author_or_support on public.supportvraag_reacties;
create policy supportvraag_reacties_insert_author_or_support
on public.supportvraag_reacties
for insert
to authenticated
with check (
  app_private.is_systeemondersteuner()
  or exists (
    select 1
    from public.supportvragen sv
    where sv.id = supportvraag_id
      and sv.aangemaakt_door_persoon_id = app_private.current_persoon_id()
      and sv.aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
  )
);

commit;
