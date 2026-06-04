# Seed

`supabase/config.toml` laadt bij een lokale `supabase db reset` de entrypoint
`supabase/seed.sql`.

Voor Fase 1 is de leidende development/testdata de migratie-seedlijn met vijf
kernprofielen: Bas Beheerder, Sanne Systeemondersteuner, Milan Medewerker, Sam
Bewoner en Gijs Gast. Die data zit in de migratieketen en sluit aan op de
huidige appfixtures, profielcontext en nulmeting.

`supabase/seed/017_seed_dev_data.sql` is een oudere, uitgebreidere seedset met
acht profielen. Laad dit bestand niet automatisch in de lokale reset zolang Fase
1 op de migratie-seedlijn werkt; anders ontstaan dubbele personen/profielen en
verwarrende scenario's. Het bestand blijft voorlopig bewaard als historisch
referentiepunt.

Gebruik seeddata alleen voor lokale/ontwikkelomgevingen. Auth-koppelingen in een
remote ontwikkelproject kunnen afwijken van deze lokale data en mogen niet via
frontendcode of service-role worden aangepast.

Sla nooit wachtwoorden, echte persoonsgegevens, productiegegevens, service-role
keys of andere credentials op in seeddata. Browserflows kunnen later runtime het
gedeelde lokale testwachtwoord nodig hebben; dat wachtwoord hoort niet in deze
repo.
