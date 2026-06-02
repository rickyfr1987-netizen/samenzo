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

type SupportQuestionRow = Pick<
  Tables<"supportvragen">,
  "id" | "onderwerp" | "omschrijving" | "status" | "created_at"
>;

export type TimelineItemSource =
  | "tijdlijnbericht"
  | "signaal"
  | "supportvraag";

export type TimelineItem = {
  id: string;
  source: TimelineItemSource;
  title: string;
  body: string | null;
  status: string;
  urgency: string | null;
  createdAt: string;
  related:
    | {
        type: string;
        id: string;
      }
    | null;
};

export async function fetchVisibleTimelineItems(): Promise<TimelineItem[]> {
  const supabase = getSupabaseBrowserClient();
  const [messagesResult, signalsResult, supportResult] = await Promise.all([
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

  return [
    ...((messagesResult.data ?? []) as TimelineMessageRow[]).map(
      mapTimelineMessage
    ),
    ...((signalsResult.data ?? []) as SignalRow[]).map(mapSignal),
    ...((supportResult.data ?? []) as SupportQuestionRow[]).map(
      mapSupportQuestion
    )
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
    related: null
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

  if (item.status === "nieuw" || item.status === "zichtbaar") {
    return 1;
  }

  return 0;
}
