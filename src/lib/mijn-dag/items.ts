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

type DocumentAttentionTimelineRow = Pick<
  Tables<"tijdlijnberichten">,
  | "id"
  | "status"
  | "created_at"
  | "gericht_aan_profiel_id"
  | "gekoppeld_type"
  | "gekoppeld_id"
>;

type DocumentAttentionSignalRow = Pick<
  Tables<"signalen">,
  | "id"
  | "status"
  | "created_at"
  | "gericht_aan_profiel_id"
  | "gekoppeld_type"
  | "gekoppeld_id"
>;

type DocumentForMijnDag = Pick<
  Tables<"documenten">,
  "id" | "titel" | "samenvatting" | "status"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
};

const MIJN_DAG_PERSONAL_MOMENT_STATUSES: Tables<"momenten">["status"][] = [
  "gepland",
  "open",
  "vol",
  "gewijzigd"
];

const MIJN_DAG_DEELNAME_STATUSES: Tables<"deelnames">["status"][] = [
  "voorgesteld",
  "uitgenodigd",
  "geaccepteerd",
  "ingeschreven",
  "wachtlijst"
];

const MIJN_DAG_TIMELINE_DOCUMENT_ATTENTION_STATUSES: Tables<"tijdlijnberichten">["status"][] =
  ["nieuw", "actie_nodig"];

const MIJN_DAG_SIGNAL_DOCUMENT_ATTENTION_STATUSES: Tables<"signalen">["status"][] =
  ["nieuw", "zichtbaar", "actie_nodig"];

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
  type:
    | "persoonlijk_moment"
    | "deelname"
    | "rolbezetting"
    | "voorstel"
    | "taak"
    | "aandacht";
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

export type MijnDagDocumentAttentionItem = MijnDagItem & {
  documentId: string;
  source: "tijdlijnbericht" | "signaal";
  sourceId: string;
};

const MIJN_DAG_REASON_PRIORITY: Record<MijnDagItemReason["type"], number> = {
  persoonlijk_moment: 1,
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

function isTimestampOnDay(value: string | null, day: Date) {
  if (!value) {
    return false;
  }

  const { start, end } = getLocalDayRange(day);
  const timestamp = new Date(value);

  return timestamp >= start && timestamp < end;
}

function collectDocumentAttentionIds(
  timelineRows: DocumentAttentionTimelineRow[],
  signalRows: DocumentAttentionSignalRow[],
  profielId: string,
  day: Date
) {
  return [
    ...new Set(
      [
        ...timelineRows
          .filter((row) => isActiveTimelineDocumentAttention(row, profielId, day))
          .map((row) => row.gekoppeld_id)
          .filter((documentId): documentId is string => Boolean(documentId)),
        ...signalRows
          .filter((row) => isActiveSignalDocumentAttention(row, profielId, day))
          .map((row) => row.gekoppeld_id)
          .filter((documentId): documentId is string => Boolean(documentId))
      ]
    )
  ];
}

function isActiveTimelineDocumentAttention(
  row: DocumentAttentionTimelineRow,
  profielId: string,
  day: Date
) {
  return (
    row.gericht_aan_profiel_id === profielId &&
    row.gekoppeld_type === "document" &&
    row.gekoppeld_id !== null &&
    MIJN_DAG_TIMELINE_DOCUMENT_ATTENTION_STATUSES.includes(row.status) &&
    isTimestampOnDay(row.created_at, day)
  );
}

function isActiveSignalDocumentAttention(
  row: DocumentAttentionSignalRow,
  profielId: string,
  day: Date
) {
  return (
    row.gericht_aan_profiel_id === profielId &&
    row.gekoppeld_type === "document" &&
    row.gekoppeld_id !== null &&
    MIJN_DAG_SIGNAL_DOCUMENT_ATTENTION_STATUSES.includes(row.status) &&
    isTimestampOnDay(row.created_at, day)
  );
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

export async function fetchMijnDagDocumentAttentionItems(
  profielId: string,
  day: Date
): Promise<MijnDagDocumentAttentionItem[]> {
  const supabase = getSupabaseBrowserClient();

  const [timelineResult, signalResult] = await Promise.all([
    supabase
      .from("tijdlijnberichten")
      .select(
        "id, status, created_at, gericht_aan_profiel_id, gekoppeld_type, gekoppeld_id"
      )
      .eq("gericht_aan_profiel_id", profielId)
      .eq("gekoppeld_type", "document")
      .in("status", MIJN_DAG_TIMELINE_DOCUMENT_ATTENTION_STATUSES)
      .is("archived_at", null),
    supabase
      .from("signalen")
      .select(
        "id, status, created_at, gericht_aan_profiel_id, gekoppeld_type, gekoppeld_id"
      )
      .eq("gericht_aan_profiel_id", profielId)
      .eq("gekoppeld_type", "document")
      .in("status", MIJN_DAG_SIGNAL_DOCUMENT_ATTENTION_STATUSES)
      .is("archived_at", null)
  ]);

  if (timelineResult.error) {
    throw new Error(timelineResult.error.message);
  }

  if (signalResult.error) {
    throw new Error(signalResult.error.message);
  }

  const timelineRows = (timelineResult.data ?? []) as DocumentAttentionTimelineRow[];
  const signalRows = (signalResult.data ?? []) as DocumentAttentionSignalRow[];
  const documentIds = collectDocumentAttentionIds(
    timelineRows,
    signalRows,
    profielId,
    day
  );

  if (documentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("documenten")
    .select(
      `
        id,
        titel,
        samenvatting,
        status,
        categorieen (
          naam
        )
      `
    )
    .in("id", documentIds);

  if (error) {
    throw new Error(error.message);
  }

  const documentsById = new Map<string, DocumentForMijnDag>(
    ((data ?? []) as DocumentForMijnDag[]).map((document) => [
      document.id,
      document
    ])
  );

  const timelineItems = timelineRows
    .filter((row) => isActiveTimelineDocumentAttention(row, profielId, day))
    .map((row) =>
      mapDocumentAttentionRow({
        document: documentsById.get(row.gekoppeld_id ?? ""),
        source: "tijdlijnbericht",
        sourceId: row.id,
        status: row.status,
        createdAt: row.created_at
      })
    );

  const signalItems = signalRows
    .filter((row) => isActiveSignalDocumentAttention(row, profielId, day))
    .map((row) =>
      mapDocumentAttentionRow({
        document: documentsById.get(row.gekoppeld_id ?? ""),
        source: "signaal",
        sourceId: row.id,
        status: row.status,
        createdAt: row.created_at
      })
    );

  return [...timelineItems, ...signalItems]
    .filter((item): item is MijnDagDocumentAttentionItem => item !== null)
    .sort((first, second) => {
      const firstTime = first.startsAt
        ? new Date(first.startsAt).getTime()
        : 0;
      const secondTime = second.startsAt
        ? new Date(second.startsAt).getTime()
        : 0;

      return firstTime - secondTime;
    });
}

function mapDocumentAttentionRow({
  createdAt,
  document,
  source,
  sourceId,
  status
}: {
  createdAt: string;
  document: DocumentForMijnDag | undefined;
  source: MijnDagDocumentAttentionItem["source"];
  sourceId: string;
  status: string;
}): MijnDagDocumentAttentionItem | null {
  if (!document) {
    return null;
  }

  return {
    id: `${source}-${sourceId}`,
    documentId: document.id,
    source,
    sourceId,
    title: document.titel,
    description: document.samenvatting,
    startsAt: createdAt,
    endsAt: null,
    isAllDay: false,
    location: null,
    status,
    categoryName: document.categorieen?.naam ?? "Document",
    reasons: [
      {
        type: "aandacht",
        label: "Document onder aandacht",
        status
      }
    ]
  };
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

  const [deelnamesResult, rolbezettingenResult, persoonlijkeMomentenResult] =
    await Promise.all([
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
        .eq("status", "actief"),
      supabase
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
        `
        )
        .eq("eigenaar_profiel_id", profielId)
        .is("archived_at", null)
        .in("status", MIJN_DAG_PERSONAL_MOMENT_STATUSES)
    ]);

  if (deelnamesResult.error) {
    throw new Error(deelnamesResult.error.message);
  }

  if (rolbezettingenResult.error) {
    throw new Error(rolbezettingenResult.error.message);
  }

  if (persoonlijkeMomentenResult.error) {
    throw new Error(persoonlijkeMomentenResult.error.message);
  }

  const itemsByMomentId = new Map<string, MijnDagItem>();

  ((persoonlijkeMomentenResult.data ?? []) as MomentForMijnDag[]).forEach(
    (moment) => {
      if (
        !MIJN_DAG_PERSONAL_MOMENT_STATUSES.includes(moment.status) ||
        !isMomentOnDay(moment, day)
      ) {
        return;
      }

      upsertMomentItem(itemsByMomentId, moment, {
        type: "persoonlijk_moment",
        label: "Persoonlijk moment",
        status: moment.status
      });
    }
  );

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
