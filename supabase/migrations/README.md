# Migrations

Deze map bevat de actuele lokale Supabase-migratieketen voor SAM&ZO, inclusief
schema, RLS, hardening en development/testdata.

Werkafspraken:

- wijzig geen oude migraties die al onderdeel zijn van de keten;
- maak alleen een nieuwe migratie na expliciete GO;
- raak geen remote of linked Supabase-project aan zonder expliciete toestemming;
- gebruik geen service-role om frontend- of browsertestgedrag te bewijzen;
- sla geen wachtwoorden, echte persoonsgegevens of productiegegevens op in
  migraties.

Voor Fase 1 is de migratie-seedlijn met vijf kernprofielen leidend. De
architectuur-SQL v0.2 in `docs/architecture` blijft een technische blauwdruk en
is geen uitvoerbare productie-migratie.

Migraties met een datum na 4 juni 2026 blijven voorlopig inhoudelijk ongemoeid.
Ze zijn een bekend ordeningsrisico en vragen later apart GO als hernoemen of
herschikken nodig blijkt.
