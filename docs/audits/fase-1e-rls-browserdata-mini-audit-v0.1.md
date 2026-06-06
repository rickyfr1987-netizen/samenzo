# SAM&ZO Fase 1E mini-audit RLS-testbasis en browserdata v0.1

## 1. Doel

Deze audit beoordeelt of de Fase 1 RLS-testbasis en de resetbare
browserdatafixture voldoende gecontroleerd zijn om door te gaan naar Fase 2A.
De audit bouwt geen productfunctionaliteit, geen migratie, geen RLS-policy, geen
RPC en geen browserflow.

Datum: 2026-06-06.
Branch: `fase-2-personal-items-green-base`.
Laatste gecontroleerde implementatiecommit: `15f0a72520876e3659416f4393238c9513a83d22`.

## 2. Gelezen bronnen

- `docs/planning/samzo-bouwplan-v0.1.md`
- `docs/audits/fase-1-rls-bewijsmatrix-v0.1.md`
- `docs/testing/browser-testdata-v0.1.md`
- `docs/testing/test-strategy-v0.1.md`
- `tests/e2e/README.md`
- `tests/e2e/fixtures/browser-data.ts`
- `tests/e2e/fixtures/reset-browser-data.sql`
- `tests/unit/e2e-browser-data.test.ts`
- `tests/e2e/fixtures/auth.ts`
- `playwright.config.ts`
- `supabase/tests/README.md`
- `.github/workflows/samzo-rls-ci.yml`
- `package.json`

## 3. Vooraf-controles

| Controle | Beoordeling |
| --- | --- |
| Past binnen bouwplan? | Ja. Stap 1E is expliciet een mini-audit van RLS-testbasis en resetbare browserdata. |
| Logische fase? | Ja. Fase 1 sluit de testpoorten af voor Fase 2A start. |
| Juiste model? | Ja. GPT-5.5 Hoog past bij audit, RLS, privacy en bouwvolgorde. |
| Privacyrisico's? | Geen blokkerend risico gevonden. Fixture gebruikt fictieve `@example.test`-data en geen wachtwoorden. |
| RLS-risico's? | Geen nieuwe RLS-wijziging. Bestaande pgTAP-route is groen in GitHub Actions. |
| Afhankelijkheden? | Fase 0C, 1A, 1C en 1D zijn aanwezig; CI-route draait op de stabiele vervolgbranch. |

## 4. RLS-testbasis

De RLS-testbasis blijft pgTAP-first en loopt via `npm run test:rls` tegen een
lokale Supabase database. Lokaal op de Shadow cloud-pc is Docker Desktop niet
beschikbaar, waardoor `npm run test:rls` daar niet kan verbinden met
`127.0.0.1:54322`. Dit is een bekend Fase 1-risico en wordt ondervangen door
de GitHub Actions-runtime.

Laatste objectieve RLS-bewijs:

| Onderdeel | Waarde |
| --- | --- |
| Workflow | `SAM&ZO RLS CI` |
| Run | `27066892330` |
| Commit | `15f0a72520876e3659416f4393238c9513a83d22` |
| Branch | `fase-2-personal-items-green-base` |
| Status | `completed` |
| Conclusie | `success` |
| URL | `https://github.com/rickyfr1987-netizen/samenzo/actions/runs/27066892330` |

De workflow draait typecheck, lint, Vitest, lokale Supabase start/reset,
seed/RLS-controle en pgTAP RLS-tests. Er worden geen Supabase secrets, remote
projecten of service-role credentials gebruikt.

## 5. Browserdatafixture

De resetbare browserdata is dev-only en staat buiten de migratieketen:

- `tests/e2e/fixtures/reset-browser-data.sql`
- `tests/e2e/fixtures/browser-data.ts`

Beoordeling:

| Punt | Beoordeling |
| --- | --- |
| Vaste fictieve profielen | GO. Bas, Sanne, Milan, Sam en Gijs gebruiken `@example.test`. |
| Auth-wachtwoorden | GO. Geen wachtwoordwaarde in SQL, TS, docs of Playwright-config. |
| Auth-koppeling | GO met aandachtspunt. SQL koppelt alleen bestaande lokale `auth.users` op e-mail; er staan geen Auth-user IDs in Git. |
| Resetbaarheid | GO. Delete-then-insert binnen transactie, met vaste `8e2e...` UUID's. |
| Scope van deletes | GO. Deletes richten zich op eigen fixture-ID's of afhankelijke records rond die fixture-ID's. |
| Scenario's | GO. Voorstel, supportvraag, actieve/claimbare taak, actieve/claimbare rol, gastcontext en Mijn dag zijn aanwezig. |
| CI-uitvoering fixture | Aandachtspunt. De fixture wordt nog niet automatisch in CI toegepast; dit moet bij de eerste echte muterende Playwright-flow gebeuren. |

De unit-test `tests/unit/e2e-browser-data.test.ts` bewaakt dat de TS-ID's in de
SQL voorkomen, dat de vaste datum `2026-06-06` gelijk blijft en dat de SQL geen
service-role of runtime-authconfigwaarde bevat.

## 6. Browser-smoke

Playwright is smal en veilig ingericht:

- `screenshot`, `trace` en `video` staan uit.
- `fullyParallel` staat uit.
- De auth-fixture leest alleen `SAMZO_E2E_EMAIL`, `SAMZO_E2E_PASSWORD` en
  `SAMZO_E2E_PROFILE_NAME`.
- Bij ontbrekende runtime-authconfig skipped de smoke test zonder secrets te
  loggen.

Laatste lokale 1D-controle:

| Check | Resultaat |
| --- | --- |
| `npm.cmd run typecheck` | Groen |
| `npm.cmd run lint` | Groen |
| `npm.cmd run test` | Groen, 12 files en 101 tests |
| `npm.cmd run test:rls` lokaal | Geblokkeerd door ontbrekende lokale Docker/Supabase-runtime |
| `npm.cmd run test:e2e -- tests/e2e/mijn-dag-auth-smoke.spec.ts` | Veilig geskipt door ontbrekende runtime-authconfig |
| GitHub Actions RLS CI | Groen |

## 7. Open aandachtspunten

| Prioriteit | Punt | Beoordeling |
| --- | --- | --- |
| Gemiddeld | De reset-SQL is schema-audited en door unit-test gespiegeld, maar nog niet als aparte fixturestap uitgevoerd in CI. | Niet blokkerend voor 2A, wel verplicht uitwerken voordat Fase 2C muterende browserflows bouwt. |
| Gemiddeld | Lokale Docker/Supabase-runtime ontbreekt op de Shadow cloud-pc. | Niet blokkerend zolang GitHub Actions de objectieve RLS-poort blijft. |
| Gemiddeld | Enkele oudere documenten noemen nog Fase 1H/1I/1J als historische stapnamen. | Niet blokkerend; het bouwplan is leidend, maar documentnamen kunnen later worden opgeschoond. |
| Gemiddeld | GitHub Actions toont een Node.js 20-actions deprecation-waarschuwing voor gebruikte actions. | Niet blokkerend voor huidige groene runs, wel CI-onderhoud voor later. |
| Laag | De fixture gebruikt vaste datum `2026-06-06`. | Bewust en geschikt voor reproduceerbaarheid; toekomstige tests moeten deze datum expliciet gebruiken. |

## 8. Besluit

Resultaat: GO.

Fase 1 is voldoende gecontroleerd om door te gaan naar Fase 2A, omdat:

- het bouwplan voor Fase 1 is gevolgd;
- RLS via GitHub Actions groen is op de stabiele vervolgbranch;
- browser-auth geen secrets of artifacts vastlegt;
- resetbare browserdata bestaat, is gedocumenteerd en is niet als productseed of
  migratie toegevoegd;
- open punten niet blokkeren voor de analyse-only stap 2A.

Voor Fase 2C of andere echte browserflows geldt wel een harde poort: de
browserfixture moet dan actief worden toegepast in de testopzet en de flow mag
geen volgorde-afhankelijke of niet-resetbare data muteren.
