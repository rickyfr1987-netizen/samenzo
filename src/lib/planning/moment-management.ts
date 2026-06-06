import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";

export type PlanningMomentManagementInput = {
  groupId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  isAllDay?: boolean;
  location?: string | null;
  capacity?: number | null;
  registrationOpen?: boolean;
  guestAccess?: boolean;
};

export type PlanningMomentUpdateInput = PlanningMomentManagementInput & {
  momentId: string;
  status: Extract<
    Tables<"momenten">["status"],
    "gepland" | "open" | "gewijzigd" | "geannuleerd"
  >;
};

export type PlanningMomentActionResult = {
  id: string;
  title?: string;
  status: Tables<"momenten">["status"];
  groupId?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
};

type CreatePlanningMomentRpcResult = {
  moment_id: string;
  titel: string;
  status: Tables<"momenten">["status"];
  eigenaar_groep_id: string;
  start_at: string | null;
  eind_at: string | null;
};

type UpdatePlanningMomentRpcResult = CreatePlanningMomentRpcResult & {
  updated_at: string | null;
};

type ArchivePlanningMomentRpcResult = {
  moment_id: string;
  status: Tables<"momenten">["status"];
  archived_at: string | null;
};

type PlanningMomentManagementRpcClient = {
  rpc(
    fn: "maak_groep_moment",
    args: {
      target_groep_id: string;
      target_categorie_id: string;
      target_titel: string;
      target_beschrijving: string | null;
      target_start_at: string;
      target_eind_at: string | null;
      target_hele_dag: boolean;
      target_locatie: string | null;
      target_capaciteit: number | null;
      target_inschrijving_open: boolean;
      target_gasttoegang: boolean;
    }
  ): {
    maybeSingle(): Promise<{
      data: CreatePlanningMomentRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
  rpc(
    fn: "wijzig_groep_moment",
    args: {
      target_moment_id: string;
      target_categorie_id: string;
      target_titel: string;
      target_beschrijving: string | null;
      target_start_at: string;
      target_eind_at: string | null;
      target_hele_dag: boolean;
      target_locatie: string | null;
      target_capaciteit: number | null;
      target_inschrijving_open: boolean;
      target_gasttoegang: boolean;
      target_status: PlanningMomentUpdateInput["status"];
    }
  ): {
    maybeSingle(): Promise<{
      data: UpdatePlanningMomentRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
  rpc(
    fn: "archiveer_groep_moment",
    args: {
      target_moment_id: string;
    }
  ): {
    maybeSingle(): Promise<{
      data: ArchivePlanningMomentRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
};

export async function createPlanningGroupMoment(
  input: PlanningMomentManagementInput
): Promise<PlanningMomentActionResult> {
  const supabase =
    getSupabaseBrowserClient() as unknown as PlanningMomentManagementRpcClient;

  const { data, error } = await supabase
    .rpc("maak_groep_moment", toCreateRpcArgs(input))
    .maybeSingle();

  if (error) {
    throw new Error(toPlanningMomentManagementMessage(error.message));
  }

  if (!data) {
    throw new Error("Het planningmoment kon niet worden aangemaakt.");
  }

  return {
    id: data.moment_id,
    title: data.titel,
    status: data.status,
    groupId: data.eigenaar_groep_id,
    startsAt: data.start_at,
    endsAt: data.eind_at
  };
}

export async function updatePlanningGroupMoment(
  input: PlanningMomentUpdateInput
): Promise<PlanningMomentActionResult> {
  const supabase =
    getSupabaseBrowserClient() as unknown as PlanningMomentManagementRpcClient;

  const { data, error } = await supabase
    .rpc("wijzig_groep_moment", {
      ...toUpdateRpcArgs(input),
      target_moment_id: input.momentId,
      target_status: input.status
    })
    .maybeSingle();

  if (error) {
    throw new Error(toPlanningMomentManagementMessage(error.message));
  }

  if (!data) {
    throw new Error("Het planningmoment kon niet worden bijgewerkt.");
  }

  return {
    id: data.moment_id,
    title: data.titel,
    status: data.status,
    groupId: data.eigenaar_groep_id,
    startsAt: data.start_at,
    endsAt: data.eind_at,
    updatedAt: data.updated_at
  };
}

export async function archivePlanningGroupMoment({
  momentId
}: {
  momentId: string;
}): Promise<PlanningMomentActionResult> {
  const supabase =
    getSupabaseBrowserClient() as unknown as PlanningMomentManagementRpcClient;

  const { data, error } = await supabase
    .rpc("archiveer_groep_moment", {
      target_moment_id: momentId
    })
    .maybeSingle();

  if (error) {
    throw new Error(toPlanningMomentManagementMessage(error.message));
  }

  if (!data) {
    throw new Error("Het planningmoment kon niet worden gearchiveerd.");
  }

  return {
    id: data.moment_id,
    status: data.status,
    archivedAt: data.archived_at
  };
}

function toCreateRpcArgs(input: PlanningMomentManagementInput) {
  return {
    target_groep_id: input.groupId,
    target_categorie_id: input.categoryId,
    target_titel: input.title,
    target_beschrijving: input.description ?? null,
    target_start_at: input.startsAt,
    target_eind_at: input.endsAt ?? null,
    target_hele_dag: input.isAllDay ?? false,
    target_locatie: input.location ?? null,
    target_capaciteit: input.capacity ?? null,
    target_inschrijving_open: input.registrationOpen ?? false,
    target_gasttoegang: input.guestAccess ?? false
  };
}

function toUpdateRpcArgs(input: PlanningMomentManagementInput) {
  const { target_groep_id: _groupId, ...args } = toCreateRpcArgs(input);

  return args;
}

function toPlanningMomentManagementMessage(message: string) {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("row-level security") ||
    lowered.includes("niet toegestaan") ||
    lowered.includes("alleen systeembeheerder")
  ) {
    return "Je kunt dit planningmoment niet beheren met dit profiel.";
  }

  if (lowered.includes("momentcategorie")) {
    return "Kies een geldige momentcategorie.";
  }

  if (lowered.includes("actieve groep")) {
    return "Kies een actieve groep voor dit planningmoment.";
  }

  if (lowered.includes("titel")) {
    return "Vul een titel in voor het planningmoment.";
  }

  if (lowered.includes("eindtijd")) {
    return "De eindtijd moet na de starttijd liggen.";
  }

  if (lowered.includes("capaciteit")) {
    return "Capaciteit mag niet negatief zijn.";
  }

  if (lowered.includes("gasttoegang")) {
    return "Gasttoegang is alleen toegestaan voor gastgerichte momenten.";
  }

  return "Het planningmoment kon niet worden beheerd. Probeer opnieuw.";
}
