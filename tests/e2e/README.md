# E2E Tests

Playwright is geconfigureerd via `playwright.config.ts`. Fase 1 Stap 1H voegt
alleen een minimale auth-rooktest toe voor de bestaande dev-login en
`/mijn-dag` profielcontext.

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

Alle e2e-tests moeten:

- draaien tegen een lokale Next-app en lokale Supabase-context;
- eerst de lokale testdata resetten of een expliciet resetbaar scenario kiezen;
- inloggen via een runtime fixture of handmatige lokale sessie;
- geen wachtwoorden, tokens of Auth-user IDs opslaan in code, fixtures,
  screenshots, traces of documentatie.

Playwright screenshots, video en traces staan uit in de basisconfig om te
voorkomen dat login- of profielcontext per ongeluk in artifacts belandt.
RLS wordt niet met Playwright bewezen; RLS blijft via pgTAP en GitHub Actions
bewezen. Resetbare browserdata wordt in Stap 1I verder uitgewerkt.
