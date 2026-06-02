import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";
import type { User } from "@supabase/supabase-js";

export type CurrentSamzoPersoon = Pick<
  Tables<"personen">,
  "id" | "auth_user_id" | "email" | "accountnaam" | "systeemrol" | "status"
>;

export type CurrentSamzoProfiel = Pick<
  Tables<"profielen">,
  | "id"
  | "persoon_id"
  | "weergavenaam"
  | "status"
  | "avatar_url"
  | "zichtbaar_voor_leden"
>;

export type CurrentSamzoContext = {
  authUser: User | null;
  persoon: CurrentSamzoPersoon | null;
  profielen: CurrentSamzoProfiel[];
  currentProfiel: CurrentSamzoProfiel | null;
};

export async function fetchCurrentSamzoContext(): Promise<CurrentSamzoContext> {
  const supabase = getSupabaseBrowserClient();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const authUser = sessionData.session?.user ?? null;

  if (!authUser) {
    return {
      authUser: null,
      persoon: null,
      profielen: [],
      currentProfiel: null
    };
  }

  const { data: persoon, error: persoonError } = await supabase
    .from("personen")
    .select("id, auth_user_id, email, accountnaam, systeemrol, status")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (persoonError) {
    throw new Error(persoonError.message);
  }

  if (!persoon) {
    return {
      authUser,
      persoon: null,
      profielen: [],
      currentProfiel: null
    };
  }

  const { data: profielen, error: profielenError } = await supabase
    .from("profielen")
    .select(
      "id, persoon_id, weergavenaam, status, avatar_url, zichtbaar_voor_leden"
    )
    .eq("persoon_id", persoon.id)
    .eq("status", "actief")
    .order("weergavenaam", { ascending: true });

  if (profielenError) {
    throw new Error(profielenError.message);
  }

  const activeProfielen = profielen ?? [];

  return {
    authUser,
    persoon,
    profielen: activeProfielen,
    currentProfiel:
      activeProfielen.length === 1 ? activeProfielen[0] : null
  };
}
