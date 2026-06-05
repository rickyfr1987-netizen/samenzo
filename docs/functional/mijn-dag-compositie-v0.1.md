# SAM&ZO Mijn dag-compositie v0.1

## 1. Doel en scope

Dit document specificeert wat Mijn dag in de MVP mag samenstellen als
persoonlijke werkelijkheid van het actieve profiel. Het is een functionele
specificatie voor Fase 2 Stap 2B en bouwt geen functionaliteit.

Buiten scope:

- UI-wijzigingen;
- databasewijzigingen;
- migraties;
- RLS- of policywijzigingen;
- seeddata;
- Playwright-tests of browserflows;
- categoriegedrag;
- voorsteltypes buiten momenten bouwen;
- `doelacceptaties` oplossen.

## 2. Definitie: Mijn dag als persoonlijke werkelijkheid

Mijn dag toont alleen wat voor het actieve profiel op de gekozen dag persoonlijk
relevant is. De bron kan gemeenschappelijk zijn, zoals een moment uit Planning,
maar het item komt pas in Mijn dag wanneer er een persoonlijke relatie met het
actieve profiel bestaat.

Persoonlijke relaties zijn in de MVP:

- eigen deelname aan een moment;
- eigen rolbezetting bij een moment;
- open voorstel voor het eigen profiel;
- taakuitvoerderschap voor het eigen profiel;
- profielgerichte aandacht uit Tijdlijn, Signalen of Support;
- later: persoonlijk moment met eigenaar-profiel of eigen deelname;
- later: document of doel onder aandacht, mits RLS en attentiemodel kloppen.

De actieve profielcontext is leidend. Wanneer iemand naar een ander profiel
kijkt, mag dit alleen kijken zijn. Handelingen die persoonlijke werkelijkheid
vaststellen blijven voorstelgestuurd.

## 3. Wat Mijn dag niet is

Mijn dag is niet:

- een volledige Planning;
- een meldingenmuur;
- een documentbibliotheek;
- een doelendashboard;
- een supportticketsysteem;
- een beheerplek;
- een plek waar categorieen rechten bepalen;
- een plek waar een begeleider definitief persoonlijke werkelijkheid van een
  client vaststelt.

## 4. Compositieregels

1. Een item verschijnt alleen als RLS de onderliggende brondata zichtbaar maakt.
2. Een item moet aan het actieve profiel gekoppeld zijn via deelname, rol,
   voorstel, taakuitvoerder, eigenaar-profiel of expliciete profielgerichte
   aandacht.
3. Groepszichtbaarheid alleen is niet genoeg voor Mijn dag. Groep is een
   context- en filtermechanisme, geen persoonlijke relevantie.
4. Categorieen mogen labels en gedrag sturen, maar nooit rechten of toegang.
5. Een gekoppeld item geeft geen extra leesrecht. Document-, doel-, moment- en
   taak-RLS blijven zelfstandig leidend.
6. Voorstellen blijven open aandacht totdat het ontvangende eigen profiel
   accepteert of weigert.
7. Handelen vanuit andermans profielperspectief mag geen definitieve deelname,
   taak, doelacceptatie of persoonlijk moment maken.
8. Afgehandelde, verlopen, geannuleerde of gearchiveerde items verdwijnen uit
   actieve Mijn dag-aandacht, tenzij later expliciet een historiekweergave wordt
   ontworpen.
9. Datumlogica gebruikt de lokale dagrange van de gekozen datum.
10. Dezelfde bron mag niet dubbel getoond worden; een moment met open voorstel
    en deelname wordt een enkele kaart met meerdere redenen.

## 5. Itemtypematrix

| Itemtype | Brondata | MVP-status | Actiebeleid | RLS-status |
| --- | --- | --- | --- | --- |
| Definitief moment via deelname | `deelnames` + `momenten` | Bouwen/handhaven | Lezen; mutaties later beperkt | Basis aanwezig, bredere matrix later |
| Geclaimde rol | `rolbezettingen` + `momentrollen` + `momenten` | Bouwen/handhaven | Lezen; vrijgeven later | Basis aanwezig, specifieke Mijn dag-RLS later |
| Open momentvoorstel | `voorstellen` + gekoppeld `moment` | Bouwen/handhaven | Accepteren/weigeren alleen eigen profiel | Voorstellen-RLS bewezen voor kernpad |
| Persoonlijk moment | `momenten` met eigenaar-profiel en/of `deelnames` | Specificeren voor bouw | Eigen profiel definitief, ander profiel voorstel | Extra RLS-test nodig |
| Individuele activiteit | Persoonlijk of kleinschalig `moment` | Specificeren voor bouw | Zelf definitief, ander profiel voorstel | Extra RLS-test nodig |
| Taak | `taakuitvoerders` + `taken` + `lijsten` | Eerst read-only | Afvinken later na resetdata | Read policies aanwezig, mutaties apart |
| Aandachtspunt | Tijdlijn, Signalen, Support, Voorstellen | Bouwen als compositie | Afhandelen later per bron | Bron-RLS leidend |
| Document onder aandacht | Attentiekaart + `documenten` | Uitstellen tot attentiemodel | Document openen alleen als RLS toestaat | Documenten-RLS basis bewezen |
| Doel onder aandacht | `doelen` + later `doelacceptaties` | Uitstellen | Geen doelacceptatie tot policy bestaat | Policygat op `doelacceptaties` |
| Tijdlijn-/support-aandacht | `tijdlijnberichten`, `supportvragen`, `signalen` | Beperkt handhaven | Geen ticketsysteem | Minimale support-RLS bewezen |

## 6. Per itemtype

### 6.1 Definitieve momenten via deelname

Brondata:

- `deelnames.profiel_id`;
- `deelnames.status`;
- gekoppelde `momenten`;
- optionele `categorieen` voor label, niet voor rechten.

Zichtbaarheidsregel:

- toon wanneer `deelnames.profiel_id` gelijk is aan het actieve profiel;
- toon alleen niet-gearchiveerde deelname;
- toon alleen wanneer het gekoppelde moment op de gekozen lokale dag valt.

Status/voorstelregel:

- `geaccepteerd`, `ingeschreven` en vergelijkbare actieve statussen zijn
  definitieve persoonlijke werkelijkheid;
- `voorgesteld` en `uitgenodigd` mogen alleen als voorstel/uitnodigingstaal
  worden gepresenteerd, niet als definitieve deelname.

Datumregel:

- gebruik `momenten.start_at`;
- zonder startdatum geen dagkaart in de MVP.

Actiebeleid:

- in Stap 2C nog geen nieuwe mutatie;
- bestaande voorstelactie voor momentvoorstellen blijft via RPC lopen.

RLS/privacyrisico:

- deelname mag geen gekoppeld moment openbreken buiten RLS;
- profieltoegang mag kijken toestaan, maar niet accepteren namens de
  profieleigenaar.

Testdata nodig:

- actieve deelname vandaag;
- deelname op andere dag;
- afgewezen/gearchiveerde deelname;
- deelname van ander profiel.

MVP-keuze:

- handhaven en later expliciet testen als eerste compositiepad.

### 6.2 Geclaimde rollen / rolbezettingen

Brondata:

- `rolbezettingen.profiel_id`;
- `momentrollen`;
- gekoppelde `momenten`.

Zichtbaarheidsregel:

- toon actieve rolbezetting voor het actieve profiel;
- koppel aan het moment op de gekozen dag.

Status/voorstelregel:

- actieve rolbezetting is definitief;
- een rol die voor een ander profiel wordt geclaimd mag alleen via voorstel of
  aparte later-goedgekeurde flow in persoonlijke werkelijkheid komen.

Datumregel:

- gebruik de datum van het gekoppelde moment.

Actiebeleid:

- in Stap 2C read-only tonen;
- vrijgeven of claimen vanuit Mijn dag later, met resetbare testdata.

RLS/privacyrisico:

- rolbezetting mag geen niet-zichtbaar moment lekken;
- open rol in Planning is gemeenschappelijk, eigen rolbezetting in Mijn dag is
  persoonlijk.

Testdata nodig:

- rol voor eigen profiel;
- rol voor ander profiel;
- rol bij moment buiten gekozen dag.

MVP-keuze:

- handhaven als persoonlijk itemtype, read-only.

### 6.3 Open momentvoorstellen

Brondata:

- `voorstellen.ontvangend_profiel_id`;
- `voorstellen.status`;
- `voorstellen.gekoppeld_type = 'moment'`;
- gekoppeld `momenten`-record.

Zichtbaarheidsregel:

- toon open voorstel wanneer ontvangend profiel gelijk is aan actief profiel;
- toon alleen wanneer het gekoppelde moment zichtbaar is en op de gekozen dag
  valt.

Status/voorstelregel:

- `open` is aandacht en voorstel, geen definitief moment;
- `geaccepteerd` of `geweigerd` verdwijnt uit actieve Mijn dag-aandacht.

Datumregel:

- gebruik datum van gekoppeld moment.

Actiebeleid:

- accepteren/weigeren alleen wanneer actief profiel het eigen profiel is;
- verwerking blijft via `beantwoord_moment_voorstel`.

RLS/privacyrisico:

- medewerker, beheerder of profieltoegang mag niet namens het ontvangende
  profiel accepteren;
- voorstel mag gekoppelde momentdata niet zichtbaar maken als RLS dat blokkeert.

Testdata nodig:

- open voorstel voor Sam;
- voorstel voor ander profiel;
- geaccepteerd/geweigerd voorstel;
- voorstel met niet-zichtbaar of geannuleerd moment.

MVP-keuze:

- handhaven als eerste voorstelpad; geen nieuwe voorsteltypes bouwen in 2C.

### 6.4 Persoonlijke momenten / persoonlijke afspraken

Brondata:

- MVP-advies: gebruik `momenten` als persoonlijk moment;
- geen aparte entiteit `persoonlijke_afspraken` in de MVP;
- persoonlijke zichtbaarheid via `momenten.eigenaar_profiel_id` en/of eigen
  `deelnames`.

Zichtbaarheidsregel:

- toon wanneer actief profiel eigenaar is van het moment;
- toon ook wanneer actief profiel deelnemer is;
- groepszichtbaarheid alleen maakt het nog geen Mijn dag-item.

Status/voorstelregel:

- eigen profiel maakt definitief persoonlijk moment wanneer RLS dit later
  toestaat;
- begeleider naar client maakt voorstel, geen definitief persoonlijk moment;
- eigenaar-profiel alleen is genoeg als functionele intentie, maar moet in code
  en RLS nog expliciet worden ondersteund.

Datumregel:

- gebruik `momenten.start_at`;
- zonder datum niet tonen in Mijn dag.

Actiebeleid:

- Stap 2C mag dit nog niet bouwen zonder RLS-test en testdata;
- eerst queryregel en RLS-scenario specificeren.

RLS/privacyrisico:

- eigenaar-profiel-zichtbaarheid moet niet per ongeluk persoonlijke momenten
  via Planning breed tonen;
- profieltoegang moet kijken kunnen toestaan zonder definitief handelen.

Testdata nodig:

- eigen persoonlijk moment zonder deelname;
- persoonlijk moment voor ander profiel;
- begeleider-voorstel voor persoonlijk moment;
- gastpersoonlijk moment met expliciete gastcontext.

MVP-keuze:

- persoonlijke afspraak = persoonlijk moment, geen aparte entiteit.
- Voor Stap 2C eerst specificatie/testdata, nog geen UI-bouw.

### 6.5 Individuele activiteiten

Brondata:

- `momenten` met eigenaar-profiel, deelname of kleinschalige groep;
- eventueel `moment_groepen` wanneer de activiteit toch gemeenschappelijke
  context heeft.

Zichtbaarheidsregel:

- in Mijn dag wanneer het actieve profiel eigenaar, deelnemer of ontvangend
  voorstelprofiel is;
- in Planning alleen wanneer het functioneel gemeenschappelijk of groepgericht
  is.

Status/voorstelregel:

- zelf toegevoegd voor eigen profiel kan definitief zijn;
- toegevoegd voor ander profiel blijft voorstel.

Datumregel:

- gebruik `momenten.start_at`.

Actiebeleid:

- in Stap 2C alleen als specificatie/testdata meenemen.

RLS/privacyrisico:

- individuele activiteit mag niet door groepsfilters publiek worden;
- categorie "persoonlijk moment" mag geen rechten dragen.

Testdata nodig:

- individuele activiteit alleen in Mijn dag;
- individuele activiteit ook zichtbaar in Planning door expliciete groep;
- voorstel voor individuele activiteit.

MVP-keuze:

- modelleer als momentvariant, niet als aparte entiteit.

### 6.6 Taken

Brondata:

- `taakuitvoerders.profiel_id`;
- `taken`;
- `lijsten`;
- eventueel gekoppeld moment via lijst.

Zichtbaarheidsregel:

- toon wanneer actief profiel taakuitvoerder is;
- toon alleen relevante taakstatussen;
- gebruik `deadline_at`, of anders de startdatum van gekoppeld moment.

Status/voorstelregel:

- `actief` als persoonlijke taak;
- `voorgesteld` als voorgestelde taak;
- afgerond hoort niet in actieve Mijn dag.

Datumregel:

- `deadline_at` heeft prioriteit;
- bij ontbrekende deadline mag gekoppelde momentdatum worden gebruikt;
- zonder datum niet tonen in MVP.

Actiebeleid:

- Stap 2C read-only of beperkt tonen;
- afvinken, claimen, vrijgeven en heropenen pas met resetbare testdata en
  aparte RLS-check.

RLS/privacyrisico:

- lijstzichtbaarheid en taakuitvoerder-zichtbaarheid moeten samen kloppen;
- andermans taak mag niet zichtbaar worden door lijstcontext alleen.

Testdata nodig:

- taak vandaag voor eigen profiel;
- taak morgen;
- taak van ander profiel;
- afgeronde taak;
- voorgestelde taak.

MVP-keuze:

- tonen mag, mutaties later.

### 6.7 Aandachtspunten

Brondata:

- `tijdlijnberichten`;
- `signalen`;
- `supportvragen`;
- open `voorstellen`.

Zichtbaarheidsregel:

- alleen profielgerichte aandacht voor het actieve profiel;
- groepsgerichte aandacht niet automatisch in Mijn dag tonen;
- gekoppeld moment niet dubbel tonen als het moment al als kaart bestaat.

Status/voorstelregel:

- urgent, escalatie, actie nodig, aandacht nodig of open voorstel zijn actieve
  aandacht;
- afgehandeld, gesloten of verlopen verdwijnt.

Datumregel:

- gebruik `created_at` of relevante zichtbaarheidsdatum;
- in MVP alleen tonen op gekozen dag.

Actiebeleid:

- afhandeling later per bron;
- geen generieke "aandacht afvinken" zonder bronmodel.

RLS/privacyrisico:

- aandachtkaart mag geen toegang geven tot gekoppelde documenten, doelen of
  momenten;
- supportinhoud moet in requester/supportcontext blijven.

Testdata nodig:

- urgent signaal voor eigen profiel;
- signaal voor ander profiel;
- groepssignaal zonder profiel;
- verlopen tijdlijnbericht;
- open supportvraag.

MVP-keuze:

- geen aparte aandacht-entiteit; compositie van bestaande bronnen.

### 6.8 Documenten onder aandacht

Brondata:

- MVP-light: profielgericht `tijdlijnbericht` of signaal met
  `gekoppeld_type = 'document'`;
- `documenten` blijven aparte inhoudsbron.

Zichtbaarheidsregel:

- Mijn dag toont een attentiekaart wanneer de attentie aan het actieve profiel
  is gericht;
- documentinhoud of documentlink is alleen actief als document-RLS het document
  zichtbaar maakt.

Status/voorstelregel:

- document onder aandacht is aandacht, geen persoonlijk document;
- document zelf blijft informerend.

Datumregel:

- gebruik attentie-created/zichtbaar-vanaf-datum;
- later eventueel verlooptijd.

Actiebeleid:

- openen mag alleen als document zichtbaar is;
- geen documentmutaties vanuit Mijn dag.

RLS/privacyrisico:

- een attentiekaart mag het bestaan of de inhoud van een verboden document niet
  lekken;
- document_koppelingen blijven verwijzingen, geen toegangsbewijs.

Testdata nodig:

- attentie naar zichtbaar document;
- attentie naar niet-zichtbaar document;
- groepsdocument voor medewerker maar niet bewoner.

MVP-keuze:

- uitstellen tot attentiemodel en testdata expliciet zijn. Daarna MVP-light als
  attentiekaart, niet als documentsectie.

### 6.9 Doelen onder aandacht

Brondata:

- `doelen`;
- `doel_koppelingen`;
- later `doelacceptaties`.

Zichtbaarheidsregel:

- doel mag alleen zichtbaar zijn wanneer `can_view_doel`/doelen-RLS dit toestaat;
- persoonlijke activering via `doelacceptaties` mag pas wanneer policies bestaan.

Status/voorstelregel:

- voorgesteld persoonlijk doel is nog geen actief doel;
- acceptatie/weigering moet vergelijkbaar met voorstelregie verlopen.

Datumregel:

- gebruik `start_at`, `eind_at` of attentiedatum, maar dit is nog niet
  vastgelegd.

Actiebeleid:

- geen doelacceptatie in Stap 2C;
- geen doelen onder aandacht bouwen voordat `doelacceptaties` policy en RLS-test
  bestaan.

RLS/privacyrisico:

- `doelacceptaties` heeft RLS aan maar geen actuele policy;
- zonder policy is dit veilig gesloten, maar functioneel onbruikbaar;
- doelen kunnen gevoelige persoonlijke richting bevatten.

Testdata nodig:

- zichtbaar persoonlijk doel;
- groepsdoel;
- voorgesteld doel met acceptatie;
- doel van ander profiel;
- doel onder aandacht via attentie.

MVP-keuze:

- uitstellen tot na policy/RLS-fix.

### 6.10 Tijdlijn-/support-aandacht

Brondata:

- `tijdlijnberichten`;
- `supportvragen`;
- `supportvraag_reacties`;
- `signalen`.

Zichtbaarheidsregel:

- supportvraag in Mijn dag wanneer aangemaakt vanuit actief profiel of door
  RLS/supportcontext zichtbaar;
- tijdlijn/signaal alleen profielgericht in Mijn dag.

Status/voorstelregel:

- `nieuw`, `actie_nodig` en `in_behandeling` zijn actieve aandacht;
- `gesloten` en `afgehandeld` verdwijnen uit actieve Mijn dag.

Datumregel:

- gebruik `updated_at` of `created_at`, afhankelijk van bron;
- supportreactie kan een vraag opnieuw aandacht geven.

Actiebeleid:

- geen ticketsysteem bouwen;
- sluitflow en reactieflow later apart toetsen.

RLS/privacyrisico:

- support mag niet zichtbaar worden voor ongekoppelde profielen of gasten;
- supportreacties en sluitflow zijn nog niet volledig als browserflow bewezen.

Testdata nodig:

- supportvraag nieuw;
- supportvraag met supportantwoord;
- gesloten supportvraag;
- supportvraag van ander profiel.

MVP-keuze:

- beperkte aandacht behouden via Tijdlijn; geen aparte supportmodule.

## 7. Besluiten voor MVP

1. Mijn dag blijft compositie van persoonlijke relaties, geen losse entiteit.
2. Persoonlijke afspraak wordt persoonlijk moment, geen aparte tabel.
3. Persoonlijk moment verschijnt in Mijn dag wanneer actief profiel eigenaar is
   of deelnemer is.
4. Begeleider naar client maakt een voorstel, geen definitief persoonlijk item.
5. Taken mogen zichtbaar zijn, maar mutaties vanuit Mijn dag blijven later.
6. Aandachtspunten zijn geen aparte entiteit in de MVP.
7. Documenten onder aandacht worden attentiekaarten; document-RLS blijft leidend.
8. Doelen onder aandacht worden uitgesteld tot `doelacceptaties` policy en
   RLS-test bestaan.
9. Support blijft aandacht via Tijdlijn, geen ticketsysteem.
10. Categorieen mogen nooit rechten of zichtbaarheid bepalen.

## 8. Uitgestelde onderdelen

- doelacceptatie-acties;
- voorsteltypes voor taken, doelen, documenten en persoonlijke momenten;
- muterende taakflows vanuit Mijn dag;
- document onder aandacht als volwaardige UI-flow;
- persoonlijke momenten aanmaken of wijzigen;
- groepsgerichte aandacht in Mijn dag;
- historiek van afgehandelde aandacht;
- browserflows en Playwright-mutaties;
- begeleidingsnotities als functionele Mijn dag-flow.

## 9. RLS- en policygaten

| Gat | Effect | Vereist voor bouw |
| --- | --- | --- |
| `doelacceptaties` heeft RLS maar geen policy | Doelacceptatie is functioneel geblokkeerd | Policy + pgTAP-test voor doelen in Mijn dag |
| Persoonlijk moment via eigenaar-profiel niet bewezen | Eigenaar-profiel-moment kan buiten beeld vallen of verkeerd zichtbaar worden | RLS-test en queryspecificatie |
| Document onder aandacht heeft geen vast attentiemodel | Attentie kan documenttoegang lekken of onduidelijk zijn | Attentiedefinitie + document-RLS-test |
| Voorsteltypes buiten moment ontbreken | Taak/doel/document/persoonlijk moment kunnen nog niet veilig voorstelgestuurd | Nieuwe RPC/policy/test per type |
| Mijn dag als samengestelde query niet RLS-getest | Tabel-RLS kan kloppen terwijl compositie privacy lekt | Compositie-scenario's in pgTAP |

## 10. Testdata-behoefte

Minimale resetbare scenario's voor Fase 2:

- Sam met definitieve deelname vandaag;
- Sam met open momentvoorstel vandaag;
- Sam met eigen taak vandaag;
- Sam met afgeronde taak die niet verschijnt;
- Milan met rolbezetting vandaag;
- persoonlijk moment van Sam zonder deelname;
- persoonlijk moment van ander profiel;
- profielgerichte aandacht voor Sam;
- groepsgerichte aandacht die niet in Mijn dag verschijnt;
- document-attentie naar zichtbaar document;
- document-attentie naar verboden document;
- doel onder aandacht pas na policyfix;
- supportvraag nieuw, in behandeling en gesloten;
- Gijs als gast met alleen gasttoegankelijke werkelijkheid.

De browserlaag mag deze scenario's pas muterend gebruiken nadat resetbaarheid is
vastgelegd. Het gedeelde lokale testwachtwoord is voor deze specificatie niet
nodig.

## 11. Aanbevolen bouwvolgorde

1. Voeg resetbare testdata toe voor Mijn dag-compositie zonder nieuwe UI.
2. Voeg pgTAP/RLS-tests toe voor persoonlijke momenten en compositiegrenzen.
3. Herijk de Mijn dag-query voor eigenaar-profiel-momenten.
4. Houd taken read-only en test zichtbaarheid op taakuitvoerder.
5. Voeg attentiemodel voor documenten onder aandacht toe, eerst als specificatie
   en testdata.
6. Los `doelacceptaties` policy op voordat doelen in Mijn dag worden gebouwd.
7. Breid UI pas uit na groene RLS/testdata-basis.
8. Voeg browser-smoke pas toe nadat runtime-login en resetdata betrouwbaar zijn.

## 12. Voorstel voor Fase 2 Stap 2C

Voorgesteld doel:

- maak resetbare testdata en RLS-scenario's voor de eerste veilige Mijn
  dag-compositie: deelname, rolbezetting, open momentvoorstel, taak en
  profielgerichte aandacht;
- bouw nog geen UI;
- los `doelacceptaties` nog niet op, tenzij Stap 2C expliciet daarop wordt
  gericht.

Aanbevolen model: GPT-5.5 Codex.
Reden: deze stap raakt migratie-seeddata, RLS, testisolatie en compositiegedrag.
Reasoningniveau: extra hoog.
Browsertesten: nee.
Het gedeelde lokale testwachtwoord is niet nodig.
