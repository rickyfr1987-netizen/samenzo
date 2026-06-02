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
  type: "deelname" | "rolbezetting";
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
  status: Tables<"momenten">["status"];
  categoryName: string | null;
  reasons: MijnDagItemReason[];
};

const MIJN_DAG_REASON_PRIORITY: Record<MijnDagItemReason["type"], number> = {
  deelname: 1,
  rolbezetting: 2
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

function upsertMomentItem(
  itemsByMomentId: Map<string, MijnDagItem>,
  moment: MomentForMijnDag,
  reason: MijnDagItemReason
) {
  const existingItem = itemsByMomentId.get(moment.id);

  if (existingItem) {
    const currentPriority = existingItem.reasons[0]
      ? MIJN_DAG_REASON_PRIORITY[existingItem.reasons[0].type]
      : 0;
    const nextPriority = MIJN_DAG_REASON_PRIORITY[reason.type];

    if (nextPriority > currentPriority) {
      existingItem.reasons = [reason];
      return;
    }

    if (nextPriority === currentPriority) {
      existingItem.reasons.push(reason);
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
