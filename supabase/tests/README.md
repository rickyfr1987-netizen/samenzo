# Supabase Tests

Deze map bevat Supabase-specifieke testbestanden. Fase 1 Stap 1B voegt de
eerste uitvoerbare pgTAP/RLS-basis toe in `supabase/tests/database/`.

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
- GitHub Actions voert dezelfde test uit via `npm run test:rls`;
- er worden geen remote of linked Supabase-projecten geraakt.

Gebruik hier geen echte persoonsgegevens, geen service-role secrets en geen
wachtwoorden. Browser- of RLS-tests die authenticatie nodig hebben, moeten
credentials runtime aanleveren en uitsluitend verwijzen naar het gedeelde lokale
testwachtwoord.
