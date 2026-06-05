import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

export type PersoonlijkMomentInput = {
  profielId: string;
  titel: string;
  categorieId: string;
  startAt: string;
  eindAt?: string | null;
  beschrijving?: string | null;
  locatie?: string | null;
  heleDag?: boolean;
};

export type PersoonlijkMomentResult = {
  id: string;
  eigenaarProfielId: string;
  eigenaarGroepId: string | null;
  titel: string;
  startAt: string;
  eindAt: string | null;
  status: string;
};

type MaakPersoonlijkMomentRpcResult = {
  moment_id: string;
  eigenaar_profiel_id: string;
  eigenaar_groep_id: string | null;
  titel: string;
  start_at: string;
  eind_at: string | null;
  status: string;
};

type MaakPersoonlijkMomentRpcClient = {
  rpc(
    fn: "maak_persoonlijk_moment",
    args: {
      target_profiel_id: string;
      target_titel: string;
      target_categorie_id: string;
      target_start_at: string;
      target_eind_at: string | null;
      target_beschrijving: string | null;
      target_locatie: string | null;
      target_hele_dag: boolean;
    }
  ): {
    maybeSingle(): Promise<{
      data: MaakPersoonlijkMomentRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
};

export async function maakPersoonlijkMoment(
  input: PersoonlijkMomentInput
): Promise<PersoonlijkMomentResult> {
  const titel = input.titel.trim();

  if (!titel) {
    throw new Error("De titel van een persoonlijk moment is verplicht.");
  }

  if (!input.startAt) {
    throw new Error("Een starttijd is verplicht voor een persoonlijk moment.");
  }

  const supabase =
    getSupabaseBrowserClient() as unknown as MaakPersoonlijkMomentRpcClient;

  const { data, error } = await supabase.rpc("maak_persoonlijk_moment", {
    target_profiel_id: input.profielId,
    target_titel: titel,
    target_categorie_id: input.categorieId,
    target_start_at: input.startAt,
    target_eind_at: input.eindAt ?? null,
    target_beschrijving: input.beschrijving ?? null,
    target_locatie: input.locatie ?? null,
    target_hele_dag: input.heleDag ?? false
  }).maybeSingle();

  if (error) {
    throw new Error(toMaakPersoonlijkMomentMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Persoonlijk moment kon niet worden aangemaakt. Probeer opnieuw."
    );
  }

  return {
    id: data.moment_id,
    eigenaarProfielId: data.eigenaar_profiel_id,
    eigenaarGroepId: data.eigenaar_groep_id,
    titel: data.titel,
    startAt: data.start_at,
    eindAt: data.eind_at,
    status: data.status
  };
}

function toMaakPersoonlijkMomentMessage(message: string) {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("row-level security") ||
    lowered.includes("not allowed") ||
    lowered.includes("niet toegestaan") ||
    lowered.includes("eigen actieve profiel")
  ) {
    return "Je kunt dit persoonlijk moment niet aanmaken voor dit profiel.";
  }

  if (lowered.includes("starttijd is verplicht")) {
    return "Een starttijd is verplicht voor een persoonlijk moment.";
  }

  if (lowered.includes("titel is verplicht")) {
    return "De titel van een persoonlijk moment is verplicht.";
  }

  return "Het persoonlijk moment kon niet worden aangemaakt. Probeer opnieuw.";
}
