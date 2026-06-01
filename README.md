# SAM&ZO App

Slice 0 bevat alleen het projectskelet voor de SAM&ZO-app. Dit skelet is bedoeld als startpunt voor latere GO/FIX-gestuurde slices.

## Bouwvolgorde

0. Projectskelet: structuur zonder businesslogica.
1. Identiteit en Groepen: Auth, Persoon, Profiel, profieltoegang en groepen, pas na GO.
2. Categorieen en Momenten: categoriebeheer, Planning en Momenten, pas na GO.
3. Voorstellen en Deelnames: Mijn dag, deelname, uitnodiging en voorstel, pas na GO.
4. Rollen: vaste Momentrollen en rolbezetting, pas na GO.
5. Lijsten en Taken: uitvoering via lijsten en taken, pas na GO.
6. Documenten en Notities: documenten informeren; begeleidingsnotities blijven apart, pas na GO.
7. Doelen: lichte doelenlaag, pas na GO.
8. Support en Beheer: support via Tijdlijn en basisbeheer, pas na GO.

Elke slice stopt op audit. Verder bouwen gebeurt alleen na expliciete GO. Bij FIX wordt alleen de aangegeven slice gecorrigeerd.

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
- RLS is later de echte beveiligingslaag.
- SQL v0.2 is alleen een technische blauwdruk.

## Verboden zonder expliciete GO

- Geen Auth bouwen.
- Geen Supabase-koppeling maken.
- Geen databasequeries toevoegen.
- Geen RLS toevoegen.
- Geen migraties uitvoeren.
- Geen API-routes maken.
- Geen domeinlogica toevoegen.
- Geen echte formulieren bouwen.
- Geen echte data of seeddata toevoegen.
- Geen nieuwe modules toevoegen.
- Geen functionele app-logica toevoegen.
- SQL v0.2 niet interpreteren als uitvoerbare productie-migratie.

## Structuur

- `app/`: lege Next.js routes voor de hoofdgebieden.
- `components/`: componentmappen zonder functionele componenten.
- `domain/`: domeinmappen zonder domeinservices of businesslogica.
- `lib/`: technische helpermappen zonder implementatie.
- `supabase/`: placeholders voor latere Supabase-configuratie, migrations, seed en tests.
- `tests/`: placeholders voor latere RLS-, e2e- en fixturetests.
- `docs/`: bron-, architectuur- en promptdocumentatie.
