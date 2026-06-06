# Fase 3B Planning momentbeheer RLS/RPC-specificatie v0.1

## Status

GO voor specificatie.

Nog geen GO voor implementatie. Deze stap bouwt geen migratie, geen RPC, geen
server action, geen TypeScript-helper, geen UI en geen uitvoerbaar
pgTAP-bestand.

## Doel

Specificeer de RLS/RPC/server-actionroute voor Planning momentbeheer op basis
van Fase 3A. De specificatie is bedoeld als directe bouwinstructie voor Fase
3C.

Planning blijft de gemeenschappelijke werkelijkheid. Persoonlijke Mijn
dag-mutaties blijven buiten deze route.

## Bronnen

- `docs/planning/samzo-bouwplan-v0.1.md`
- `docs/architecture/fase-3a-planning-momentbeheer-mvp-smal-ontwerp-v0.1.md`
- `docs/testing/test-strategy-v0.1.md`
- `supabase/migrations/20260601000500_moments_participation_roles.sql`
- `supabase/migrations/20260601001000_indexes.sql`
- `supabase/migrations/20260601001200_enable_rls.sql`
- `supabase/migrations/20260601001400_rls_slice_2_moments_participation_roles.sql`
- `supabase/migrations/20260607230000_harden_guest_access_context.sql`
- `supabase/tests/database/gastcontext_rls.test.sql`
- `src/lib/planning/moments.ts`
- `src/lib/moment/detail.ts`
- Supabase docs: RLS in exposed schemas, explicit grants, and the rule that
  UPDATE needs SELECT visibility.

## Bestaand contract

De bestaande database ondersteunt deze route al structureel:

- `momenten` heeft precies een eigenaar via `momenten_exact_een_eigenaar`;
- groepseigenaarschap bestaat via `eigenaar_groep_id`;
- aanvullende groepscontext bestaat via `moment_groepen`;
- RLS staat aan voor `momenten` en `moment_groepen`;
- `momenten_select_can_view` gebruikt `app_private.can_view_moment(id)`;
- systeembeheerder mag bestaande `momenten` en `moment_groepen` muteren;
- Planning filtert groepen via `moment_groepen`, niet via
  `eigenaar_groep_id` alleen.

De latere implementatie moet daarom geen nieuw datamodel introduceren. Zij moet
wel de productroute versmallen, omdat directe tabelmutaties te veel vrije
clientinput toelaten.

## Routekeuze

Gebruik drie smalle `public` RPC's met `security invoker`:

- `public.maak_groep_moment(...)`
- `public.wijzig_groep_moment(...)`
- `public.archiveer_groep_moment(...)`

Waarom:

- de functies draaien onder de aangemelde gebruiker en blijven dus RLS-first;
- het productcontract kan input valideren voordat tabellen muteren;
- actorvelden kunnen uit `app_private.current_persoon_id()` komen;
- UI en server actions krijgen een klein, stabiel contract;
- pgTAP kan rechtstreeks de productroute testen.

Niet gebruiken:

- geen `security definer` in `public`;
- geen service-role;
- geen directe browserinsert als productroute;
- geen categorie als rechtenlaag;
- geen `has_profieltoegang()` als beheerrecht.

## Beheerhelper

Voeg in Fase 3C een private helper toe voor hergebruik:

`app_private.can_manage_planning_moment(target_moment_id uuid)`

Minimale betekenis voor MVP-smal:

- `true` wanneer `app_private.is_systeembeheerder()`;
- anders `false`.

De helper lijkt nu triviaal, maar maakt toekomstige uitbreiding naar
systeemondersteuner of groepbeheerder expliciet testbaar. De helper moet in
`app_private` blijven, `security definer` mogen zijn, en alleen `execute` aan
`authenticated` krijgen als policies of tests haar moeten aanroepen.

Voor create zonder bestaand moment is een tweede helper optioneel:

`app_private.can_create_planning_moment_for_group(target_groep_id uuid)`

Minimale betekenis:

- actor bestaat;
- actor is systeembeheerder;
- doelgroep is een actieve groep.

## RPC-contract: maak_groep_moment

Aanbevolen signatuur:

```sql
public.maak_groep_moment(
  target_groep_id uuid,
  target_categorie_id uuid,
  titel text,
  beschrijving text default null,
  start_at timestamptz,
  eind_at timestamptz default null,
  hele_dag boolean default false,
  locatie text default null,
  capaciteit integer default null,
  inschrijving_open boolean default false,
  gasttoegang boolean default false
)
returns table (
  moment_id uuid,
  titel text,
  status public.moment_status,
  eigenaar_groep_id uuid,
  start_at timestamptz,
  eind_at timestamptz
)
```

Validaties:

- actorpersoon bestaat;
- actor is systeembeheerder;
- `target_groep_id` verwijst naar een actieve groep;
- `target_categorie_id` is actief en `entiteit_type = 'moment'`;
- `titel` is niet leeg na trim;
- `start_at` is verplicht;
- `eind_at` is leeg of later dan `start_at`;
- `capaciteit` is leeg of `>= 0`;
- `gasttoegang = true` is alleen toegestaan wanneer de doelgroep een expliciet
  gastgerichte context is. Voor MVP-smal betekent dit: groep zichtbaar en
  beoogd voor gasten, of een expliciet gekozen gastgroep-fixture in pgTAP.

Schrijfgedrag:

- insert precies een `momenten`-rij;
- zet `eigenaar_groep_id = target_groep_id`;
- zet `eigenaar_profiel_id = null`;
- zet `status = 'gepland'`, behalve wanneer `inschrijving_open = true`; dan
  mag `status = 'open'`;
- zet `created_by_persoon_id = app_private.current_persoon_id()`;
- zet `updated_*` en `archived_*` leeg;
- insert precies een primaire `moment_groepen`-rij met dezelfde groep en
  `context_type = 'eigenaar'`;
- maak geen deelnames, rollen, voorstellen, tijdlijnberichten, taken, doelen,
  documenten of signalen aan.

Foutcodes:

- gebruik `22023` voor ongeldige input;
- gebruik `42501` voor niet-toegestane actor/context;
- gebruik bestaande constraints als vangnet, maar leun daar niet op voor
  productuitleg.

## RPC-contract: wijzig_groep_moment

Aanbevolen signatuur:

```sql
public.wijzig_groep_moment(
  target_moment_id uuid,
  target_categorie_id uuid,
  titel text,
  beschrijving text default null,
  start_at timestamptz,
  eind_at timestamptz default null,
  hele_dag boolean default false,
  locatie text default null,
  capaciteit integer default null,
  inschrijving_open boolean default false,
  gasttoegang boolean default false,
  target_status public.moment_status default 'gepland'
)
returns table (
  moment_id uuid,
  titel text,
  status public.moment_status,
  eigenaar_groep_id uuid,
  start_at timestamptz,
  eind_at timestamptz,
  updated_at timestamptz
)
```

Validaties:

- actorpersoon bestaat;
- `app_private.can_manage_planning_moment(target_moment_id)` is `true`;
- moment bestaat, is groepseigenaar en niet gearchiveerd;
- `eigenaar_profiel_id` blijft `null`;
- primaire groepkoppeling blijft bestaan;
- categorie, titel, tijd, capaciteit en gasttoegang voldoen aan dezelfde
  regels als create;
- toegestane statussen: `gepland`, `open`, `gewijzigd`, `geannuleerd`;
- `open` vereist `inschrijving_open = true`;
- `gepland` of `gewijzigd` mag `inschrijving_open = false` hebben;
- `vol`, `afgerond` en `gearchiveerd` zijn niet toegestaan via edit.

Schrijfgedrag:

- update alleen de toegestane velden uit Fase 3A;
- zet `updated_at = now()`;
- zet `updated_by_persoon_id = app_private.current_persoon_id()`;
- wijzig geen eigenaar;
- wijzig geen deelnemers, rollen of gekoppelde persoonlijke werkelijkheid.

Belangrijk RLS-punt:

Omdat Postgres RLS bij UPDATE eerst SELECT-zichtbaarheid vereist, moet pgTAP
bewijzen dat de beheeractor het doelmoment kan selecteren. Bas kan dat via
`app_private.is_systeembeheerder()` in `can_view_moment`. Als later andere
beheerders worden toegevoegd, moet hun SELECT-zichtbaarheid ook bewezen worden
of de update zal stil 0 rijen raken.

## RPC-contract: archiveer_groep_moment

Aanbevolen signatuur:

```sql
public.archiveer_groep_moment(
  target_moment_id uuid
)
returns table (
  moment_id uuid,
  status public.moment_status,
  archived_at timestamptz
)
```

Validaties:

- actorpersoon bestaat;
- `app_private.can_manage_planning_moment(target_moment_id)` is `true`;
- moment bestaat, is groepseigenaar en niet al gearchiveerd;
- persoonlijke eigenaarroute wordt geweigerd.

Schrijfgedrag:

- update `status = 'gearchiveerd'`;
- zet `archived_at = now()`;
- zet `archived_by_persoon_id = app_private.current_persoon_id()`;
- zet ook `updated_at` en `updated_by_persoon_id`;
- delete niets;
- archiveer geen deelnemers, rollen of gekoppelde items in deze MVP-smalle
  route.

Na archiveren moet het moment buiten actieve `can_view_moment` vallen.

## Grants en RLS

Fase 3C moet expliciet zichtbaar maken:

```sql
revoke all on function public.maak_groep_moment(...) from public;
revoke all on function public.wijzig_groep_moment(...) from public;
revoke all on function public.archiveer_groep_moment(uuid) from public;

grant execute on function public.maak_groep_moment(...) to authenticated;
grant execute on function public.wijzig_groep_moment(...) to authenticated;
grant execute on function public.archiveer_groep_moment(uuid) to authenticated;
```

Controleer daarnaast tabelgrants voor Supabase Data API-toegang. Als de route
via RPC draait, is execute op functies de primaire toegang, maar de
security-invoker functies hebben nog steeds de onderliggende tabelrechten en
RLS nodig. Nieuwe of gewijzigde grants mogen alleen voor `authenticated` en
alleen op noodzakelijke tabellen/kolommen.

Niet doen:

- geen `anon` mutatierechten;
- geen brede `grant all`;
- geen RLS-bypass;
- geen functies in exposed schema met `security definer`.

## Server-actionroute

Fase 3C mag de UI nog niet bouwen, maar mag later een helper/server-actionbasis
voorbereiden wanneer pgTAP groen is.

Aanbevolen vorm:

- TypeScript-helper in `src/lib/planning/moment-management.ts`;
- server action pas in 3D of aan het einde van 3C wanneer nodig voor tests;
- input schema op TypeScriptniveau spiegelt de RPC-validaties;
- foutmapping vertaalt SQLSTATE `22023` en `42501` naar korte Nederlandse
  meldingen;
- helper gebruikt de normale Supabase user client, niet service-role.

## pgTAP-specificatie

Maak in Fase 3C eerst:

`supabase/tests/database/planning_momentbeheer_rls.test.sql`

Gebruik rollback-opzet:

```sql
begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(<aantal>);

-- tijdelijke auth.users koppelen voor Bas, Sam, Milan, Gijs
-- set_config('request.jwt.claim.sub', ...), set local role authenticated

select * from finish();

rollback;
```

Gebruik vaste fictieve ids binnen de test, bijvoorbeeld prefix
`89310000-0000-4000-8000-...`, zodat rollbackdata herkenbaar blijft.

### Setup-cases

1. Bas, Sam, Milan en Gijs bestaan in lokale resetdata.
2. Bas is `systeembeheerder`.
3. Sam is `lid`.
4. Milan is `medewerker`.
5. Gijs is `gast`.
6. Er is minimaal een actieve momentcategorie.
7. Er is minimaal een actieve bewonersgroep.
8. Er is minimaal een actieve gastgroep of expliciet gastgerichte groepfixture.
9. RLS staat aan voor `momenten` en `moment_groepen`.
10. `momenten_select_can_view` en `moment_groepen_select_can_view_moment` zijn
    aanwezig.
11. De drie RPC's bestaan en hebben execute voor `authenticated`.

### Positieve RPC/RLS-cases

1. Bas kan `maak_groep_moment` uitvoeren voor een actieve groep.
2. De return bevat het aangemaakte `moment_id`.
3. Het record heeft `eigenaar_groep_id = target_groep_id`.
4. Het record heeft `eigenaar_profiel_id is null`.
5. Het record heeft `status = 'gepland'` bij gesloten inschrijving.
6. Het record heeft `status = 'open'` bij `inschrijving_open = true`.
7. Het record heeft `created_by_persoon_id = Bas`.
8. Er bestaat precies een primaire `moment_groepen`-rij met
   `context_type = 'eigenaar'`.
9. Sam als lid van de eigenaar-groep kan het aangemaakte niet-gearchiveerde
   moment lezen via RLS.
10. Bas kan `wijzig_groep_moment` uitvoeren en `updated_by_persoon_id = Bas`
    wordt gezet.
11. Bas kan status `gewijzigd` zetten zonder eigenaar te wijzigen.
12. Bas kan `archiveer_groep_moment` uitvoeren.
13. Na archiveren ziet Sam het moment niet meer via `momenten`.
14. Na archiveren blijft het record fysiek bestaan met archiveervelden.
15. Gijs kan een gastgericht moment alleen lezen wanneer `gasttoegang = true`
    en zijn bestaande groep/context dat toestaat.

### Negatieve actorcases

1. Sam kan `maak_groep_moment` niet uitvoeren.
2. Milan kan `maak_groep_moment` niet uitvoeren.
3. Gijs kan `maak_groep_moment` niet uitvoeren.
4. Sam kan `wijzig_groep_moment` niet uitvoeren.
5. Milan kan `wijzig_groep_moment` niet uitvoeren.
6. Gijs kan `wijzig_groep_moment` niet uitvoeren.
7. Sam kan `archiveer_groep_moment` niet uitvoeren.
8. Milan kan `archiveer_groep_moment` niet uitvoeren.
9. Gijs kan `archiveer_groep_moment` niet uitvoeren.
10. Bas kan via deze groeproute geen persoonlijk `eigenaar_profiel_id`-moment
    maken of wijzigen.

### Negatieve inputcases

1. Lege titel faalt met `22023`.
2. Ontbrekende startdatum faalt met `22023`.
3. `eind_at <= start_at` faalt met `22023`.
4. Negatieve capaciteit faalt met `22023`.
5. Inactieve groep faalt.
6. Gearchiveerde groep faalt.
7. Niet-bestaande groep faalt.
8. Inactieve categorie faalt.
9. Categorie met `entiteit_type <> 'moment'` faalt.
10. `target_status = 'vol'` faalt via edit.
11. `target_status = 'afgerond'` faalt via edit.
12. `target_status = 'gearchiveerd'` faalt via edit.
13. Create kan geen `vol`, `afgerond` of `gearchiveerd` opleveren.
14. `gasttoegang = true` faalt voor een interne groep zonder gastcontext.

### Geen-zij-effect-cases

Na create, edit en archive:

1. Er is geen nieuwe `deelnames`-rij.
2. Er is geen nieuwe `momentrollen`-rij.
3. Er is geen nieuwe `rolbezettingen`-rij.
4. Er is geen nieuwe `voorstellen`-rij.
5. Er is geen nieuwe `tijdlijnberichten`-rij.
6. Er is geen nieuwe `signalen`-rij.
7. Er is geen nieuwe `taken`-rij.
8. Gekoppelde documenten/doelen/notities krijgen geen nieuw leesrecht door
   alleen deze momentroute.

### Structurele databasecases

1. `public.maak_groep_moment` is `security invoker`.
2. `public.wijzig_groep_moment` is `security invoker`.
3. `public.archiveer_groep_moment` is `security invoker`.
4. Geen van de drie functies is executable door `anon`.
5. De private beheerhelper staat in `app_private`, niet als `security definer`
   in een exposed public functie.
6. `momenten` update blijft afhankelijk van een selecteerbare rij.
7. `moment_groepen` bevat exact een primaire eigenaar-koppeling voor de
   aangemaakte route.

## Implementatievolgorde voor Fase 3C

1. Maak eerst de pgTAP-suite met de cases hierboven.
2. Voeg de migratie toe via `supabase migration new`, niet met een handmatige
   bestandsnaam.
3. Implementeer helper(s), RPC's, grants en eventuele policy-aanpassing in die
   migratie.
4. Draai `npm.cmd run typecheck`.
5. Draai `npm.cmd run lint`.
6. Draai `npm.cmd run test:rls` alleen wanneer lokale Supabase/Docker
   beschikbaar is; anders rapporteer als geparkeerd en gebruik CI alleen na
   expliciete route.
7. Voeg pas daarna TypeScript-helper/unittests toe als 3C-scope dat vereist.

## Stopcondities voor Fase 3C

Stop en rapporteer FIX als:

- de route alleen met service-role werkt;
- een `security definer` public RPC nodig lijkt;
- Sam, Milan of Gijs groepmomenten kunnen beheren;
- `has_profieltoegang()` beheer mogelijk maakt;
- create of edit persoonlijke eigenaarmomenten raakt;
- `moment_groepen` niet consistent met `eigenaar_groep_id` blijft;
- gearchiveerde momenten zichtbaar blijven via normale RLS;
- `gasttoegang = true` interne momenten opent;
- pgTAP alleen met remote Supabase-data bewijsbaar is.

## Besluit

Fase 3B specificeert een smalle RLS-first momentbeheerroute met drie
security-invoker RPC's, systeembeheerder als enige MVP-beheeractor, expliciete
grants, primaire groepkoppeling, conservatieve statusregels en een uitgebreide
rollback pgTAP-suite als eerste bewijslaag.

Dit is GO voor specificatie. Implementatie hoort pas in Fase 3C.
