-- SAM&ZO Fase 2 Stap 2L: veilige doelacceptatie-actielaag.
-- Doel: eigen-profiel doelacceptaties centraal beantwoorden via security
-- invoker RPC, zonder service-role, UI-knoppen of brede doelenflow.

revoke update on public.doelacceptaties from anon, authenticated;
grant update (
  status,
  geaccepteerd_at,
  geweigerd_at,
  later_bekijken_at,
  updated_at
) on public.doelacceptaties to authenticated;

drop policy if exists doelacceptaties_update_eigen_voorgesteld on public.doelacceptaties;
drop policy if exists doelacceptaties_update_eigen_actief on public.doelacceptaties;
create policy doelacceptaties_update_eigen_actief
on public.doelacceptaties
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and app_private.can_view_doel(doel_id)
  and status in ('voorgesteld', 'later_bekijken')
)
with check (
  profiel_id = app_private.current_profiel_id()
  and app_private.can_view_doel(doel_id)
  and (
    (
      status = 'geaccepteerd'
      and geaccepteerd_at is not null
      and geweigerd_at is null
      and later_bekijken_at is null
    )
    or (
      status = 'geweigerd'
      and geaccepteerd_at is null
      and geweigerd_at is not null
      and later_bekijken_at is null
    )
    or (
      status = 'later_bekijken'
      and geaccepteerd_at is null
      and geweigerd_at is null
      and later_bekijken_at is not null
    )
  )
);

drop function if exists public.beantwoord_doelacceptatie(uuid, uuid, text);

create function public.beantwoord_doelacceptatie(
  target_acceptatie_id uuid,
  target_profiel_id uuid,
  antwoord text
)
returns table (
  acceptatie_id uuid,
  doel_id uuid,
  profiel_id uuid,
  doelacceptatie_status public.doelacceptatie_status,
  geaccepteerd_at timestamptz,
  geweigerd_at timestamptz,
  later_bekijken_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_profiel_id uuid := app_private.current_profiel_id();
  v_acceptatie public.doelacceptaties%rowtype;
  v_target_status public.doelacceptatie_status;
begin
  if target_acceptatie_id is null or target_profiel_id is null then
    raise exception 'Doelacceptatieactie mist noodzakelijke gegevens.'
      using errcode = '22023';
  end if;

  if v_current_profiel_id is null then
    raise exception 'Doelacceptatieactie vereist een actief profiel.'
      using errcode = '28000';
  end if;

  if target_profiel_id <> v_current_profiel_id then
    raise exception 'Doelacceptatieactie is alleen toegestaan voor het eigen profiel.'
      using errcode = '42501';
  end if;

  if antwoord not in ('accept', 'reject', 'later') then
    raise exception 'Onbekende doelacceptatieactie.'
      using errcode = '22023';
  end if;

  select *
  into v_acceptatie
  from public.doelacceptaties da
  where da.id = target_acceptatie_id
    and da.profiel_id = target_profiel_id;

  if v_acceptatie.id is null then
    raise exception 'Doelacceptatie is niet zichtbaar voor dit profiel.'
      using errcode = '42501';
  end if;

  if v_acceptatie.status not in (
    'voorgesteld'::public.doelacceptatie_status,
    'later_bekijken'::public.doelacceptatie_status
  ) then
    raise exception 'Doelacceptatie is niet meer open.'
      using errcode = '23514';
  end if;

  if v_acceptatie.status = 'later_bekijken'::public.doelacceptatie_status
     and antwoord = 'later' then
    raise exception 'Doelacceptatie staat al op later bekijken.'
      using errcode = '23514';
  end if;

  if antwoord = 'accept' then
    v_target_status := 'geaccepteerd'::public.doelacceptatie_status;
  elsif antwoord = 'reject' then
    v_target_status := 'geweigerd'::public.doelacceptatie_status;
  else
    v_target_status := 'later_bekijken'::public.doelacceptatie_status;
  end if;

  update public.doelacceptaties da
  set
    status = v_target_status,
    geaccepteerd_at = case when antwoord = 'accept' then now() else null end,
    geweigerd_at = case when antwoord = 'reject' then now() else null end,
    later_bekijken_at = case when antwoord = 'later' then now() else null end,
    updated_at = now()
  where da.id = v_acceptatie.id
    and da.profiel_id = target_profiel_id
    and da.status in (
      'voorgesteld'::public.doelacceptatie_status,
      'later_bekijken'::public.doelacceptatie_status
    )
  returning *
  into v_acceptatie;

  if not found then
    raise exception 'Doelacceptatie kon niet worden bijgewerkt voor dit profiel.'
      using errcode = '42501';
  end if;

  return query
  select
    v_acceptatie.id,
    v_acceptatie.doel_id,
    v_acceptatie.profiel_id,
    v_acceptatie.status,
    v_acceptatie.geaccepteerd_at,
    v_acceptatie.geweigerd_at,
    v_acceptatie.later_bekijken_at;
end;
$$;

revoke all on function public.beantwoord_doelacceptatie(uuid, uuid, text) from public;
grant execute on function public.beantwoord_doelacceptatie(uuid, uuid, text) to authenticated;
