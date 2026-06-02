import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables, TablesInsert } from "@/src/lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";

export type ParticipationStatus = Tables<"deelnames">["status"];

export const REGISTERED_PARTICIPATION_STATUS: ParticipationStatus =
  "ingeschreven";
export const CANCELLED_PARTICIPATION_STATUS: ParticipationStatus = "afgemeld";

type CurrentParticipationRow = Pick<
  Tables<"deelnames">,
  "id" | "status"
>;

export type RegistrationResult =
  | { status: "inserted" }
  | { status: "reactivated" }
  | { status: "already_registered"; deelnameStatus: ParticipationStatus };

export type UnregisterResult = {
  status: "unregistered";
  roleClaimsReleased: number;
  taskClaimsReleased: number;
};

type UnregisterRpcResult = {
  deelname_released: boolean;
  role_claims_released: number;
  task_claims_released: number;
};

type MomentUnregisterRpcClient = {
  rpc(
    fn: "afmelden_moment_met_claims",
    args: {
      target_deelname_id: string;
      target_moment_id: string;
      target_profiel_id: string;
    }
  ): {
    maybeSingle(): Promise<{
      data: UnregisterRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
};

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
}): Promise<RegistrationResult> {
  const supabase = getSupabaseBrowserClient();
  const timestamp = new Date().toISOString();
  const existingParticipation = await fetchCurrentParticipation(
    momentId,
    profielId
  );

  if (existingParticipation) {
    if (existingParticipation.status === CANCELLED_PARTICIPATION_STATUS) {
      const { data, error } = await supabase
        .from("deelnames")
        .update({
          status: REGISTERED_PARTICIPATION_STATUS,
          afgemeld_at: null,
          status_updated_at: timestamp,
          updated_at: timestamp
        })
        .eq("id", existingParticipation.id)
        .eq("moment_id", momentId)
        .eq("profiel_id", profielId)
        .is("archived_at", null)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(toParticipationActionMessage(error.message));
      }

      if (!data) {
        throw new Error(
          "Opnieuw aanmelden is niet gelukt. De bestaande deelname mag mogelijk niet door dit profiel worden aangepast."
        );
      }

      return { status: "reactivated" };
    }

    return {
      status: "already_registered",
      deelnameStatus: existingParticipation.status
    };
  }

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

  return { status: "inserted" };
}

export async function unregisterFromMoment({
  deelnameId,
  momentId,
  profielId
}: {
  deelnameId: string;
  momentId: string;
  profielId: string;
}): Promise<UnregisterResult> {
  const supabase = getSupabaseBrowserClient() as unknown as MomentUnregisterRpcClient;
  const { data, error } = await supabase
    .rpc("afmelden_moment_met_claims", {
      target_deelname_id: deelnameId,
      target_moment_id: momentId,
      target_profiel_id: profielId
    })
    .maybeSingle();

  if (error) {
    throw new Error(toParticipationActionMessage(error.message));
  }

  if (!data?.deelname_released) {
    throw new Error(
      "Afmelden is nog niet toegestaan voor deze sessie. De huidige RLS-policies laten geen eigen deelname-update door."
    );
  }

  return {
    status: "unregistered",
    roleClaimsReleased: data.role_claims_released,
    taskClaimsReleased: data.task_claims_released
  };
}

async function fetchCurrentParticipation(
  momentId: string,
  profielId: string
): Promise<CurrentParticipationRow | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("deelnames")
    .select("id, status")
    .eq("moment_id", momentId)
    .eq("profiel_id", profielId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(toParticipationActionMessage(error.message));
  }

  return data;
}

function toParticipationActionMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("row-level security")) {
    return "Deze deelname-actie is niet toegestaan voor dit profiel volgens de huidige RLS-regels.";
  }

  if (
    lowerMessage.includes("duplicate key") ||
    lowerMessage.includes("deelnames_actief_uniek_idx") ||
    lowerMessage.includes("deelnames_current_moment_profiel_uniek_idx")
  ) {
    return "Er bestaat al een lopende deelname voor dit profiel en moment.";
  }

  return message;
}
