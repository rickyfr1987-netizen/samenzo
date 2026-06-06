# Fase 3A Planning momentbeheer MVP-smal ontwerp v0.1

## Status

GO voor ontwerp.

Nog geen GO voor implementatie. Deze stap bouwt geen productcode, geen
migratie, geen RPC, geen server action, geen pgTAP-bestand en geen UI.

## Doel

Ontwerp de smalle momentcreatie- en beheerflow voor Planning als
gemeenschappelijke werkelijkheid.

De flow gaat over groepgerichte momenten in Planning. De persoonlijke
eigenaar-profielroute uit Fase 2D blijft apart en geparkeerd totdat de
pgTAP-pilot daarvoor groen kan draaien.

## Bronnen

- `docs/planning/samzo-bouwplan-v0.1.md`
- `docs/functional/mijn-dag-compositie-v0.1.md`
- `docs/testing/test-strategy-v0.1.md`
- `docs/planning/overgeslagen-stappen-v0.1.md`
- `docs/architecture/fase-2d-eigen-persoonlijk-moment-rls-ontwerp-v0.1.md`
- `supabase/migrations/20260601000200_enum_types.sql`
- `supabase/migrations/20260601000500_moments_participation_roles.sql`
- `supabase/migrations/20260601001100_rls_helper_functions.sql`
- `supabase/migrations/20260601001400_rls_slice_2_moments_participation_roles.sql`
- `supabase/migrations/20260603073817_harden_proposal_response_workflow.sql`
- `supabase/migrations/20260604094500_fix_proposal_and_reactivation_participation_policies.sql`
- `supabase/migrations/20260607230000_harden_guest_access_context.sql`
- `supabase/tests/database/gastcontext_rls.test.sql`
- `supabase/tests/database/mijn_dag_persoonlijke_momenten_rls.test.sql`
- `supabase/tests/database/voorstellen_rls.test.sql`
- `src/lib/planning/moments.ts`
- `src/lib/moment/detail.ts`
- `src/lib/moment/participation.ts`
- `src/lib/moment/role-claims.ts`
- Supabase docs: row level security, met name dat updates ook selecteerbaarheid
  nodig hebben en dat exposed schema's RLS en grants expliciet moeten houden.

## Bestaande basis

`momenten` heeft al precies een eigenaar: `eigenaar_profiel_id` of
`eigenaar_groep_id`. Voor Fase 3 gebruikt Planning alleen groepseigendom.
Profieleigendom blijft de persoonlijke Mijn dag-route.

`moment_groepen` bestaat al als aanvullende groepscontext. Het huidige
Planning-overzicht filtert op deze koppeltabel. Daarom moet een nieuw
groepgericht Planning-moment later altijd ook een primaire
`moment_groepen`-rij krijgen voor dezelfde groep als `eigenaar_groep_id`.
Anders is het moment wel zichtbaar via RLS, maar niet betrouwbaar vindbaar via
de groepsfilter in Planning.

`app_private.can_view_moment(id)` is de centrale leeshelper. Die laat
niet-gearchiveerde momenten zien via systeembeheer, eigenaar-profiel,
profieltoegang, eigenaar-groep, `moment_groepen`, deelname of actieve rol.
Sinds de gastverharding geldt extra: een gastsessie ziet alleen momenten met
`gasttoegang = true`, en dan nog steeds alleen binnen een toegestane context.

De huidige mutatiebasis is bewust beperkt:

- `momenten` insert: eigen profiel of systeembeheerder;
- `momenten` update: systeembeheerder;
- `moment_groepen` insert/update: systeembeheerder;
- `momentrollen` insert/update: systeembeheerder;
- deelnemers en rolclaims hebben eigen, smallere routes.

Dit is genoeg als technische basis voor beheer door Bas, maar niet genoeg als
productroute. Directe client-inserts laten te veel veldkeuzes open. De latere
route moet dus valideren en niet blind op losse tabelmutaties vertrouwen.

## Scope voor MVP-smal

Wel:

- groepgericht moment maken;
- groepgericht moment beperkt wijzigen;
- moment archiveren via status en archiveervelden;
- categorie, datum/tijd, locatie, capaciteit, inschrijving en gasttoegang
  valideren;
- RLS bewijzen met positieve en negatieve pgTAP-cases.

Niet:

- persoonlijke Mijn dag-plusroute;
- begeleider-naar-client definitieve persoonlijke mutatie;
- volledige week- of maandplanner;
- conflictdetectie;
- capaciteitstelling met wachtlijstautomatisering;
- rollen configureren als onderdeel van de eerste create-flow;
- deelnemers uitnodigen of voorstellen maken;
- categorieen als rechtenlaag gebruiken;
- service-role gebruiken om gebruikersgedrag te bewijzen.

## Ontwerpbeslissingen

| Onderwerp | Besluit |
| --- | --- |
| Eigenaar | Fase 3 create gebruikt `eigenaar_groep_id`; `eigenaar_profiel_id` moet `null` zijn. |
| Groep | De eigenaar-groep moet actief zijn. Dezelfde groep krijgt ook een primaire `moment_groepen`-koppeling met bijvoorbeeld `context_type = 'eigenaar'`. |
| Extra groepen | Buiten de eerste create-route. Later kan edit extra zichtbare groepen beheren, maar pas met eigen pgTAP-cases. |
| Categorie | Verplicht een actieve categorie met `entiteit_type = 'moment'`. Categorie bepaalt geen rechten. |
| Start/einde | `start_at` is verplicht. `eind_at` is optioneel, maar als aanwezig later dan `start_at`. |
| Capaciteit | `null` of `>= 0`. Capaciteit is informatief in deze fase en mag geen automatische status- of wachtlijstflow starten. |
| Inschrijving | `inschrijving_open` mag alleen bewust aan. Zonder uitgewerkte inschrijfflow blijft standaard `false`. |
| Gasttoegang | Standaard `false`. `true` mag alleen wanneer de route expliciet een gastzichtbare context wil openen en pgTAP bewijst dat interne momenten dicht blijven. |
| Status bij create | Standaard `gepland`. `open` alleen als inschrijving bewust open staat. `vol`, `afgerond` en `gearchiveerd` mogen niet via create ontstaan. |
| Archiveren | Geen delete. Gebruik `status = 'gearchiveerd'`, `archived_at` en `archived_by_persoon_id`. |
| Actorvelden | `created_by_persoon_id`, `updated_by_persoon_id` en `archived_by_persoon_id` komen uit `app_private.current_persoon_id()`, niet uit clientinput. |

## Beheerrechten

De eerste veilige beheerroute blijft conservatief: systeembeheerder beheert
Planning-momenten. Milan als `medewerker` en Sanne als
`systeemondersteuner` krijgen in deze stap geen impliciet momentbeheerrecht.

Als later medewerkers of systeemondersteuners momenten mogen beheren, moet dat
een aparte beleidsbeslissing worden met een helper zoals
`app_private.can_manage_moment(target_moment_id)` of
`app_private.can_manage_groep_moment(target_groep_id)`. Die helper moet dan
groepgericht en testbaar zijn. `has_profieltoegang()` mag daarvoor niet worden
gebruikt, want profieltoegang is geen mandaat voor gemeenschappelijke planning
of persoonlijke werkelijkheid.

## Aanbevolen mutatievorm voor Fase 3B

Gebruik geen directe browserinsert als productroute. Ontwerp in 3B een smalle
set security-invoker mutaties, aangeroepen via server action of via getypeerde
clienthelper:

- `maak_groep_moment(...)`
- `wijzig_groep_moment(...)`
- `archiveer_groep_moment(...)`

De mutaties moeten gewone RLS en expliciete grants respecteren. Supabase Data
API-toegang moet zichtbaar blijven in de migratie: grant alleen de benodigde
kolommen of functies aan `authenticated`, en gebruik geen service-role voor
gebruikersacties.

`maak_groep_moment` doet in een transactie:

1. valideer actor, systeemrol en input;
2. valideer actieve groep en actieve momentcategorie;
3. insert `momenten` met groepseigenaar en gecontroleerde velden;
4. insert primaire `moment_groepen`-koppeling voor dezelfde groep;
5. return alleen het aangemaakte moment-id en de velden die de UI nodig heeft.

`wijzig_groep_moment` mag alleen beperkte velden wijzigen:

- titel;
- beschrijving;
- categorie;
- start/einde/hele dag;
- locatie;
- capaciteit;
- inschrijving_open;
- gasttoegang;
- status binnen toegestane transities.

`archiveer_groep_moment` is apart omdat archiveren semantisch anders is dan
algemeen wijzigen en omdat auditvelden verplicht gezet moeten worden.

## Statusregels

Toegestane statusrichting voor MVP-smal:

- create: `gepland`;
- create met open inschrijving: `open`;
- edit: `gepland`, `open`, `gewijzigd`, `geannuleerd`;
- archive: `gearchiveerd`;
- later of afgeleid: `vol`, `afgerond`.

`vol` hoort niet handmatig via de eerste UI gezet te worden. Als capaciteit
later echt afdwingend wordt, moet `vol` worden afgeleid uit actieve deelnames
of via een aparte transactionele route.

Een gearchiveerd moment blijft door `can_view_moment` buiten actief zicht.
Planning, momentdetail en Mijn dag mogen gearchiveerde momenten daarom niet als
actieve kaart tonen.

## Gasttoegang

Gasttoegang is geen los publicatievinkje. De huidige guest-gate werkt alleen
veilig als `gasttoegang = true` samenvalt met een toegestane context, zoals een
gastgroep of een expliciet gastzichtbare groepscontext.

Voor Fase 3 geldt daarom:

- interne groepmomenten: `gasttoegang = false`;
- gastgerichte momenten: `gasttoegang = true` alleen met expliciete testdata en
  pgTAP-bewijs;
- een gast mag geen moment maken, wijzigen of archiveren;
- een gast mag een gasttoegankelijk moment wel zien als de bestaande
  `can_view_moment`-context dat toestaat.

## RLS-testplan voor Fase 3B

Maak een rollback pgTAP-suite, bijvoorbeeld:

`supabase/tests/database/planning_momentbeheer_rls.test.sql`

Minimale positieve cases:

1. Bas als systeembeheerder kan via `maak_groep_moment` een groepgericht moment
   maken voor een actieve groep.
2. Het aangemaakte moment heeft `eigenaar_groep_id`, geen
   `eigenaar_profiel_id`, `status = 'gepland'`, geldige categorie,
   gecontroleerde actorvelden en geen archiveervelden.
3. De route maakt precies een primaire `moment_groepen`-koppeling voor dezelfde
   groep.
4. Bas kan het moment wijzigen via `wijzig_groep_moment` en `updated_by` wordt
   uit de sessie gezet.
5. Bas kan het moment archiveren via `archiveer_groep_moment` en daarna is het
   niet meer zichtbaar via de normale Planning-selectie.
6. Een lid van de eigenaar-groep kan het niet-gearchiveerde moment lezen via
   RLS.
7. Een gast ziet een gastgericht moment alleen wanneer `gasttoegang = true` en
   de groep/context zichtbaar is.

Minimale negatieve cases:

1. Sam als `lid` kan geen groepmoment maken.
2. Milan als `medewerker` kan geen groepmoment maken, wijzigen of archiveren in
   deze MVP-smalle route.
3. Gijs als `gast` kan geen groepmoment maken, wijzigen of archiveren.
4. Bas kan via deze route geen `eigenaar_profiel_id` zetten.
5. Bas kan geen moment maken met beide eigenaars of zonder eigenaar.
6. Bas kan geen inactieve, gearchiveerde of verkeerde entiteitcategorie
   gebruiken.
7. Bas kan geen inactieve of gearchiveerde groep gebruiken.
8. Ongeldige tijd faalt: ontbrekende `start_at` of `eind_at <= start_at`.
9. Negatieve capaciteit faalt.
10. `status = 'vol'`, `afgerond` of `gearchiveerd` faalt bij create.
11. `gasttoegang = true` faalt voor een interne groep zonder expliciete
    gastcontext.
12. Een gearchiveerd moment lekt niet via Planning, detail, deelname of
    rolbezetting.
13. De route maakt geen `deelnames`, `momentrollen`, `rolbezettingen`,
    voorstellen, taken, tijdlijnberichten of signalen aan.
14. Een categorie- of groepkoppeling mag geen extra document-, doel- of
    begeleidingsnotitie-rechten openen.

Structurele pgTAP-controles:

- RLS staat aan voor `momenten` en `moment_groepen`.
- De bestaande selectpolicy `momenten_select_can_view` blijft aanwezig.
- De mutatiefuncties hebben `execute` alleen voor `authenticated`.
- De tests gebruiken tijdelijke lokale Auth-users en `set local role
  authenticated`.
- De tests gebruiken geen service-role en geen remote Supabase-data.

## Integratieverwachting voor Fase 3C en 3D

Fase 3C mag pas bouwen nadat 3B de pgTAP-specificatie heeft vastgezet. De
implementatie moet daarna dezelfde route volgen:

- eerst pgTAP;
- dan getypeerde mutatiehelper/server action;
- dan component- en integratietests;
- pas daarna Planning-UI.

Fase 3D sluit de UI rustig aan:

- create/edit/archive alleen tonen aan de beheercontext die 3B/3C bewezen
  heeft;
- geen actieknoppen tonen voor leden, gasten of medewerkers zolang de RLS-route
  dat niet toestaat;
- na create terug naar Planning of detail met het nieuwe moment zichtbaar;
- na archive geen actieve kaart meer tonen.

## Besluit

Fase 3A kiest voor een smalle, groepgerichte beheerroute voor Planning:
systeembeheerder maakt en beheert groepmomenten via gecontroleerde mutaties,
met een primaire `moment_groepen`-koppeling, actieve momentcategorie,
conservatieve statusregels, expliciete gastgrenzen en pgTAP als eerste
bewijslaag.

Dit ontwerp is GO. Implementatie is pas aan de orde in 3C, na de
pgTAP-specificatie van 3B.
