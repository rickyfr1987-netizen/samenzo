# Supabase Tests

Deze map bevat Supabase-specifieke testbestanden. Fase 1 Stap 1B voegde de
eerste uitvoerbare pgTAP/RLS-basis toe in `supabase/tests/database/`; Fase 1
Stap 1C breidde die basis uit naar voorstellen, Stap 1D voegde gastcontext toe,
Stap 1E voegde minimale begeleidingsnotities-RLS toe en Stap 1F voegt minimale
supportvragen-RLS toe.

Draaien:

```bash
npm run test:rls
```

Deze command gebruikt `supabase test db --local supabase/tests/database` en
vereist een draaiende lokale Supabase-stack. Start lokaal eerst met
`supabase start` en reset daarna met `supabase db reset` als de stack nog niet
op de actuele migratieketen staat.

Omdat de Shadow cloud-pc op dit moment geen gezonde Docker/WSL2-backend levert,
is `.github/workflows/samzo-rls-ci.yml` toegevoegd als objectieve runtime-route
voor Fase 1B. Die GitHub Actions-workflow draait op een Linux runner, gebruikt
alleen lokale Supabase-commando's, raakt geen remote project en gebruikt geen
secrets of wachtwoorden.

Huidige RLS-basis:

- lokale reset heeft nu een bestaande `supabase/seed.sql` entrypoint;
- de actieve Fase 1-testdata blijft de migratie-seedlijn;
- `supabase/seed/017_seed_dev_data.sql` wordt niet automatisch geladen;
- `documents_rls.test.sql` koppelt tijdelijke lokale Auth-users in een rollback-
  transactie en test documenten-RLS voor Milan en Sam;
- `voorstellen_rls.test.sql` koppelt tijdelijke lokale Auth-users in een
  rollback-transactie en test voorstellen-RLS voor Sam, Gijs en Bas;
- voorstellen-RLS bewijst dat het ontvangende profiel een open voorstel ziet,
  een niet-betrokken profiel dat voorstel niet ziet, Bas het voorstel niet
  namens Sam kan beantwoorden en Sam zijn eigen voorstel via de RPC kan
  weigeren;
- `gastcontext_rls.test.sql` koppelt tijdelijke lokale Auth-users in een
  rollback-transactie en test gastcontext-RLS voor Gijs Gast;
- gastcontext-RLS bewijst dat Gijs een expliciet gasttoegankelijk moment en
  zijn eigen gastdeelname kan zien, maar geen bewonersmoment of intern
  medewerkersdocument;
- `begeleidingsnotities_rls.test.sql` koppelt tijdelijke lokale Auth-users in
  een rollback-transactie en test minimale begeleidingsnotities-RLS voor Milan,
  Sam en Gijs;
- begeleidingsnotities-RLS bewijst dat Milan een notitie in een toegestane
  momentcontext kan aanmaken en zien, terwijl Sam die notitie niet kan zien of
  aanmaken en Gijs die als gast niet kan zien;
- `supportvragen_rls.test.sql` koppelt tijdelijke lokale Auth-users in een
  rollback-transactie en test minimale supportvragen-RLS voor Sam, Sanne en
  Gijs;
- supportvragen-RLS bewijst dat Sam zijn eigen supportvraag kan zien, Sanne als
  systeemondersteuner de supportvraag kan zien en in behandeling kan zetten,
  en Gijs de supportvraag niet kan zien of muteren;
- GitHub Actions voert dezelfde test uit via `npm run test:rls`;
- er worden geen remote of linked Supabase-projecten geraakt.

Deze minimale tests rond begeleidingsnotities en supportvragen ronden die
domeinen niet functioneel af. Support blijft hier lichte tijdlijn-support en
wordt geen ticketmodule. Realistische individuele contexten en volledige flows
blijven bewust later, na Fase 2.

De compacte Fase 1 RLS-bewijsmatrix met CI-route, open risico's en resterende
Fase 1-stappen staat in `docs/audits/fase-1-rls-bewijsmatrix-v0.1.md`.

Gebruik hier geen echte persoonsgegevens, geen service-role secrets en geen
wachtwoorden. Browser- of RLS-tests die authenticatie nodig hebben, moeten
credentials runtime aanleveren en uitsluitend verwijzen naar het gedeelde lokale
testwachtwoord.
