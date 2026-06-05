import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
  fetchMijnDagDocumentAttentionItems,
  fetchMijnDagGoalAttentionItems,
  fetchMijnDagItems,
  fetchMijnDagTaskItems
} from "@/src/lib/mijn-dag/items";

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

type QueryPayload = {
  data: unknown;
  error: null | { message: string };
};

type TableQuerySequence = Record<string, QueryPayload[]>;

function createQueryMock(payload: QueryPayload) {
  const query = {
    data: payload.data,
    error: payload.error,
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    neq: vi.fn(() => query),
    order: vi.fn(() => query)
  };

  return query;
}

function createFromMock(payloadByTable: TableQuerySequence) {
  const tableCalls = new Map<string, number>();

  return vi.fn().mockImplementation((table: string) => {
    const index = tableCalls.get(table) ?? 0;
    tableCalls.set(table, index + 1);

    const payloads = payloadByTable[table];
    if (!payloads || !payloads[index]) {
      throw new Error(`Unexpected query for table: ${table}`);
    }

    return createQueryMock(payloads[index]);
  });
}

const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);
const selectedDay = new Date(2026, 5, 10);

function createMoment(overrides: Record<string, unknown> = {}) {
  return {
    id: "moment-1",
    titel: "Ochtendwandeling",
    beschrijving: "Rustige wandeling op de gekozen dag.",
    start_at: "2026-06-10T09:00:00.000Z",
    eind_at: "2026-06-10T10:00:00.000Z",
    hele_dag: false,
    locatie: "Park",
    status: "open",
    categorieen: { naam: "Activiteit" },
    ...overrides
  };
}

describe("Mijn dag itemcompositie", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
  });

  it("dedupliceert hetzelfde moment maar behoudt deelname en rolbezetting als redenen", async () => {
    const moment = createMoment();

    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        deelnames: [
          {
            data: [
              {
                id: "deelname-1",
                status: "geaccepteerd",
                momenten: moment
              }
            ],
            error: null
          }
        ],
        rolbezettingen: [
          {
            data: [
              {
                id: "rolbezetting-1",
                status: "actief",
                momentrollen: {
                  id: "momentrol-1",
                  titel: "Begeleider",
                  roltype: "begeleider",
                  status: "open",
                  momenten: moment
                }
              }
            ],
            error: null
          }
        ],
        momenten: [
          {
            data: [],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagItems("profiel-sam", selectedDay);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "moment-1",
      title: "Ochtendwandeling"
    });
    expect(items[0].reasons).toEqual([
      {
        type: "rolbezetting",
        label: "Begeleider",
        status: "actief"
      },
      {
        type: "deelname",
        label: "Deelname",
        status: "geaccepteerd"
      }
    ]);
  });

  it("toont een eigenaar-profiel moment zonder deelname als persoonlijk moment", async () => {
    const personalMoment = createMoment({
      id: "persoonlijk-moment-1",
      titel: "Rustige ochtend",
      beschrijving: "Eigen persoonlijk moment zonder deelname.",
      status: "open"
    });

    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        deelnames: [
          {
            data: [],
            error: null
          }
        ],
        rolbezettingen: [
          {
            data: [],
            error: null
          }
        ],
        momenten: [
          {
            data: [personalMoment],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagItems("profiel-sam", selectedDay);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "persoonlijk-moment-1",
      title: "Rustige ochtend",
      status: "open"
    });
    expect(items[0].reasons).toEqual([
      {
        type: "persoonlijk_moment",
        label: "Persoonlijk moment",
        status: "open"
      }
    ]);
  });

  it("toont geen afgehandeld eigenaar-profiel moment in actieve Mijn dag", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        deelnames: [
          {
            data: [],
            error: null
          }
        ],
        rolbezettingen: [
          {
            data: [],
            error: null
          }
        ],
        momenten: [
          {
            data: [
              createMoment({
                id: "afgerond-persoonlijk-moment",
                status: "afgerond"
              })
            ],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagItems("profiel-sam", selectedDay);

    expect(items).toEqual([]);
  });

  it("toont alleen actieve read-only taken op de gekozen dag", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        taakuitvoerders: [
          {
            data: [
              { taak_id: "taak-actief", status: "actief" },
              { taak_id: "taak-afgerond", status: "actief" },
              { taak_id: "taak-morgen", status: "actief" },
              { taak_id: "taak-zonder-datum", status: "actief" }
            ],
            error: null
          }
        ],
        taken: [
          {
            data: [
              {
                id: "taak-actief",
                titel: "Medicatie klaarzetten",
                beschrijving: "Read-only taak voor vandaag.",
                status: "open",
                deadline_at: "2026-06-10T11:00:00.000Z",
                lijsten: {
                  id: "lijst-1",
                  titel: "Dagtaken",
                  momenten: null
                }
              },
              {
                id: "taak-afgerond",
                titel: "Afgeronde taak",
                beschrijving: "Hoort niet actief terug te komen.",
                status: "afgerond",
                deadline_at: "2026-06-10T12:00:00.000Z",
                lijsten: {
                  id: "lijst-1",
                  titel: "Dagtaken",
                  momenten: null
                }
              },
              {
                id: "taak-morgen",
                titel: "Morgentaak",
                beschrijving: "Valt buiten de gekozen dag.",
                status: "open",
                deadline_at: "2026-06-11T09:00:00.000Z",
                lijsten: {
                  id: "lijst-1",
                  titel: "Dagtaken",
                  momenten: null
                }
              },
              {
                id: "taak-zonder-datum",
                titel: "Taak zonder datum",
                beschrijving: "Geen deadline of momentdatum.",
                status: "open",
                deadline_at: null,
                lijsten: {
                  id: "lijst-1",
                  titel: "Dagtaken",
                  momenten: null
                }
              }
            ],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagTaskItems("profiel-sam", selectedDay);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "taak-actief",
      title: "Medicatie klaarzetten",
      assigneeStatus: "actief",
      startsAt: "2026-06-10T11:00:00.000Z"
    });
  });

  it("toont alleen document-attenties waarvan het document zelf zichtbaar is", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        tijdlijnberichten: [
          {
            data: [
              {
                id: "tijdlijn-zichtbaar",
                status: "actie_nodig",
                titel: "Lees zichtbaar document",
                inhoud: "Attentie naar zichtbaar document.",
                created_at: "2026-06-10T08:00:00.000Z",
                gericht_aan_profiel_id: "profiel-sam",
                gekoppeld_type: "document",
                gekoppeld_id: "document-zichtbaar"
              },
              {
                id: "tijdlijn-verboden",
                status: "actie_nodig",
                titel: "Lees verboden document",
                inhoud: "Deze tekst mag niet als documentkaart verschijnen.",
                created_at: "2026-06-10T09:00:00.000Z",
                gericht_aan_profiel_id: "profiel-sam",
                gekoppeld_type: "document",
                gekoppeld_id: "document-verboden"
              }
            ],
            error: null
          }
        ],
        signalen: [
          {
            data: [],
            error: null
          }
        ],
        documenten: [
          {
            data: [
              {
                id: "document-zichtbaar",
                titel: "Zichtbaar document",
                samenvatting: "Document-RLS heeft dit document vrijgegeven.",
                status: "gepubliceerd",
                categorieen: { naam: "Document algemeen" }
              }
            ],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagDocumentAttentionItems(
      "profiel-sam",
      selectedDay
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "tijdlijnbericht-tijdlijn-zichtbaar",
      documentId: "document-zichtbaar",
      title: "Zichtbaar document",
      description: "Document-RLS heeft dit document vrijgegeven.",
      categoryName: "Document algemeen"
    });
    expect(items[0].reasons).toEqual([
      {
        type: "aandacht",
        label: "Document onder aandacht",
        status: "actie_nodig"
      }
    ]);
  });

  it("maakt groepsgerichte documentaandacht niet persoonlijk", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        tijdlijnberichten: [
          {
            data: [
              {
                id: "tijdlijn-groep",
                status: "actie_nodig",
                titel: "Groepsdocument",
                inhoud: "Groepscontext alleen.",
                created_at: "2026-06-10T08:00:00.000Z",
                gericht_aan_profiel_id: null,
                gekoppeld_type: "document",
                gekoppeld_id: "document-groep"
              }
            ],
            error: null
          }
        ],
        signalen: [
          {
            data: [
              {
                id: "signaal-groep",
                niveau: "aandacht_nodig",
                status: "nieuw",
                titel: "Groepssignaal",
                omschrijving: "Groepscontext alleen.",
                created_at: "2026-06-10T09:00:00.000Z",
                gericht_aan_profiel_id: null,
                gekoppeld_type: "document",
                gekoppeld_id: "document-groep"
              }
            ],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagDocumentAttentionItems(
      "profiel-sam",
      selectedDay
    );

    expect(items).toEqual([]);
  });

  it("toont alleen actieve doel-attenties waarvan het doel zelf zichtbaar is", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        doelacceptaties: [
          {
            data: [
              {
                id: "acceptatie-voorgesteld",
                doel_id: "doel-zichtbaar",
                status: "voorgesteld",
                created_at: "2026-06-10T08:00:00.000Z",
                later_bekijken_at: null
              },
              {
                id: "acceptatie-later",
                doel_id: "doel-later",
                status: "later_bekijken",
                created_at: "2026-06-09T08:00:00.000Z",
                later_bekijken_at: "2026-06-10T09:00:00.000Z"
              },
              {
                id: "acceptatie-geweigerd",
                doel_id: "doel-geweigerd",
                status: "geweigerd",
                created_at: "2026-06-10T10:00:00.000Z",
                later_bekijken_at: null
              },
              {
                id: "acceptatie-verborgen",
                doel_id: "doel-verborgen",
                status: "voorgesteld",
                created_at: "2026-06-10T11:00:00.000Z",
                later_bekijken_at: null
              }
            ],
            error: null
          }
        ],
        doelen: [
          {
            data: [
              {
                id: "doel-zichtbaar",
                titel: "Zichtbaar doel",
                beschrijving: "Doel-RLS heeft dit doel vrijgegeven.",
                status: "onder_de_aandacht",
                start_at: "2026-06-10T08:00:00.000Z",
                eind_at: null,
                categorieen: { naam: "Doel licht" }
              },
              {
                id: "doel-later",
                titel: "Later bekijken doel",
                beschrijving: "Blijft read-only aandacht.",
                status: "onder_de_aandacht",
                start_at: "2026-06-09T08:00:00.000Z",
                eind_at: null,
                categorieen: { naam: "Doel licht" }
              }
            ],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagGoalAttentionItems(
      "profiel-sam",
      selectedDay
    );

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual([
      "doelacceptatie-acceptatie-voorgesteld",
      "doelacceptatie-acceptatie-later"
    ]);
    expect(items[0]).toMatchObject({
      goalId: "doel-zichtbaar",
      title: "Zichtbaar doel",
      description: "Doel-RLS heeft dit doel vrijgegeven.",
      acceptanceStatus: "voorgesteld",
      categoryName: "Doel licht"
    });
    expect(items[0].reasons).toEqual([
      {
        type: "aandacht",
        label: "Doel onder aandacht",
        status: "voorgesteld"
      }
    ]);
    expect(items[1]).toMatchObject({
      goalId: "doel-later",
      startsAt: "2026-06-10T09:00:00.000Z",
      acceptanceStatus: "later_bekijken"
    });
  });

  it("geeft geen doel-attenties terug als er geen actieve acceptatie op de gekozen dag is", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        doelacceptaties: [
          {
            data: [
              {
                id: "acceptatie-morgen",
                doel_id: "doel-morgen",
                status: "voorgesteld",
                created_at: "2026-06-11T08:00:00.000Z",
                later_bekijken_at: null
              }
            ],
            error: null
          }
        ]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchMijnDagGoalAttentionItems(
      "profiel-sam",
      selectedDay
    );

    expect(items).toEqual([]);
  });
});
