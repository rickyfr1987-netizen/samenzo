import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type DocumentCategoryRow = Pick<Tables<"categorieen">, "naam">;
type DocumentLinkRow = Pick<
  Tables<"document_koppelingen">,
  "id" | "gekoppeld_type" | "gekoppeld_id"
>;

type DocumentRow = Pick<
  Tables<"documenten">,
  | "id"
  | "titel"
  | "samenvatting"
  | "inhoud"
  | "status"
  | "created_at"
  | "updated_at"
> & {
  categorieen: DocumentCategoryRow | null;
      document_groepen:
    | (Pick<Tables<"document_groepen">, "id"> & {
        groepen:
          | (Pick<
              Tables<"groepen">,
              "id" | "naam" | "status" | "zichtbaarheid"
            > & {
              status: Tables<"groepen">["status"] | null;
            })
          | null;
      })[]
    | null;
  document_koppelingen:
    | DocumentLinkRow[]
    | null;
};

type LinkedMomentRow = Pick<
  Tables<"momenten">,
  "id" | "titel" | "status"
>;

type LinkedListRow = Pick<
  Tables<"lijsten">,
  "id" | "titel" | "status"
>;

type LinkedGoalRow = Pick<
  Tables<"doelen">,
  "id" | "titel" | "status"
>;

type SupportedLinkedType = "moment" | "lijst" | "doel";

const LINK_TYPE_MOMENT = "moment";
const LINK_TYPE_LIJST = "lijst";
const LINK_TYPE_DOEL = "doel";

export type DocumentenGroup = {
  id: string;
  groupId: string;
  name: string;
  status: Tables<"groepen">["status"];
  visibility: Tables<"groepen">["zichtbaarheid"];
};

export type DocumentenLink = {
  id: string;
  linkType: SupportedLinkedType;
  linkedId: string;
  title: string;
  status: string | null;
  href: string | null;
  isVisible: boolean;
};

export type DocumentSummary = {
  id: string;
  title: string;
  summary: string | null;
  status: Tables<"documenten">["status"];
  categoryName: string | null;
  createdAt: string;
  updatedAt: string | null;
  groups: DocumentenGroup[];
};

export type DocumentDetail = DocumentSummary & {
  body: string;
  links: DocumentenLink[];
};

export async function fetchVisibleDocumenten(): Promise<DocumentSummary[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("documenten")
    .select(
      `
        id,
        titel,
        samenvatting,
        inhoud,
        status,
        created_at,
        updated_at,
        categorieen (
          naam
        ),
        document_groepen (
          id,
          groep_id,
          groepen (
            id,
            naam,
            status,
            zichtbaarheid
          )
        ),
        document_koppelingen (
          id,
          gekoppeld_type,
          gekoppeld_id
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DocumentRow[]).map((row) => mapDocumentRowToSummary(row));
}

export async function fetchDocumentById(
  documentId: string
): Promise<DocumentDetail | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("documenten")
    .select(
      `
        id,
        titel,
        samenvatting,
        inhoud,
        status,
        created_at,
        updated_at,
        categorieen (
          naam
        ),
        document_groepen (
          id,
          groep_id,
          groepen (
            id,
            naam,
            status,
            zichtbaarheid
          )
        ),
        document_koppelingen (
          id,
          gekoppeld_type,
          gekoppeld_id
        )
      `
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as DocumentRow;
  const links = await hydrateDocumentLinks(row.document_koppelingen ?? []);

  return {
    ...mapDocumentRowToSummary(row),
    body: row.inhoud,
    links
  };
}

async function hydrateDocumentLinks(
  links: DocumentLinkRow[]
) {
  const momentIds = collectLinkedIds(links, LINK_TYPE_MOMENT);
  const listIds = collectLinkedIds(links, LINK_TYPE_LIJST);
  const goalIds = collectLinkedIds(links, LINK_TYPE_DOEL);

  const supabase = getSupabaseBrowserClient();

  const [momentResult, listResult, goalResult] = await Promise.all([
    momentIds.length > 0
      ? supabase
          .from("momenten")
          .select("id, titel, status, start_at, hele_dag")
          .in("id", momentIds)
      : Promise.resolve({ data: [] as LinkedMomentRow[], error: null }),
    listIds.length > 0
      ? supabase
          .from("lijsten")
          .select("id, titel, status")
          .in("id", listIds)
      : Promise.resolve({ data: [] as LinkedListRow[], error: null }),
    goalIds.length > 0
      ? supabase
          .from("doelen")
          .select("id, titel, status")
          .in("id", goalIds)
      : Promise.resolve({ data: [] as LinkedGoalRow[], error: null })
  ]);

  if (momentResult.error) {
    throw new Error(momentResult.error.message);
  }

  if (listResult.error) {
    throw new Error(listResult.error.message);
  }

  if (goalResult.error) {
    throw new Error(goalResult.error.message);
  }

  const momentMap = new Map<string, LinkedMomentRow>(
    (momentResult.data ?? []).map((moment) => [moment.id, moment])
  );
  const listMap = new Map<string, LinkedListRow>(
    (listResult.data ?? []).map((list) => [list.id, list])
  );
  const goalMap = new Map<string, LinkedGoalRow>(
    (goalResult.data ?? []).map((goal) => [goal.id, goal])
  );

  const hydrated: DocumentenLink[] = [];

  for (const link of links) {
    const type = normalizeLinkType(link.gekoppeld_type);

    if (!type) {
      continue;
    }

    if (type === LINK_TYPE_MOMENT) {
      const moment = momentMap.get(link.gekoppeld_id);

      hydrated.push({
        id: link.id,
        linkType: type,
        linkedId: link.gekoppeld_id,
        title: moment?.titel ?? "Moment niet zichtbaar",
        status: moment?.status ?? null,
        href: moment ? `/planning/${moment.id}` : null,
        isVisible: Boolean(moment)
      });

      continue;
    }

    if (type === LINK_TYPE_LIJST) {
      const list = listMap.get(link.gekoppeld_id);

      hydrated.push({
        id: link.id,
        linkType: type,
        linkedId: link.gekoppeld_id,
        title: list?.titel ?? "Lijst niet zichtbaar",
        status: list?.status ?? null,
        href: list ? `/lijsten/${list.id}` : null,
        isVisible: Boolean(list)
      });

      continue;
    }

    const goal = goalMap.get(link.gekoppeld_id);
    hydrated.push({
      id: link.id,
      linkType: type,
      linkedId: link.gekoppeld_id,
      title: goal?.titel ?? "Doel niet zichtbaar",
      status: goal?.status ?? null,
      href: null,
      isVisible: Boolean(goal)
    });
  }

  return hydrated;
}

function collectLinkedIds(
  links: DocumentLinkRow[],
  linkType: SupportedLinkedType
) {
  return links
    .filter(
      (link) => normalizeLinkType(link.gekoppeld_type) === linkType
    )
    .map((link) => link.gekoppeld_id);
}

function normalizeLinkType(
  rawType: string | null
): SupportedLinkedType | null {
  if (rawType === LINK_TYPE_MOMENT || rawType === LINK_TYPE_LIJST || rawType === LINK_TYPE_DOEL) {
    return rawType;
  }

  return null;
}

function mapDocumentRowToSummary(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    title: row.titel,
    summary: row.samenvatting,
    status: row.status,
    categoryName: row.categorieen?.naam ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    groups: (row.document_groepen ?? [])
      .filter((groupRelation) => groupRelation.groepen)
      .map((groupRelation) => ({
        id: groupRelation.id,
        groupId: groupRelation.groepen!.id,
        name: groupRelation.groepen!.naam,
        status: groupRelation.groepen!.status,
        visibility: groupRelation.groepen!.zichtbaarheid
      }))
  };
}

export function formatDocumentStatus(status: string) {
  return status.replaceAll("_", " ");
}
