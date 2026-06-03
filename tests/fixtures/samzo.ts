import type { User } from "@supabase/supabase-js";

import type { CurrentSamzoContext } from "@/src/lib/samzo/current-context";

export const SAM_PERSOON_ID = "00000000-0000-4000-8000-000000000004";
export const SAM_PROFILE_ID = "10000000-0000-4000-8000-000000000004";
export const BAS_PROFILE_ID = "10000000-0000-4000-8000-000000000001";

export function createSamzoContext(
  overrides: Partial<CurrentSamzoContext> = {}
): CurrentSamzoContext {
  const persoon = {
    id: SAM_PERSOON_ID,
    auth_user_id: "auth-sam",
    email: "sam.bewoner@example.test",
    accountnaam: "Sam Bewoner",
    systeemrol: "lid" as const,
    status: "actief" as const
  };
  const profiel = {
    id: SAM_PROFILE_ID,
    persoon_id: SAM_PERSOON_ID,
    weergavenaam: "Sam Bewoner",
    status: "actief" as const,
    avatar_url: null,
    zichtbaar_voor_leden: true
  };

  return {
    authUser: {
      id: "auth-sam",
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-06-03T00:00:00.000Z",
      user_metadata: {}
    } as User,
    currentProfiel: profiel,
    ownProfiel: profiel,
    persoon,
    profielen: [profiel],
    ...overrides
  };
}

export function currentDayIsoAt(hour: number) {
  const today = new Date();
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hour,
    0,
    0,
    0
  );

  return date.toISOString();
}
