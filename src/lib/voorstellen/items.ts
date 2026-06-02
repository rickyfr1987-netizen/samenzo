import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type VoorstelRow = Pick<
  Tables<"voorstellen">,
  | "id"
  | "type"
  | "status"
  | "titel"
  | "toelichting"
  | "created_at"
  | "updated_at"
  | "geaccepteerd_at"
  | "geweigerd_at"
  | "gekoppeld_type"
  | "gekoppeld_id"
>;

type LinkedMomentRow = Pick<
  Tables<"momenten">,
  | "id"
  | "titel"
  | "beschrijving"
  | "locatie"
  | "status"
  | "start_at"
  | "eind_at"
  | "hele_dag"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
};

type LinkedMomentProjection = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isAllDay: boolean;
  categoryName: string | null;
  status: Tables<"momenten">["status"];
};

type FetchOptions = {
  includeOnlyOpen?: boolean;
  limit?: number;
};

export type VoorstelItem = {
  id: string;
  type: Tables<"voorstellen">["type"];
  status: Tables<"voorstellen">["status"];
  title: string | null;
  explanation: string | null;
  createdAt: string;
  updatedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  linkedType: string;
  linkedId: string;
  canRespond: boolean;
  linkedMoment: LinkedMomentProjection | null;
};

export async function fetchOpenVoorstellenForProfile(
  profielId: string
): Promise<VoorstelItem[]> {
  return fetchVoorstellenForProfile(profielId, {
    includeOnlyOpen: true,
    limit: 50
  });
}

export async function fetchVisibleVoorstellenForProfile(
  profielId: string
): Promise<VoorstelItem[]> {
  return fetchVoorstellenForProfile(profielId, {
    includeOnlyOpen: false,
    limit: 100
  });
};

export async function fetchOpenVoorstelForProfileAndMoment(
  profielId: string,
  momentId: string
): Promise<VoorstelItem | null> {
  const proposals = await fetchOpenVoorstellenForProfile(profielId);

  return (
    proposals.find(
      (voorstel) =>
        voorstel.linkedType === "moment" && voorstel.linkedId === momentId
    ) ?? null
  );
}

export async function fetchOpenMomentProposalsForProfile(
  profielId: string
): Promise<VoorstelItem[]> {
  const proposals = await fetchOpenVoorstellenForProfile(profielId);

  return proposals.filter((voorstel) => voorstel.linkedType === "moment");
}

export async function fetchVoorstelById(
  voorstelId: string
): Promise<VoorstelItem | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("voorstellen")
    .select(
      "id, type, status, titel, toelichting, created_at, updated_at, geaccepteerd_at, geweigerd_at, gekoppeld_type, gekoppeld_id"
    )
    .eq("id", voorstelId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as VoorstelRow;
  const linkedMoments = await fetchLinkedMoments(
    row.gekoppeld_type === "moment" ? [row.gekoppeld_id] : []
  );

  return mapVoorstellen([row], linkedMoments)[0] ?? null;
}

export async function fetchVoorstellenForProfile(
  profielId: string,
  options: FetchOptions = {}
): Promise<VoorstelItem[]> {
  const { includeOnlyOpen = false, limit = 50 } = options;

  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("voorstellen")
    .select(
      "id, type, status, titel, toelichting, created_at, updated_at, geaccepteerd_at, geweigerd_at, gekoppeld_type, gekoppeld_id"
    )
    .eq("ontvangend_profiel_id", profielId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (includeOnlyOpen) {
    query = query.eq("status", "open");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const voorstellen = (data ?? []) as VoorstelRow[];
  const linkedMomentIds = [
    ...new Set(
      voorstellen
        .filter((voorstel) => voorstel.gekoppeld_type === "moment")
        .map((voorstel) => voorstel.gekoppeld_id)
    )
  ];

  const linkedMoments = await fetchLinkedMoments(linkedMomentIds);

  return mapVoorstellen(voorstellen, linkedMoments);
}

function mapVoorstellen(
  voorstellen: VoorstelRow[],
  linkedMoments: Map<string, LinkedMomentProjection>
) {
  return voorstellen.map((voorstel) => {
    return {
      id: voorstel.id,
      type: voorstel.type,
      status: voorstel.status,
      title: voorstel.titel,
      explanation: voorstel.toelichting,
      createdAt: voorstel.created_at,
      updatedAt: voorstel.updated_at,
      acceptedAt: voorstel.geaccepteerd_at,
      declinedAt: voorstel.geweigerd_at,
      linkedType: voorstel.gekoppeld_type,
      linkedId: voorstel.gekoppeld_id,
      canRespond: voorstel.status === "open",
      linkedMoment:
        voorstel.gekoppeld_type === "moment"
          ? linkedMoments.get(voorstel.gekoppeld_id) ?? null
          : null
    };
  });
}

async function fetchLinkedMoments(
  linkedMomentIds: string[]
): Promise<Map<string, LinkedMomentProjection>> {
  if (!linkedMomentIds.length) {
    return new Map();
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("momenten")
    .select(
      "id, titel, beschrijving, locatie, status, start_at, eind_at, hele_dag, categorieen (naam)"
    )
    .in("id", linkedMomentIds);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, LinkedMomentProjection>();

  (data ?? []).forEach((moment) => {
    const row = moment as LinkedMomentRow;
    map.set(row.id, {
      id: row.id,
      title: row.titel,
      description: row.beschrijving,
      location: row.locatie,
      startsAt: row.start_at,
      endsAt: row.eind_at,
      isAllDay: row.hele_dag,
      categoryName: row.categorieen?.naam ?? null,
      status: row.status
    });
  });

  return map;
}

