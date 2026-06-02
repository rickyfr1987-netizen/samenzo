import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type GoalSummaryRow = Pick<
  Tables<"doelen">,
  | "id"
  | "titel"
  | "beschrijving"
  | "status"
  | "start_at"
  | "eind_at"
  | "created_at"
  | "updated_at"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
  eigenaar_profiel: Pick<
    Tables<"profielen">,
    "id" | "weergavenaam" | "status"
  > | null;
  eigenaar_groep: Pick<
    Tables<"groepen">,
    "id" | "naam" | "status" | "zichtbaarheid"
  > | null;
};

type GoalRow = Pick<
  Tables<"doelen">,
  | "id"
  | "titel"
  | "beschrijving"
  | "status"
  | "start_at"
  | "eind_at"
  | "created_at"
  | "updated_at"
  | "archived_at"
> & GoalSummaryRow & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
  eigenaar_profiel: Pick<
    Tables<"profielen">,
    "id" | "weergavenaam" | "status"
  > | null;
  eigenaar_groep: Pick<
    Tables<"groepen">,
    "id" | "naam" | "status" | "zichtbaarheid"
  > | null;
};

type GoalLinkRow = Pick<
  Tables<"doel_koppelingen">,
  "id" | "gekoppeld_type" | "gekoppeld_id"
>;

type LinkedMomentRow = Pick<
  Tables<"momenten">,
  "id" | "titel" | "status" | "start_at" | "hele_dag"
>;

type LinkedListRow = Pick<
  Tables<"lijsten">,
  "id" | "titel" | "beschrijving" | "status"
>;

type LinkedTaskRow = Pick<
  Tables<"taken">,
  "id" | "lijst_id" | "titel" | "beschrijving" | "status" | "sort_order" | "deadline_at"
>;

const GOAL_LINK_TYPE_MOMENT = "moment";
const GOAL_LINK_TYPE_LIST = "lijst";

type SupportedGoalLinkType = typeof GOAL_LINK_TYPE_MOMENT | typeof GOAL_LINK_TYPE_LIST;

const DOEL_DETAIL_SELECT = `
  id,
  titel,
  beschrijving,
  status,
  start_at,
  eind_at,
  created_at,
  updated_at,
  archived_at,
  categorieen (naam),
  eigenaar_profiel:profielen!doelen_eigenaar_profiel_id_fkey (
    id,
    weergavenaam,
    status
  ),
  eigenaar_groep:groepen!doelen_eigenaar_groep_id_fkey (
    id,
    naam,
    status,
    zichtbaarheid
  )
`;

export type GoalOwnerProfile = {
  id: string;
  displayName: string;
  status: Tables<"profielen">["status"];
  kind: "profiel";
};

export type GoalOwnerGroup = {
  id: string;
  name: string;
  status: Tables<"groepen">["status"];
  visibility: Tables<"groepen">["zichtbaarheid"];
  kind: "groep";
};

type GoalOwner = GoalOwnerProfile | GoalOwnerGroup;

export type DoelenSamenvatting = {
  id: string;
  title: string;
  description: string | null;
  status: Tables<"doelen">["status"];
  categoryName: string | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  owner: GoalOwner | null;
};

export type DoelLinkedTask = {
  id: string;
  title: string;
  description: string | null;
  status: Tables<"taken">["status"];
  sortOrder: number | null;
  deadlineAt: string | null;
};

export type DoelLinkedMoment = {
  id: string;
  title: string;
  status: Tables<"momenten">["status"];
  startsAt: string | null;
  isAllDay: boolean;
};

export type DoelLinkedList = {
  id: string;
  title: string;
  description: string | null;
  status: Tables<"lijsten">["status"];
  tasks: DoelLinkedTask[];
};

export type DoelenDetail = DoelenSamenvatting & {
  links: {
    moments: DoelLinkedMoment[];
    lists: DoelLinkedList[];
  };
};

export async function fetchVisibleDoelen(): Promise<DoelenSamenvatting[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("doelen")
    .select(
      `
        id,
        titel,
        beschrijving,
        status,
        start_at,
        eind_at,
        created_at,
        updated_at,
        categorieen (naam),
        eigenaar_profiel:profielen!doelen_eigenaar_profiel_id_fkey (
          id,
          weergavenaam,
          status
        ),
        eigenaar_groep:groepen!doelen_eigenaar_groep_id_fkey (
          id,
          naam,
          status,
          zichtbaarheid
        )
      `
    )
    .is("archived_at", null)
    .neq("status", "gearchiveerd")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as GoalSummaryRow[]).map(mapGoalSummaryRow);
}

export async function fetchDoelById(
  goalId: string
): Promise<DoelenDetail | null> {
  const supabase = getSupabaseBrowserClient();

  const [{ data: goalData, error: goalError }, { data: linkRows, error: linksError }] =
    await Promise.all([
      supabase
        .from("doelen")
        .select(DOEL_DETAIL_SELECT)
        .eq("id", goalId)
        .is("archived_at", null)
        .neq("status", "gearchiveerd")
        .maybeSingle(),
      supabase
        .from("doel_koppelingen")
        .select("id, gekoppeld_type, gekoppeld_id")
        .eq("doel_id", goalId)
        .order("created_at", { ascending: true })
    ]);

  if (goalError) {
    throw new Error(goalError.message);
  }

  if (!goalData) {
    return null;
  }

  if (linksError) {
    throw new Error(linksError.message);
  }

  const goal = goalData as GoalRow;
  const summary = mapGoalSummaryRow(goal);
  const links = (linkRows ?? []) as GoalLinkRow[];
  const normalizedLinks = links.filter((link) =>
    isSupportedGoalLinkType(link.gekoppeld_type)
  );

  const linkedMoments = collectLinkedIds(
    normalizedLinks,
    GOAL_LINK_TYPE_MOMENT
  );
  const linkedLists = collectLinkedIds(normalizedLinks, GOAL_LINK_TYPE_LIST);

  const [momentRows, listRows, taskRows] = await Promise.all([
    linkedMoments.length > 0
      ? supabase
          .from("momenten")
          .select("id, titel, status, start_at, hele_dag")
          .in("id", linkedMoments)
      : Promise.resolve({ data: [] as LinkedMomentRow[], error: null }),
    linkedLists.length > 0
      ? supabase
          .from("lijsten")
          .select("id, titel, beschrijving, status")
          .in("id", linkedLists)
      : Promise.resolve({ data: [] as LinkedListRow[], error: null }),
    linkedLists.length > 0
      ? supabase
          .from("taken")
          .select(
            "id, lijst_id, titel, beschrijving, status, sort_order, deadline_at"
          )
          .in("lijst_id", linkedLists)
          .is("archived_at", null)
      : Promise.resolve({ data: [] as LinkedTaskRow[], error: null })
  ]);

  if (momentRows.error) {
    throw new Error(momentRows.error.message);
  }

  if (listRows.error) {
    throw new Error(listRows.error.message);
  }

  if (taskRows.error) {
    throw new Error(taskRows.error.message);
  }

  const taskMap = new Map<string, DoelLinkedTask[]>();
  for (const task of taskRows.data ?? []) {
    const listTasks = taskMap.get(task.lijst_id) ?? [];
    listTasks.push({
      id: task.id,
      title: task.titel,
      description: task.beschrijving,
      status: task.status,
      sortOrder: task.sort_order,
      deadlineAt: task.deadline_at
    });
    taskMap.set(task.lijst_id, listTasks);
  }

  const moments: DoelLinkedMoment[] = ((momentRows.data ?? []) as LinkedMomentRow[]).map(
    (moment) => ({
      id: moment.id,
      title: moment.titel,
      status: moment.status,
      startsAt: moment.start_at,
      isAllDay: moment.hele_dag
    })
  );

  const lists: DoelLinkedList[] = ((listRows.data ?? []) as LinkedListRow[]).map((list) => ({
    id: list.id,
    title: list.titel,
    description: list.beschrijving,
    status: list.status,
    tasks: (taskMap.get(list.id) ?? [])
      .sort((first, second) => {
        const firstSort = first.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const secondSort = second.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (firstSort !== secondSort) {
          return firstSort - secondSort;
        }
        return first.title.localeCompare(second.title, "nl");
      })
  }));

  return {
    ...summary,
    links: {
      moments,
      lists
    }
  };
}

function collectLinkedIds(links: GoalLinkRow[], linkedType: SupportedGoalLinkType) {
  return links
    .filter((link) => link.gekoppeld_type === linkedType)
    .map((link) => link.gekoppeld_id);
}

function isSupportedGoalLinkType(
  rawType: string | null
): rawType is SupportedGoalLinkType {
  return rawType === GOAL_LINK_TYPE_MOMENT || rawType === GOAL_LINK_TYPE_LIST;
}

export function formatDoelStatus(status: string) {
  return status.replaceAll("_", " ");
}

function mapGoalSummaryRow(goal: GoalSummaryRow): DoelenSamenvatting {
  return {
    id: goal.id,
    title: goal.titel,
    description: goal.beschrijving,
    status: goal.status,
    categoryName: goal.categorieen?.naam ?? null,
    startAt: goal.start_at,
    endAt: goal.eind_at,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    owner: mapGoalOwner(goal.eigenaar_profiel, goal.eigenaar_groep)
  };
}

function mapGoalOwner(
  profile: GoalSummaryRow["eigenaar_profiel"],
  group: GoalSummaryRow["eigenaar_groep"]
): GoalOwner | null {
  if (profile) {
    return {
      id: profile.id,
      displayName: profile.weergavenaam,
      status: profile.status,
      kind: "profiel"
    };
  }

  if (group) {
    return {
      id: group.id,
      name: group.naam,
      status: group.status,
      visibility: group.zichtbaarheid,
      kind: "groep"
    };
  }

  return null;
}
