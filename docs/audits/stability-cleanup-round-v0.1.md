# SAM&ZO stability cleanup round v0.1

## 1. Samenvatting

Deze ronde was uitsluitend gericht op stabiliteit, veiligheid, testbaarheid en
opschoning. Er zijn geen nieuwe functionele gebruikersfeatures toegevoegd.

Gecontroleerd en aangepast:

| Gebied | Resultaat |
| --- | --- |
| Voorstelworkflow | Directe frontend-update vervangen door een atomische Supabase RPC voor momentvoorstellen. |
| RLS rond voorstellen | Updatepolicy versmald naar alleen het ontvangende actieve profiel. |
| Tijdlijnknoppen | Accept/weiger-knoppen worden alleen getoond aan het ontvangende profiel. |
| Mijn dag | Voorstellen blijven momentkaarten met statuslabel `voorgesteld`; technische laadfout vervangen door rustige melding. |
| Kleine cleanup | Verouderde Slice-0 README's geactualiseerd en dode voorstel-detail-CSS verwijderd. |
| Generated types | Supabase types opnieuw gegenereerd na de nieuwe RPC. |

Alle verplichte controles zijn uiteindelijk groen:

| Controle | Resultaat |
| --- | --- |
| `npm.cmd run typecheck` | Geslaagd |
| `npm.cmd run lint` | Geslaagd |
| `npm.cmd run build` | Geslaagd |
| `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none` | Geslaagd, geen schema-errors |

## 2. Voorstelworkflow

Oude situatie:

| Stap | Oude werking | Risico |
| --- | --- | --- |
| Voorstel accepteren | Frontend update op `voorstellen`, daarna losse deelname-update via `registerForMoment`. | Als de eerste update lukte en de deelname-update faalde, konden voorstel en deelname inconsistent worden. |
| Voorstel weigeren | Frontend update op `voorstellen`, daarna losse deelname-update via `updateParticipationForProposal`. | Zelfde half-verwerkte statusrisico. |
| Dubbele deelname voorkomen | De frontend helper probeerde bestaande deelname te hergebruiken. | Bij een race of RLS-fout kon de flow alsnog op de helft stranden. |
| Opnieuw aanmelden | `registerForMoment` ondersteunt heractiveren vanuit onder meer `afgemeld` en `geweigerd`. | Deze richting was goed en is behouden. |

Aangepast:

| Bestand | Wijziging |
| --- | --- |
| `supabase/migrations/20260603073817_harden_proposal_response_workflow.sql` | Nieuwe RPC `public.beantwoord_moment_voorstel(target_voorstel_id, target_profiel_id, antwoord)`. |
| `src/lib/voorstellen/actions.ts` | `acceptVoorstel` en `declineVoorstel` gebruiken nu de RPC in plaats van directe tabelupdates plus losse deelname-update. |
| `src/lib/database.types.ts` | Generated Supabase types bijgewerkt na de nieuwe RPC. |

De nieuwe RPC:

| Onderdeel | Gedrag |
| --- | --- |
| Beveiligingsmodus | `SECURITY INVOKER`, dus de bestaande RLS blijft gelden. |
| Toegestane actor | Alleen `target_profiel_id = app_private.current_profiel_id()`. |
| Toegestane voorstelstatus | Alleen een voorstel dat nog `open` is. |
| Toegestane voorsteltypes | Alleen `deelname_aan_moment` en `uitnodiging_moment`. |
| Toegestelde koppeling | Alleen `gekoppeld_type = 'moment'` met bestaande `gekoppeld_id`. |
| Accept | Zet voorstel op `geaccepteerd` en zet bestaande voorstelachtige deelname op `geaccepteerd`; als er geen deelname is maar RLS dit toestaat, wordt een `ingeschreven` deelname gemaakt. |
| Reject | Zet voorstel op `geweigerd` en zet bestaande voorstelachtige deelname op `geweigerd`. |
| Dubbele deelname | Er wordt eerst naar bestaande eigen deelname gekeken; er wordt alleen ingevoegd als er geen actuele deelname zichtbaar is. |

Opgeloste risico's:

| Risico | Opgelost door |
| --- | --- |
| Voorstelstatus gewijzigd maar deelname niet | Voorstel en deelname worden in een databasefunctie binnen dezelfde transactie aangepast. |
| Admin/support/voorsteller kan persoonlijke voorstelstatus definitief maken | Updatepolicy is teruggebracht tot ontvangend profiel. |
| Tijdlijn toont actieknoppen die daarna pas door RLS falen | UI checkt nu `ontvangend_profiel_id` tegen het actieve profiel. |
| Technische databasefout in Mijn dag | Laadfout toont nu een gebruikersveilige melding. |

Blijvende risico's:

| Risico | Waarom niet opgelost in deze ronde |
| --- | --- |
| Er zijn nog geen regressietests voor de voorstel-RPC. | Teststack opzetten was expliciet een volgende ronde. |
| Voorstellen voor taak/doel/document zijn nog niet functioneel uitgewerkt. | Deze ronde moest klein blijven en alleen bestaande momentvoorstellen hardenen. |
| `voorstellen.gekoppeld_type`/`gekoppeld_id` blijft generiek zonder type-specifieke FK. | Datamodelkeuze is groter dan stabiliteitscleanup. |
| Als data al inconsistent is met een actieve deelname plus open voorstel, wordt reject niet gebruikt om actieve deelname af te melden. | Bewust behouden: voorstel weigeren mag geen bestaande actieve deelname onverwacht verwijderen. |

## 3. RLS en rechten

Gecontroleerde policies en helpers:

| Policy/helper | Bevinding |
| --- | --- |
| `voorstellen_select_eigen_voorsteller_of_toegang` | Bestaande select zichtbaarheid blijft breder dan alleen ontvanger; dit is nodig voor voorsteller/beheer/contextzichtbaarheid. |
| `voorstellen_insert_voorsteller` | Niet aangepast. |
| `voorstellen_update_status_bij_ontvanger` | Aangepast. Was te breed door `has_profieltoegang`, systeembeheerder en systeemondersteuner. |
| `deelnames_insert_eigen_of_voorlopig_via_profieltoegang` | Niet aangepast. De RPC gebruikt deze policy alleen als er nog geen deelname bestaat. |
| `deelnames_update_eigen_heraanmelden` | Niet aangepast. De RPC gebruikt deze voor voorstelachtige deelname naar `geaccepteerd` of `geweigerd`. |
| `app_private.can_view_moment` | Niet aangepast. Voorstellen blijven geen zelfstandig toegangsbewijs voor momentzichtbaarheid. |

Aangepast:

| Wijziging | Effect |
| --- | --- |
| `revoke update on public.voorstellen from anon, authenticated` | Brede tabelupdate ingetrokken. |
| `grant update (status, geaccepteerd_at, geweigerd_at, updated_at) on public.voorstellen to authenticated` | Alleen statusvelden die nodig zijn voor voorstelantwoord blijven updatebaar. |
| Nieuwe `voorstellen_update_status_bij_ontvanger` | Alleen het ontvangende profiel kan een open voorstelstatus wijzigen. |

Wat mag het ontvangende profiel nu:

| Actie | Toegestaan |
| --- | --- |
| Open momentvoorstel accepteren | Ja, via RPC en RLS. |
| Open momentvoorstel weigeren | Ja, via RPC en RLS. |
| Gekoppelde eigen voorstelachtige deelname activeren/weigeren | Ja, via bestaande deelname-RLS. |
| Handmatig aanmelden na `geweigerd` of `afgemeld` | Ja, bestaande `registerForMoment`-reactivatie blijft behouden. |

Wat mogen beheer/support/voorsteller nu wel of niet:

| Rol/context | Gedrag |
| --- | --- |
| Voorsteller | Kan voorstel mogelijk nog zien via bestaande select-policy, maar kan de persoonlijke status niet definitief accepteren/weigeren. |
| Systeembeheerder | Kan voorstel mogelijk zien, maar deze ronde geeft geen administratieve accept/weiger-uitzondering. |
| Systeemondersteuner | Kan voorstel mogelijk zien, maar deze ronde geeft geen persoonlijke statusmutatie namens de ontvanger. |
| Profieltoegang/supportcontext | Kan zichtbaarheid hebben volgens bestaande policies, maar niet definitief antwoorden namens het profiel. |

## 4. UI-controle

Mijn dag:

| Aspect | Resultaat |
| --- | --- |
| Presentatie | Open momentvoorstellen worden niet als los voorstelitem getoond, maar als momentkaart. |
| Statuslabel | De kaart krijgt reden/status `Voorstel: voorgesteld`. |
| Acties | Accept/weiger staan alleen op de momentkaart als `proposal.canRespond` waar is. |
| Lege staat | Rustige lege staat blijft bestaan wanneer geen items of voorstellen zichtbaar zijn. |
| Foutmelding | Technische foutdetails worden niet meer rechtstreeks getoond bij laden. |

Tijdlijn:

| Aspect | Resultaat |
| --- | --- |
| Presentatie | Voorstellen worden nog als aandachtitem gekoppeld aan het moment getoond, niet als voorstel-detailroute. |
| Acties | Accept/weiger zijn alleen zichtbaar als `item.proposalReceivingProfileId === currentProfiel.id`. |
| Fallback | Als een beheerder/supporter/voorsteller een voorstel ziet, verschijnt hoogstens de momentlink, niet de persoonlijke antwoordknoppen. |

Momentdetail:

| Aspect | Resultaat |
| --- | --- |
| Presentatie | Bestaande richting behouden: momentdetail toont voorstelstatus/acties op het moment zelf. |
| Acties | Bestaande `acceptVoorstel`/`declineVoorstel` worden automatisch via de nieuwe RPC afgehandeld. |
| Handmatig aanmelden | Bestaande deelnamehelper blijft heraanmelden vanuit `geweigerd`/`afgemeld` ondersteunen. |

## 5. Kleine cleanup

Uitgevoerd:

| Bestand | Cleanup |
| --- | --- |
| `README.md` | Slice-0 tekst vervangen door actuele projectstatus en werkafspraken. |
| `supabase/README.md` | Placeholdertekst vervangen door actuele Supabase-afspraken. |
| `tests/README.md` | Placeholdertekst vervangen door testbasis-richting. |
| `supabase/seed/README.md` | Placeholdertekst vervangen door actuele seeddata-notitie. |
| `app/globals.css` | Ongebruikte `.voorstel-detail-*` styling verwijderd. |
| `app/mijn-dag/page.tsx` | Directe technische laadfout vervangen door gebruikersveilige melding. |

Niet verwijderd:

| Onderdeel | Reden |
| --- | --- |
| Placeholdermappen | Niet verwijderd, omdat deze mogelijk nog als toekomstige structuurankers dienen en verwijderen geen stabiliteitswinst gaf. |
| Brede UI-structuur | Geen brede herstructurering uitgevoerd. |

## 6. Niet uitgevoerd

Bewust niet opgepakt:

| Punt | Reden |
| --- | --- |
| Nieuwe teststack toevoegen | Te groot voor deze stabiliteitsronde; wel testplan opgenomen. |
| Browser/e2e-test uitvoeren | Niet gevraagd in deze ronde en er is geen bestaande e2e-testbasis. |
| Voorstellen voor taak/doel/document bouwen | Nieuwe functionaliteit, buiten scope. |
| Administratieve voorstelstatus-exceptie bouwen | Functioneel niet ondubbelzinnig vastgelegd. |
| Gast-RLS uitbreiden | Grotere functionele/RLS-keuze, al als auditbevinding bekend. |
| Begeleidingsnotitie-RLS aanpassen | Privacygevoelig en buiten voorstelstabiliteit. |
| Planningfilters of Mijn dag-uitbreiding bouwen | Nieuwe functionaliteit, buiten scope. |
| Oude gepushte migraties aanpassen | Expliciet vermeden; er is een nieuwe migratie toegevoegd. |

## 7. Controlecommando's

| Commando | Resultaat | Eventuele foutmelding/opmerking |
| --- | --- | --- |
| `npx.cmd supabase --version` | Geslaagd | CLI versie `2.103.0`; update beschikbaar naar `2.104.0`. |
| `npx.cmd supabase migration new harden_proposal_response_workflow` | Geslaagd | Nieuwe migratie: `supabase/migrations/20260603073817_harden_proposal_response_workflow.sql`. |
| `npx.cmd supabase db push --help` | Geslaagd | Flags gecontroleerd. |
| `npx.cmd supabase db lint --help` | Geslaagd | Flags gecontroleerd. |
| `npx.cmd supabase db push --linked --yes` | Gefaald, daarna opgelost | Fout: lokale migratie lag timestamp-technisch vóór de laatste remote migratie; Supabase vroeg expliciet om `--include-all`. |
| `npx.cmd supabase db push --linked --include-all --yes` | Geslaagd | Migratie `20260603073817_harden_proposal_response_workflow.sql` toegepast op remote. |
| `npx.cmd supabase gen types --linked --lang=typescript --schema public` | Geslaagd | Generated types bijgewerkt. Eerste write met `-NoNewline` maakte het bestand syntactisch ongeldig; daarna opnieuw correct weggeschreven met `Out-File -Encoding utf8`. |
| `npm.cmd run typecheck` | Eerst gefaald, daarna geslaagd | Eerste fout: generated types stonden op één regel (`TS1005`). Na correct regenereren geslaagd met `tsc --noEmit`. |
| `npm.cmd run lint` | Geslaagd | `eslint .` zonder fouten. |
| `npm.cmd run build` | Geslaagd | Next.js 16.2.6 productiebuild succesvol; 13 static pages gegenereerd. |
| `npx.cmd supabase db lint --linked --schema public --level warning --fail-on none` | Geslaagd | `No schema errors found`. |

## 8. Aanbevolen volgende ronde

Concrete vervolgpompt:

```text
Je werkt in het SAM&ZO-project.

Doel:
Zet een kleine testbasis op voor regressietests rond de bestaande kernflows.
Bouw geen nieuwe functionele features.

Model:
GPT-5.3-Codex

Reasoningniveau:
hoog

Risico:
Middel tot hoog, omdat tests Supabase/RLS, profielcontext en voorstelstatussen raken.

Taken:
1. Inspecteer package scripts, bestaande testmappen, Supabase CLI-mogelijkheden en docs/audits/stability-cleanup-round-v0.1.md.
2. Kies de kleinste passende testtooling voor:
   - frontend rooktests;
   - voorstelactie-integratie;
   - RLS/regressiecontrole.
3. Voeg alleen minimale configuratie toe.
4. Maak eerste regressietests voor:
   - voorstel accepteren zet voorstel op geaccepteerd en maakt/activeert deelname zonder duplicaat;
   - voorstel weigeren zet voorstel/deelname op geweigerd en handmatig aanmelden blijft mogelijk;
   - Mijn dag toont een open momentvoorstel als momentkaart met label voorgesteld;
   - Tijdlijn toont accept/weiger alleen aan het ontvangende profiel;
   - Planning toont RLS-zichtbare momenten zonder technische fout.
5. Voeg een RLS-testplan of eerste uitvoerbare RLS-tests toe voor:
   - ontvangend profiel mag voorstel beantwoorden;
   - voorsteller/support/beheer ziet geen persoonlijke antwoordactie of mag niet muteren via RLS;
   - documenten zichtbaar per groep;
   - gast met eigen Mijn dag.
6. Run:
   - npm.cmd run typecheck
   - npm.cmd run lint
   - npm.cmd run build
   - de nieuwe testcommando's
   - relevante Supabase lint/validatie
7. Maak of werk bij docs/audits/test-foundation-round-v0.1.md met:
   - gekozen tooling;
   - tests toegevoegd;
   - commands/resultaten;
   - resterende testgaten.

Verwachte output:
- minimale testconfig;
- eerste regressietests;
- document met testresultaten en resterende gaten;
- geen commit.
```
