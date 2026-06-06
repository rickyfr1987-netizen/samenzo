# Fase 4A lijst- en taakcreatie ontwerp v0.1

Datum: 2026-06-06

## Scope

Deze analyse ontwerpt de smalle MVP-route voor lijst- en taakcreatie volgens
`docs/planning/samzo-bouwplan-v0.1.md`.

Doel van Fase 4:

- Lijsten en taken minder seed-afhankelijk maken.
- Bestaande taakacties veilig houden.
- Geen persoonlijke taak direct vanuit Mijn dag bouwen.
- Geen taakvoorstellen of taakoverdracht bouwen in deze stap.

## Gelezen bestanden

- `docs/planning/samzo-bouwplan-v0.1.md`
- `docs/planning/overgeslagen-stappen-v0.1.md`
- `docs/audits/fase-3e-planning-momenten-mvp-smal-audit-v0.1.md`
- `src/lib/lijsten/items.ts`
- `src/lib/lijsten/task-actions.ts`
- `app/lijsten/page.tsx`
- `app/lijsten/[lijstId]/page.tsx`
- `supabase/migrations/20260601000600_goals_lists_tasks.sql`
- `supabase/migrations/20260602141723_fix_taakuitvoerders_rls_recursion.sql`
- `supabase/migrations/20260602150939_add_task_completion_action.sql`
- `supabase/migrations/20260602152045_add_single_task_reopen_action.sql`
- `docs/functional/mijn-dag-compositie-v0.1.md`

Er zijn geen bestaande lijst-/taak-pgTAP-bestanden gevonden onder
`supabase/tests/database/`.

## Huidige situatie

De app heeft nu:

- lijstoverzicht en lijstdetail op basis van RLS-zichtbare lijsten;
- taakdetails vanuit `taken` en `taakuitvoerders`;
- eigen-profielacties voor taak claimen, vrijgeven, afvinken en heropenen;
- read-policy via `app_private.can_view_lijst`;
- RLS op `lijsten`, `taken` en `taakuitvoerders`.

Ontbreekt:

- lijst aanmaken/wijzigen/archiveren;
- taak aanmaken/wijzigen/archiveren;
- gecontroleerde beheerroute voor lijstgroep-koppelingen;
- pgTAP-bewijs voor create/manage van lijsten en taken.

## Ontwerpkeuze

Fase 4B moet beginnen met een smalle beheerroute voor groepseigen lijsten.

Kernkeuze:

- `lijsten` blijven eigendom van precies een groep of een profiel.
- In 4B bouwen we alleen groepseigen lijsten.
- Persoonlijke lijsten en persoonlijke taken blijven buiten scope.
- `taken` worden beheerd binnen een zichtbare/beheerbare lijst.
- `taakuitvoerders` worden niet als actieve uitvoerder aangemaakt door beheer.

Waarom:

- Lijstbeheer is gemeenschappelijke werkcontext.
- Taakuitvoerderschap is persoonlijke werkelijkheid.
- De bestaande claim-/afvinkflow beschermt eigen-profielactie al.
- Profieltoegang mag geen taakuitvoerderschap definitief maken.

## Voorgestelde RPC-route

Maak in 4B drie lijst-RPC's:

- `maak_groep_lijst`
- `wijzig_groep_lijst`
- `archiveer_groep_lijst`

Maak in 4B drie taak-RPC's:

- `maak_lijst_taak`
- `wijzig_lijst_taak`
- `archiveer_lijst_taak`

Alle RPC's:

- staan in `public`;
- zijn `security invoker`;
- gebruiken geen service-role;
- vertrouwen op RLS en aanvullende functiechecks;
- zijn alleen uitvoerbaar voor `authenticated`;
- weigeren anon;
- valideren actor via `app_private.is_systeembeheerder()` voor beheer.

## Eigenaarschap

Voor 4B:

- `maak_groep_lijst` accepteert `target_groep_id`;
- `eigenaar_groep_id` wordt gezet;
- `eigenaar_profiel_id` blijft `null`;
- primaire `lijst_groepen`-koppeling naar dezelfde groep wordt aangemaakt;
- gekoppeld moment/doel is optioneel.

Niet doen in 4B:

- geen profiel-eigen lijst;
- geen persoonlijke taak;
- geen beheerder die namens een client een taakuitvoerder actief maakt.

## Koppelingen

Gekoppeld moment:

- mag alleen worden gezet als `target_moment_id` zichtbaar is via
  `app_private.can_view_moment`;
- mag geen extra lijstleesrecht geven buiten `can_view_lijst`;
- mag niet afhankelijk zijn van het nog onbewezen Fase 3C-momentbeheerpad.

Gekoppeld doel:

- mag alleen worden gezet als doel zichtbaar is via bestaande doel-RLS;
- als er nog geen private helper voor doelzichtbaarheid bestaat, moet 4B eerst
  stoppen en een aparte RLS-ontwerpstap vragen.

Advies voor 4B:

- start met optionele momentkoppeling alleen als bestaande `can_view_moment`
  voldoende is;
- laat doelkoppeling in de eerste build optioneel `null`, tenzij doel-RLS-helper
  expliciet bewezen is.

## Taakcreatie

`maak_lijst_taak`:

- accepteert lijst-id, titel, beschrijving, sortering en deadline;
- zet status standaard op `open`;
- zet actorvelden op huidige persoon;
- maakt geen `taakuitvoerders`-rij aan.

`wijzig_lijst_taak`:

- mag titel, beschrijving, sortering, deadline en beheerstatus wijzigen;
- staat alleen beheerstatussen toe die niet persoonlijk zijn:
  `open`, `bezig`, `afgerond`, `vervallen`;
- mag geen `taakuitvoerders.status` wijzigen.

`archiveer_lijst_taak`:

- zet taakstatus naar `vervallen` of archiveert via `archived_at`;
- laat bestaande taakuitvoerders ongemuteerd of zet alleen niet-persoonlijke
  afgeleide status als dat apart in pgTAP is bewezen.

Advies:

- archiveer taak via `archived_at` en `archived_by_persoon_id`;
- laat persoonlijke uitvoerdershistoriek intact.

## Taakuitvoerders

Fase 4B maakt geen actieve taakuitvoerder aan voor een ander profiel.

Toegestaan:

- een taak zonder uitvoerder aanmaken;
- bestaande eigen-profiel claimflow blijven gebruiken;
- later in Fase 4C taakvoorstellen/overdracht ontwerpen.

Niet toegestaan:

- systeembeheerder of medewerker wijst Sam definitief aan als actieve uitvoerder;
- profieltoegang maakt of wijzigt taakuitvoerderschap;
- Mijn dag krijgt directe persoonlijke taakcreatie.

## Privacy en RLS

Belangrijkste risico's:

- lijstzichtbaarheid kan taken te breed zichtbaar maken;
- gekoppeld moment/doel kan extra informatie lekken;
- taakuitvoerderschap kan persoonlijke werkelijkheid worden zonder acceptatie;
- beheerroute kan onbedoeld persoonlijke lijsten raken.

Mitigaties:

- create/manage in 4B alleen voor systeembeheerder;
- groepseigen lijst verplicht;
- categorie moet `entiteit_type = 'lijst'` en `status = 'actief'` hebben;
- groep moet actief zijn;
- doelkoppeling pas bouwen als doelzichtbaarheidshelper bestaat of apart is
  ontworpen;
- taakuitvoerders blijven eigen-profiel of voorstelgestuurd.

## pgTAP-testplan

Maak in 4B een nieuw bestand:

- `supabase/tests/database/lijst_taakbeheer_rls.test.sql`

Minimaal positieve tests:

1. Bas als systeembeheerder kan een groepseigen lijst maken.
2. De lijst heeft `eigenaar_groep_id`, geen `eigenaar_profiel_id`.
3. De primaire `lijst_groepen`-koppeling bestaat.
4. Bas kan een taak in die lijst aanmaken.
5. Taakcreatie maakt geen `taakuitvoerders`-rij.
6. Bas kan lijst en taak wijzigen.
7. Bas kan lijst en taak archiveren.

Minimaal negatieve tests:

1. Anon kan RPC's niet uitvoeren.
2. Sam kan geen groepseigen lijst maken.
3. Milan kan geen groepseigen lijst maken.
4. Gijs kan geen interne lijst maken.
5. Profieltoegang kan geen lijst of taak beheren.
6. Inactieve groep wordt geweigerd.
7. Niet-lijstcategorie wordt geweigerd.
8. Lege titel wordt geweigerd.
9. Doel- of momentkoppeling mag geen extra leesrecht veroorzaken.
10. RPC mag geen actieve taakuitvoerder voor een ander profiel maken.

Regressietests:

1. Bestaande claimflow blijft werken voor eigen profiel.
2. Een andere gebruiker kan taakuitvoerderschap niet namens Sam maken.
3. Gearchiveerde lijsten en taken verdwijnen uit actieve read-laag.
4. Mijn dag toont taken alleen via `taakuitvoerders.profiel_id`.

## 4B-stopcondities

Stop 4B als:

- lokale/CI pgTAP-runtime niet beschikbaar is;
- doelkoppeling doel-RLS vereist die niet bestaat;
- de implementatie taakuitvoerders voor een ander profiel definitief wil zetten;
- de route profiel-eigen lijsten of persoonlijke taken gaat bouwen;
- het ontwerp afhankelijk wordt van open Fase 3C-RLS-bewijs;
- service-role of remote data nodig lijkt.

## Beoordeling

Status: GO

Reden:

- De ontwerpstap blijft binnen het bouwplan.
- De eerste 4B-route is smal genoeg: groepseigen lijstbeheer en taakbeheer.
- Persoonlijke taakwerkelijkheid blijft beschermd.
- RLS/pgTAP-testplan is concreet.
- Open Docker/RLS-runtime blijft een stopconditie voor 4B-uitvoering.
