# SAM&ZO browser-testdata v0.1

## 1. Doel

Dit document legt de Fase 1-basis vast voor toekomstige Playwright-browserflows.
Het doel is reproduceerbaarheid zonder wachtwoorden, sessies, screenshots,
traces of storage state in Git op te slaan.

RLS-bewijs loopt niet via Playwright. RLS blijft bewezen via pgTAP en GitHub
Actions (`SAM&ZO RLS CI`).

## 2. Runtime-authconfig

De minimale Playwright-authrooktest gebruikt alleen runtimevariabelen:

| Variabele | Doel |
| --- | --- |
| `SAMZO_E2E_EMAIL` | Fictief lokaal Auth-account dat aan een seedpersoon is gekoppeld. |
| `SAMZO_E2E_PASSWORD` | Runtimewaarde voor het gedeelde lokale testwachtwoord. |
| `SAMZO_E2E_PROFILE_NAME` | Verwachte zichtbare profielnaam na login. |

Waarden horen niet in code, documentatie, commits, GitHub Actions, fixtures,
storage state, screenshots, traces of logs. Als een variabele ontbreekt, slaat
de rooktest veilig over.

Aanbevolen eerste rooktestaccount:

| Variabele | Aanbevolen waarde |
| --- | --- |
| `SAMZO_E2E_EMAIL` | `sam.bewoner@example.test` |
| `SAMZO_E2E_PROFILE_NAME` | `Sam Bewoner` |

Het wachtwoord wordt alleen runtime gezet en wordt nergens vastgelegd.

## 3. Browserdata-catalogus

| Profiel | E-mail | Rol | Geschikt voor | Risico's en grenzen |
| --- | --- | --- | --- | --- |
| Bas Beheerder | `bas.beheerder@example.test` | `systeembeheerder` | Beheercontext en later brede zichtbaarheidscontrole. | Niet als eerste rooktest gebruiken; beheerrechten kunnen te veel zichtbaarheid geven en regressies maskeren. Mutaties alleen met resetbaar scenario. |
| Sanne Systeemondersteuner | `sanne.support@example.test` | `systeemondersteuner` | Supportcontext en later lichte supportcontrole. | Supportvragen mogen geen ticketsysteem of chatflow worden. Mutaties alleen in apart resetbaar supportscenario. |
| Milan Medewerker | `milan.medewerker@example.test` | `medewerker` | Medewerkercontext, planning/rolcontext en later begeleidingsnotitie-observatie. | Begeleidingsnotities zijn privacykritisch; browserflows mogen pas muteren na expliciete resetdata. |
| Sam Bewoner | `sam.bewoner@example.test` | `lid` | Eerste auth-rooktest, Mijn dag, persoonlijke regie en bewonersplanning. | Beste startprofiel, maar voorstel-/deelname-acties muteren data en moeten later eigen resetbare scenario's krijgen. |
| Gijs Gast | `gijs.gast@example.test` | `gast` | Later gastcontext en beperkte zichtbaarheid. | Niet in Stap 1I testen; gastflows vragen aparte negatieve/positieve browsercases. |

Alle e-mails zijn fictief en horen bij de bestaande Fase 1-seedlijn. De
migratie-seedlijn bevat geen Auth-users; Auth-koppeling blijft een lokale
runtimevoorwaarde.

## 4. Resetstrategie

### A. RLS/databasebewijs

- Route: GitHub Actions.
- Workflow: `SAM&ZO RLS CI`.
- Branches: `fase-1b-ci-rls-proof` en `fase-2-personal-items-green-base`.
- Reset: `supabase start` en `supabase db reset --local`.
- Test: `npm run test:rls`.
- Secrets: niet nodig.
- Remote Supabase: niet geraakt.

### B. Browser-rooktest

- Route: Playwright tegen een lokale Next-app.
- Test: `npm run test:e2e -- tests/e2e/mijn-dag-auth-smoke.spec.ts`.
- Auth: runtime-only via `SAMZO_E2E_EMAIL`, `SAMZO_E2E_PASSWORD` en
  `SAMZO_E2E_PROFILE_NAME`.
- Mutaties: geen bewuste datamutaties.
- Bewijs: app start, dev-login werkt, profielcontext verschijnt in `/mijn-dag`.
- Skip: veilig als runtime-authconfig ontbreekt.

### C. Toekomstige muterende browserflows

Muterende browserflows mogen pas worden toegevoegd als het scenario vooraf
resetbaar is. Voorbeelden:

| Flow | Mutatie | Resetvoorwaarde |
| --- | --- | --- |
| Voorstel accepteren/weigeren | Wijzigt voorstelstatus en eventueel deelname. | Eigen voorstel-seed of resetstap per run. |
| Deelname aanmelden/afmelden | Wijzigt deelname-status. | Eigen moment/deelname-testdata met vaste beginstatus. |
| Rol claimen/vrijgeven | Wijzigt rolbezetting. | Eigen rolbezetting met vaste capaciteit/beginstatus. |
| Supportantwoord/sluiten | Wijzigt supportvraag en reacties. | Eigen supportvraag/reactie-seed zonder ticketmodule-uitbreiding. |
| Begeleidingsnotitie toevoegen | Maakt privacykritische notitie. | Alleen met expliciete privacy- en resetafspraken. |

Tot Stap 1J is de browserlaag dus beperkt tot een auth/profielcontext-rooktest.
Volledige Mijn dag-, Planning-, support-, gast- en begeleidingsnotitieflows
blijven buiten Stap 1I.

## 5. Artifactbeleid

Playwright screenshots, video en traces staan standaard uit in
`playwright.config.ts`. Er wordt geen storage state bewaard. Als een toekomstige
flow toch artifacts nodig heeft, moet vooraf worden beoordeeld of daarin
profielcontext, sessiegegevens of andere gevoelige informatie kan staan.
