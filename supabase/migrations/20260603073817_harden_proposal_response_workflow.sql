-- SAM&ZO stability cleanup: atomische momentvoorstel-respons.
-- Doel: voorstelstatus en gekoppelde deelname in een transactie wijzigen,
-- zonder service-role en zonder brede administratieve statusupdates.

revoke update on public.voorstellen from anon, authenticated;
grant update (
  status,
  geaccepteerd_at,
  geweigerd_at,
  updated_at
) on public.voorstellen to authenticated;

drop policy if exists voorstellen_update_status_bij_ontvanger on public.voorstellen;
create policy voorstellen_update_status_bij_ontvanger
on public.voorstellen
for update
to authenticated
using (
  status = 'open'
  and ontvangend_profiel_id = app_private.current_profiel_id()
)
with check (
  ontvangend_profiel_id = app_private.current_profiel_id()
  and status in ('open', 'geaccepteerd', 'geweigerd', 'later_bekijken', 'verlopen')
);

drop function if exists public.beantwoord_moment_voorstel(uuid, uuid, text);

create function public.beantwoord_moment_voorstel(
  target_voorstel_id uuid,
  target_profiel_id uuid,
  antwoord text
)
returns table (
  voorstel_id uuid,
  voorstel_titel text,
  voorstel_type public.voorstel_type,
  gekoppeld_type text,
  gekoppeld_id uuid,
  voorstel_status public.voorstel_status,
  deelname_id uuid,
  deelname_status public.deelname_status
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_current_profiel_id uuid := app_private.current_profiel_id();
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_voorstel public.voorstellen%rowtype;
  v_target_voorstel_status public.voorstel_status;
  v_deelname_id uuid;
  v_deelname_status public.deelname_status;
begin
  if target_voorstel_id is null or target_profiel_id is null then
    raise exception 'Voorstelactie mist noodzakelijke gegevens.'
      using errcode = '22023';
  end if;

  if v_current_profiel_id is null or v_current_persoon_id is null then
    raise exception 'Voorstelactie vereist een actief profiel.'
      using errcode = '28000';
  end if;

  if target_profiel_id <> v_current_profiel_id then
    raise exception 'Voorstelactie is alleen toegestaan voor het ontvangende profiel.'
      using errcode = '42501';
  end if;

  if antwoord not in ('accept', 'reject') then
    raise exception 'Onbekende voorstelactie.'
      using errcode = '22023';
  end if;

  select *
  into v_voorstel
  from public.voorstellen
  where id = target_voorstel_id
    and ontvangend_profiel_id = target_profiel_id
  for update;

  if v_voorstel.id is null then
    raise exception 'Voorstel is niet zichtbaar voor dit profiel.'
      using errcode = '42501';
  end if;

  if v_voorstel.status <> 'open'::public.voorstel_status then
    raise exception 'Voorstel is niet meer open.'
      using errcode = '23514';
  end if;

  if v_voorstel.gekoppeld_type <> 'moment' or v_voorstel.gekoppeld_id is null then
    raise exception 'Deze voorstelactie ondersteunt alleen gekoppelde momenten.'
      using errcode = '23514';
  end if;

  if v_voorstel.type not in (
    'deelname_aan_moment'::public.voorstel_type,
    'uitnodiging_moment'::public.voorstel_type
  ) then
    raise exception 'Dit voorsteltype kan niet als momentdeelname worden beantwoord.'
      using errcode = '23514';
  end if;

  if antwoord = 'accept' then
    v_target_voorstel_status := 'geaccepteerd'::public.voorstel_status;
  else
    v_target_voorstel_status := 'geweigerd'::public.voorstel_status;
  end if;

  update public.voorstellen
  set
    status = v_target_voorstel_status,
    geaccepteerd_at = case when antwoord = 'accept' then now() else null end,
    geweigerd_at = case when antwoord = 'reject' then now() else null end,
    updated_at = now()
  where id = v_voorstel.id
    and ontvangend_profiel_id = target_profiel_id
    and status = 'open'
  returning *
  into v_voorstel;

  if not found then
    raise exception 'Voorstel kon niet worden bijgewerkt voor dit profiel.'
      using errcode = '42501';
  end if;

  if antwoord = 'accept' then
    with updated_deelname as (
      update public.deelnames
      set
        status = 'geaccepteerd'::public.deelname_status,
        geaccepteerd_at = now(),
        geweigerd_at = null,
        afgemeld_at = null,
        status_updated_at = now(),
        updated_at = now(),
        aangemeld_door_persoon_id = v_current_persoon_id,
        aangemeld_vanuit_profiel_id = v_current_profiel_id
      where moment_id = v_voorstel.gekoppeld_id
        and profiel_id = target_profiel_id
        and archived_at is null
        and status in (
          'afgemeld',
          'voorgesteld',
          'uitgenodigd',
          'wachtlijst',
          'geweigerd',
          'geannuleerd',
          'verlopen'
        )
      returning id, status
    )
    select id, status
    into v_deelname_id, v_deelname_status
    from updated_deelname
    order by id
    limit 1;

    if v_deelname_id is null then
      select d.id, d.status
      into v_deelname_id, v_deelname_status
      from public.deelnames d
      where d.moment_id = v_voorstel.gekoppeld_id
        and d.profiel_id = target_profiel_id
        and d.archived_at is null
        and d.status in ('geaccepteerd', 'ingeschreven')
      order by d.created_at desc
      limit 1;
    end if;

    if v_deelname_id is null then
      insert into public.deelnames (
        moment_id,
        profiel_id,
        status,
        aangemeld_door_persoon_id,
        aangemeld_vanuit_profiel_id,
        status_updated_at,
        updated_at
      )
      values (
        v_voorstel.gekoppeld_id,
        target_profiel_id,
        'ingeschreven'::public.deelname_status,
        v_current_persoon_id,
        v_current_profiel_id,
        now(),
        now()
      )
      returning id, status
      into v_deelname_id, v_deelname_status;
    end if;
  else
    with updated_deelname as (
      update public.deelnames
      set
        status = 'geweigerd'::public.deelname_status,
        geaccepteerd_at = null,
        geweigerd_at = now(),
        afgemeld_at = null,
        status_updated_at = now(),
        updated_at = now(),
        aangemeld_door_persoon_id = null,
        aangemeld_vanuit_profiel_id = v_current_profiel_id
      where moment_id = v_voorstel.gekoppeld_id
        and profiel_id = target_profiel_id
        and archived_at is null
        and status in (
          'afgemeld',
          'voorgesteld',
          'uitgenodigd',
          'wachtlijst',
          'geweigerd',
          'geannuleerd',
          'verlopen'
        )
      returning id, status
    )
    select id, status
    into v_deelname_id, v_deelname_status
    from updated_deelname
    order by id
    limit 1;
  end if;

  return query
  select
    v_voorstel.id,
    v_voorstel.titel,
    v_voorstel.type,
    v_voorstel.gekoppeld_type,
    v_voorstel.gekoppeld_id,
    v_voorstel.status,
    v_deelname_id,
    v_deelname_status;
end;
$$;

revoke all on function public.beantwoord_moment_voorstel(uuid, uuid, text) from public;
grant execute on function public.beantwoord_moment_voorstel(uuid, uuid, text) to authenticated;
