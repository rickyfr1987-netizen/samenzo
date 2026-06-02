import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables, TablesInsert } from "@/src/lib/database.types";

export type ParticipationStatus = Tables<"deelnames">["status"];

export const REGISTERED_PARTICIPATION_STATUS: ParticipationStatus =
  "ingeschreven";
export const CANCELLED_PARTICIPATION_STATUS: ParticipationStatus = "afgemeld";

const ACTIVE_PARTICIPATION_STATUSES: ParticipationStatus[] = [
  "geaccepteerd",
  "ingeschreven"
];

const BLOCKING_PARTICIPATION_STATUSES: ParticipationStatus[] = [
  "voorgesteld",
  "uitgenodigd",
  "geaccepteerd",
  "ingeschreven",
  "wachtlijst"
];

export function isActiveParticipationStatus(status: ParticipationStatus) {
  return ACTIVE_PARTICIPATION_STATUSES.includes(status);
}

export function isBlockingParticipationStatus(status: ParticipationStatus) {
  return BLOCKING_PARTICIPATION_STATUSES.includes(status);
}

export async function registerForMoment({
  momentId,
  persoonId,
  profielId
}: {
  momentId: string;
  persoonId: string;
  profielId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const timestamp = new Date().toISOString();
  const deelname: TablesInsert<"deelnames"> = {
    moment_id: momentId,
    profiel_id: profielId,
    status: REGISTERED_PARTICIPATION_STATUS,
    aangemeld_door_persoon_id: persoonId,
    aangemeld_vanuit_profiel_id: profielId,
    status_updated_at: timestamp,
    geaccepteerd_at: timestamp
  };

  const { data, error } = await supabase
    .from("deelnames")
    .insert(deelname)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(toParticipationActionMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Aanmelden is niet gelukt. De deelname is mogelijk niet zichtbaar door RLS."
    );
  }
}

export async function unregisterFromMoment({
  deelnameId,
  momentId,
  profielId
}: {
  deelnameId: string;
  momentId: string;
  profielId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("deelnames")
    .update({
      status: CANCELLED_PARTICIPATION_STATUS,
      afgemeld_at: timestamp,
      status_updated_at: timestamp,
      updated_at: timestamp
    })
    .eq("id", deelnameId)
    .eq("moment_id", momentId)
    .eq("profiel_id", profielId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(toParticipationActionMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Afmelden is nog niet toegestaan voor deze sessie. De huidige RLS-policies laten geen eigen deelname-update door."
    );
  }
}

function toParticipationActionMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("row-level security")) {
    return "Deze deelname-actie is niet toegestaan voor dit profiel volgens de huidige RLS-regels.";
  }

  if (
    lowerMessage.includes("duplicate key") ||
    lowerMessage.includes("deelnames_actief_uniek_idx")
  ) {
    return "Er bestaat al een lopende deelname voor dit profiel en moment.";
  }

  return message;
}
