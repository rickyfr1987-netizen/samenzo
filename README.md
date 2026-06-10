# SAM&ZO App

De SAM&ZO-app is voorbij Slice 0. De repo bevat inmiddels een werkende
Next.js/Supabase-basis met Auth-context, RLS-gedreven datahelpers, migraties,
development seeddata en schermen voor onder meer Mijn dag, Planning, Momenten,
Tijdlijn, Lijsten, Documenten, Doelen en Leden.

Gebruik de documenten in `docs/source/`, `docs/architecture/` en de auditdocs
in `docs/audits/` als bron van waarheid voor vervolgrondes.

## Vaste SAM&ZO-regels

- Mijn dag = persoonlijke werkelijkheid.
- Planning = gemeenschappelijke werkelijkheid.
- Persoon en Profiel blijven gescheiden.
- Groepen zijn primair filtermechanisme.
- Categorieen bepalen gedrag, maar zijn geen rechtenlaag.
- Voorstellen beschermen persoonlijke regie.
- Momentrollen zijn alleen: deelnemer, uitvoerder, ondersteuner, begeleider, organisator.
- Begeleidingsnotities zijn geen Documenten.
- Support loopt via Tijdlijn.
- Tags geven geen rechten.
- RLS is de echte beveiligingslaag voor Supabase-data.
- SQL- en architectuurdocumenten zijn richtinggevend, maar bestaande migraties
  bepalen de actuele lokale/remote schemastatus.

## Werkafspraken

- Bewerk geen al gepushte migraties; maak een nieuwe migratie.
- Verzwak RLS niet zonder expliciete functionele opdracht.
- Gebruik geen service-role in frontendcode.
- Voeg geen nieuwe functionaliteit toe tijdens stabiliteits- of audit-rondes.
- Commit niets automatisch zonder opdracht.

## Lokale Windows/Docker setup

Deze repo gebruikt Next.js met een lokale Supabase-stack. Supabase start zijn
lokale services via Docker Desktop en heeft op Windows een werkende WSL2-backend
nodig.

Frisse Windows-PC:

```powershell
winget install --id OpenJS.NodeJS.LTS -e --scope user
winget install --id Git.Git -e
winget install --id Docker.DockerDesktop -e
```

Als Docker Desktop meldt dat WSL ontbreekt, open PowerShell als Administrator:

```powershell
wsl --install
```

Herstart Windows daarna, open Docker Desktop tot de engine draait en run vanuit
de repo:

```powershell
.\scripts\bootstrap-local-stack.cmd -RunRlsTests
```

De `.cmd` wrapper start PowerShell met `ExecutionPolicy Bypass` voor deze ene
run. Het script gebruikt daarna `npm.cmd`/`npx.cmd`, zodat PowerShell execution
policy de Node-shims niet blokkeert.

## Structuur

- `app/`: Next.js routes en schermen.
- `components/`: gedeelde appcomponenten.
- `src/lib/`: Supabase-clients, contexthelpers, datahelpers en acties.
- `supabase/`: configuratie, migraties, seed en Supabase-testplaceholder.
- `tests/`: placeholders voor toekomstige RLS-, e2e- en fixturetests.
- `docs/`: bron-, architectuur- en promptdocumentatie.
