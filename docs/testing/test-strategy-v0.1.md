# SAM&ZO teststrategie v0.1

## Architectuur

De testbasis volgt de SAM&ZO-architectuur:

| Laag | Doel | Testvorm |
| --- | --- | --- |
| Domein-/actiehelpers | Statusovergangen, RPC-aanroepen en foutafhandeling vastleggen. | Vitest unit tests met gemockte Supabase-client. |
| Clientpagina's | Controleren dat bestaande schermen SAM&ZO-logica correct tonen. | Vitest + Testing Library in `jsdom`. |
| Browserflows | Kritieke routes en gebruikerflows door de echte Next-app klikken. | Playwright, apart van de snelle unitrun. |
| Supabase/RLS | Controleren dat policygrenzen overeenkomen met persoonlijke regie, groepen en zichtbaarheid. | Gerichte pgTAP/RLS-tests tegen een lokale Supabase-testdatabase. |

Bronnen van waarheid:

| Bron | Gebruik |
| --- | --- |
| `docs/source/` | Functionele regels: Mijn dag persoonlijk, Planning gemeenschappelijk, voorstellen als status/actie op item. |
| `docs/architecture/` | Datamodel-, RLS- en statusrichting. |
| `docs/audits/autonomous-project-audit-v0.1.md` | Implementatiematrix en testgaten. |
| `docs/audits/stability-cleanup-round-v0.1.md` | Gehard voorstelgedrag en resterende risico's. |

## Tooling

| Tool | Waarom |
| --- | --- |
| Vitest | Past bij TypeScript/Vite-ecosysteem, snel voor unit- en component-integratietests. |
| Testing Library | Test UI zoals gebruikers die ervaren, zonder componentinternals te bevriezen. |
| `@testing-library/jest-dom` | Leesbare DOM-assertions. |
| `jsdom` | Browserachtige omgeving voor client components zonder echte browser. |
| Playwright | Beste laag voor toekomstige echte browserflows met Next.js routes. |

## Structuur

| Pad | Inhoud |
| --- | --- |
| `tests/setup/` | Vitest setup, DOM cleanup en gedeelde mocks zoals `next/link`. |
| `tests/fixtures/` | Kleine, stabiele fixtures voor SAM&ZO-profielen, context en datums. |
| `tests/unit/` | Pure unit tests en actiehelpertests. |
| `tests/integration/` | Component-integratietests met gemockte datahelpers. |
| `tests/e2e/` | Playwright browsertests. |
| `tests/rls/` | Uitleg en scenario-overzicht voor echte RLS-tests. |
| `supabase/tests/database/` | Uitvoerbare pgTAP/RLS-tests voor `supabase test db`. |

## Actuele Fase 1-status

De snelle testbasis is aanwezig en gebruikt Vitest, Testing Library en jsdom.
Playwright is geconfigureerd, maar bevat nog geen reproduceerbare browserflows
of authfixtures. De uitvoerbare RLS-basis staat in `supabase/tests/database/`
en draait via `npm run test:rls` tegen een lokale Supabase/Postgres-context.
Documenten-RLS is het eerste bewezen domein; voorstellen-RLS is het tweede
bewezen domein; gastcontext-RLS is het derde bewezen domein.

De Shadow cloud-pc kan deze lokale Supabase-runtime pas bewijzen zodra
Docker/WSL2 gezond is. Tot die tijd gebruikt Fase 1B
`.github/workflows/samzo-rls-ci.yml` als objectieve GitHub Actions-runtime voor
lokale Supabase reset en RLS-tests. Deze workflow gebruikt geen Supabase access
token, geen project-ref, geen remote database en geen secrets.

Lokale resetstrategie:

- `supabase/config.toml` gebruikt `supabase/seed.sql` als seed-entrypoint.
- De leidende development/testdata voor Fase 1 staat in de migratieketen met
  vijf kernprofielen: Bas Beheerder, Sanne Systeemondersteuner, Milan
  Medewerker, Sam Bewoner en Gijs Gast.
- `supabase/seed/017_seed_dev_data.sql` is een oudere acht-profielen seedset en
  wordt niet automatisch geladen, om dubbele of inconsistente testdata te
  voorkomen.
- `npm run test:rls` vereist dat de lokale Supabase-stack draait en dat de
  migratieketen lokaal is toegepast, bijvoorbeeld na `supabase db reset`.

Wachtwoorden, service-role keys, Auth secrets en echte persoonsgegevens mogen
niet in tests, seeddata, documentatie, prompts, traces of logs worden
opgeslagen. Browsertesten kunnen later runtime het gedeelde lokale
testwachtwoord nodig hebben.

## Naamconventies

| Type | Conventie | Voorbeeld |
| --- | --- | --- |
| Unit | `<domein>.<onderdeel>.test.ts` | `voorstellen.actions.test.ts` |
| Component-integratie | `<route-of-flow>.page.test.tsx` | `mijn-dag.page.test.tsx` |
| E2E | `<flow>.spec.ts` | `proposal-flow.spec.ts` |
| Fixtures | Beschrijvende helpernamen | `createSamzoContext`, `currentDayIsoAt` |

## Scripts

| Script | Doel |
| --- | --- |
| `npm run test` | Snelle regressierun via Vitest. |
| `npm run test:unit` | Zelfde snelle Vitest-run, expliciet voor unit/component-integratie. |
| `npm run test:rls` | Lokale Supabase pgTAP/RLS-tests. |
| `npm run test:e2e` | Playwright browsertests. |
| `npm run test:ci` | Typecheck, lint en Vitest voor CI-achtige controle. |

## GitHub Actions

| Workflow | Trigger | Doel |
| --- | --- | --- |
| `.github/workflows/samzo-rls-ci.yml` | `workflow_dispatch`, push naar de huidige default branch en pull requests naar de huidige default branch | Typecheck, lint, Vitest, lokale Supabase start/reset, seed/RLS-controle en pgTAP RLS-tests. |

Deze workflow draait op `ubuntu-latest`, gebruikt Node 24 en installeert de
Supabase CLI via `supabase/setup-cli@v2` met versie `2.103.0`, gelijk aan de
huidige project-devDependency. Supabase-output die lokale keys of database-URLs
kan bevatten, wordt in de workflow geredacteerd. Browsertests en het gedeelde
lokale testwachtwoord horen niet bij deze CI-stap.

## Nieuwe tests toevoegen

Werkwijze:

1. Kies de laag die het risico het goedkoopst afdekt.
2. Gebruik bestaande documenten en audits als functionele bron.
3. Mock Supabase alleen op modulegrenzen, niet midden in componentlogica.
4. Test gebruikerszichtbare tekst, knoppen en statuslabels met Testing Library.
5. Voeg RLS-tests pas toe tegen een expliciet gekozen lokale testdatabase, tenzij
   er apart GO is om een linked project te raken.
6. Houd testdata klein en herkenbaar: Sam Bewoner, Bas Beheerder, Milan Medewerker, Sanne Systeemondersteuner en Gijs Gast.

## Supabase/RLS-strategie

De eerste RLS-testlaag gebruikt pgTAP via `supabase test db --local`. RLS is
alleen betrouwbaar te testen tegen een echte Postgres/Supabase-context met
Auth-claims; Vitest-mocks blijven aanvullend en bewijzen geen policygrenzen.

Bewezen RLS-domeinen:

| Domein | Bewijs |
| --- | --- |
| Documenten | Milan kan het gepubliceerde medewerkersdocument zien; Sam niet. |
| Voorstellen | Sam kan zijn eigen open voorstel zien en via `beantwoord_moment_voorstel` weigeren; Gijs ziet Sams voorstel niet; Bas kan niet namens Sam antwoorden. |
| Gastcontext | Gijs kan een expliciet gasttoegankelijk moment en zijn eigen gastdeelname zien; Gijs kan een bewonersmoment en intern medewerkersdocument niet zien. |

Aanbevolen volgorde:

| Stap | Inhoud |
| --- | --- |
| 1 | Supabase CLI-validatie lokaal voorbereiden via help/status/reset-checks zonder remote project te raken. |
| 2 | Lokale Supabase-testdatabase starten, resetten en `npm run test:rls` draaien. |
| 3 | RLS-scenario's uitbreiden voor begeleidingsnotities en supportvragen. |
| 4 | Alleen testdata gebruiken die idempotent, fictief en development-only is. |
| 5 | Geen service-role gebruiken om gewoon gebruikersgedrag te bewijzen; tijdelijke Auth-koppelingen horen in rollback-testsetup. |
