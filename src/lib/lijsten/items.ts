import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type LinkedMomentRow = Pick<
  Tables<"momenten">,
  "id" | "titel" | "start_at" | "hele_dag" | "status"
>;

type SummaryTaskAssigneeRow = Pick<Tables<"taakuitvoerders">, "id" | "status">;

type SummaryTaskRow = Pick<Tables<"taken">, "id" | "status"> & {
  taakuitvoerders: SummaryTaskAssigneeRow[] | null;
};

type TaskAssigneeRow = Pick<
  Tables<"taakuitvoerders">,
  "id" | "profiel_id" | "status"
> & {
  profielen: Pick<Tables<"profielen">, "id" | "weergavenaam" | "status"> | null;
};

type TaskRow = Pick<
  Tables<"taken">,
  | "id"
  | "titel"
  | "beschrijving"
  | "status"
  | "sort_order"
  | "deadline_at"
> & {
  taakuitvoerders: TaskAssigneeRow[] | null;
};

type ListSummaryRow = Pick<
  Tables<"lijsten">,
  | "id"
  | "titel"
  | "beschrijving"
  | "status"
  | "gekoppeld_moment_id"
  | "created_at"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
  momenten: LinkedMomentRow | null;
  taken: SummaryTaskRow[] | null;
};

type ListDetailRow = Omit<ListSummaryRow, "taken"> & {
  taken: TaskRow[] | null;
};

export type LijstTaskAssignee = {
  id: string;
  profileId: string;
  profileName: string;
  profileStatus: Tables<"profielen">["status"] | null;
  status: Tables<"taakuitvoerders">["status"];
};

export type LijstTask = {
  id: string;
  title: string;
  description: string | null;
  status: Tables<"taken">["status"];
  sortOrder: number | null;
  deadlineAt: string | null;
  assignees: LijstTaskAssignee[];
};

export type LijstSummary = {
  id: string;
  title: string;
  description: string | null;
  status: Tables<"lijsten">["status"];
  categoryName: string | null;
  linkedMoment: {
    id: string;
    title: string;
    startsAt: string | null;
    isAllDay: boolean;
    status: Tables<"momenten">["status"];
  } | null;
  taskCount: number;
  claimedTaskCount: number;
  completedTaskCount: number;
};

export type VisibleLijst = LijstSummary;

export type LijstDetail = LijstSummary & {
  tasks: LijstTask[];
};

const LIST_SUMMARY_SELECT = `
  id,
  titel,
  beschrijving,
  status,
  gekoppeld_moment_id,
  created_at,
  categorieen (
    naam
  ),
  momenten!lijsten_gekoppeld_moment_id_fkey (
    id,
    titel,
    start_at,
    hele_dag,
    status
  ),
  taken (
    id,
    status,
    taakuitvoerders (
      id,
      status
    )
  )
`;

const LIST_DETAIL_SELECT = `
  id,
  titel,
  beschrijving,
  status,
  gekoppeld_moment_id,
  created_at,
  categorieen (
    naam
  ),
  momenten!lijsten_gekoppeld_moment_id_fkey (
    id,
    titel,
    start_at,
    hele_dag,
    status
  ),
  taken (
    id,
    titel,
    beschrijving,
    status,
    sort_order,
    deadline_at,
    taakuitvoerders (
      id,
      profiel_id,
      status,
      profielen (
        id,
        weergavenaam,
        status
      )
    )
  )
`;

export async function fetchVisibleLijsten(): Promise<VisibleLijst[]> {
  return fetchLijstSummaries();
}

export async function fetchLijstenForMoment(
  momentId: string
): Promise<VisibleLijst[]> {
  return fetchLijstSummaries(momentId);
}

export async function fetchLijstDetail(
  lijstId: string
): Promise<LijstDetail | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("lijsten")
    .select(LIST_DETAIL_SELECT)
    .eq("id", lijstId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapListDetailRow(data as ListDetailRow) : null;
}

async function fetchLijstSummaries(
  momentId?: string
): Promise<LijstSummary[]> {
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("lijsten")
    .select(LIST_SUMMARY_SELECT)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (momentId) {
    query = query.eq("gekoppeld_moment_id", momentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ListSummaryRow[]).map(mapListSummaryRow);
}

function mapListSummaryRow(list: ListSummaryRow): LijstSummary {
  const tasks = list.taken ?? [];

  return {
    id: list.id,
    title: list.titel,
    description: list.beschrijving,
    status: list.status,
    categoryName: list.categorieen?.naam ?? null,
    linkedMoment: list.momenten
      ? {
          id: list.momenten.id,
          title: list.momenten.titel,
          startsAt: list.momenten.start_at,
          isAllDay: list.momenten.hele_dag,
          status: list.momenten.status
        }
      : null,
    taskCount: tasks.length,
    claimedTaskCount: countClaimedTasks(tasks),
    completedTaskCount: tasks.filter((task) => task.status === "afgerond")
      .length
  };
}

function mapListDetailRow(list: ListDetailRow): LijstDetail {
  const sortedTasks = (list.taken ?? [])
    .map(mapTaskRow)
    .sort((first, second) => {
      const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.title.localeCompare(second.title, "nl");
    });
  const summary = mapListSummaryRow({
    ...list,
    taken: list.taken?.map((task) => ({
      id: task.id,
      status: task.status,
      taakuitvoerders: task.taakuitvoerders?.map((assignee) => ({
        id: assignee.id,
        status: assignee.status
      })) ?? null
    })) ?? null
  });

  return {
    ...summary,
    tasks: sortedTasks
  };
}

function mapTaskRow(task: TaskRow): LijstTask {
  return {
    id: task.id,
    title: task.titel,
    description: task.beschrijving,
    status: task.status,
    sortOrder: task.sort_order,
    deadlineAt: task.deadline_at,
    assignees: (task.taakuitvoerders ?? []).map((assignee) => ({
      id: assignee.id,
      profileId: assignee.profiel_id,
      profileName: assignee.profielen?.weergavenaam ?? "Onbekend profiel",
      profileStatus: assignee.profielen?.status ?? null,
      status: assignee.status
    }))
  };
}

function countClaimedTasks(tasks: SummaryTaskRow[]) {
  return tasks.filter((task) =>
    (task.taakuitvoerders ?? []).some(
      (assignee) => assignee.status === "actief"
    )
  ).length;
}
