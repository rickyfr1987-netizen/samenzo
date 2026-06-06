# E2E Tests

Playwright is geconfigureerd via `playwright.config.ts`. Fase 1 Stap 1H voegt
alleen een minimale auth-rooktest toe voor de bestaande dev-login en
`/mijn-dag` profielcontext.

De browserdata-catalogus en resetstrategie staan in
`docs/testing/browser-testdata-v0.1.md`.

Rooktest:

```bash
npm run test:e2e -- tests/e2e/mijn-dag-auth-smoke.spec.ts
```

De test voert alleen echt loginwerk uit als deze runtime-variabelen lokaal
beschikbaar zijn:

| Variabele | Doel |
| --- | --- |
| `SAMZO_E2E_EMAIL` | Fictief lokaal Auth-account, bijvoorbeeld een gekoppeld `@example.test` account. |
| `SAMZO_E2E_PASSWORD` | Runtimewaarde voor het gedeelde lokale testwachtwoord. |
| `SAMZO_E2E_PROFILE_NAME` | Verwachte zichtbare profielnaam na login. |

Als deze waarden ontbreken, slaat de rooktest zichzelf over. Bewaar geen
storage state in Git; de test logt per run opnieuw in via `/beheer/dev-login`.
Gebruik als eerste rooktestprofiel bij voorkeur `sam.bewoner@example.test` met
verwachte profielnaam `Sam Bewoner`.

## Resetbare browserdata

Voor toekomstige browserflows is er een dev-only resetfixture:

- `tests/e2e/fixtures/reset-browser-data.sql`
- `tests/e2e/fixtures/browser-data.ts`

Voer de SQL alleen lokaal uit na de normale Supabase dev-seed. De fixture reset
eigen `8e2e...` records voor voorstel, supportvraag, actieve/claimbare taak,
actieve/claimbare rol, gastzichtbaarheid en Mijn dag op `2026-06-06`.
Auth-wachtwoorden staan niet in Git en blijven runtime-only via de bestaande
`SAMZO_E2E_*` variabelen.

Alle e2e-tests moeten:

- draaien tegen een lokale Next-app en lokale Supabase-context;
- eerst de lokale testdata resetten of een expliciet resetbaar scenario kiezen;
- inloggen via een runtime fixture of handmatige lokale sessie;
- geen wachtwoorden, tokens of Auth-user IDs opslaan in code, fixtures,
  screenshots, traces of documentatie.

Playwright screenshots, video en traces staan uit in de basisconfig om te
voorkomen dat login- of profielcontext per ongeluk in artifacts belandt.
RLS wordt niet met Playwright bewezen; RLS blijft via pgTAP en GitHub Actions
bewezen. De resetstrategie voor browserdata staat in
`docs/testing/browser-testdata-v0.1.md`.
Muterende browserflows worden pas toegevoegd nadat hun data vooraf resetbaar is.
