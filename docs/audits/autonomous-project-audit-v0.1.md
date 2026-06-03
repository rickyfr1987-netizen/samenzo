# SAM&ZO autonome projectaudit v0.1

## 1. Samenvatting

De app is voorbij Slice 0 gegroeid en bevat een werkende technische basis voor Auth-context, RLS-gedreven dataweergave, planning, momentdetails, Mijn dag, lijsten/taken, documenten, doelen, leden, tijdlijn en voorstellen. TypeScript, lint en productiebuild zijn groen.

De huidige status is echter nog geen complete SAM&ZO-MVP. De grootste gaten zitten in testdekking, categoriegedrag, beheer-/creatieflows, gasttoegang, begeleidingsnotities, supportflow en de atomische afhandeling van voorstelacceptatie/weigering. De code volgt op veel plekken de documentlogica, maar gevoelige voorstelstatussen worden nog via directe client-updates plus losse deelname-update afgehandeld. Dat wijkt af van de architectuurrichting om gecontroleerde RPC/statusworkflows te gebruiken.

## 2. Uitgevoerde controles

Gecontroleerde bronnen:

| Bron | Gecontroleerd |
| --- | --- |
| `docs/source/` | `.docx`-documenten uitgelezen op kernbegrippen en leidende SAM&ZO-regels |
| `docs/architecture/` | `.docx`-documenten en `samzo_supabase_sql_migratie_v_0_2.sql` gecontroleerd |
| `app/` | Routes, UI-staten, acties en links gecontroleerd |
| `components/` | `AppHeader` en placeholderstatus gecontroleerd |
| `src/lib/` | Datahelpers, acties, Supabase-client en contexthelpers gecontroleerd |
| `supabase/migrations/` | Tabellen, enums, constraints, indexes, RLS enablement, policies en seed/resetmigraties gecontroleerd |
| `supabase/seed/` | Development seedbestand en README gecontroleerd |
| `tests/` en `supabase/tests/` | Teststructuur en testbestanden gecontroleerd |
| remote Supabase | Read-only tellingen, voorstelstatussen, deelnamestatussen, momentroltypen en schema-lint gecontroleerd |

Uitgevoerde commando's:

| Commando | Resultaat |
| --- | --- |
| `npm.cmd run typecheck` | Geslaagd |
| `npm.cmd run lint` | Geslaagd |
| `npm.cmd run build` | Geslaagd |
| `npm.cmd test` | Gefaald: script `test` ontbreekt |
| `npx.cmd supabase --help` | Geslaagd |
| `npx.cmd supabase db --help` | Geslaagd |
| `npx.cmd supabase test --help` | Geslaagd |
| `npx.cmd supabase inspect --help` | Geslaagd |
| `npx.cmd supabase --version` | `2.103.0` |
| `npx.cmd supabase status` | Gefaald: Docker Desktop pipe niet beschikbaar |
| `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none` | Geslaagd, geen schema-errors |
| `npx.cmd supabase db advisors --linked --type all --level warn --fail-on none` | Timeout na circa 124s |
| `npx.cmd supabase db query --linked ...` | Read-only tellingen geslaagd, enkele parallelle queries time-outten en zijn daarna los herhaald |

Remote dataobservaties:

| Observatie | Waarde |
| --- | --- |
| Personen | 5 |
| Personen gekoppeld aan `auth_user_id` | 5 |
| Profielen | 5 |
| Groepen | 4 |
| Momenten | 8 |
| Lijsten | 4 |
| Taken | 16 |
| Documenten | 2 |
| Doelen | 1 |
| Supportvragen | 1 |
| Tijdlijnberichten | 3 |
| Begeleidingsnotities | 0 |
| Voorstellen | 7 totaal: 2 open, 4 geaccepteerd, 1 geweigerd |
| Deelnames | 2 voorgesteld, 2 uitgenodigd, 3 geaccepteerd, 8 ingeschreven, 4 afgemeld, 1 wachtlijst |
| Momentroltypen | `uitvoerder`, `ondersteuner`, `begeleider`, `organisator`; geen seeded `deelnemer`-rol gevonden |

## 3. Build/lint/test-resultaten

`npm.cmd run typecheck` is geslaagd met `tsc --noEmit`.

`npm.cmd run lint` is geslaagd met `eslint .`.

`npm.cmd run build` is geslaagd met Next.js 16.2.6 en genereert routes voor:

| Route | Status |
| --- | --- |
| `/` | static |
| `/beheer` | static |
| `/beheer/dev-login` | static |
| `/beheer/supabase-health` | static |
| `/documenten` | static |
| `/documenten/[documentId]` | dynamic |
| `/doelen` | static |
| `/doelen/[doelId]` | dynamic |
| `/leden` | static |
| `/leden/[profielId]` | dynamic |
| `/lijsten` | static |
| `/lijsten/[lijstId]` | dynamic |
| `/mijn-dag` | static |
| `/planning` | static |
| `/planning/[momentId]` | dynamic |
| `/tijdlijn` | static |

`npm.cmd test` is niet beschikbaar. Er is geen testscript in `package.json`, en de testmappen bevatten alleen README-placeholders.

Supabase `db lint --linked` is geslaagd zonder schema-errors. Supabase `db advisors --linked` is niet afgerond door timeout. Lokale Supabase status kon niet worden bepaald omdat Docker Desktop niet bereikbaar was.

## 4. Implementatiematrix

| Onderdeel | Status | Gevonden bestanden | Opmerkingen | Aanbevolen vervolgstap |
| --- | --- | --- | --- | --- |
| Projectstructuur | Deels geïmplementeerd | `app/`, `components/app-header.tsx`, `src/lib/`, `supabase/`, `tests/` | Echte code staat in `app` en `src/lib`; oude Slice-0 placeholdermappen `domain`, `hooks`, `lib`, `styles` blijven bestaan. | Structuurkeuze vastleggen: placeholdermappen opruimen of bewust reserveren. |
| Hoofdnavigatie | Geïmplementeerd basis | `app/page.tsx`, `components/app-header.tsx` | Routes naar kerngebieden bestaan; profielmenu is nog dev-login link. | Later vervangen door echt profielmenu/profielswitch. |
| Mijn dag | Deels geïmplementeerd | `app/mijn-dag/page.tsx`, `src/lib/mijn-dag/items.ts`, `src/lib/voorstellen/items.ts` | Toont persoonlijke momentkaarten uit deelnames, rolbezettingen en open momentvoorstellen. Mist taken, doelen, documenten en tijdlijn-attentie als persoonlijke dagitems. | Uitbreiden naar volledige persoonlijke werkelijkheid volgens UX-blauwdruk. |
| Planning | Deels geïmplementeerd | `app/planning/page.tsx`, `src/lib/planning/moments.ts` | Toont RLS-zichtbare momenten als gemeenschappelijke werkelijkheid. Geen echte filters op groep, categorie, datum of status. Dev-profielkeuze is alleen uitleg, geen RLS-context. | Planningfilters en beheer/creatie pas bouwen na expliciete scopekeuze. |
| Momentdetail | Deels geïmplementeerd | `app/planning/[momentId]/page.tsx`, `src/lib/moment/detail.ts`, `src/lib/moment/participation.ts`, `src/lib/moment/role-claims.ts` | Detail toont moment, groepen, deelname, lijsten, actieve deelnemers en rollen. Aanmelden, afmelden, rol claimen/vrijgeven en voorstelactie bestaan. | Kritieke flows testen en statuslogica rond rollen/deelnames reviewen. |
| Voorstellen/uitnodigingen | Deels geïmplementeerd | `src/lib/voorstellen/actions.ts`, `src/lib/voorstellen/items.ts`, `app/mijn-dag/page.tsx`, `app/tijdlijn/page.tsx`, `app/planning/[momentId]/page.tsx` | Momentvoorstellen worden in Mijn dag als momentkaart getoond; er is geen `/voorstellen` route. Accept/reject werkt via directe update op `voorstellen` en daarna deelname-update. | Vervangen door gecontroleerde RPC/statusworkflow en RLS-policy aanscherpen. |
| Tijdlijn | Deels geïmplementeerd | `app/tijdlijn/page.tsx`, `src/lib/tijdlijn/items.ts` | Combineert tijdlijnberichten, signalen, supportvragen en open voorstellen. Voorstelitems linken naar momentdetail en niet naar voorstelpagina. Geen read/unread, notificatiestatus, supportcreatie of echte inbox. | Tijdlijnstatussen, supportflow en voorstelbutton-zichtbaarheid testen/aanscherpen. |
| Lijsten en taken | Deels geïmplementeerd | `app/lijsten/page.tsx`, `app/lijsten/[lijstId]/page.tsx`, `src/lib/lijsten/items.ts`, `src/lib/lijsten/task-actions.ts` | Lijstoverzicht, detail, taakclaim, vrijgeven, afvinken en heropenen bestaan. Geen lijst-/taakcreatie of beheer. | Kritieke taakflowtests toevoegen en daarna creatieflow bepalen. |
| Documenten | Deels geïmplementeerd | `app/documenten/page.tsx`, `app/documenten/[documentId]/page.tsx`, `src/lib/documenten/items.ts` | Documenten worden informatief getoond met koppelingen. Begeleidingsnotities worden niet als documenten getoond, wat klopt. Geen creatie/publicatie/review. | Documentzichtbaarheid per groep testen; beheerflow later. |
| Doelen | Deels geïmplementeerd | `app/doelen/page.tsx`, `app/doelen/[doelId]/page.tsx`, `src/lib/doelen/items.ts` | Doelen en koppelingen naar momenten/lijsten/taken worden gelezen. Geen doelacceptatieflow, geen voorstelgedrag voor doelen. | Doelacceptaties/RLS eerst afmaken of UI bewust read-only houden. |
| Groepen | Deels geïmplementeerd | `src/lib/leden/items.ts`, `src/lib/moment/detail.ts`, migrations | Groepen sturen zichtbaarheid via RLS en worden in context getoond. Geen aparte groepsroute of groepsfilter-UX. | Groepsfilters en beheer alleen toevoegen na scopebesluit. |
| Profielen/personen | Deels geïmplementeerd | `app/leden/page.tsx`, `app/leden/[profielId]/page.tsx`, `src/lib/leden/items.ts`, `src/lib/samzo/current-context.ts`, `app/beheer/dev-login/page.tsx` | Persoon/profielscheiding zit in schema en context. Huidig profiel wordt alleen automatisch gekozen bij exact één actief profiel. Geen echte profielswitch. | Profielswitch bouwen voordat multi-profielscenario's serieus getest worden. |
| Rollen en rechten | Deels geïmplementeerd | `src/lib/moment/role-claims.ts`, RLS migrations, `src/lib/database.types.ts` | Vast rollenpalet bestaat in enum. Rolclaim/vrijgave bestaat. Geen brede rechten-UI of beheerscherm. | RLS- en e2e-tests voor claimcapaciteit en blokkades toevoegen. |
| Supportvragen | Aanwezig maar nog niet volwaardig gekoppeld | `src/lib/tijdlijn/items.ts`, `supabase/migrations/20260601000800_proposals_timeline_support_signals.sql` | Supportvragen worden in Tijdlijn gelezen. Er is geen supportvraagformulier, afhandel-UI of supportdetail. | Support via Tijdlijn als MVP-flow uitwerken. |
| Begeleidingsnotities | Aanwezig maar niet gekoppeld aan UI/data | `supabase/migrations/20260601000700_documents_notes.sql`, `supabase/migrations/20260601001600_rls_slice_4_documents_notes.sql`, generated types | Tabel bestaat zonder categorie. RLS is zeer conservatief: alleen systeembeheerder. Remote data telt 0 notities. | Medewerker/contextbeleid uit documenten vertalen naar RLS en UI-blok pas daarna bouwen. |
| Categoriegedrag | Aanwezig maar functioneel nog niet gebruikt | `categorieen`, `categorie_configuraties`, `src/lib/planning/moments.ts`, document/list/goal helpers | App toont categorienaam, maar gebruikt configuratie niet om velden, acties, rollen of statussen te sturen. | Categoriegedrag als aparte slice specificeren en testen. |
| Beheer | Minimale dev-tooling | `app/beheer/page.tsx`, `app/beheer/dev-login/page.tsx`, `app/beheer/supabase-health/page.tsx` | Beheer is vooral ontwikkelhulpmiddel. Geen productiebeheer voor personen, groepen, categorieën of rechten. | Duidelijk markeren als dev-only of vervangen door echte beheer-MVP. |

## 5. Functionele afwijkingen

| Afwijking | Impact | Bewijs/plek |
| --- | --- | --- |
| Voorstelacceptatie/weigering gebeurt niet atomisch via RPC. | Als voorstel-update lukt en deelname-update faalt, kan status inconsistent worden. Documentatie noemt gevoelige statusovergangen via RPC/gecontroleerde services. | `src/lib/voorstellen/actions.ts`, architectuur SQL v0.2 opmerkingen over `accept_voorstel`/`weiger_voorstel` |
| RLS-policy voor voorstelstatus is breder dan “alleen ontvangend profiel”. | `has_profieltoegang`, systeembeheerder en systeemondersteuner mogen volgens policy status bijwerken. Functioneel mag alleen de daadwerkelijke profieleigenaar persoonlijke voorstellen accepteren/weigeren; support/beheer mag hoogstens administratief ondersteunen/sluiten. | `supabase/migrations/20260602170000_rls_slice_4_voorstellen_update.sql` |
| Tijdlijn toont proposal action buttons op basis van `source/status`, zonder ontvangerprofiel in het item. | Een gebruiker die een voorstel via RLS ziet als voorsteller/beheerder kan acties zien die daarna pas falen door `.eq("ontvangend_profiel_id", profielId)`. | `src/lib/tijdlijn/items.ts`, `app/tijdlijn/page.tsx` |
| Mijn dag is nog beperkt tot momenten uit deelname/rol/voorstel. | Documenten noemen ook taken, herinneringen, persoonlijke doelen, belangrijke documenten en tijdlijn-attentie. | `src/lib/mijn-dag/items.ts`, UX-blauwdruk v1.1 |
| Planning mist echte gemeenschappelijke filters. | Planning hoort collectief filtergericht te zijn; huidige pagina is vooral een lijst van RLS-zichtbare momenten. | `app/planning/page.tsx` |
| Gasttoegang is nog niet generiek meegenomen in `can_view_moment`. | Documenten eisen expliciete gasttoegang; helpercomment zegt dat gasttoegang nog buiten helper valt. Gast kan alleen via eigen deelname/andere koppelingen zicht krijgen. | `src/lib/dev/profile-context.ts`, `supabase/migrations/20260604094500_fix_proposal_and_reactivation_participation_policies.sql` |
| Begeleidingsnotities zijn strikter dan de functionele medewerkercontext. | Documenten zeggen medewerker/contextgebonden zichtbaarheid; huidige RLS geeft alleen systeembeheerder toegang. Dit is veilig, maar functioneel onvolledig. | `supabase/migrations/20260601001600_rls_slice_4_documents_notes.sql` |
| Categorieconfiguratie stuurt nog geen UI-gedrag. | Categorieën zijn nu vooral labels. De documenten beschrijven gedrag, velden, acties, statussen, rollen en signalen. | `categorie_configuraties`, apphelpers |
| Oude Slice-0 README's zijn verouderd. | README's zeggen dat er geen Supabase/RLS/seeddata is, terwijl die nu wel bestaan. Dit kan nieuwe Codex-rondes misleiden. | `README.md`, `supabase/README.md`, `tests/README.md` |
| Oude voorstel-detail CSS staat nog in globale styling. | Geen runtimeprobleem, maar dode styling na het verwijderen van proposal detail route. | `app/globals.css` selectors `.voorstel-detail-*` |
| Foutmeldingen zijn niet overal gebruikersveilig. | Sommige pagina's tonen `error.message` rechtstreeks. Dat kan technische database/RLS-details lekken. | onder andere `app/mijn-dag/page.tsx`, `app/planning/page.tsx`, `components/app-header.tsx` |

## 6. Ontbrekende functionaliteit

### Kritiek voor MVP

| Functionaliteit | Waarom kritiek |
| --- | --- |
| Tests voor voorstel accepteren/weigeren inclusief deelname-update | Persoonlijke regie en statusconsistentie zijn kernlogica. |
| Atomische voorstelworkflow via RPC of gecontroleerde serveractie | Voorkomt half-verwerkte voorstel/deelname-statussen. |
| Aanscherping RLS voor voorstelstatussen | Moet aansluiten op “alleen profieleigenaar accepteert/weigert”. |
| Profielswitch of expliciet huidig profiel | Persoon/Profiel-scheiding is kernlogica; huidige context kiest alleen bij één profiel. |
| Mijn dag uitbreiden met taken en aandacht uit Tijdlijn | Mijn dag is nog niet de volledige persoonlijke werkelijkheid. |
| RLS-/e2e-tests voor Planning zichtbaarheid | Planning is gemeenschappelijke werkelijkheid en sterk afhankelijk van groepen/RLS. |
| Documentzichtbaarheid per groep testen | Documenten informeren, maar mogen geen persoonlijke dossiers of brede lekken worden. |
| Gasttoegang testen en eventueel helper uitbreiden | Gast met eigen Mijn dag staat expliciet in documenten. |

### Belangrijk maar later

| Functionaliteit | Reden |
| --- | --- |
| Categorieconfiguratie daadwerkelijk toepassen in UI | Nodig voor gedrag per categorie, maar kan na kernflows. |
| Supportvraag aanmaken en afhandelen via Tijdlijn | Support is kernconcept, maar kan eenvoudig starten. |
| Begeleidingsnotitieblok op relevante detailpagina's | Privacygevoelig; eerst RLS exact maken. |
| Beheer voor categorieën, groepen, personen/profielen | Nodig voor gebruik buiten devomgeving. |
| Lijst-/taakcreatie | Huidige uitvoeringsflow werkt vooral met seeddata. |
| Doelacceptaties en voorstelgedrag voor doelen | Schema bestaat, UI/RLS-flow ontbreekt. |
| Notificatiestatus/read-state in Tijdlijn | Ondersteunt aandacht, maar is niet de eerste data-integriteitspijler. |

### Nice-to-have

| Functionaliteit | Reden |
| --- | --- |
| Opruimen oude placeholdermappen en README's | Maakt repo minder verwarrend. |
| Opruimen dode voorstel-detail CSS | Vermindert stylingruis. |
| Betere lege staten per rol/profiel | UX-verfijning. |
| Documentatie-index met bronhiërarchie | Helpt volgende Codex-rondes sneller starten. |

## 7. Datamodel- en Supabase-bevindingen

Schema-overzicht:

| Bevinding | Status |
| --- | --- |
| 33 publieke tabellen gevonden in migraties | Aanwezig |
| Alle aangemaakte tabellen hebben RLS enablement in `20260601001200_enable_rls.sql` | Aanwezig |
| Enums voor systeemrol, profiel, groep, categorie, moment, deelname, rollen, taken, documenten, doelen, voorstellen, tijdlijn, support en signalen | Aanwezig |
| Vaste momentrollen in enum: `deelnemer`, `uitvoerder`, `ondersteuner`, `begeleider`, `organisator` | Correct |
| Eigenaarschap-checks voor momenten, doelen, lijsten en documenten | Aanwezig: exact één eigenaar Profiel of Groep |
| Begeleidingsnotities zonder categorie | Correct volgens docs |
| Check constraints voor tijd/ontvanger/context bestaan op meerdere tabellen | Aanwezig |
| Unique indexes voor actieve lidmaatschappen/deelnames/rolbezettingen/taakuitvoerders/doelacceptaties | Aanwezig |
| Generated Supabase types sluiten aan op actuele kolommen, inclusief `voorstellen.verloopt_at` en geen `verlopen_at` | Correct |

Belangrijke risico's:

| Risico | Toelichting |
| --- | --- |
| `doelacceptaties` heeft RLS aan maar geen policy | Tabel is technisch afgesloten voor normale gebruikers; UI gebruikt hem nog niet. Dit is veilig maar functioneel onvolledig. |
| Voorstellen gebruiken generieke `gekoppeld_type`/`gekoppeld_id` zonder FK naar moment/taak/doel/document | Flexibel, maar minder database-afdwinging dan de SQL v0.2-blauwdruk met type-specifieke FK's. |
| Voorstelstatus-updatepolicy is functioneel te breed | Zie functionele afwijkingen. |
| Voorstelactie is niet atomisch | Directe client-update plus losse deelname-update is kwetsbaar. |
| `can_view_moment` bevat geen algemene gasttoegangscasus | Expliciete gastcontext is nog niet volledig vertaald naar RLS-helper. |
| Begeleidingsnotitie-RLS is nog systeembeheerder-only | Privacyveilig, maar niet conform medewerker/contextgebruik uit docs. |
| `public` RPC's bestaan voor `afmelden_moment_met_claims`, `taak_afvinken`, `taak_heropenen` | Ze zijn afgeschermd met grants, maar blijven gevoelige functies in exposed schema; Supabase-best-practice review aanbevolen. |
| Seedcommentaar in `supabase/seed/017_seed_dev_data.sql` zegt `auth_user_id` voorlopig NULL | Remote database heeft inmiddels 5/5 personen gekoppeld aan Auth; document/comment is verouderd. |
| Supabase README's en tests README's spreken nog over Slice 0 placeholders | Niet meer waar voor actuele projectstatus. |

Seeddata:

| Gebied | Status |
| --- | --- |
| Testpersonen/profielen voor Gijs, Sam, Milan, Sanne, Bas | Aanwezig |
| Auth-koppeling op remote | Aanwezig voor 5/5 personen |
| Momenten/deelnames/rollen/lijsten/taken/documenten/doelen/tijdlijn/support | Aanwezig |
| Voorstellen | Aanwezig, 7 totaal, 2 open |
| Begeleidingsnotities | Geen remote testdata gevonden |
| Gastvoorstellen | Aanwezig als open voorstel voor moment, maar gast-RLS-context blijft aandachtspunt |

## 8. Testgaten

Er zijn geen echte unit-, integratie-, RLS- of e2e-tests gevonden. Alleen placeholder README's bestaan. Dit is het grootste kwaliteitsgat, omdat vrijwel alle kernlogica afhankelijk is van RLS, statusovergangen en profielcontext.

Aanbevolen tests:

| Flow | Testtype | Waarom belangrijk |
| --- | --- | --- |
| Voorstel accepteren | RLS + e2e + integratie | Moet voorstel `geaccepteerd` zetten, deelname actief maken en geen duplicaten maken. |
| Voorstel weigeren | RLS + e2e + integratie | Moet voorstel/deelname `geweigerd` zetten en latere handmatige aanmelding mogelijk houden. |
| Mijn dag tonen | e2e + RLS | Moet persoonlijke werkelijkheid tonen zonder losse voorstelkaart en zonder technische foutmeldingen. |
| Planning filteren | e2e + RLS | Moet gemeenschappelijke werkelijkheid per groep/categorie/datum correct tonen. |
| Rollen claimen | RLS + integratie | Capaciteit, actieve deelname, blokkades en vrijgave moeten kloppen. |
| Supportvraag in Tijdlijn | RLS + e2e | Support loopt via Tijdlijn en mag geen aparte brede rechtenbron worden. |
| Documenten zichtbaar per groep | RLS + e2e | Documenten informeren, maar mogen niet als persoonlijke dossiers of datalek werken. |
| Gast met eigen Mijn dag | RLS + e2e | Gasttoegang is expliciet en mag niet te breed worden. |
| Begeleidingsnotitie zichtbaarheid | RLS | Privacykritiek; alleen medewerker/context of beheer volgens uiteindelijke policy. |
| Categoriegedrag | unit + e2e | Categorieconfiguratie moet velden, acties, rollen en signalen sturen zonder rechtenlaag te worden. |
| Profielswitch/current profile | e2e | Persoon/Profiel-scheiding valt om als current profile ambigu blijft. |
| Tijdlijn voorstelactie zichtbaarheid | e2e | Proposer/support/beheer mogen geen misleidende accept/reject-knoppen zien. |

## 9. Kleine fixes die zijn uitgevoerd

Geen codefixes uitgevoerd. De enige wijziging in deze audit is het toevoegen van dit auditdocument en het aanmaken van `docs/audits/`.

## 10. Aanbevolen volgende Codex-prompts

| Vervolgtaak | Doel | Model | Reasoningniveau | Risico | Verwachte output |
| --- | --- | --- | --- | --- | --- |
| Voorstelworkflow hardenen | Vervang directe voorstel/deelname-updates door gecontroleerde RPC of serveractie en scherp RLS aan tot ontvangend profiel. | GPT-5.3-Codex | hoog | Hoog: raakt persoonlijke regie en RLS | Migratie/RPC, aangepaste frontendactie, tests, build/lint/typecheck |
| Testbasis opzetten | Voeg Playwright/Vitest/pgTAP of gekozen teststack toe met eerste kritieke flows. | GPT-5.3-Codex | hoog | Middel: toolingkeuze | Testconfig, scripts, eerste tests voor voorstellen/Mijn dag/Planning |
| RLS audit en fix doelacceptaties/gast/begeleidingsnotities | Werk RLS-gaten uit zonder UI-bouw. | GPT-5.3-Codex | hoog | Hoog: security/privacy | Nieuwe migratie(s), `db lint`, eventueel advisors, RLS-testplan |
| Mijn dag uitbreiden naar volledige persoonlijke werkelijkheid | Voeg taken, doelen, documenten en tijdlijn-attentie toe volgens docs. | GPT-5.3-Codex | gemiddeld | Middel: UX-compositie | Kleine UI/data-uitbreiding zonder proposal-duplicaten |
| Planningfilters bouwen | Voeg datum-, groep-, categorie- en statusfilters toe voor gemeenschappelijke werkelijkheid. | GPT-5.3-Codex | gemiddeld | Middel: UX/RLS-verwachtingen | Filter-UI, queryaanpassing, e2e rooktest |
| Support via Tijdlijn MVP | Maak supportvraag aanmaken/lezen/afhandelen via Tijdlijn. | GPT-5.3-Codex | gemiddeld | Middel: rechten en statusflow | UI-flow, RLS-check, tests |
| Categoriegedrag slice | Gebruik `categorie_configuraties` om acties/velden/rollen per categorie te sturen. | GPT-5.3-Codex | hoog | Hoog: raakt veel schermen | Gedocumenteerde gedragmapping, kleine eerste implementatie, tests |
| Documentatie opschonen | Actualiseer README's en verwijder of label Slice-0 placeholders. | GPT-5.3-Codex | laag | Laag | README-update, geen functionele codewijziging |
| Dode voorstel-detail resten opruimen | Verwijder ongebruikte CSS en helpers voor verdwenen proposal detail route. | GPT-5.3-Codex | laag | Laag | Kleine cleanup, lint/build |
