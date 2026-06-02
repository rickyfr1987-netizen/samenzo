import type { Tables } from "@/src/lib/database.types";

export const DEVELOPMENT_PROFILE_STORAGE_KEY = "samzo.dev.activeProfileId";

export type DevelopmentProfile = {
  id: string;
  personId: string;
  name: string;
  email: string;
  role: Tables<"personen">["systeemrol"];
  groups: string[];
  expectedPlanningVisibility: string;
};

// Development-only seed profile metadata from 20260601210656_seed_initial_samzo_data.sql.
// This is not an authorization source and is never sent to Supabase as privileged context.
export const DEVELOPMENT_PROFILES: DevelopmentProfile[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    personId: "00000000-0000-4000-8000-000000000001",
    name: "Bas Beheerder",
    email: "bas.beheerder@example.test",
    role: "systeembeheerder",
    groups: ["Iedereen"],
    expectedPlanningVisibility: "Alle seedmomenten na Auth-koppeling."
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    personId: "00000000-0000-4000-8000-000000000002",
    name: "Sanne Systeemondersteuner",
    email: "sanne.support@example.test",
    role: "systeemondersteuner",
    groups: ["Medewerkers"],
    expectedPlanningVisibility:
      "Geen seedmomenten via de huidige moment-RLS; supportcontext zit nog niet in can_view_moment()."
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    personId: "00000000-0000-4000-8000-000000000003",
    name: "Milan Medewerker",
    email: "milan.medewerker@example.test",
    role: "medewerker",
    groups: ["Medewerkers"],
    expectedPlanningVisibility:
      "Avondmaaltijd test via actieve rolbezetting na Auth-koppeling."
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    personId: "00000000-0000-4000-8000-000000000004",
    name: "Sam Bewoner",
    email: "sam.bewoner@example.test",
    role: "lid",
    groups: ["Bewoners"],
    expectedPlanningVisibility:
      "Avondmaaltijd test en Zwemmen test via deelname en bewonersgroep na Auth-koppeling."
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    personId: "00000000-0000-4000-8000-000000000005",
    name: "Gijs Gast",
    email: "gijs.gast@example.test",
    role: "gast",
    groups: ["Gasten"],
    expectedPlanningVisibility:
      "Geen seedmomenten via de huidige moment-RLS; gasttoegang is bewust nog niet meegenomen."
  }
];

export function isDevelopmentProfileContextEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function getDevelopmentProfileById(profileId: string | null) {
  return (
    DEVELOPMENT_PROFILES.find((profile) => profile.id === profileId) ?? null
  );
}

export function readStoredDevelopmentProfileId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(DEVELOPMENT_PROFILE_STORAGE_KEY);
}

export function writeStoredDevelopmentProfileId(profileId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (profileId) {
    window.localStorage.setItem(DEVELOPMENT_PROFILE_STORAGE_KEY, profileId);
    return;
  }

  window.localStorage.removeItem(DEVELOPMENT_PROFILE_STORAGE_KEY);
}
