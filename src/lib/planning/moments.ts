import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

export type PlanningFilterParams = {
  dateFrom?: string | null;
  dateTo?: string | null;
  categoryId?: string | null;
  groupId?: string | null;
  status?: Tables<"momenten">["status"] | null;
};

export type PlanningCategoryOption = {
  id: string;
  name: string;
};

export type PlanningGroupOption = {
  id: string;
  name: string;
};

export const PLANNING_MOMENT_STATUSES: ReadonlyArray<
  Tables<"momenten">["status"]
> = [
  "concept",
  "gepland",
  "open",
  "vol",
  "gewijzigd",
  "geannuleerd",
  "afgerond",
  "gearchiveerd"
];

type MomentRow = Pick<
  Tables<"momenten">,
  | "id"
  | "titel"
  | "beschrijving"
  | "start_at"
  | "eind_at"
  | "hele_dag"
  | "locatie"
  | "status"
>;

type MomentWithCategory = MomentRow & {
  categorieen:
    | Pick<Tables<"categorieen">, "id" | "naam" | "entiteit_type">
    | null;
  moment_groepen: Pick<Tables<"moment_groepen">, "groep_id">[] | null;
};

export type PlanningMoment = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isAllDay: boolean;
  location: string | null;
  status: Tables<"momenten">["status"];
  categoryName: string | null;
  categoryId: string | null;
  groupIds: string[];
};

function toStartOfDayIso(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toEndOfDayIso(date: string) {
  const parsed = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeFilters(filters: PlanningFilterParams) {
  return {
    categoryId: filters.categoryId ?? null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    groupId: filters.groupId ?? null,
    status: filters.status ?? null
  };
}

export async function fetchPlanningFilterCategories(): Promise<
  PlanningCategoryOption[]
> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("categorieen")
    .select("id, naam")
    .eq("entiteit_type", "moment")
    .eq("status", "actief")
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((categorie) => ({
    id: categorie.id,
    name: categorie.naam
  }));
}

export async function fetchPlanningFilterGroups(): Promise<PlanningGroupOption[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("groepen")
    .select("id, naam")
    .eq("status", "actief")
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((groep) => ({
    id: groep.id,
    name: groep.naam
  }));
}

export async function fetchPlanningMoments(
  filters: PlanningFilterParams = {}
): Promise<PlanningMoment[]> {
  const supabase = getSupabaseBrowserClient();
  const normalizedFilters = normalizeFilters(filters);
  let query = supabase
    .from("momenten")
    .select(
      `
        id,
        titel,
        beschrijving,
        start_at,
        eind_at,
        hele_dag,
        locatie,
        status,
        categorieen (
          id,
          naam,
          entiteit_type
        ),
        moment_groepen (
          groep_id
        )
      `
    )
    .order("start_at", { ascending: true });

  if (normalizedFilters.categoryId) {
    query = query.eq("categorie_id", normalizedFilters.categoryId);
  }

  if (normalizedFilters.status) {
    query = query.eq("status", normalizedFilters.status);
  }

  const startDate = normalizedFilters.dateFrom
    ? toStartOfDayIso(normalizedFilters.dateFrom)
    : null;
  if (startDate) {
    query = query.gte("start_at", startDate);
  }

  const endDate = normalizedFilters.dateTo
    ? toEndOfDayIso(normalizedFilters.dateTo)
    : null;
  if (endDate) {
    query = query.lte("start_at", endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).filter((moment) => {
    if (moment.categorieen?.entiteit_type !== "moment") {
      return false;
    }

    if (!normalizedFilters.groupId) {
      return true;
    }

    return (moment.moment_groepen ?? []).some(
      (group) => group.groep_id === normalizedFilters.groupId
    );
  });

  return rows.map((moment) => ({
    id: moment.id,
    title: moment.titel,
    description: moment.beschrijving,
    startsAt: moment.start_at,
    endsAt: moment.eind_at,
    isAllDay: moment.hele_dag,
    location: moment.locatie,
    status: moment.status,
    categoryName: moment.categorieen?.naam ?? null,
    categoryId: moment.categorieen?.id ?? null,
    groupIds: (moment.moment_groepen ?? []).map((group) => group.groep_id)
  }));
}
