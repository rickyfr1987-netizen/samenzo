import { getSupabaseBrowserClient } from "@/src/lib/supabase/client"

import type { Tables } from "@/src/lib/database.types"

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
>

type MomentWithCategory = MomentRow & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null
}

export type PlanningMoment = {
  id: string
  title: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  isAllDay: boolean
  location: string | null
  status: Tables<"momenten">["status"]
  categoryName: string | null
}

export async function fetchPlanningMoments(): Promise<PlanningMoment[]> {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
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
          naam
        )
      `,
    )
    .order("start_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as MomentWithCategory[]).map((moment) => ({
    id: moment.id,
    title: moment.titel,
    description: moment.beschrijving,
    startsAt: moment.start_at,
    endsAt: moment.eind_at,
    isAllDay: moment.hele_dag,
    location: moment.locatie,
    status: moment.status,
    categoryName: moment.categorieen?.naam ?? null,
  }))
}
