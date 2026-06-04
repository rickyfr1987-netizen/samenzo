# E2E Tests

Playwright is geconfigureerd via `playwright.config.ts`, maar Fase 1 Stap 1A
voegt nog geen browserflows toe.

Toekomstige e2e-tests moeten:

- draaien tegen een lokale Next-app en lokale Supabase-context;
- eerst de lokale testdata resetten of een expliciet resetbaar scenario kiezen;
- inloggen via een runtime fixture of handmatige lokale sessie;
- geen wachtwoorden, tokens of Auth-user IDs opslaan in code, fixtures,
  screenshots, traces of documentatie.

Browsertesten kunnen later het gedeelde lokale testwachtwoord nodig hebben.
Gebruik dat uitsluitend runtime en bewaar het nergens in deze repo.
