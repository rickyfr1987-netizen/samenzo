# Lokale werkroute en modelverdeling v0.1

Datum: 2026-06-10

## Doel

Deze werkroute legt vast hoe we na de overstap naar de eigen pc verder bouwen:

- lokaal uitvoeren wat lokaal kan;
- Docker/Supabase lokaal gebruiken als primaire bewijsruntime;
- GitHub/online alleen gebruiken voor versiebeheer, CI-bewijs en latere
  overdracht naar online omgevingen;
- per stap expliciet kiezen tussen ChatGPT 5.5 en GPT-5.3 Codex met passend
  redeneerniveau.

## Huidige lokale status

| Onderdeel | Status |
| --- | --- |
| Projectmap | `C:\Users\user\Documents\Codex\samzo-app` |
| Lokale Supabase/Docker | Werkend; `db reset` en volledige RLS-suite zijn groen gedraaid. |
| Next-app | Lokale app en health-route gaven HTTP 200. |
| Git | Nog niet hersteld in deze map; `.git` ontbreekt lokaal. |
| GitHub-connector | Beschikbaar, maar gaf geen toegankelijke repositories terug. |
| Remote Supabase | Niet gebruiken als bewijsruntime voor RLS of muterende tests, tenzij apart goedgekeurd. |

## Modelkeuze

| Werksoort | Model | Redeneerniveau | Reden |
| --- | --- | --- | --- |
| Architectuur, privacy, RLS-ontwerp, datamodel, voorstelroutes, remote rollout | ChatGPT 5.5 | Hoog tot Extra Hoog | Deze keuzes raken rechten, persoonlijke regie, gegevensmodel of online risico. |
| Korte audits, statuscontrole, beslisnotities | ChatGPT 5.5 | Middel tot Hoog | Analyse moet coherent zijn, maar hoeft meestal geen code te wijzigen. |
| Implementatie van al ontworpen backend/UI-stappen | GPT-5.3 Codex | Hoog | Uitvoering, tests en integratie zijn hier belangrijker dan nieuw ontwerp. |
| Kleine fixes, documentatie, testnaamgeving, onderhoud | GPT-5.3 Codex | Middel | Beperkte scope; snelheid en consistentie zijn voldoende. |
| Grote implementatie na GO op ontwerp | GPT-5.3 Codex | Extra Hoog | Veel bestanden en testpoorten, maar de inhoudelijke richting moet al vastliggen. |

Escalatieregel:

- Als een stap RLS, eigenaarschap, profielcontext, voorstelstatus,
  taakuitvoerderschap, gasttoegang of remote data raakt, eerst ChatGPT 5.5.
- Als een stap alleen ontworpen functionaliteit uitvoert en de privacygrenzen
  vastliggen, GPT-5.3 Codex.

## Werkvolgorde

| Stap | Doel | Runtime | Model | Redeneerniveau | Status/actie |
| --- | --- | --- | --- | --- | --- |
| 0 | Git/repo-koppeling herstellen zonder lokale wijzigingen kwijt te raken. | Lokaal + GitHub | GPT-5.3 Codex; bij history-conflict ChatGPT 5.5 | Middel; bij conflict Hoog | Wacht op juiste repo-URL of GitHub App-toegang. Geen destructive git-acties. |
| 1 | Lokale basis bevestigen: Docker, Supabase, app, testpoorten. | Lokaal | GPT-5.3 Codex | Middel | Reeds groen; herhalen na repo-herstel of grotere wijziging. |
| 2 | Fase 2C inhalen: Playwright Mijn dag-auth smoke met resetbare browserdata. | Lokaal | GPT-5.3 Codex | Hoog | Eerst fixture toepassen, dan e2e draaien; geen secrets in repo/logs. |
| 3 | Fase 2O-b pgTAP-pilot voor eigen persoonlijk moment. | Lokaal | ChatGPT 5.5 voor ontwerp/audit, daarna GPT-5.3 Codex voor uitvoering | Extra Hoog, daarna Hoog/Extra Hoog | Nog niet bouwen zonder groene pgTAP-pilot. |
| 4 | Fase 4B product-UI voor groepseigen lijst-/taakbeheer. | Lokaal | GPT-5.3 Codex | Hoog | Backend/RLS is groen; UI kan na stap 0/1, met componenttests. |
| 5 | Fase 4C taakvoorstellen/overdracht ontwerpen. | Lokaal analyse | ChatGPT 5.5 | Hoog | Eerst ontwerp; taakuitvoerderschap blijft persoonlijke werkelijkheid. |
| 6 | Online overdracht testen via GitHub CI. | GitHub Actions | GPT-5.3 Codex; bij workflowstrategie ChatGPT 5.5 | Middel/Hoog | Alleen na lokale groene checks. CI draait lokale Supabase, geen remote project. |
| 7 | Remote Supabase rollout of staging-check. | Online/staging | ChatGPT 5.5 | Hoog/Extra Hoog | Alleen met aparte GO; migraties, secrets en data-impact vooraf expliciet maken. |

## Lokale poorten per bouwstap

Minimale lokale poort voor gewone codewijzigingen:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
```

Extra poort bij RLS, migraties, RPCs of privacygevoelige queries:

```powershell
npx.cmd supabase db reset --local
npm.cmd run test:rls
```

Extra poort bij browserflows:

```powershell
npm.cmd run test:e2e -- tests/e2e/mijn-dag-auth-smoke.spec.ts
```

Extra poort voor release-achtige zekerheid:

```powershell
npm.cmd run build
```

## Online gebruik

Online is geen vervanging voor lokale RLS-bewijsvoering.

Wel online:

- GitHub als versiebeheer en herstelpunt;
- GitHub Actions als onafhankelijke CI-runtime;
- later een remote/staging Supabase-migratiecheck na lokale groene tests.

Niet online zonder aparte GO:

- remote Supabase-data muteren om tests groen te krijgen;
- service-role gebruiken in frontend, Playwright of gewone testflows;
- secrets, wachtwoorden of Auth-user-id's in docs, repo of logs opslaan;
- remote productie/staging wijzigen zonder rollback- en migratieplan.

## Directe blokkade

De lokale map heeft geen `.git`. Voor stap 0 is nodig:

1. de juiste GitHub repo-URL; of
2. GitHub App-toegang tot de repo zodat de connector de repository kan zien.

Na die input kan de repo-koppeling lokaal worden hersteld zonder eerst nieuwe
productfunctionaliteit te bouwen.
