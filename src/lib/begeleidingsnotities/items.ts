import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables, TablesInsert, TablesUpdate } from "@/src/lib/database.types";

type BegeleidingsnotitieSelectRow = Pick<
  Tables<"begeleidingsnotities">,
  | "id"
  | "inhoud"
  | "status"
  | "created_at"
  | "updated_at"
  | "moment_id"
  | "lijst_id"
  | "taak_id"
  | "betrokken_profiel_id"
  | "zichtbaar_voor_roltype"
>;

const BEGELEIDINGSNOTITIE_SELECT = `
  id,
  inhoud,
  status,
  created_at,
  updated_at,
  moment_id,
  lijst_id,
  taak_id,
  betrokken_profiel_id,
  zichtbaar_voor_roltype
`;

const ACTIVE_NOTE_STATI = ["actief", "bewerkt"] as const;

export type Begeleidingsnotitie = {
  id: string;
  inhoud: string;
  status: Tables<"begeleidingsnotities">["status"];
  contextType: "moment" | "lijst" | "taak";
  contextId: string;
  createdAt: string;
  updatedAt: string | null;
  betrokkenProfielId: string | null;
  zichtbaarVoorRoltype:
    | Tables<"begeleidingsnotities">["zichtbaar_voor_roltype"]
    | null;
};

export type BegeleidingsnotitieCreateContext = {
  personId: string;
  inhoud: string;
  betrokkenProfielId: string | null;
  zichtbaarVoorRoltype: Tables<"begeleidingsnotities">["zichtbaar_voor_roltype"] | null;
};

export type BegeleidingsnotitieMomentInput =
  BegeleidingsnotitieCreateContext & {
    momentId: string;
  };

export type BegeleidingsnotitieLijstInput =
  BegeleidingsnotitieCreateContext & {
    lijstId: string;
  };

export type BegeleidingsnotitieTaakInput =
  BegeleidingsnotitieCreateContext & {
    taakId: string;
  };

export type BegeleidingsnotitieUpdateInput = {
  noteId: string;
  persoonId: string;
  inhoud: string;
};

export type BegeleidingsnotitieArchiveInput = {
  noteId: string;
  persoonId: string;
};

export async function fetchBegeleidingsnotitiesForMoment(
  momentId: string
): Promise<Begeleidingsnotitie[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("begeleidingsnotities")
    .select(BEGELEIDINGSNOTITIE_SELECT)
    .eq("moment_id", momentId)
    .in("status", ACTIVE_NOTE_STATI)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BegeleidingsnotitieSelectRow[]).map((note) =>
    mapBegeleidingsnotitieRow(note)
  );
}

export async function fetchBegeleidingsnotitiesForLijst(
  lijstId: string
): Promise<Begeleidingsnotitie[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("begeleidingsnotities")
    .select(BEGELEIDINGSNOTITIE_SELECT)
    .eq("lijst_id", lijstId)
    .in("status", ACTIVE_NOTE_STATI)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BegeleidingsnotitieSelectRow[]).map((note) =>
    mapBegeleidingsnotitieRow(note)
  );
}

export async function createBegeleidingsnotitieForMoment(
  input: BegeleidingsnotitieMomentInput
): Promise<void> {
  const inhoud = input.inhoud.trim();

  if (!inhoud) {
    throw new Error("Een begeleidingsnotitie mag niet leeg zijn.");
  }

  const supabase = getSupabaseBrowserClient();
  const payload: TablesInsert<"begeleidingsnotities"> = {
    moment_id: input.momentId,
    inhoud,
    status: "actief",
    created_by_persoon_id: input.personId,
    betrokken_profiel_id: input.betrokkenProfielId,
    zichtbaar_voor_roltype: input.zichtbaarVoorRoltype
  };

  const { error } = await supabase
    .from("begeleidingsnotities")
    .insert(payload);

  if (error) {
    throw new Error(toBegeleidingsNotitieErrorMessage(error.message));
  }
}

export async function createBegeleidingsnotitieForLijst(
  input: BegeleidingsnotitieLijstInput
): Promise<void> {
  const inhoud = input.inhoud.trim();

  if (!inhoud) {
    throw new Error("Een begeleidingsnotitie mag niet leeg zijn.");
  }

  const supabase = getSupabaseBrowserClient();
  const payload: TablesInsert<"begeleidingsnotities"> = {
    lijst_id: input.lijstId,
    inhoud,
    status: "actief",
    created_by_persoon_id: input.personId,
    betrokken_profiel_id: input.betrokkenProfielId,
    zichtbaar_voor_roltype: null
  };

  const { error } = await supabase
    .from("begeleidingsnotities")
    .insert(payload);

  if (error) {
    throw new Error(toBegeleidingsNotitieErrorMessage(error.message));
  }
}

export async function updateBegeleidingsnotitie(
  input: BegeleidingsnotitieUpdateInput
): Promise<void> {
  const inhoud = input.inhoud.trim();

  if (!inhoud) {
    throw new Error("Een begeleidingsnotitie mag niet leeg zijn.");
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseBrowserClient();
  const payload: TablesUpdate<"begeleidingsnotities"> = {
    inhoud,
    status: "bewerkt",
    updated_by_persoon_id: input.persoonId,
    updated_at: now
  };

  const { error } = await supabase
    .from("begeleidingsnotities")
    .update(payload)
    .eq("id", input.noteId);

  if (error) {
    throw new Error(toBegeleidingsNotitieErrorMessage(error.message));
  }
}

export async function archiveBegeleidingsnotitie(
  input: BegeleidingsnotitieArchiveInput
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabaseBrowserClient();
  const payload: TablesUpdate<"begeleidingsnotities"> = {
    status: "gearchiveerd",
    archived_at: now,
    archived_by_persoon_id: input.persoonId,
    updated_by_persoon_id: input.persoonId,
    updated_at: now
  };

  const { error } = await supabase
    .from("begeleidingsnotities")
    .update(payload)
    .eq("id", input.noteId);

  if (error) {
    throw new Error(toBegeleidingsNotitieErrorMessage(error.message));
  }
}

function mapBegeleidingsnotitieRow(
  note: BegeleidingsnotitieSelectRow
): Begeleidingsnotitie {
  const contextType = note.moment_id
    ? "moment"
    : note.lijst_id
      ? "lijst"
      : "taak";
  const contextId =
    note.moment_id ?? note.lijst_id ?? note.taak_id ?? "";

  return {
    id: note.id,
    inhoud: note.inhoud,
    status: note.status,
    contextType,
    contextId,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    betrokkenProfielId: note.betrokken_profiel_id,
    zichtbaarVoorRoltype: note.zichtbaar_voor_roltype
  };
}

function toBegeleidingsNotitieErrorMessage(message: string) {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("row-level security") ||
    lowered.includes("not allowed") ||
    lowered.includes("niet toegestaan")
  ) {
    return "Je hebt onvoldoende rechten voor deze begeleidingsactie.";
  }

  return "De begeleidingsactie kon niet worden verwerkt. Probeer opnieuw.";
}
