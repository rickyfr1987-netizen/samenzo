# RLS Tests

Deze map beschrijft de echte RLS-regressies tegen een lokale
Supabase/Postgres-context. De uitvoerbare SQL-tests staan in
`supabase/tests/database/`, omdat `supabase test db` daar pgTAP-bestanden leest.
Vitest-mocks bewijzen UI-gedrag, maar geen database-afdwinging.

Fase 1 bouwt nog geen volledige RLS-suite. De huidige bewijslaag is:

- lokale reset gebruikt `supabase/seed.sql` als entrypoint;
- de leidende testdata komt uit de migratie-seedlijn met vijf kernprofielen;
- `npm run test:rls` voert `supabase test db --local supabase/tests/database`
  uit;
- `documents_rls.test.sql` bevat een positieve en negatieve documenten-case;
- `voorstellen_rls.test.sql` bevat positieve en negatieve voorstellen-cases en
  een gecontroleerde RPC-case voor `beantwoord_moment_voorstel`;
- `gastcontext_rls.test.sql` bevat positieve en negatieve gastcontext-cases
  voor momenten, eigen deelname en interne informatie;
- `begeleidingsnotities_rls.test.sql` bevat minimale privacycases voor
  contextgebonden begeleidingsnotities;
- `supportvragen_rls.test.sql` bevat minimale requester/support/negatieve
  profielcases voor lichte supportvragen;
- `mijn_dag_compositie_rls.test.sql` bevat de eerste Mijn dag-compositiegrenzen
  voor deelname, rolbezetting, open momentvoorstel, read-only taakrelatie en
  profielgerichte aandacht;
- `mijn_dag_persoonlijke_momenten_rls.test.sql` bevat eigenaar-profiel
  persoonlijke momenten zonder deelname, inclusief gastcontextgrenzen;
- `mijn_dag_document_attenties_rls.test.sql` bevat profielgerichte
  document-attenties uit tijdlijnberichten en signalen, inclusief de grens dat
  een zichtbare attentie geen verboden document opent;
- `doelacceptaties_rls.test.sql` bevat eigen-profiel grenzen en de
  `beantwoord_doelacceptatie`-RPC voor doelacceptaties rond zichtbare en
  verborgen doelen;
- `mijn_dag_doel_attenties_rls.test.sql` bevat read-only Mijn dag-grenzen voor
  doel-attenties via doelacceptaties en doel-RLS;
- tests gebruiken tijdelijke lokale Auth-users binnen een rollback-transactie;
- tests mogen geen service-role gebruiken om gebruikersgedrag te bewijzen.

De centrale Fase 1-bewijsmatrix, CI-route, risicoordening en resterende
Fase 1-stappen staan in
`docs/audits/fase-1-rls-bewijsmatrix-v0.1.md`.

Runtimebewijs:

- lokaal op de Shadow cloud-pc is Supabase runtime geblokkeerd zolang
  Docker/WSL2 niet gezond is;
- `.github/workflows/samzo-rls-ci.yml` gebruikt GitHub Actions als objectieve
  Linux-runtime voor `supabase start`, `supabase db reset` en `npm run test:rls`
  op `fase-1b-ci-rls-proof` en `fase-2-personal-items-green-base`;
- de workflow gebruikt geen Supabase access token, geen project-ref, geen
  remote database en geen secrets;
- Playwright en browserflows vallen buiten deze stap;
- het gedeelde lokale testwachtwoord is niet nodig voor deze CI-route.

Bewezen domeinen:

1. Documenten: Milan kan het gepubliceerde medewerkersdocument zien; Sam niet.
2. Voorstellen: Sam kan zijn eigen open voorstel zien en via de RPC weigeren;
   Gijs ziet Sams voorstel niet; Bas kan het voorstel niet namens Sam
   beantwoorden.
3. Gastcontext: Gijs kan een expliciet gasttoegankelijk moment en zijn eigen
   gastdeelname zien; Gijs kan een bewonersmoment en intern medewerkersdocument
   niet zien.
4. Begeleidingsnotities: Milan kan een notitie in een toegestane momentcontext
   aanmaken en zien; Sam kan die notitie niet zien of aanmaken; Gijs kan die
   notitie als gast niet zien.
5. Supportvragen: Sam kan zijn eigen supportvraag zien; Sanne kan die als
   systeemondersteuner zien en in behandeling zetten; Gijs kan de supportvraag
   niet zien of muteren.
6. Mijn dag-compositie: Sam ziet eigen deelname, open momentvoorstel,
   taakrelatie en profielgerichte aandacht; Milan ziet via eigen rolbezetting
   de gekoppelde momentcontext; Gijs ziet Sams persoonlijke relaties/aandacht niet;
   groepscontext alleen is geen profielgerichte Mijn dag-aandacht.
7. Mijn dag persoonlijke momenten: Sam en Milan zien hun eigen eigenaar-profiel
   moment zonder deelname; Gijs ziet Sams moment niet; Gijs ziet een eigen
   persoonlijk moment alleen wanneer `gasttoegang` expliciet aan staat.
8. Mijn dag document-attenties: Sam ziet profielgerichte document-attenties
   alleen als het gekoppelde document via document-RLS zichtbaar is; Gijs ziet
   Sams attentie niet; groepscontext alleen is geen persoonlijke documentkaart.
9. Doelacceptaties: Sam ziet en beantwoordt alleen eigen doelacceptaties
   wanneer het gekoppelde doel via `can_view_doel` zichtbaar is; de RPC staat
   `voorgesteld` naar `geaccepteerd`, `geweigerd` of `later_bekijken` toe en
   staat `later_bekijken` naar `geaccepteerd` of `geweigerd` toe. Verborgen
   doelen blijven dicht, Gijs, Bas en Milan kunnen Sams acceptatie niet lezen
   of muteren, herbeantwoorden blijft gesloten en insert blijft gesloten.
10. Mijn dag doel-attenties: Sam krijgt alleen read-only doel-attenties voor
    eigen `voorgesteld` en `later_bekijken` acceptaties wanneer het doel zelf
    via doel-RLS zichtbaar is; verborgen doelen, Gijs, `geweigerd` en
    `geaccepteerd` blijven buiten actieve Mijn dag-doelattentie.

Volgende aanbevolen RLS-scenario's na deze basis:

1. Documenten: zichtbaarheid verder uitbreiden naar groep/context en gekoppelde
   items.
2. Begeleidingsnotities: later uitbreiden met realistische individuele
   contexten en volledige flows na Fase 2.
3. Supportvragen: later uitbreiden met volledige reactie- en sluitflows, zonder
   ticketsysteem of chatlaag te introduceren.
4. Mijn dag-compositie: later uitbreiden met UI-acties voor doelacceptaties op
   basis van de bewezen RPC, zonder brede doelenmodule of browserflow.

Open RLS-punt: de doelacceptatie-RPC heeft nu bewijs, maar `/mijn-dag` heeft
nog geen acceptatieknoppen, acceptatieformulier of browserflow.
