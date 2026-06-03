import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/src/lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";

type VoorstelStatus = Tables<"voorstellen">["status"];
type VoorstelType = Tables<"voorstellen">["type"];
type DeelnameStatus = Tables<"deelnames">["status"];
type VoorstelAntwoord = "accept" | "reject";

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

type ProposalResponseRpcResult = {
  voorstel_id: string;
  voorstel_titel: string | null;
  voorstel_type: VoorstelType;
  gekoppeld_type: string;
  gekoppeld_id: string;
  voorstel_status: VoorstelStatus;
  deelname_id: string | null;
  deelname_status: DeelnameStatus | null;
};

type ProposalResponseRpcClient = {
  rpc(
    fn: "beantwoord_moment_voorstel",
    args: {
      target_voorstel_id: string;
      target_profiel_id: string;
      antwoord: VoorstelAntwoord;
    }
  ): {
    maybeSingle(): Promise<{
      data: ProposalResponseRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
};

export async function acceptVoorstel(
  input: VoorstelActionInput
): Promise<VoorstelActionResult> {
  return respondToVoorstel(input, "accept");
}

export async function declineVoorstel(
  input: VoorstelActionInput
): Promise<VoorstelActionResult> {
  return respondToVoorstel(input, "reject");
}

async function respondToVoorstel(
  { voorstelId, profielId, persoonId }: VoorstelActionInput,
  antwoord: VoorstelAntwoord
): Promise<VoorstelActionResult> {
  if (antwoord === "accept" && !persoonId) {
    throw new Error(
      "Je account is niet volledig verbonden met een profiel voor deze actie."
    );
  }

  const supabase =
    getSupabaseBrowserClient() as unknown as ProposalResponseRpcClient;

  const { data, error } = await supabase
    .rpc("beantwoord_moment_voorstel", {
      target_voorstel_id: voorstelId,
      target_profiel_id: profielId,
      antwoord
    })
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
    id: data.voorstel_id,
    title: data.voorstel_titel,
    type: data.voorstel_type,
    linkedType: data.gekoppeld_type,
    linkedId: data.gekoppeld_id
  };
}

function toVoorstelActionMessage(message: string) {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("row-level security") ||
    lowered.includes("not allowed") ||
    lowered.includes("niet toegestaan")
  ) {
    return "Je kunt deze voorstelactie niet uitvoeren met dit profiel.";
  }

  return "De voorstelactie kon niet worden uitgevoerd. Probeer opnieuw.";
}
