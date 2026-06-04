# Tests

De repo heeft inmiddels een werkende Vitest-basis voor unit- en
component-integratietests. De snelle regressierun gebruikt mockgrenzen rond
Supabase en de huidige profielcontext.

Beschikbare scripts:

| Script | Doel |
| --- | --- |
| `npm run test` | Vitest-run voor unit- en integratietests. |
| `npm run test:unit` | Zelfde Vitest-run, expliciet voor de snelle testlaag. |
| `npm run test:rls` | Lokale Supabase pgTAP/RLS-tests. Vereist een draaiende lokale stack. |
| `npm run test:e2e` | Playwright-configuratie voor toekomstige browserflows. |
| `npm run test:ci` | Typecheck, lint en Vitest. |

Huidige status:

- `tests/unit/` bevat helper- en actie-regressies.
- `tests/integration/` bevat Testing Library-tests voor bestaande schermen en
  flows.
- `tests/e2e/` is voorbereid, maar bevat nog geen browserflows.
- `tests/rls/` beschrijft de RLS-laag; de uitvoerbare SQL-tests staan in
  `supabase/tests/database/`.

Gebruik voor Fase 1 de migratie-seedlijn met vijf kernprofielen als leidende
testdata. `supabase/seed.sql` bestaat als lokale seed-entrypoint en laadt geen
tweede dataset.

Sla geen wachtwoorden of credentials op in tests, fixtures, logs of docs.
Toekomstige browsertests kunnen runtime het gedeelde lokale testwachtwoord nodig
hebben, maar dat wachtwoord hoort niet in de repo.
