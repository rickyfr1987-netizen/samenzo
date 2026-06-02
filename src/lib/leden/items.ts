import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type ProfileGroupRow = Pick<Tables<"groepen">, "id" | "naam" | "status" | "zichtbaarheid">;
type ProfileGroupLinkRow = Pick<
  Tables<"groepslidmaatschappen">,
  "id" | "status" | "groep_id" | "profiel_id"
> & {
  groepen: ProfileGroupRow | null;
};

type ProfileRow = Pick<
  Tables<"profielen">,
  | "id"
  | "weergavenaam"
  | "status"
  | "kennismakingstekst"
  | "zichtbaar_voor_gasten"
  | "zichtbaar_voor_leden"
  | "created_at"
  | "archived_at"
> & {
  groepslidmaatschappen: ProfileGroupLinkRow[] | null;
};

type PublicProfileSummaryRow = Omit<ProfileRow, "archived_at">;

export type VisibleLid = {
  id: string;
  displayName: string;
  status: Tables<"profielen">["status"];
  shortDescription: string | null;
  visibleForGuests: boolean;
  visibleForMembers: boolean;
  joinedAt: string;
  groups: LedenGroep[];
};

export type VisibleLidDetail = VisibleLid & {
  hasGroups: boolean;
};

export type LedenGroep = {
  id: string;
  name: string;
  status: Tables<"groepen">["status"];
  visibility: Tables<"groepen">["zichtbaarheid"];
};

export function formatProfileVisibility(profile: VisibleLid | VisibleLidDetail) {
  if (profile.visibleForMembers && profile.visibleForGuests) {
    return "voor leden en gasten";
  }

  if (profile.visibleForMembers) {
    return "voor leden";
  }

  if (profile.visibleForGuests) {
    return "voor gasten";
  }

  return "beperkt zichtbaar";
}

const PROFIEL_BASE_SELECT = `
  id,
  weergavenaam,
  status,
  kennismakingstekst,
  zichtbaar_voor_gasten,
  zichtbaar_voor_leden,
  created_at,
  archived_at,
  groepslidmaatschappen (
    id,
    status,
    groep_id,
    profiel_id,
    groepen (
      id,
      naam,
      status,
      zichtbaarheid
    )
  )
`;

export async function fetchVisibleProfielen(): Promise<VisibleLid[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("profielen")
    .select(PROFIEL_BASE_SELECT)
    .eq("status", "actief")
    .is("archived_at", null)
    .order("weergavenaam", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileRow[]).map(mapProfileRowToVisible);
}

export async function fetchProfileById(
  profielId: string
): Promise<VisibleLidDetail | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("profielen")
    .select(PROFIEL_BASE_SELECT)
    .eq("id", profielId)
    .eq("status", "actief")
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapProfileRowToDetail(data as ProfileRow);
}

function mapProfileRowToVisible(profile: PublicProfileSummaryRow): VisibleLid {
  return {
    id: profile.id,
    displayName: profile.weergavenaam,
    status: profile.status,
    shortDescription: profile.kennismakingstekst,
    visibleForGuests: profile.zichtbaar_voor_gasten,
    visibleForMembers: profile.zichtbaar_voor_leden,
    joinedAt: profile.created_at,
    groups: toVisibleGroups(profile.groepslidmaatschappen)
  };
}

function mapProfileRowToDetail(profile: ProfileRow): VisibleLidDetail {
  const visible = mapProfileRowToVisible(profile);
  return {
    ...visible,
    hasGroups: visible.groups.length > 0
  };
}

function toVisibleGroups(
  memberships: ProfileGroupLinkRow[] | null
): LedenGroep[] {
  if (!memberships || memberships.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const activeGroups: LedenGroep[] = [];

  for (const membership of memberships) {
    if (membership.status !== "actief") {
      continue;
    }

    if (!membership.groepen) {
      continue;
    }

    if (seen.has(membership.groepen.id)) {
      continue;
    }

    seen.add(membership.groepen.id);

    activeGroups.push({
      id: membership.groepen.id,
      name: membership.groepen.naam,
      status: membership.groepen.status,
      visibility: membership.groepen.zichtbaarheid
    });
  }

  return activeGroups;
}
