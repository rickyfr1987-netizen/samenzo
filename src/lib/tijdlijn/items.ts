import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type TimelineMessageRow = Pick<
  Tables<"tijdlijnberichten">,
  | "id"
  | "type"
  | "status"
  | "titel"
  | "inhoud"
  | "urgent"
  | "created_at"
  | "gekoppeld_type"
  | "gekoppeld_id"
  | "supportvraag_id"
  | "signaal_id"
>;

type SignalRow = Pick<
  Tables<"signalen">,
  | "id"
  | "niveau"
  | "status"
  | "titel"
  | "omschrijving"
  | "created_at"
  | "gekoppeld_type"
  | "gekoppeld_id"
>;

type VoorstelRow = Pick<
  Tables<"voorstellen">,
  | "id"
  | "type"
  | "status"
  | "titel"
  | "toelichting"
  | "created_at"
  | "ontvangend_profiel_id"
  | "gekoppeld_type"
  | "gekoppeld_id"
>;

type LinkedMomentRow = Pick<
  Tables<"momenten">,
  | "id"
  | "titel"
  | "beschrijving"
  | "status"
  | "start_at"
  | "eind_at"
  | "hele_dag"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
};

type SupportQuestionRow = Pick<
  Tables<"supportvragen">,
  "id" | "onderwerp" | "omschrijving" | "status" | "created_at"
>;

export type TimelineItemSource =
  | "tijdlijnbericht"
  | "signaal"
  | "supportvraag"
  | "voorstel";

type LinkedMomentProjection = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isAllDay: boolean;
  categoryName: string | null;
  status: Tables<"momenten">["status"];
};

export type TimelineItem = {
  id: string;
  source: TimelineItemSource;
  title: string;
  body: string | null;
  status: string;
  urgency: string | null;
  createdAt: string;
  proposalId: string | null;
  proposalReceivingProfileId: string | null;
  related:
    | {
        type: string;
        id: string;
      }
    | null;
};

export async function fetchVisibleTimelineItems(): Promise<TimelineItem[]> {
  const supabase = getSupabaseBrowserClient();
  const [messagesResult, signalsResult, supportResult, proposalsResult] =
    await Promise.all([
      supabase
        .from("tijdlijnberichten")
        .select(
          "id, type, status, titel, inhoud, urgent, created_at, gekoppeld_type, gekoppeld_id, supportvraag_id, signaal_id"
        )
        .is("archived_at", null)
        .or(
          `zichtbaar_vanaf_at.is.null,zichtbaar_vanaf_at.lte.${new Date().toISOString()}`
        )
        .or(`verloopt_at.is.null,verloopt_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("signalen")
        .select(
          "id, niveau, status, titel, omschrijving, created_at, gekoppeld_type, gekoppeld_id"
        )
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("supportvragen")
        .select("id, onderwerp, omschrijving, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("voorstellen")
        .select(
          "id, type, status, titel, toelichting, created_at, ontvangend_profiel_id, gekoppeld_type, gekoppeld_id"
        )
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }

  if (signalsResult.error) {
    throw new Error(signalsResult.error.message);
  }

  if (supportResult.error) {
    throw new Error(supportResult.error.message);
  }

  if (proposalsResult.error) {
    throw new Error(proposalsResult.error.message);
  }

  const proposals = (proposalsResult.data ?? []) as VoorstelRow[];
  const linkedMomentIds = [
    ...new Set(
      proposals
        .filter((voorstel) => voorstel.gekoppeld_type === "moment")
        .map((voorstel) => voorstel.gekoppeld_id)
    )
  ];
  const linkedMoments = await fetchLinkedMomentsForProposals(linkedMomentIds);

  return [
    ...((messagesResult.data ?? []) as TimelineMessageRow[]).map(mapTimelineMessage),
    ...((signalsResult.data ?? []) as SignalRow[]).map(mapSignal),
    ...((supportResult.data ?? []) as SupportQuestionRow[]).map(mapSupportQuestion),
    ...proposals.map((proposal) => mapVoorstel(proposal, linkedMoments))
  ].sort(sortTimelineItems);
}

function mapTimelineMessage(message: TimelineMessageRow): TimelineItem {
  return {
    id: message.id,
    source: "tijdlijnbericht",
    title: message.titel,
    body: message.inhoud,
    status: message.status,
    urgency: message.urgent ? "urgent" : message.type,
    createdAt: message.created_at,
    proposalId: null,
    proposalReceivingProfileId: null,
    related: getRelated({
      linkedType: message.gekoppeld_type,
      linkedId: message.gekoppeld_id,
      fallbackType: message.supportvraag_id ? "supportvraag" : "signaal",
      fallbackId: message.supportvraag_id ?? message.signaal_id
    })
  };
}

function mapSignal(signal: SignalRow): TimelineItem {
  return {
    id: signal.id,
    source: "signaal",
    title: signal.titel,
    body: signal.omschrijving,
    status: signal.status,
    urgency: signal.niveau,
    createdAt: signal.created_at,
    proposalId: null,
    proposalReceivingProfileId: null,
    related: getRelated({
      linkedType: signal.gekoppeld_type,
      linkedId: signal.gekoppeld_id
    })
  };
}

function mapSupportQuestion(question: SupportQuestionRow): TimelineItem {
  return {
    id: question.id,
    source: "supportvraag",
    title: question.onderwerp,
    body: question.omschrijving,
    status: question.status,
    urgency: getSupportUrgency(question.status),
    createdAt: question.created_at,
    proposalId: null,
    proposalReceivingProfileId: null,
    related: null
  };
}

function mapVoorstel(
  voorstel: VoorstelRow,
  linkedMoments: Map<string, LinkedMomentProjection>
): TimelineItem {
  const linkedMoment =
    voorstel.gekoppeld_type === "moment"
      ? linkedMoments.get(voorstel.gekoppeld_id) ?? null
      : null;

  return {
    id: voorstel.id,
    source: "voorstel",
    title: linkedMoment?.title ?? voorstel.titel ?? "Voorstel",
    body:
      linkedMoment?.description
        ? linkedMoment.description
        : voorstel.toelichting ?? "Open voorstel voor dit moment.",
    status: voorstel.status,
    urgency: "actie_nodig",
    createdAt: voorstel.created_at,
    proposalId: voorstel.id,
    proposalReceivingProfileId: voorstel.ontvangend_profiel_id,
    related: getRelated({
      linkedType: voorstel.gekoppeld_type,
      linkedId: voorstel.gekoppeld_id
    })
  };
}

function getRelated({
  fallbackId,
  fallbackType,
  linkedId,
  linkedType
}: {
  fallbackId?: string | null;
  fallbackType?: string;
  linkedId: string | null;
  linkedType: string | null;
}) {
  if (linkedType && linkedId) {
    return {
      type: linkedType,
      id: linkedId
    };
  }

  if (fallbackType && fallbackId) {
    return {
      type: fallbackType,
      id: fallbackId
    };
  }

  return null;
}

function getSupportUrgency(status: Tables<"supportvragen">["status"]) {
  if (status === "actie_nodig") {
    return "actie_nodig";
  }

  return null;
}

function sortTimelineItems(first: TimelineItem, second: TimelineItem) {
  const priorityDifference = getPriority(second) - getPriority(first);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

function getPriority(item: TimelineItem) {
  if (item.urgency === "escalatie" || item.urgency === "urgent") {
    return 4;
  }

  if (item.urgency === "actie_nodig" || item.status === "actie_nodig") {
    return 3;
  }

  if (item.urgency === "aandacht_nodig") {
    return 2;
  }

  if (item.source === "voorstel" && item.status === "open") {
    return 3;
  }

  if (item.status === "nieuw" || item.status === "zichtbaar") {
    return 1;
  }

  return 0;
}

async function fetchLinkedMomentsForProposals(
  linkedMomentIds: string[]
): Promise<Map<string, LinkedMomentProjection>> {
  if (!linkedMomentIds.length) {
    return new Map<string, LinkedMomentProjection>();
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("momenten")
    .select(
      "id, titel, beschrijving, status, start_at, eind_at, hele_dag, categorieen (naam)"
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
      startsAt: row.start_at,
      endsAt: row.eind_at,
      isAllDay: row.hele_dag,
      categoryName: row.categorieen?.naam ?? null,
      status: row.status
    });
  });

  return map;
}
