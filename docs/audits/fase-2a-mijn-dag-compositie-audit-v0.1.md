# SAM&ZO Fase 2A audit Mijn dag-compositie v0.1

## 1. Doel

Deze audit toetst de huidige Mijn dag-compositie aan de bronregels, het
bouwplan en de bestaande queryhelpers. De stap bouwt geen productcode,
migratie, RLS-policy, RPC, UI-wijziging, Playwright-flow, plusknop of 2O-b.

Datum: 2026-06-06.
Branch: `fase-2-personal-items-green-base`.
Laatste uitgangscommit: `e4c8871d9fad9dbec0d701538c83c5531efba6e7`.

## 2. Gelezen bronnen

- `docs/planning/samzo-bouwplan-v0.1.md`
- `docs/functional/mijn-dag-compositie-v0.1.md`
- `docs/audits/fase-1e-rls-browserdata-mini-audit-v0.1.md`
- `docs/testing/test-strategy-v0.1.md`
- `src/lib/mijn-dag/items.ts`
- `app/mijn-dag/page.tsx`
- `src/lib/voorstellen/items.ts`
- `src/lib/tijdlijn/items.ts`
- `tests/unit/mijn-dag.items.test.ts`
- `tests/unit/tijdlijn.items.test.ts`
- `tests/integration/mijn-dag.page.test.tsx`

## 3. Vooraf-controles

| Controle | Beoordeling |
| --- | --- |
| Past binnen bouwplan? | Ja. Fase 2A is expliciet een analyse/audit van Mijn dag-compositie. |
| Logische fase? | Ja. Fase 1 is met GO afgerond; Fase 2 start met analyse zonder mutatie. |
| Juiste model? | Ja. GPT-5.5 Hoog past bij compositie, profielcontext, privacy en RLS-audit. |
| Privacyrisico's? | Geen blokkerend lek gevonden; gekoppelde documenten/doelen blijven afhankelijk van eigen RLS-query. |
| RLS-risico's? | Geen RLS-wijziging in deze stap. Bestaande RLS-bewijsroute is groen in CI. |
| Afhankelijkheden? | Fase 1E GO, resetbare browserdata en CI-route zijn aanwezig. |

## 4. Bronregels voor Mijn dag

Leidende regels uit bouwplan en functionele specificatie:

- Mijn dag is de persoonlijke werkelijkheid van het actieve profiel.
- Groepszichtbaarheid alleen is niet genoeg voor een Mijn dag-item.
- Gekoppelde items geven geen extra leesrecht; document-, doel-, moment- en
  taak-RLS blijven zelfstandig leidend.
- Definitieve persoonlijke werkelijkheid ontstaat alleen via eigen profiel of
  expliciete acceptatie.
- Profieltoegang mag kijken, maar niet stilzwijgend persoonlijke keuzes maken.
- 2O-b, plusknop, persoonlijke taak en persoonlijk aandachtspunt blijven
  geparkeerd.

De functionele specificatie bevat historische tekst waarin doelacceptatieknoppen
nog uitgesteld waren. Het actuele bouwplan en de huidige codebasis vermelden
doelacceptatie-acties als al gebouwd met RPC, helper en eigen-profiel-gating.
Voor deze audit is het bouwplan leidend.

## 5. Huidige compositie

| Bron | Helper/UI | Beoordeling |
| --- | --- | --- |
| Deelnames | `fetchMijnDagItems` filtert op `deelnames.profiel_id`, actieve statussen, dagrange en `archived_at is null`. | GO. Persoonlijke relatie staat centraal. |
| Rolbezettingen | `fetchMijnDagItems` filtert op `rolbezettingen.profiel_id` en `status = actief`, daarna momentdag. | GO. Eigen rolbezetting is persoonlijke werkelijkheid. |
| Eigenaar-profiel momenten | `fetchMijnDagItems` filtert op `momenten.eigenaar_profiel_id`, niet-gearchiveerd en actieve momentstatussen. | GO voor read-only compositie. Mutatie blijft geparkeerd. |
| Open momentvoorstellen | `fetchOpenMomentProposalsForProfile` filtert op ontvangend profiel en status `open`; pagina toont actie alleen bij eigen profiel. | GO. Voorstellen blijven persoonlijke regie. |
| Taken | `fetchMijnDagTaskItems` start bij `taakuitvoerders.profiel_id`, filtert actieve uitvoerderstatussen en taakdatum. | GO. Lijstcontext alleen maakt geen Mijn dag-taak. |
| Document-attenties | `fetchMijnDagDocumentAttentionItems` eist profielgerichte attentie en haalt daarna `documenten` apart op. | GO. Verboden documenten vallen weg wanneer document-RLS geen rij teruggeeft. |
| Doel-attenties | `fetchMijnDagGoalAttentionItems` eist eigen `doelacceptaties` met actieve status en haalt daarna `doelen` apart op. | GO. Verborgen doelen vallen weg wanneer doel-RLS geen rij teruggeeft. |
| Geaccepteerde doelen | `fetchMijnDagAcceptedGoalItems` toont alleen geaccepteerde eigen doelacceptaties binnen doelperiode of acceptatiedag. | GO. Read-only persoonlijk doelitem, geen dashboard. |
| Tijdlijn/support/signalen | `mapTimelineAttentionItems` filtert op profielgerichte aandacht en sluit document-attenties uit voor de veilige documenthelper. | GO met aandachtspunt. De filter gebeurt na `fetchVisibleTimelineItems`; RLS blijft leidend, maar 2B kan labels/states verbeteren zonder querywijziging. |

## 6. Testdekking

Huidige tests bewijzen de belangrijkste compositieregels op helper- en
componentniveau:

- deduplicatie van hetzelfde moment met meerdere redenen;
- eigenaar-profiel moment read-only zichtbaar;
- afgerond eigenaar-profiel moment niet actief;
- taken alleen via taakuitvoerder en gekozen dag;
- document-attenties alleen wanneer document-RLS data teruggeeft;
- groepsgerichte documentaandacht niet persoonlijk;
- doel-attenties alleen bij zichtbare doelen en actieve acceptatiestatus;
- geaccepteerde doelen read-only en datumgebonden;
- open momentvoorstel als momentkaart met knoppen;
- geaccepteerde deelname en rolbezetting als persoonlijke items;
- niet-geclaimde taak niet zichtbaar;
- profielgerichte tijdlijn-aandacht wel, groepscontext niet;
- doelacceptatieknoppen alleen in eigen profielperspectief;
- profielwissel herlaadt data.

RLS wordt niet door deze Vitest-mocks bewezen. De RLS-laag blijft bewezen via
pgTAP en GitHub Actions, zoals vastgelegd in Fase 1E.

## 7. Aandachtspunten voor 2B

Deze punten zijn geschikt voor de volgende bouwstap, omdat ze bestaande UI,
labels, sortering en foutmeldingen raken zonder dat datamodel, RLS, RPC of
nieuwe functionaliteit hoeft te wijzigen:

| Punt | Advies voor 2B | Niet doen |
| --- | --- | --- |
| Statuslabels | Maak statuslabels rustiger en consistenter voor `later_bekijken`, `actie_nodig`, `in_behandeling`, `voorgesteld` en `geaccepteerd`. | Geen nieuwe statussen of statuslogica. |
| Actielabels | Harmoniseer voorstel- en doelacties waar passend: voorstel gebruikt `Afwijzen`, doel gebruikt `Weigeren`. | Geen nieuwe acties of andere RPC-aanroepen. |
| Sortering | Houd sortering stabiel bij gelijke tijden en zet ongedateerde items niet onbedoeld bovenaan. | Geen wijziging in welke items zichtbaar zijn. |
| Foutmeldingen | Houd technische RLS/Supabase-errors buiten de UI en toon rustige herstelbare tekst. | Geen foutdetails, IDs of auth-context lekken. |
| Eigen-profiel waarschuwing | Maak de waarschuwing voor bekeken profiel compact en minder foutachtig als er geen echte fout is. | Geen actieknoppen tonen in andermans profielperspectief. |
| Lege/laadstatus | Verfijn tekst en toegankelijkheid zonder nieuwe flows. | Geen plusknop, formulier of persoonlijke invoer. |
| Document/doel links | Behoud link alleen wanneer de veilige helper het zichtbare document/doel heeft teruggegeven. | Geen links maken vanuit generieke tijdlijn-attentie naar verboden gekoppelde items. |

## 8. Niet bouwen in 2B

- Geen persoonlijke momentmutatie.
- Geen plusknop of formulier.
- Geen persoonlijke taakcreatie.
- Geen persoonlijk aandachtspunt.
- Geen begeleider-naar-client definitieve mutatie.
- Geen nieuwe RLS-policy, migratie of RPC.
- Geen nieuwe browserflow; Playwright komt pas in 2C met resetdata.
- Geen categoriegedreven rechten of zichtbaarheid.

## 9. Besluit

Resultaat: GO.

Fase 2B mag starten als smalle UI/teststap rond bestaande Mijn dag-items:

- UI-states;
- sortering;
- status- en actielabels;
- foutmeldingen;
- component-/unitdekking voor die bestaande UI-gedragingen.

Er is geen reden om 2O-b, persoonlijke plusknop, RLS-wijziging of nieuwe
muterende persoonlijke flow in 2B te bouwen.
