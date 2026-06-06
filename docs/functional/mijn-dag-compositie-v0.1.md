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
- doelen onder aandacht read-only zichtbaar maken.

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
| Persoonlijk moment | `momenten` met eigenaar-profiel en/of `deelnames` | Read-only voorbereiden | Eigen profiel definitief, ander profiel voorstel | Eigenaar-profiel RLS bewezen in Stap 2E |
| Individuele activiteit | Persoonlijk of kleinschalig `moment` | Specificeren voor bouw | Zelf definitief, ander profiel voorstel | Extra RLS-test nodig |
| Taak | `taakuitvoerders` + `taken` + `lijsten` | Eerst read-only | Afvinken later na resetdata | Read policies aanwezig, mutaties apart |
| Aandachtspunt | Tijdlijn, Signalen, Support, Voorstellen | Bouwen als compositie | Afhandelen later per bron | Bron-RLS leidend |
| Document onder aandacht | Profielgerichte `tijdlijnberichten`/`signalen` + `documenten` | Read-only voorbereiden | Document openen alleen als document-RLS toestaat | Document-attentie RLS bewezen in Stap 2F |
| Doel onder aandacht / persoonlijk doel | `doelacceptaties` + daarna `doelen` | Read-only zichtbaar | Geen acceptatieknoppen in Mijn dag | Doel-attentie RLS bewezen in Stap 2H; UI zichtbaar in Stap 2I; geaccepteerd doelitem in Stap 2J |
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
- eigenaar-profiel alleen is genoeg als functionele intentie en is in Stap 2E
  read-only bewezen voor RLS en compositie.

Datumregel:

- gebruik `momenten.start_at`;
- zonder datum niet tonen in Mijn dag.

Actiebeleid:

- Stap 2E mag dit read-only tonen nadat RLS-testdata bewijst dat
  eigenaar-profiel zichtbaarheid correct begrensd is;
- aanmaken, wijzigen en begeleider-naar-client blijven later voorstelgestuurd.

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

- MVP-light: profielgericht `tijdlijnbericht` of `signaal` met
  `gekoppeld_type = 'document'`;
- `documenten` blijven aparte inhoudsbron.

Zichtbaarheidsregel:

- Mijn dag toont een attentiekaart wanneer de attentie aan het actieve profiel
  is gericht;
- documentinhoud of documentlink is alleen actief als document-RLS het document
  zichtbaar maakt.
- groepsgerichte document-aandacht is context, geen persoonlijke Mijn dag-kaart.

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

- Stap 2F bereidt MVP-light read-only voor als attentiekaart, niet als
  documentsectie;
- aanmaken, wijzigen en documentbeheer blijven buiten Mijn dag.

### 6.9 Doelen onder aandacht

Brondata:

- `doelen`;
- `doel_koppelingen`;
- `doelacceptaties`.

Zichtbaarheidsregel:

- doel mag alleen zichtbaar zijn wanneer `can_view_doel`/doelen-RLS dit toestaat;
- persoonlijke activering via `doelacceptaties` mag alleen voor het eigen
  profiel en alleen wanneer het gekoppelde doel zelf zichtbaar is.

Status/voorstelregel:

- voorgesteld persoonlijk doel is nog geen actief doel;
- `voorgesteld` verschijnt als actieve read-only aandacht;
- `later_bekijken` mag actieve read-only aandacht blijven;
- `geweigerd` verdwijnt uit actieve Mijn dag;
- `geaccepteerd` wordt geen aandachtkaart, maar een read-only persoonlijk
  doelitem;
- acceptatie/weigering moet vergelijkbaar met voorstelregie verlopen.

Datumregel:

- `voorgesteld` en `later_bekijken` gebruiken de attentiedatum uit
  `doelacceptaties`;
- `geaccepteerd` verschijnt vanaf acceptatie binnen de doelperiode;
- als een geaccepteerd doel geen periode heeft, verschijnt het alleen op de
  acceptatiedag;
- een tijdloos geaccepteerd doel wordt niet dagelijks getoond zonder apart
  ontwerpbesluit.

Actiebeleid:

- geen doelacceptatie vanuit Mijn dag;
- Stap 2G voegt alleen minimale RLS toe voor eigen doelacceptaties lezen en
  eigen voorgestelde doelacceptatie beantwoorden;
- Stap 2H bereidt read-only doelen onder aandacht voor via
  `doelacceptaties`, zonder acceptatieknoppen of doelmutaties;
- Stap 2J toont geaccepteerde doelen als read-only persoonlijk doelitem, zonder
  voortgang, dashboard of rapportage;
- Stap 2L voegt een smalle RPC-actielaag toe voor eigen doelacceptaties, maar
  nog geen knoppen, formulier of doelenbeheerflow;
- Stap 2M sluit deze actielaag compact aan op doel-attenties in Mijn dag,
  alleen voor het eigen profiel en zonder doelenbeheerflow;
- doeldata wordt pas gebruikt nadat `doelen` zelf die rij via RLS teruggeeft.

RLS/privacyrisico:

- `doelacceptaties` raakt persoonlijke werkelijkheid en mag niet door
  begeleiders of beheerders namens het profiel worden vastgesteld;
- doelacceptatie-RLS mag doelinhoud niet openen als `can_view_doel` het doel
  blokkeert;
- doelen kunnen gevoelige persoonlijke richting bevatten.

Testdata nodig:

- zichtbaar persoonlijk doel;
- groepsdoel;
- voorgesteld doel met acceptatie;
- doel van ander profiel;
- doel onder aandacht via doelacceptatie.

MVP-keuze:

- read-only aandachtkaart en persoonlijk doelitem zijn zichtbaar in Mijn dag;
  acceptatie/weigering en beheerflow blijven uitgesteld.

Actiespecificatie voor latere bouw:

- doelacceptatie-acties mogen alleen persoonlijke regie vastleggen voor het
  eigen profiel. De actor moet dus het actieve eigen profiel zijn; kijken via
  `has_profieltoegang`, beheercontext, medewerkercontext of systeemcontext mag
  nooit genoeg zijn om namens een ander profiel te accepteren, weigeren of op
  later bekijken te zetten;
- de gekoppelde doelrij moet zelfstandig zichtbaar blijven via
  `can_view_doel`/doelen-RLS. Een doelacceptatie-actie mag geen verboden doel
  openen en mag geen doelinhoud gebruiken wanneer de doelrij niet zichtbaar is;
- `voorgesteld` is een actieve persoonlijke aandacht. Latere acties mogen dit
  omzetten naar `geaccepteerd`, `geweigerd` of `later_bekijken`;
- `later_bekijken` blijft een actieve persoonlijke aandacht. Productmatig is
  het logisch dat het eigen profiel dit later alsnog naar `geaccepteerd` of
  `geweigerd` kan brengen. Stap 2L ondersteunt deze route expliciet via de
  centrale RPC en RLS-testdekking. Nogmaals later bekijken vanuit
  `later_bekijken` blijft niet toegestaan;
- `geaccepteerd` is een read-only persoonlijk doelitem en geen actieve
  acceptatie-aandacht meer. Opnieuw accepteren, weigeren of later bekijken is
  geen actieve Mijn dag-actie;
- `geweigerd` verdwijnt uit actieve Mijn dag en krijgt geen nieuwe actieknoppen
  zonder apart heropeningsontwerp;
- `verlopen` is geen actieve Mijn dag-actie. Als verlopen doelvoorstellen later
  historisch zichtbaar worden, blijft dat een aparte historiekweergave zonder
  directe mutatie.

Aanbevolen technische route voor latere bouw:

- bouw de uiteindelijke mutatie als RPC of server action met een klein
  actiewoord (`accept`, `reject`, `later`) en expliciete `target_acceptance_id`
  plus `target_profiel_id`;
- houd de functie `security invoker`, vergelijkbaar met
  `beantwoord_moment_voorstel`, zodat gewone RLS en het actieve profiel de
  grens blijven bepalen;
- zet status en precies een timestampveld centraal in die actie:
  `geaccepteerd_at` bij accepteren, `geweigerd_at` bij weigeren en
  `later_bekijken_at` bij later bekijken. De andere twee actietimestamps moeten
  dan leeg blijven;
- gebruik geen directe client-update als productroute. De bestaande RLS maakt
  een beperkte update van eigen `voorgesteld` technisch mogelijk, maar een
  RPC/server action voorkomt verspreide timestamplogica, geeft betere
  foutmeldingen en houdt ruimte voor logging, notificaties of statusgeschiedenis;
- UI-gating blijft aanvullend: knoppen mogen alleen verschijnen wanneer de
  pagina het eigen profiel toont en de status actiegeschikt is. De database/RPC
  blijft de beslissende beveiligingslaag.

Teststrategie voor latere actiebouw:

- pgTAP/RLS bewijst positief dat Sam een eigen zichtbare `voorgesteld`
  doelacceptatie kan accepteren, weigeren en later bekijken;
- pgTAP/RLS bewijst, als dit functioneel gekozen wordt, dat Sam een eigen
  zichtbare `later_bekijken` doelacceptatie alsnog kan accepteren of weigeren;
- pgTAP/RLS bewijst negatief dat Gijs, Bas, beheercontext en profieltoegang
  niet namens Sam kunnen handelen;
- pgTAP/RLS bewijst negatief dat een doelacceptatie naar een verborgen doel
  geen actie en geen doelinhoud opent;
- pgTAP/RLS bewijst dat `geaccepteerd`, `geweigerd` en `verlopen` niet opnieuw
  als actieve actie worden beantwoord;
- pgTAP/RLS of unitdekking controleert dat per eindstatus precies de juiste
  timestamp is gevuld en de andere actietimestamps leeg zijn;
- unit- en componenttests bewijzen dat knoppen alleen bij eigen profiel en
  actiegeschikte status verschijnen, en dat andermans profielperspectief
  read-only blijft;
- browsertests komen pas later met resetbare data. Het gedeelde lokale
  testwachtwoord is voor deze specificatie niet nodig en hoort niet in docs,
  tests, traces of CI te staan.

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

### 6.11 Directe persoonlijke items vanuit Mijn dag

Doel en scope:

- specificeer alleen wat later rechtstreeks vanuit Mijn dag persoonlijk mag
  worden aangemaakt;
- bouw in deze stap geen UI, formulier, plusknop, migratie, RLS-policy, RPC,
  server action, seeddata of browserflow;
- categorieen blijven beschrijvend en dragen geen rechten, zichtbaarheid of
  routekeuze.

Waarom dit nodig is:

- Mijn dag toont nu vooral persoonlijke werkelijkheid die elders ontstaat;
- een bewoner of gast moet later ook zelf een klein persoonlijk item kunnen
  vastleggen zonder dat dit automatisch groepswerkelijkheid wordt;
- een begeleider moet persoonlijke werkelijkheid voor een client niet
  definitief kunnen maken zonder voorstel- of acceptatiestap.

Drie soorten persoonlijke items:

| Soort | Definitie | Voorbeelden | MVP-besluit |
| --- | --- | --- | --- |
| Afgeleid persoonlijk item | Item bestaat elders en wordt persoonlijk door deelname, rol, taakuitvoering, voorstel of profielgerichte aandacht. | deelname aan moment, rolbezetting, taakuitvoerder, doelacceptatie, document-attentie, tijdlijn-/support-aandacht | Blijft de basis van Mijn dag-compositie. |
| Direct persoonlijk item | Actieve profiel maakt zelf eigen persoonlijke werkelijkheid. | eigen persoonlijke afspraak/moment; later persoonlijke taak; later persoonlijk aandachtspunt | Alleen specificeren; eerste bouwkandidaat is eigen persoonlijk moment. |
| Voorgesteld persoonlijk item | Iemand anders wil persoonlijke werkelijkheid voor het profiel laten ontstaan. | begeleider stelt persoonlijk moment voor client voor | Blijft voorstelgestuurd; geen definitieve client-mutatie. |

Persoonlijke afspraak / persoonlijk moment:

- persoonlijke afspraak is functioneel hetzelfde als persoonlijk moment;
- gebruik `momenten` met `eigenaar_profiel_id`, geen aparte tabel
  `persoonlijke_afspraken`;
- een eigen persoonlijk moment heeft geen verplichte `deelnames`-rij nodig:
  eigenaar-profiel is de persoonlijke relatie;
- een profiel mag later alleen voor het eigen actieve profiel definitief
  aanmaken, mits RLS en inputflow dit afdwingen;
- een begeleider die vanuit clientcontext werkt, maakt later een voorstel en
  geen definitief clientmoment;
- zonder `start_at` verschijnt het item niet in Mijn dag;
- profiel-eigendom maakt het item niet automatisch breed zichtbaar in Planning.

Persoonlijke taak:

- `taken` zijn nu lijstgebonden via `lijst_id`;
- `taakuitvoerders.profiel_id` is genoeg om een bestaande taak persoonlijk te
  maken voor Mijn dag, maar niet genoeg als veilig maakmodel;
- directe persoonlijke taakcreatie blijft later totdat een persoonlijke lijst-
  of taakstrategie, mutatiepad en RLS-test expliciet gekozen zijn.

Persoonlijk aandachtspunt:

- maak nu geen nieuwe entiteit voor "aandachtspunt";
- gebruik voorlopig bestaande compositiebronnen zoals `tijdlijnberichten`,
  `signalen`, supportvragen of doel-/document-attentie;
- een later aandachtspunt heeft minimaal bron, ontvanger, status en sluit- of
  vervalgedrag nodig, zodat Mijn dag geen onbeperkte notificatielijst wordt.

Begeleider naar client:

- profieltoegang mag kijken en begeleiden mogelijk maken, maar niet stilzwijgend
  persoonlijke werkelijkheid voor de client vastleggen;
- begeleider-naar-client hoort daarom bij voorgestelde persoonlijke items;
- de bestaande momentvoorstelroute dekt al momentdeelname en uitnodiging, maar
  nog geen volledig nieuw persoonlijk moment als voorstel;
- een latere bouwstap moet kiezen tussen nieuw `voorstel_type` met RPC of een
  expliciet draft-/voorstelmodel.

Plusknoproute:

- de eerste veilige plusknopoptie voor Mijn dag is later: eigen persoonlijk
  moment;
- de route moet contextueel werken op het actieve eigen profiel;
- persoonlijke taak en persoonlijk aandachtspunt blijven uit de eerste
  plusknopstap;
- doelen-dashboard, brede supportflow, documentenbeheer en categoriegedrag
  horen niet bij deze route.

RLS- en privacyregels:

- UI-gating is nooit genoeg; database/RPC moet het actieve eigen profiel
  afdwingen;
- `has_profieltoegang` kan lezen toestaan, maar mag niet automatisch schrijven
  namens de client toestaan;
- categorieen mogen geen policyshortcut worden;
- profieleigen momenten moeten niet via groeps- of Planningcontext lekken.

Testdata nodig voor latere bouw:

- eigen profiel maakt definitief persoonlijk moment voor vandaag;
- persoonlijk moment voor ander profiel is niet zichtbaar of mutabel;
- gearchiveerd persoonlijk moment verschijnt niet actief;
- persoonlijk moment zonder datum verschijnt niet in Mijn dag;
- begeleider-naar-client levert voorstel op, geen definitief moment;
- persoonlijke taak alleen na gekozen persoonlijke lijst-/taakstrategie;
- persoonlijk aandachtspunt alleen na gekozen bron-, status- en sluitmodel.

Aanbevolen bouwvolgorde:

1. Specificeer en test resetbare data voor eigen persoonlijke momenten.
2. Voeg pgTAP/RLS-tests toe voor insert, lezen, wijzigen en lekgrenzen.
3. Bouw een smalle RPC/server action voor eigen profiel persoonlijk moment.
4. Sluit pas daarna een contextuele Mijn dag-plusknop aan.
5. Ontwerp daarna begeleider-naar-client als voorstelpad.
6. Pak persoonlijke taken en aandachtspunten pas op na hun datamodelkeuze.

## 7. Besluiten voor MVP

1. Mijn dag blijft compositie van persoonlijke relaties, geen losse entiteit.
2. Persoonlijke afspraak wordt persoonlijk moment, geen aparte tabel.
3. Persoonlijk moment verschijnt in Mijn dag wanneer actief profiel eigenaar is
   of deelnemer is.
4. Begeleider naar client maakt een voorstel, geen definitief persoonlijk item.
5. Taken mogen zichtbaar zijn, maar mutaties vanuit Mijn dag blijven later.
6. Aandachtspunten zijn geen aparte entiteit in de MVP.
7. Documenten onder aandacht worden attentiekaarten; document-RLS blijft leidend.
8. Doelen onder aandacht worden read-only voorbereid via doelacceptaties;
   acceptatieknoppen en doelmutaties blijven later.
9. Support blijft aandacht via Tijdlijn, geen ticketsysteem.
10. Categorieen mogen nooit rechten of zichtbaarheid bepalen.
11. Directe persoonlijke invoer start later alleen met eigen persoonlijk moment;
    persoonlijke taken en aandachtspunten blijven aparte vervolgstappen.

## 8. Uitgestelde onderdelen

- implementatie van doelacceptatie-acties;
- doelacceptatieknoppen op doelen onder aandacht;
- voorsteltypes voor taken, doelen, documenten en persoonlijke momenten;
- muterende taakflows vanuit Mijn dag;
- document onder aandacht als volwaardige UI-flow;
- persoonlijke momenten aanmaken of wijzigen;
- directe persoonlijke plusknop vanuit Mijn dag;
- persoonlijke taak zonder gekozen lijst-/taakstrategie;
- persoonlijk aandachtspunt zonder bron-, status- en sluitmodel;
- groepsgerichte aandacht in Mijn dag;
- historiek van afgehandelde aandacht;
- browserflows en Playwright-mutaties;
- begeleidingsnotities als functionele Mijn dag-flow.

## 9. RLS- en policygaten

| Gat | Effect | Vereist voor bouw |
| --- | --- | --- |
| Doelen zonder acceptatieflow | Read-only aandachtkaart en geaccepteerd doelitem zijn zichtbaar en RLS-bewijs is voorbereid, maar persoonlijke acceptatie/weigering ontbreekt bewust | Voorstelgestuurde of RPC-gestuurde acceptatieflow in aparte vervolgstap |
| Persoonlijk moment via eigenaar-profiel alleen read-only bewezen | Eigenaar-profiel-moment is zichtbaar als persoonlijke relatie, maar heeft nog geen veilige maak- of voorstelroute | Muterende flow + voorstel-RLS per vervolgstap |
| Direct persoonlijk item vanuit Mijn dag nog niet muterend bewezen | Eigen profiel mag later eigen werkelijkheid maken, maar insert/update-grenzen zijn nog niet getest | RLS-first eigen-persoonlijk-momentflow met resetbare testdata |
| Document onder aandacht alleen read-only bewezen | Attentiekaart werkt via profielgerichte aandacht plus document-RLS, maar heeft nog geen veilige aanmaak- of beheerflow | Muterende flow + testdata per vervolgstap |
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
- eigen profiel dat later een persoonlijk moment mag aanmaken;
- begeleider-naar-client als voorstel, niet als definitief persoonlijk moment;
- persoonlijk moment zonder datum dat niet in Mijn dag verschijnt;
- profielgerichte aandacht voor Sam;
- groepsgerichte aandacht die niet in Mijn dag verschijnt;
- document-attentie naar zichtbaar document;
- document-attentie naar verboden document;
- doel onder aandacht als read-only compositie;
- supportvraag nieuw, in behandeling en gesloten;
- Gijs als gast met alleen gasttoegankelijke werkelijkheid.

De browserlaag mag deze scenario's pas muterend gebruiken nadat resetbaarheid is
vastgelegd. Het gedeelde lokale testwachtwoord is voor deze specificatie niet
nodig.

Fase 2 Stap 2C voegt voor de eerste veilige compositie rollback-pgTAP-testdata
toe in `supabase/tests/database/mijn_dag_compositie_rls.test.sql`. Die test
dekt deelname, rolbezetting, open momentvoorstel, read-only taakrelatie en
profielgerichte aandacht af. Fase 2 Stap 2E voegt
`supabase/tests/database/mijn_dag_persoonlijke_momenten_rls.test.sql` toe voor
persoonlijke eigenaar-profiel momenten zonder deelname, inclusief gastcontext.
Fase 2 Stap 2F voegt
`supabase/tests/database/mijn_dag_document_attenties_rls.test.sql` toe voor
profielgerichte document-attenties uit tijdlijnberichten en signalen. Die suite
bewijst dat een zichtbare attentie geen verboden document opent, en dat
groepscontext alleen geen persoonlijke document-attentie wordt. Fase 2 Stap 2G
voegt
`supabase/tests/database/doelacceptaties_rls.test.sql` toe en een minimale
policy voor `doelacceptaties`: eigen profiel mag eigen voorgestelde
doelacceptatie zien en beantwoorden, mits het gekoppelde doel via
`can_view_doel` zichtbaar is. Fase 2 Stap 2H voegt
`supabase/tests/database/mijn_dag_doel_attenties_rls.test.sql` toe en bereidt
read-only `fetchMijnDagGoalAttentionItems` voor. Alleen `voorgesteld` en
`later_bekijken` zijn actieve doel-attenties; `geweigerd` en `geaccepteerd`
worden niet als actieve doelkaart samengesteld. Fase 2 Stap 2I toont deze
read-only doel-attenties in `/mijn-dag`, zonder acceptatieknoppen,
weigerknoppen, later-bekijken-knop of formulier. Fase 2 Stap 2J toont
`geaccepteerd` als read-only persoonlijk doelitem. Geaccepteerde doelen
verschijnen binnen de doelperiode vanaf acceptatie; zonder doelperiode alleen
op de acceptatiedag. Fase 2 Stap 2K specificeert alleen de latere
doelacceptatie-acties en bevestigt dat er nog geen knoppen, formulier,
server action, RPC, migratie of doelmutatie wordt gebouwd.
Fase 2 Stap 2L voegt de centrale `beantwoord_doelacceptatie`-RPC toe met
rollback-pgTAP-dekking en een kleine TypeScript-helper. De UI blijft read-only:
er zijn nog geen acceptatie-, weiger- of later-bekijken-knoppen in `/mijn-dag`.
Fase 2 Stap 2M sluit die helper aan op `/mijn-dag`: `voorgesteld` toont
accepteren, weigeren en later bekijken; `later_bekijken` toont alleen
accepteren en weigeren. Deze acties verschijnen alleen bij het eigen profiel en
blijven via de RPC/RLS-laag lopen.
Fase 2 Stap 2N specificeert directe persoonlijke items vanuit Mijn dag zonder
implementatie. De eerste latere maakflow is eigen persoonlijk moment via
`momenten.eigenaar_profiel_id`; begeleider-naar-client blijft voorstelgestuurd,
persoonlijke taken blijven lijst-/taakstrategie-afhankelijk en persoonlijke
aandachtspunten blijven compositie totdat bron, status en sluitgedrag zijn
gekozen.

## 11. Aanbevolen bouwvolgorde

1. Voeg resetbare testdata toe voor Mijn dag-compositie zonder nieuwe UI.
2. Voeg pgTAP/RLS-tests toe voor persoonlijke momenten en compositiegrenzen.
3. Herijk de Mijn dag-query voor eigenaar-profiel-momenten.
4. Bouw directe eigen persoonlijke momentcreatie pas RLS-first, met insert- en
   updategrenzen voor het actieve eigen profiel.
5. Houd taken read-only en test zichtbaarheid op taakuitvoerder.
6. Houd document-attenties read-only en voorkom dat groepscontext persoonlijke
   Mijn dag-aandacht wordt.
7. Houd doelen onder aandacht read-only zichtbaar; bouw acceptatie/weigering pas
   later als aparte persoonlijke regieflow op basis van de Stap 2K-specificatie.
8. Breid UI pas uit na groene RLS/testdata-basis.
9. Voeg browser-smoke pas toe nadat runtime-login en resetdata betrouwbaar zijn.

## 12. Voorstel voor Fase 2 Stap 2C

Voorgesteld doel:

- maak resetbare testdata en RLS-scenario's voor de eerste veilige Mijn
  dag-compositie: deelname, rolbezetting, open momentvoorstel, taak en
  profielgerichte aandacht;
- bouw nog geen UI;
- houd doelen en `doelacceptaties` buiten Stap 2C; deze zijn later in Stap 2G
  en Stap 2H apart RLS-first voorbereid.

Aanbevolen model: GPT-5.5 Codex.
Reden: deze stap raakt migratie-seeddata, RLS, testisolatie en compositiegedrag.
Reasoningniveau: extra hoog.
Browsertesten: nee.
Het gedeelde lokale testwachtwoord is niet nodig.

## 13. Voorstel voor Fase 2 Stap 2O

Voorgesteld doel:

- PARKERING: Fase 2 Stap 2O-b is op dit moment stilgezet.
- Reden: de RLS/pgTAP-debugloop is nog niet stabiel, dus verdere muterende
  implementatie is uitgesteld.
- Status: directe persoonlijke items zijn nog alleen nog op specificatieniveau;
  nog geen RPC, helper, UI, plusknop of formulier voor eigen persoonlijk moment.
- Voor uitstel gelden nog steeds:
  1. alleen de eigen profielhouder kan een definitief persoonlijk moment maken;
  2. begeleider/medewerker/machtigingscontext blijft voorstelgestuurd;
  3. terug naar implementatie zodra we opnieuw groen RLS/invariant bewijs hebben.

Aanbevolen model: GPT-5.5 Codex.
Reden: deze stap raakt persoonlijke werkelijkheid, RLS-mutaties, RPC-keuze en
testdata-isolatie.
Reasoningniveau: extra hoog.
Browsertesten: nee.
Het gedeelde lokale testwachtwoord is niet nodig.
