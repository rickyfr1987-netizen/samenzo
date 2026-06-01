-- SAM&ZO migration 001: enable minimal extensions.
-- Doel: alleen extensies die nodig zijn voor de schema-basis.
-- Waarschuwing: uitvoeren pas na dev/test-review; dit bestand voert geen schema, RLS of seeddata in.

create extension if not exists pgcrypto;
