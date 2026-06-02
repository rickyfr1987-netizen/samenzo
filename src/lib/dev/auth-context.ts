import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

export type LinkedPersoon = Pick<
  Tables<"personen">,
  "id" | "auth_user_id" | "email" | "accountnaam" | "systeemrol" | "status"
>;

export type LinkedProfiel = Pick<
  Tables<"profielen">,
  "id" | "persoon_id" | "weergavenaam" | "status"
>;

export type CurrentSamzoIdentity = {
  persoon: LinkedPersoon | null;
  profiel: LinkedProfiel | null;
};

export async function fetchCurrentSamzoIdentity(
  authUserId: string | null
): Promise<CurrentSamzoIdentity> {
  if (!authUserId) {
    return { persoon: null, profiel: null };
  }

  const supabase = getSupabaseBrowserClient();

  const { data: persoon, error: persoonError } = await supabase
    .from("personen")
    .select("id, auth_user_id, email, accountnaam, systeemrol, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (persoonError) {
    throw new Error(persoonError.message);
  }

  if (!persoon) {
    return { persoon: null, profiel: null };
  }

  const { data: profiel, error: profielError } = await supabase
    .from("profielen")
    .select("id, persoon_id, weergavenaam, status")
    .eq("persoon_id", persoon.id)
    .maybeSingle();

  if (profielError) {
    throw new Error(profielError.message);
  }

  return { persoon, profiel };
}
