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

## Structuur

- `app/`: Next.js routes en schermen.
- `components/`: gedeelde appcomponenten.
- `src/lib/`: Supabase-clients, contexthelpers, datahelpers en acties.
- `supabase/`: configuratie, migraties, seed en Supabase-testplaceholder.
- `tests/`: placeholders voor toekomstige RLS-, e2e- en fixturetests.
- `docs/`: bron-, architectuur- en promptdocumentatie.
