import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";
import type { User } from "@supabase/supabase-js";

export const ACTIVE_PROFILE_STORAGE_KEY = "samzo.activeProfileId";
export const ACTIVE_PROFILE_CHANGED_EVENT = "samzo:activeProfileChanged";

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
  ownProfiel: CurrentSamzoProfiel | null;
  profielen: CurrentSamzoProfiel[];
  currentProfiel: CurrentSamzoProfiel | null;
};

export type ProfileAccessCandidate = {
  profiel_id: string;
};

export function readStoredActiveProfileId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
}

export function writeStoredActiveProfileId(profileId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (profileId) {
    window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
    window.dispatchEvent(
      new CustomEvent(ACTIVE_PROFILE_CHANGED_EVENT, { detail: { profileId } })
    );
    return;
  }

  window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROFILE_CHANGED_EVENT, { detail: { profileId: null } })
  );
}

function deduplicateProfiles(
  profiles: CurrentSamzoProfiel[]
): CurrentSamzoProfiel[] {
  const seen = new Set<string>();
  const uniqueProfiles: CurrentSamzoProfiel[] = [];

  for (const profile of profiles) {
    if (seen.has(profile.id)) {
      continue;
    }

    seen.add(profile.id);
    uniqueProfiles.push(profile);
  }

  return uniqueProfiles;
}

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
      ownProfiel: null,
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
      ownProfiel: null,
      profielen: [],
      currentProfiel: null
    };
  }

  const profileColumns =
    "id, persoon_id, weergavenaam, status, avatar_url, zichtbaar_voor_leden";

  const [ownProfielResult, toegangenResult] = await Promise.all([
    supabase
      .from("profielen")
      .select(profileColumns)
      .eq("persoon_id", persoon.id)
      .eq("status", "actief")
      .maybeSingle(),
    supabase
      .from("profieltoegangen")
      .select("profiel_id")
      .eq("persoon_id", persoon.id)
      .eq("status", "actief")
      .order("id", { ascending: true })
  ]);

  if (ownProfielResult.error) {
    throw new Error(ownProfielResult.error.message);
  }

  const ownProfiel = (ownProfielResult.data as CurrentSamzoProfiel) ?? null;

  if (toegangenResult.error) {
    throw new Error(toegangenResult.error.message);
  }

  const profileIds = new Set<string>();

  if (ownProfiel?.id) {
    profileIds.add(ownProfiel.id);
  }

  for (const toegang of toegangenResult.data ??
    ([] as ProfileAccessCandidate[])) {
    if (toegang?.profiel_id) {
      profileIds.add(toegang.profiel_id);
    }
  }

  const profileIdList = [...profileIds];
  const profileFetchResult = profileIdList.length
    ? await supabase
        .from("profielen")
        .select(profileColumns)
        .in("id", profileIdList)
        .eq("status", "actief")
        .order("weergavenaam", { ascending: true })
    : { data: [], error: null };

  const profielenError = profileFetchResult.error;
  if (profielenError) {
    throw new Error(profielenError.message);
  }

  const profielen = deduplicateProfiles(
    (profileFetchResult.data as CurrentSamzoProfiel[] | null) ?? []
  );

  const storedProfileId = readStoredActiveProfileId();
  const explicitStoredProfile = storedProfileId
    ? profielen.find((profile) => profile.id === storedProfileId) ?? null
    : null;
  const fallbackProfile = ownProfiel ?? profielen[0] ?? null;
  const selectedProfile = explicitStoredProfile ?? fallbackProfile;

  if (!storedProfileId || !explicitStoredProfile) {
    writeStoredActiveProfileId(selectedProfile?.id ?? null);
  }

  return {
    authUser,
    persoon,
    ownProfiel,
    profielen,
    currentProfiel: selectedProfile
  };
}

export function isOwnProfileActive(
  context: CurrentSamzoContext | null
): boolean {
  return Boolean(
    context?.ownProfiel &&
      context.currentProfiel &&
      context.ownProfiel.id === context.currentProfiel.id
  );
}
