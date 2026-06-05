import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/src/lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";

export type DoelacceptatieAntwoord = "accept" | "reject" | "later";

type DoelacceptatieActionInput = {
  acceptatieId: string;
  profielId: string;
};

export type DoelacceptatieActionResult = {
  id: string;
  goalId: string;
  profileId: string;
  status: Tables<"doelacceptaties">["status"];
};

type GoalAcceptanceRpcResult = {
  acceptatie_id: string;
  doel_id: string;
  profiel_id: string;
  doelacceptatie_status: Tables<"doelacceptaties">["status"];
  geaccepteerd_at: string | null;
  geweigerd_at: string | null;
  later_bekijken_at: string | null;
};

type GoalAcceptanceRpcClient = {
  rpc(
    fn: "beantwoord_doelacceptatie",
    args: {
      target_acceptatie_id: string;
      target_profiel_id: string;
      antwoord: DoelacceptatieAntwoord;
    }
  ): {
    maybeSingle(): Promise<{
      data: GoalAcceptanceRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
};

const DOELACCEPTATIE_ANTWOORDEN: DoelacceptatieAntwoord[] = [
  "accept",
  "reject",
  "later"
];

export async function acceptDoelacceptatie(
  input: DoelacceptatieActionInput
): Promise<DoelacceptatieActionResult> {
  return respondToDoelacceptatie(input, "accept");
}

export async function weigerDoelacceptatie(
  input: DoelacceptatieActionInput
): Promise<DoelacceptatieActionResult> {
  return respondToDoelacceptatie(input, "reject");
}

export async function bekijkDoelacceptatieLater(
  input: DoelacceptatieActionInput
): Promise<DoelacceptatieActionResult> {
  return respondToDoelacceptatie(input, "later");
}

export async function respondToDoelacceptatie(
  { acceptatieId, profielId }: DoelacceptatieActionInput,
  antwoord: DoelacceptatieAntwoord
): Promise<DoelacceptatieActionResult> {
  if (!DOELACCEPTATIE_ANTWOORDEN.includes(antwoord)) {
    throw new Error("Onbekende doelacceptatieactie.");
  }

  const supabase =
    getSupabaseBrowserClient() as unknown as GoalAcceptanceRpcClient;

  const { data, error } = await supabase
    .rpc("beantwoord_doelacceptatie", {
      target_acceptatie_id: acceptatieId,
      target_profiel_id: profielId,
      antwoord
    })
    .maybeSingle();

  if (error) {
    throw new Error(toDoelacceptatieActionMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Deze doelacceptatieactie kon niet worden verwerkt. De doelacceptatie is niet meer open of niet zichtbaar voor dit profiel."
    );
  }

  return {
    id: data.acceptatie_id,
    goalId: data.doel_id,
    profileId: data.profiel_id,
    status: data.doelacceptatie_status
  };
}

function toDoelacceptatieActionMessage(message: string) {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("row-level security") ||
    lowered.includes("not allowed") ||
    lowered.includes("niet toegestaan")
  ) {
    return "Je kunt deze doelacceptatieactie niet uitvoeren met dit profiel.";
  }

  if (lowered.includes("niet meer open")) {
    return "Deze doelacceptatie is niet meer open.";
  }

  return "De doelacceptatieactie kon niet worden uitgevoerd. Probeer opnieuw.";
}
