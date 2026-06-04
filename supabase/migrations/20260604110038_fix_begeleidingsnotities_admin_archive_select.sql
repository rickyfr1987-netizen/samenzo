-- Correctie: systeembeheerder moet ook gearchiveerde begeleidingsnotities
-- kunnen selecteren; niet-beheer blijft beperkt tot actieve/bewerkte context.

create or replace function app_private.can_view_begeleidingsnotitie(
  target_notitie_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.begeleidingsnotities bn
    where bn.id = target_notitie_id
      and app_private.begeleidingsnotitie_context_is_valid(
        bn.moment_id,
        bn.lijst_id,
        bn.taak_id,
        bn.zichtbaar_voor_roltype
      )
      and (
        app_private.is_systeembeheerder()
        or (
          bn.status <> 'gearchiveerd'
          and (
            app_private.can_manage_begeleidingsnotitie_context(
              bn.moment_id,
              bn.lijst_id,
              bn.taak_id,
              bn.betrokken_profiel_id,
              bn.zichtbaar_voor_roltype
            )
            or (
              coalesce(app_private.current_systeemrol() <> 'gast', false)
              and bn.moment_id is not null
              and bn.zichtbaar_voor_roltype is not null
              and app_private.begeleidingsnotitie_betrokken_profiel_allowed(
                bn.betrokken_profiel_id
              )
              and app_private.current_profiel_has_active_momentrol(
                bn.moment_id,
                bn.zichtbaar_voor_roltype
              )
            )
          )
        )
      )
  );
$$;

revoke all on function app_private.can_view_begeleidingsnotitie(uuid) from public;
grant execute on function app_private.can_view_begeleidingsnotitie(uuid) to authenticated;
