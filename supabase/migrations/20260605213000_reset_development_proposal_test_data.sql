-- SAM&ZO migration: reset development proposal test rows for repeatable proposal flow testing.
-- Scope: only seed rows created in the local test migrations for development use.
-- This migration intentionally resets a small subset to open/voorgesteld status.

do $$
declare
  now_at timestamptz := now();
begin
  update public.voorstellen
    set
      status = 'open',
      geaccepteerd_at = null,
      geweigerd_at = null,
      ingetrokken_at = null,
      updated_at = now_at
  where id in (
    '45500000-0000-4000-8000-000000000001',
    '45500000-0000-4000-8000-000000000002',
    '45500000-0000-4000-8000-000000000003',
    '45500000-0000-4000-8000-000000000006',
    '45600000-0000-4000-8000-000000000001'
  )
    and status <> 'open'
    and gekoppeld_type = 'moment';

  update public.deelnames d
    set
      status = 'voorgesteld',
      status_updated_at = now_at,
      updated_at = now_at,
      geaccepteerd_at = null,
      geweigerd_at = null,
      afgemeld_at = null
  from public.voorstellen v
  where v.id in (
    '45500000-0000-4000-8000-000000000001',
    '45500000-0000-4000-8000-000000000002',
    '45500000-0000-4000-8000-000000000003',
    '45500000-0000-4000-8000-000000000006',
    '45600000-0000-4000-8000-000000000001'
  )
    and v.gekoppeld_type = 'moment'
    and d.archived_at is null
    and d.moment_id = v.gekoppeld_id
    and d.profiel_id = v.ontvangend_profiel_id
    and d.status <> 'voorgesteld'
    and v.status = 'open';
end $$;
