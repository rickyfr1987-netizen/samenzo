import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
  ACCEPTED_PARTICIPATION_STATUS,
  REJECTED_PARTICIPATION_STATUS,
  registerForMoment,
  updateParticipationForProposal
} from "@/src/lib/moment/participation";
import type { Tables } from "@/src/lib/database.types";

type VoorstelStatus = Tables<"voorstellen">["status"];
type VoorstelType = Tables<"voorstellen">["type"];

type VoorstelActionInput = {
  voorstelId: string;
  profielId: string;
  persoonId: string | null;
};

export type VoorstelActionResult = {
  id: string;
  title: string | null;
  type: VoorstelType;
  linkedType: string;
  linkedId: string;
};

const ACCEPTED_STATUS: VoorstelStatus = "geaccepteerd";
const DECLINED_STATUS: VoorstelStatus = "geweigerd";
const MOMENT_PARTICIPATION_TYPES: readonly VoorstelType[] = [
  "deelname_aan_moment",
  "uitnodiging_moment"
];

export async function acceptVoorstel(
  input: VoorstelActionInput
): Promise<VoorstelActionResult> {
  const result = await updateVoorstelStatus(input, ACCEPTED_STATUS);

  if (result.linkedType === "moment" && shouldActivateParticipation(result.type)) {
    if (!input.persoonId) {
      throw new Error(
        "Je account is niet volledig verbonden met een profiel voor deze actie."
      );
    }

    await registerForMoment({
      momentId: result.linkedId,
      persoonId: input.persoonId,
      profielId: input.profielId,
      targetParticipationStatus: ACCEPTED_PARTICIPATION_STATUS
    });
  }

  return result;
}

export async function declineVoorstel(
  input: VoorstelActionInput
): Promise<VoorstelActionResult> {
  const result = await updateVoorstelStatus(input, DECLINED_STATUS);

  if (result.linkedType === "moment" && shouldActivateParticipation(result.type)) {
    if (!input.profielId) {
      return result;
    }

    await updateParticipationForProposal({
      momentId: result.linkedId,
      profielId: input.profielId,
      status: REJECTED_PARTICIPATION_STATUS
    });
  }

  return result;
}

async function updateVoorstelStatus(
  { voorstelId, profielId }: VoorstelActionInput,
  status: VoorstelStatus
): Promise<VoorstelActionResult> {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();

  const payload =
    status === ACCEPTED_STATUS
      ? {
          status,
          geaccepteerd_at: now,
          geweigerd_at: null,
          updated_at: now
        }
      : {
          status,
          geweigerd_at: now,
          geaccepteerd_at: null,
          updated_at: now
        };

  const { data, error } = await supabase
    .from("voorstellen")
    .update(payload)
    .eq("id", voorstelId)
    .eq("ontvangend_profiel_id", profielId)
    .eq("status", "open")
    .select("id, titel, type, gekoppeld_type, gekoppeld_id")
    .maybeSingle();

  if (error) {
    throw new Error(toVoorstelActionMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Deze actie kon niet worden verwerkt. Het voorstel is niet meer open of niet zichtbaar voor dit profiel."
    );
  }

  return {
    id: data.id,
    title: data.titel,
    type: data.type,
    linkedType: data.gekoppeld_type,
    linkedId: data.gekoppeld_id
  };
}

function shouldActivateParticipation(
  type: VoorstelType
): type is (typeof MOMENT_PARTICIPATION_TYPES)[number] {
  return MOMENT_PARTICIPATION_TYPES.includes(type);
}

function toVoorstelActionMessage(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes("row-level security")) {
    return "Deze voorstelactie is niet toegestaan voor dit profiel volgens de huidige RLS-regels.";
  }

  return "De voorstelactie kon niet worden uitgevoerd. Probeer opnieuw.";
}
