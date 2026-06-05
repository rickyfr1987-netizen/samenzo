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
- tests gebruiken tijdelijke lokale Auth-users binnen een rollback-transactie;
- tests mogen geen service-role gebruiken om gebruikersgedrag te bewijzen.

Runtimebewijs:

- lokaal op de Shadow cloud-pc is Supabase runtime geblokkeerd zolang
  Docker/WSL2 niet gezond is;
- `.github/workflows/samzo-rls-ci.yml` gebruikt GitHub Actions als objectieve
  Linux-runtime voor `supabase start`, `supabase db reset` en `npm run test:rls`;
- de workflow gebruikt geen Supabase access token, geen project-ref, geen
  remote database en geen secrets;
- Playwright en browserflows vallen buiten deze stap;
- het gedeelde lokale testwachtwoord is niet nodig voor deze CI-route.

Bewezen domeinen:

1. Documenten: Milan kan het gepubliceerde medewerkersdocument zien; Sam niet.
2. Voorstellen: Sam kan zijn eigen open voorstel zien en via de RPC weigeren;
   Gijs ziet Sams voorstel niet; Bas kan het voorstel niet namens Sam
   beantwoorden.

Volgende aanbevolen RLS-scenario's na deze basis:

1. Gasttoegang: Gijs Gast ziet alleen expliciete gastcontext.
2. Documenten: zichtbaarheid verder uitbreiden naar groep/context en gekoppelde
   items.
3. Begeleidingsnotities: beheer/medewerker/context mogen volgens policy;
   regulier lid en gast krijgen geen brede toegang.
4. Supportvragen: requester en support zien/muteren alleen de toegestane rijen.

Open RLS-punt: `doelacceptaties` heeft RLS aan, maar lijkt nog geen actuele
policy te hebben. Dit blijft bewust onopgelost in Stap 1A.
