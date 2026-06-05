import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type MomentForMijnDag = Pick<
  Tables<"momenten">,
  | "id"
  | "titel"
  | "beschrijving"
  | "start_at"
  | "eind_at"
  | "hele_dag"
  | "locatie"
  | "status"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
};

type DeelnameWithMoment = Pick<Tables<"deelnames">, "id" | "status"> & {
  momenten: MomentForMijnDag | null;
};

const MIJN_DAG_DEELNAME_STATUSES: Tables<"deelnames">["status"][] = [
  "voorgesteld",
  "uitgenodigd",
  "geaccepteerd",
  "ingeschreven",
  "wachtlijst"
];

type RolbezettingWithMomentrol = Pick<
  Tables<"rolbezettingen">,
  "id" | "status"
> & {
  momentrollen:
    | (Pick<
        Tables<"momentrollen">,
        "id" | "titel" | "roltype" | "status"
      > & {
        momenten: MomentForMijnDag | null;
      })
    | null;
};

export type MijnDagItemReason = {
  type: "deelname" | "rolbezetting" | "voorstel" | "taak" | "aandacht";
  label: string;
  status: string;
};

export type MijnDagItem = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isAllDay: boolean;
  location: string | null;
  status: string;
  categoryName: string | null;
  reasons: MijnDagItemReason[];
};

export type MijnDagTaskItem = MijnDagItem & {
  assigneeStatus: Tables<"taakuitvoerders">["status"];
  listId: string | null;
  listTitle: string | null;
};

const MIJN_DAG_REASON_PRIORITY: Record<MijnDagItemReason["type"], number> = {
  deelname: 1,
  rolbezetting: 2,
  voorstel: 3,
  taak: 0,
  aandacht: 0
};

export function getLocalDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function isMomentOnDay(moment: MomentForMijnDag, day: Date) {
  if (!moment.start_at) {
    return false;
  }

  const { start, end } = getLocalDayRange(day);
  const momentStart = new Date(moment.start_at);

  return momentStart >= start && momentStart < end;
}

const MIJN_DAG_TASK_ASSIGNEE_STATUSES: Tables<"taakuitvoerders">["status"][] = [
  "actief",
  "voorgesteld"
];

const MIJN_DAG_TASK_STATUSES: Tables<"taken">["status"][] = [
  "open",
  "geaccepteerd",
  "bezig",
  "voorgesteld"
];

type TaakuitvoerderForProfileRow = Pick<
  Tables<"taakuitvoerders">,
  "taak_id" | "status"
>;

type TaakuitvoerderStatus = TaakuitvoerderForProfileRow["status"];

type TaskListRow = Pick<
  Tables<"lijsten">,
  "id" | "titel"
> & {
  momenten:
    | (Pick<
        Tables<"momenten">,
        "id" | "titel" | "start_at" | "hele_dag" | "status"
      > & {
        id: string;
      })
    | null;
};

type TaskForMijnDagRow = Pick<
  Tables<"taken">,
  | "id"
  | "titel"
  | "beschrijving"
  | "status"
  | "deadline_at"
> & {
  lijsten: TaskListRow | null;
};

export async function fetchMijnDagTaskItems(
  profielId: string,
  day: Date
): Promise<MijnDagTaskItem[]> {
  const supabase = getSupabaseBrowserClient();
  const assigneesResult = await supabase
    .from("taakuitvoerders")
    .select("taak_id, status")
    .eq("profiel_id", profielId)
    .in("status", MIJN_DAG_TASK_ASSIGNEE_STATUSES);

  if (assigneesResult.error) {
    throw new Error(assigneesResult.error.message);
  }

  const assignees = assigneesResult.data as TaakuitvoerderForProfileRow[] | null;
  if (!assignees || assignees.length === 0) {
    return [];
  }

  const taakIds = Array.from(new Set(assignees.map((assignee) => assignee.taak_id)));
  const assigneeStatusByTaskId = new Map<string, TaakuitvoerderStatus>(
    assignees.map((assignee) => [assignee.taak_id, assignee.status])
  );

  const taakSelect = `
    id,
    titel,
    beschrijving,
    status,
    deadline_at,
    lijsten!taken_lijst_id_fkey (
      id,
      titel,
      momenten!lijsten_gekoppeld_moment_id_fkey (
        id,
        titel,
        start_at,
        hele_dag,
        status
      )
    )
  `;

  const { data, error } = await supabase
    .from("taken")
    .select(taakSelect)
    .in("id", taakIds)
    .is("archived_at", null)
    .order("deadline_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const { start, end } = getLocalDayRange(day);
  const taskRows = ((data ?? []) as TaskForMijnDagRow[]).filter((task) =>
    MIJN_DAG_TASK_STATUSES.includes(task.status)
  );
  const items: MijnDagTaskItem[] = [];

  for (const task of taskRows) {
    const assigneeStatus =
      assigneeStatusByTaskId.get(task.id) ??
      "actief";
    const linkedMoment = task.lijsten?.momenten;
    const displayDate = task.deadline_at ?? linkedMoment?.start_at ?? null;

    if (!displayDate) {
      continue;
    }

    const value = new Date(displayDate);
    if (Number.isNaN(value.getTime()) || value < start || value >= end) {
      continue;
    }

    items.push({
      id: task.id,
      title: task.titel,
      description: task.beschrijving,
      startsAt: displayDate,
      endsAt: null,
      isAllDay: linkedMoment?.hele_dag ?? false,
      location: linkedMoment?.titel ?? null,
      status: task.status,
      categoryName: task.lijsten?.titel ?? "Taak",
      reasons: [
        {
          type: "taak",
          label: "Taak",
          status: assigneeStatus ?? task.status
        }
      ],
      assigneeStatus,
      listId: task.lijsten?.id ?? null,
      listTitle: task.lijsten?.titel ?? null
    });
  }

  return items.sort((first, second) => {
    const firstTime = first.startsAt
      ? new Date(first.startsAt).getTime()
      : 0;
    const secondTime = second.startsAt
      ? new Date(second.startsAt).getTime()
      : 0;

    return firstTime - secondTime;
  });
}

function upsertMomentItem(
  itemsByMomentId: Map<string, MijnDagItem>,
  moment: MomentForMijnDag,
  reason: MijnDagItemReason
) {
  const existingItem = itemsByMomentId.get(moment.id);

  if (existingItem) {
    const alreadyHasReason = existingItem.reasons.some(
      (itemReason) =>
        itemReason.type === reason.type &&
        itemReason.label === reason.label &&
        itemReason.status === reason.status
    );

    if (!alreadyHasReason) {
      existingItem.reasons.push(reason);
      existingItem.reasons.sort(
        (first, second) =>
          MIJN_DAG_REASON_PRIORITY[second.type] -
          MIJN_DAG_REASON_PRIORITY[first.type]
      );
    }

    return;
  }

  itemsByMomentId.set(moment.id, {
    id: moment.id,
    title: moment.titel,
    description: moment.beschrijving,
    startsAt: moment.start_at,
    endsAt: moment.eind_at,
    isAllDay: moment.hele_dag,
    location: moment.locatie,
    status: moment.status,
    categoryName: moment.categorieen?.naam ?? null,
    reasons: [reason]
  });
}

export async function fetchMijnDagItems(
  profielId: string,
  day: Date
): Promise<MijnDagItem[]> {
  const supabase = getSupabaseBrowserClient();

  const [deelnamesResult, rolbezettingenResult] = await Promise.all([
    supabase
      .from("deelnames")
      .select(
        `
          id,
          status,
          momenten (
            id,
            titel,
            beschrijving,
            start_at,
            eind_at,
            hele_dag,
            locatie,
            status,
            categorieen (
              naam
            )
          )
        `
      )
      .eq("profiel_id", profielId)
      .is("archived_at", null)
      .in("status", MIJN_DAG_DEELNAME_STATUSES),
    supabase
      .from("rolbezettingen")
      .select(
        `
          id,
          status,
          momentrollen (
            id,
            titel,
            roltype,
            status,
            momenten (
              id,
              titel,
              beschrijving,
              start_at,
              eind_at,
              hele_dag,
              locatie,
              status,
              categorieen (
                naam
              )
            )
          )
        `
      )
      .eq("profiel_id", profielId)
      .eq("status", "actief")
  ]);

  if (deelnamesResult.error) {
    throw new Error(deelnamesResult.error.message);
  }

  if (rolbezettingenResult.error) {
    throw new Error(rolbezettingenResult.error.message);
  }

  const itemsByMomentId = new Map<string, MijnDagItem>();

  ((deelnamesResult.data ?? []) as DeelnameWithMoment[]).forEach(
    (deelname) => {
      if (!deelname.momenten || !isMomentOnDay(deelname.momenten, day)) {
        return;
      }

      upsertMomentItem(itemsByMomentId, deelname.momenten, {
        type: "deelname",
        label: "Deelname",
        status: deelname.status
      });
    }
  );

  (
    (rolbezettingenResult.data ?? []) as RolbezettingWithMomentrol[]
  ).forEach((rolbezetting) => {
    const momentrol = rolbezetting.momentrollen;

    if (!momentrol?.momenten || !isMomentOnDay(momentrol.momenten, day)) {
      return;
    }

    upsertMomentItem(itemsByMomentId, momentrol.momenten, {
      type: "rolbezetting",
      label: momentrol.titel ?? `Rol: ${momentrol.roltype}`,
      status: rolbezetting.status
    });
  });

  return Array.from(itemsByMomentId.values()).sort((first, second) => {
    const firstTime = first.startsAt ? new Date(first.startsAt).getTime() : 0;
    const secondTime = second.startsAt ? new Date(second.startsAt).getTime() : 0;

    return firstTime - secondTime;
  });
}
