# Fixtures

Deze map bevat kleine Vitest-fixtures voor SAM&ZO-profielen, context en datums.
Ze zijn bedoeld voor mock-gebaseerde unit- en integratietests, niet als
Supabase-seeddata.

Playwright-specifieke runtime fixtures staan onder `tests/e2e/fixtures/`.
Die mogen environmentvariabelen lezen, maar mogen geen waarden voor
wachtwoorden, tokens, sessies of storage state in Git opslaan.

Gebruik fictieve waarden en `@example.test`-adressen. Sla geen wachtwoorden,
tokens, Auth secrets of echte persoonsgegevens op in fixtures.
