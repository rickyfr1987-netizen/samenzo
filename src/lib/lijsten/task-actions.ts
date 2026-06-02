import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables, TablesInsert } from "@/src/lib/database.types";
import type { LijstTask, LijstTaskAssignee } from "@/src/lib/lijsten/items";
import type { PostgrestError } from "@supabase/supabase-js";

export type TaskAssigneeStatus = Tables<"taakuitvoerders">["status"];
export type TaskStatus = Tables<"taken">["status"];

export const CLAIMED_TASK_ASSIGNEE_STATUS: TaskAssigneeStatus = "actief";
export const RELEASED_TASK_ASSIGNEE_STATUS: TaskAssigneeStatus = "vervallen";
export const COMPLETED_TASK_STATUS: TaskStatus = "afgerond";
export const COMPLETED_TASK_ASSIGNEE_STATUS: TaskAssigneeStatus = "afgerond";

const RECLAIMABLE_TASK_ASSIGNEE_STATUSES: TaskAssigneeStatus[] = [
  RELEASED_TASK_ASSIGNEE_STATUS
];

const CLAIMABLE_TASK_STATUSES: TaskStatus[] = [
  "open",
  "geaccepteerd",
  "bezig"
];

type CurrentTaskAssigneeRow = Pick<
  Tables<"taakuitvoerders">,
  "id" | "status"
>;

type CompleteTaskRpcResult = {
  taak_afgerond: boolean;
  taakuitvoerder_afgerond: boolean;
};

type ReopenTaskRpcResult = {
  taak_heropend: boolean;
  taakuitvoerder_heropend: boolean;
};

type TaskCompletionRpcClient = {
  rpc(
    fn: "taak_afvinken",
    args: {
      target_profiel_id: string;
      target_taak_id: string;
      target_taakuitvoerder_id: string;
    }
  ): {
    maybeSingle(): Promise<{
      data: CompleteTaskRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
  rpc(
    fn: "taak_heropenen",
    args: {
      target_profiel_id: string;
      target_taak_id: string;
      target_taakuitvoerder_id: string;
    }
  ): {
    maybeSingle(): Promise<{
      data: ReopenTaskRpcResult | null;
      error: PostgrestError | null;
    }>;
  };
};

export type TaskClaimResult =
  | { status: "inserted" }
  | { status: "reactivated" }
  | { status: "already_claimed" }
  | { status: "existing_not_reclaimable"; assigneeStatus: TaskAssigneeStatus };

export type TaskClaimState =
  | {
      status: "not_claimed";
      currentAssignee: LijstTaskAssignee | null;
      activeAssignees: LijstTaskAssignee[];
    }
  | {
      status: "claimed_by_current";
      currentAssignee: LijstTaskAssignee;
      activeAssignees: LijstTaskAssignee[];
    }
  | {
      status: "claimed_by_other";
      currentAssignee: LijstTaskAssignee | null;
      activeAssignees: LijstTaskAssignee[];
    };

export function getTaskClaimState(
  task: LijstTask,
  currentProfielId: string | null
): TaskClaimState {
  const activeAssignees = task.assignees.filter(
    (assignee) => assignee.status === CLAIMED_TASK_ASSIGNEE_STATUS
  );
  const currentAssignee = currentProfielId
    ? task.assignees.find((assignee) => assignee.profileId === currentProfielId)
    : null;
  const currentActiveAssignee = activeAssignees.find(
    (assignee) => assignee.profileId === currentProfielId
  );

  if (currentActiveAssignee) {
    return {
      status: "claimed_by_current",
      currentAssignee: currentActiveAssignee,
      activeAssignees
    };
  }

  if (activeAssignees.length > 0) {
    return {
      status: "claimed_by_other",
      currentAssignee: currentAssignee ?? null,
      activeAssignees
    };
  }

  return {
    status: "not_claimed",
    currentAssignee: currentAssignee ?? null,
    activeAssignees
  };
}

export function canClaimTask(
  task: LijstTask,
  claimState: TaskClaimState,
  hasCurrentProfile: boolean
) {
  return (
    hasCurrentProfile &&
    claimState.status === "not_claimed" &&
    isClaimableTaskStatus(task.status) &&
    (!claimState.currentAssignee ||
      RECLAIMABLE_TASK_ASSIGNEE_STATUSES.includes(
        claimState.currentAssignee.status
      ))
  );
}

export function canCompleteTask(
  task: LijstTask,
  claimState: TaskClaimState,
  hasCurrentProfile: boolean
) {
  return (
    hasCurrentProfile &&
    claimState.status === "claimed_by_current" &&
    isClaimableTaskStatus(task.status)
  );
}

export function canReopenTask({
  currentAssignee,
  hasCurrentProfile,
  task
}: {
  currentAssignee: LijstTaskAssignee | null;
  hasCurrentProfile: boolean;
  task: LijstTask;
}) {
  return (
    hasCurrentProfile &&
    isCompletedTaskStatus(task.status) &&
    currentAssignee?.status === COMPLETED_TASK_ASSIGNEE_STATUS
  );
}

export function isClaimableTaskStatus(status: TaskStatus) {
  return CLAIMABLE_TASK_STATUSES.includes(status);
}

export function isCompletedTaskStatus(status: TaskStatus) {
  return status === COMPLETED_TASK_STATUS;
}

export async function claimTask({
  taakId,
  persoonId,
  profielId
}: {
  taakId: string;
  persoonId: string;
  profielId: string;
}): Promise<TaskClaimResult> {
  const supabase = getSupabaseBrowserClient();
  const timestamp = new Date().toISOString();
  const existingAssignee = await fetchCurrentTaskAssignee(taakId, profielId);

  if (existingAssignee) {
    if (existingAssignee.status === CLAIMED_TASK_ASSIGNEE_STATUS) {
      return { status: "already_claimed" };
    }

    if (
      !RECLAIMABLE_TASK_ASSIGNEE_STATUSES.includes(existingAssignee.status)
    ) {
      return {
        status: "existing_not_reclaimable",
        assigneeStatus: existingAssignee.status
      };
    }

    const { data, error } = await supabase
      .from("taakuitvoerders")
      .update({
        status: CLAIMED_TASK_ASSIGNEE_STATUS,
        geclaimd_door_persoon_id: persoonId,
        geclaimd_at: timestamp,
        afgerond_at: null,
        updated_at: timestamp
      })
      .eq("id", existingAssignee.id)
      .eq("taak_id", taakId)
      .eq("profiel_id", profielId)
      .eq("status", RELEASED_TASK_ASSIGNEE_STATUS)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(toTaskActionMessage(error.message));
    }

    if (!data) {
      throw new Error(
        "Taak claimen is niet gelukt. De bestaande taakuitvoerder mag mogelijk niet door dit profiel worden aangepast."
      );
    }

    return { status: "reactivated" };
  }

  const taskAssignee: TablesInsert<"taakuitvoerders"> = {
    taak_id: taakId,
    profiel_id: profielId,
    status: CLAIMED_TASK_ASSIGNEE_STATUS,
    geclaimd_door_persoon_id: persoonId,
    geclaimd_at: timestamp
  };

  const { data, error } = await supabase
    .from("taakuitvoerders")
    .insert(taskAssignee)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(toTaskActionMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Taak claimen is niet gelukt. De taakuitvoerder is mogelijk niet zichtbaar door RLS."
    );
  }

  return { status: "inserted" };
}

export async function releaseTask({
  taakuitvoerderId,
  taakId,
  profielId
}: {
  taakuitvoerderId: string;
  taakId: string;
  profielId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("taakuitvoerders")
    .update({
      status: RELEASED_TASK_ASSIGNEE_STATUS,
      geclaimd_door_persoon_id: null,
      geclaimd_at: null,
      afgerond_at: null,
      updated_at: timestamp
    })
    .eq("id", taakuitvoerderId)
    .eq("taak_id", taakId)
    .eq("profiel_id", profielId)
    .eq("status", CLAIMED_TASK_ASSIGNEE_STATUS)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(toTaskActionMessage(error.message));
  }

  if (!data) {
    throw new Error(
      "Taak vrijgeven is niet gelukt. Deze taakuitvoerder mag mogelijk niet door dit profiel worden aangepast."
    );
  }
}

export async function completeTask({
  taakuitvoerderId,
  taakId,
  profielId
}: {
  taakuitvoerderId: string;
  taakId: string;
  profielId: string;
}) {
  const supabase =
    getSupabaseBrowserClient() as unknown as TaskCompletionRpcClient;

  const { data, error } = await supabase
    .rpc("taak_afvinken", {
      target_profiel_id: profielId,
      target_taak_id: taakId,
      target_taakuitvoerder_id: taakuitvoerderId
    })
    .maybeSingle();

  if (error) {
    throw new Error(toTaskActionMessage(error.message));
  }

  if (!data?.taak_afgerond || !data.taakuitvoerder_afgerond) {
    throw new Error(
      "Taak afvinken is niet gelukt. Deze taak mag mogelijk niet door dit profiel worden afgerond."
    );
  }
}

export async function reopenTask({
  taakuitvoerderId,
  taakId,
  profielId
}: {
  taakuitvoerderId: string;
  taakId: string;
  profielId: string;
}) {
  const supabase =
    getSupabaseBrowserClient() as unknown as TaskCompletionRpcClient;

  const { data, error } = await supabase
    .rpc("taak_heropenen", {
      target_profiel_id: profielId,
      target_taak_id: taakId,
      target_taakuitvoerder_id: taakuitvoerderId
    })
    .maybeSingle();

  if (error) {
    throw new Error(toTaskActionMessage(error.message));
  }

  if (!data?.taak_heropend || !data.taakuitvoerder_heropend) {
    throw new Error(
      "Taak heropenen is niet gelukt. Deze taak mag mogelijk niet door dit profiel worden heropend."
    );
  }
}

async function fetchCurrentTaskAssignee(
  taakId: string,
  profielId: string
): Promise<CurrentTaskAssigneeRow | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("taakuitvoerders")
    .select("id, status")
    .eq("taak_id", taakId)
    .eq("profiel_id", profielId)
    .maybeSingle();

  if (error) {
    throw new Error(toTaskActionMessage(error.message));
  }

  return data;
}

function toTaskActionMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("row-level security")) {
    return "Deze taakactie is niet toegestaan voor dit profiel volgens de huidige RLS-regels.";
  }

  if (
    lowerMessage.includes("duplicate key") ||
    lowerMessage.includes("taakuitvoerders_taak_profiel_uniek_idx") ||
    lowerMessage.includes("taakuitvoerders_actief_uniek_idx")
  ) {
    return "Voor deze taak bestaat al een taakuitvoerder voor dit profiel.";
  }

  return message;
}
