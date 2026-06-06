# Fase 3E audit Planning/Momenten MVP-smal v0.1

Datum: 2026-06-06

## Scope

Deze audit beoordeelt Fase 3D opnieuw op basis van het bouwplan:

- Planning blijft de gemeenschappelijke werkelijkheid.
- Momentbeheer loopt via de smalle groepgerichte beheerroute.
- Categorieen sturen gedrag, maar geen rechten.
- UI-gating is aanvullend; RLS/RPC blijft beslissend.

Niet beoordeeld als afgerond:

- Fase 3C runtimebewijs, omdat `npm.cmd run test:rls` lokaal niet kan verbinden
  met Supabase/Postgres.
- Volledige Playwright-beheerflow.

## Gelezen bestanden

- `docs/planning/samzo-bouwplan-v0.1.md`
- `app/planning/[momentId]/page.tsx`
- `src/lib/planning/moment-management.ts`
- `src/lib/planning/moments.ts`
- `src/lib/moment/detail.ts`
- `tests/unit/planning.moment-management.test.ts`
- `tests/integration/begeleidingsnotities.detail.test.tsx`
- `docs/planning/overgeslagen-stappen-v0.1.md`
- `supabase/migrations/20260606191617_add_planning_moment_management_rpcs.sql`
- `supabase/tests/database/planning_momentbeheer_rls.test.sql`
- `docs/audits/fase-1-rls-bewijsmatrix-v0.1.md`

## Testresultaten

| Poort | Resultaat | Opmerking |
| --- | --- | --- |
| `npm.cmd run typecheck` | GO | Typecheck is groen na 3D-FIX. |
| `npm.cmd run lint` | GO | Lint is groen na 3D-FIX. |
| `npm.cmd run test -- tests/unit/planning.moment-management.test.ts tests/integration/begeleidingsnotities.detail.test.tsx` | GO | 15 tests groen. |
| `npm.cmd run test:rls` | FIX | Lokale Postgres op `127.0.0.1:54322` is niet bereikbaar. |

## Bevindingen

1. De eerdere typecheckfout op `managementEditDraft.status` is opgelost door
   alleen bewerkbare momentstatussen in het edit-draft toe te laten.

2. De eerdere typecheckfout in
   `tests/integration/begeleidingsnotities.detail.test.tsx` is opgelost door
   momentfixture-overrides onder `moment` te typeren.

3. De eerdere lintfouten rond `react-hooks/set-state-in-effect` zijn opgelost
   door managementopties en edit-draft in de laadroute te zetten.

4. De helperroute gebruikt RPC's via de browserclient en vertaalt fouten naar
   veilige UI-meldingen. Unit tests bewijzen de payloads en foutmapping.

5. De UI verbergt momentbeheer voor niet-systeembeheerders in integratietests.
   Dat is nuttige UI-gating, maar geen vervanging voor RLS/pgTAP-bewijs.

6. De pgTAP-suite voor momentbeheer is aanwezig en dekt positieve en negatieve
   cases, maar is in deze omgeving niet groen gedraaid.

## Beoordeling

Status: FIX

Reden:

- Typecheck, lint en gerichte Vitest zijn groen.
- RLS/pgTAP-bewijs voor 3C is nog niet uitgevoerd.
- `npm.cmd run test:rls` faalt door ontbrekende lokale Postgres-runtime.
- Zonder pgTAP-runtimebewijs blijft de fase-audit formeel FIX.

## Risico's

- Zonder groene pgTAP-run blijft de RLS-first claim van momentbeheer onbewezen.
- Zonder Playwright is de echte beheerflow in de browser nog niet bewezen.
- Door 3C over te slaan mag Fase 4 nog niet als normale vervolgfase starten.

## Advies

Haal eerst Fase 3 Stap 3C in zodra Docker/lokale Supabase of een expliciet
goedgekeurde CI-route beschikbaar is:

- draai `npm.cmd run test:rls`;
- herstel eventuele pgTAP- of SQL/RLS-fouten uit de runtime-run;
- voer daarna 3E opnieuw uit voor een definitief GO/FIX-besluit.

Pas na groen RLS-bewijs kan Fase 4 volgens de normale bouwvolgorde starten.
