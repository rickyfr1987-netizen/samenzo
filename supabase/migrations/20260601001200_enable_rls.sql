-- SAM&ZO migration 012: RLS inschakelen.
-- Doel: RLS activeren op alle bestaande applicatietabellen uit migrations 003 t/m 009.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand bevat geen policies, grants, helperfuncties, seeddata, triggers of RPC's.
-- RLS is de echte beveiligingslaag. UI mag rechten verbergen, maar is nooit de enige beveiliging.
-- Policies volgen later per slice. Zonder policies zijn deze tabellen bewust nog niet bruikbaar voor normale authenticated gebruikers.
-- Begeleidingsnotities krijgen RLS en later extra strenge policies.

-- Identiteit, profielen en groepen
alter table public.personen enable row level security;
alter table public.profielen enable row level security;
alter table public.profielinstellingen enable row level security;
alter table public.profieltoegangen enable row level security;
alter table public.groepen enable row level security;
alter table public.groepslidmaatschappen enable row level security;
alter table public.groepsrollen enable row level security;

-- Categorieen
alter table public.categorieen enable row level security;
alter table public.categorie_configuraties enable row level security;

-- Momenten, deelname, rollen en beschikbaarheid
alter table public.momenten enable row level security;
alter table public.moment_groepen enable row level security;
alter table public.deelnames enable row level security;
alter table public.momentrollen enable row level security;
alter table public.rolbezettingen enable row level security;
alter table public.beschikbaarheden enable row level security;

-- Doelen, lijsten en taken
alter table public.doelen enable row level security;
alter table public.doelacceptaties enable row level security;
alter table public.doel_koppelingen enable row level security;
alter table public.lijsten enable row level security;
alter table public.lijst_groepen enable row level security;
alter table public.taken enable row level security;
alter table public.taakuitvoerders enable row level security;

-- Documenten en begeleidingsnotities
alter table public.documenten enable row level security;
alter table public.document_groepen enable row level security;
alter table public.document_koppelingen enable row level security;
alter table public.begeleidingsnotities enable row level security;

-- Communicatie
alter table public.voorstellen enable row level security;
alter table public.supportvragen enable row level security;
alter table public.signalen enable row level security;
alter table public.tijdlijnberichten enable row level security;
alter table public.notificatiestatussen enable row level security;

-- Tags en templates
alter table public.tags enable row level security;
alter table public.tag_koppelingen enable row level security;
alter table public.templates enable row level security;
