import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables, TablesInsert } from "@/src/lib/database.types";

export type RoleOccupancyStatus = Tables<"rolbezettingen">["status"];

export const CLAIMED_ROLE_STATUS: RoleOccupancyStatus = "actief";

export async function claimMomentRole({
  momentRoleId,
  persoonId,
  profielId
}: {
  momentRoleId: string;
  persoonId: string;
  profielId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const timestamp = new Date().toISOString();
  const roleOccupancy: TablesInsert<"rolbezettingen"> = {
    momentrol_id: momentRoleId,
    profiel_id: profielId,
    status: CLAIMED_ROLE_STATUS,
    geclaimd_door_persoon_id: persoonId,
    geclaimd_at: timestamp
  };

  const { data, error } = await supabase
    .from("rolbezettingen")
    .insert(roleOccupancy)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(toRoleClaimMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Rol claimen is niet gelukt. De rolbezetting is mogelijk niet zichtbaar door RLS."
    );
  }
}

function toRoleClaimMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("row-level security")) {
    return "Deze rol mag niet door dit profiel worden geclaimd volgens de huidige RLS-regels.";
  }

  if (
    lowerMessage.includes("duplicate key") ||
    lowerMessage.includes("rolbezettingen_actief_uniek_idx")
  ) {
    return "Dit profiel bezet deze rol al actief.";
  }

  return message;
}
