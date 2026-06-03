import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/src/lib/database.types";

export type SupportVraagStatus = Tables<"supportvragen">["status"];
type SupportVraagCreateInput = {
  profielId: string;
  persoonId: string;
  onderwerp: string;
  omschrijving: string;
};

type SupportVraagCreateResult = {
  id: string;
  onderwerp: string;
  status: Tables<"supportvragen">["status"];
};

type SupportVraagUpdateInput = {
  persoonId: string | null;
  status: SupportVraagStatusUpdateTarget;
  supportVraagId: string;
};

type SupportVraagUpdateResult = SupportVraagCreateResult;
type SupportVraagSolvedInput = {
  persoonId: string;
  profielId: string;
  supportVraagId: string;
};
type SupportVraagResponseCreateInput = {
  inhoud: string;
  isSupportAntwoord: boolean;
  nextStatusOnCreate: Exclude<SupportVraagStatus, "nieuw">;
  profielId: string;
  persoonId: string;
  supportVraagId: string;
};
type SupportVraagResponseCreateResult = {
  id: string;
  inhoud: string;
  isSupportAntwoord: boolean;
  nextStatus: SupportVraagStatus;
};

type SupportVraagStatusUpdateTarget =
  | Exclude<SupportVraagStatus, "nieuw">
  | "nieuw";

export async function createSupportVraag(
  input: SupportVraagCreateInput
): Promise<SupportVraagCreateResult> {
  if (!input.onderwerp.trim() || !input.omschrijving.trim()) {
    throw new Error("Een onderwerp en omschrijving zijn verplicht.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("supportvragen")
    .insert({
      aangemaakt_door_persoon_id: input.persoonId,
      aangemaakt_vanuit_profiel_id: input.profielId,
      status: "nieuw",
      onderwerp: input.onderwerp.trim(),
      omschrijving: input.omschrijving.trim()
    })
    .select("id, onderwerp, status")
    .maybeSingle();

  if (error) {
    throw new Error(toSupportErrorMessage(error.message));
  }

  if (!data) {
    throw new Error("Deze supportvraag kon niet worden aangemaakt.");
  }

  return {
    id: data.id,
    onderwerp: data.onderwerp,
    status: data.status
  };
}

export async function createSupportVraagResponse(
  input: SupportVraagResponseCreateInput
): Promise<SupportVraagResponseCreateResult> {
  if (!input.inhoud.trim()) {
    throw new Error("Een reactie moet niet leeg zijn.");
  }

  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const payload: TablesInsert<"supportvraag_reacties"> = {
    supportvraag_id: input.supportVraagId,
    aangemaakt_door_persoon_id: input.persoonId,
    aangemaakt_vanuit_profiel_id: input.profielId,
    inhoud: input.inhoud.trim(),
    is_support_antwoord: input.isSupportAntwoord
  };
  const { data, error } = await supabase
    .from("supportvraag_reacties")
    .insert(payload)
    .select("id, inhoud, is_support_antwoord")
    .maybeSingle();

  if (error) {
    throw new Error(toSupportErrorMessage(error.message));
  }

  if (!data) {
    throw new Error("Deze supportreactie kon niet worden opgeslagen.");
  }

  const response = {
    id: data.id,
    inhoud: data.inhoud,
    isSupportAntwoord: data.is_support_antwoord
  };

  const { error: statusError } = await supabase
    .from("supportvragen")
    .update({
      status: input.nextStatusOnCreate,
      behandeld_door_persoon_id: input.persoonId,
      updated_at: now
    })
    .eq("id", input.supportVraagId);

  if (statusError) {
    // Keep the response, but fail clearly if status update is not permitted.
    throw new Error(toSupportErrorMessage(statusError.message));
  }

  return {
    id: response.id,
    inhoud: response.inhoud,
    isSupportAntwoord: response.isSupportAntwoord,
    nextStatus: input.nextStatusOnCreate
  };
}

export async function updateSupportVraagStatus(
  input: SupportVraagUpdateInput
): Promise<SupportVraagUpdateResult> {
  const now = new Date().toISOString();
  const updates: TablesUpdate<"supportvragen"> = {
    status: input.status,
    behandeld_door_persoon_id: input.persoonId,
    updated_at: now
  };

  if (input.status === "afgehandeld") {
    updates.afgehandeld_at = now;
  } else if (input.status === "gesloten") {
    updates.gesloten_at = now;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("supportvragen")
    .update(updates)
    .eq("id", input.supportVraagId)
    .select("id, onderwerp, status")
    .maybeSingle();

  if (error) {
    throw new Error(toSupportErrorMessage(error.message));
  }

  if (!data) {
    throw new Error("Deze supportstatus kon niet worden aangepast.");
  }

  return {
    id: data.id,
    onderwerp: data.onderwerp,
    status: data.status
  };
}

export async function markOwnSupportVraagSolved(
  input: SupportVraagSolvedInput
): Promise<SupportVraagUpdateResult> {
  const now = new Date().toISOString();
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("supportvragen")
    .update({
      status: "gesloten",
      gesloten_at: now,
      updated_at: now
    })
    .eq("id", input.supportVraagId)
    .eq("aangemaakt_door_persoon_id", input.persoonId)
    .eq("aangemaakt_vanuit_profiel_id", input.profielId)
    .select("id, onderwerp, status")
    .maybeSingle();

  if (error) {
    throw new Error(toSupportErrorMessage(error.message));
  }

  if (!data) {
    throw new Error("Deze supportvraag kon niet als opgelost worden gemarkeerd.");
  }

  return {
    id: data.id,
    onderwerp: data.onderwerp,
    status: data.status
  };
}

function toSupportErrorMessage(message: string) {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("row-level security") ||
    lowered.includes("not allowed") ||
    lowered.includes("niet toegestaan")
  ) {
    return "Je hebt onvoldoende rechten voor deze supportactie.";
  }

  return "De supportactie kon niet worden verwerkt. Probeer opnieuw.";
}
