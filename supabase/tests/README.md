# Supabase Tests

Deze map bevat Supabase-specifieke testbestanden. Fase 1 Stap 1B voegde de
eerste uitvoerbare pgTAP/RLS-basis toe in `supabase/tests/database/`; Fase 1
Stap 1C breidde die basis uit naar voorstellen, Stap 1D voegde gastcontext toe
en Stap 1E voegt minimale begeleidingsnotities-RLS toe.

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
- GitHub Actions voert dezelfde test uit via `npm run test:rls`;
- er worden geen remote of linked Supabase-projecten geraakt.

Deze minimale test rond begeleidingsnotities rondt het functionele
begeleidingsnotitie-domein niet af. Realistische individuele contexten en
volledige flows blijven bewust later, na Fase 2.

Gebruik hier geen echte persoonsgegevens, geen service-role secrets en geen
wachtwoorden. Browser- of RLS-tests die authenticatie nodig hebben, moeten
credentials runtime aanleveren en uitsluitend verwijzen naar het gedeelde lokale
testwachtwoord.
