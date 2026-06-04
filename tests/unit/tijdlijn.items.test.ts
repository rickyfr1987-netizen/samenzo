import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { fetchVisibleTimelineItems } from "@/src/lib/tijdlijn/items";

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
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => ({
      ...query,
      data: payload.data,
      error: payload.error
    }))
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

describe("tijdlijn helper mapping", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
  });

  it("plaatst actieve supportvragen boven afgehandelde/gesloten supportvragen", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        supportvragen: [
          {
            data: [
              {
                id: "support-afgehandeld",
                onderwerp: "Support afgerond",
                omschrijving: "Afgehandeld",
                status: "afgehandeld",
                created_at: "2026-06-03T08:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              },
              {
                id: "support-in-behandeling",
                onderwerp: "Nog in behandeling",
                omschrijving: "Nog te doen",
                status: "in_behandeling",
                created_at: "2026-06-03T11:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              },
              {
                id: "support-actie",
                onderwerp: "Actie nodig",
                omschrijving: "Snel even helpen",
                status: "actie_nodig",
                created_at: "2026-06-03T10:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              }
            ],
            error: null
          }
        ],
        supportvraag_reacties: [
          {
            data: [
              {
                id: "resp-1",
                supportvraag_id: "support-actie",
                inhoud: "Ik heb nog een vraag.",
                is_support_antwoord: false,
                created_at: "2026-06-03T11:20:00.000Z"
              },
              {
                id: "resp-2",
                supportvraag_id: "support-in-behandeling",
                inhoud: "Ik ben bezig hiermee.",
                is_support_antwoord: true,
                created_at: "2026-06-03T11:10:00.000Z"
              }
            ],
            error: null
          }
        ],
        tijdlijnberichten: [{ data: [], error: null }],
        signalen: [{ data: [], error: null }],
        voorstellen: [{ data: [], error: null }]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchVisibleTimelineItems();
    const supportItems = items.filter((item) => item.source === "supportvraag");

    expect(supportItems).toHaveLength(3);
    expect(supportItems[0].title).toBe("Nog in behandeling");
    expect(supportItems[1].title).toBe("Actie nodig");
    expect(supportItems[2].title).toBe("Support afgerond");
    expect(supportItems[0].urgency).toBe("in_behandeling");
    expect(supportItems[0].status).toBe("in_behandeling");
    expect(supportItems[0].supportResponseCount).toBe(1);
    expect(supportItems[0].hasSupportResponse).toBe(true);
    expect(supportItems[0].latestSupportResponse).toMatchObject({
      content: "Ik ben bezig hiermee.",
      isSupportResponse: true
    });
    expect(supportItems[1].supportResponseCount).toBe(1);
    expect(supportItems[1].hasSupportResponse).toBe(false);
    expect(supportItems[1].latestSupportResponse).toMatchObject({
      content: "Ik heb nog een vraag.",
      isSupportResponse: false
    });
    expect(supportItems[2].supportResponseCount).toBe(0);
  });

  it("gebruikt bijgewerkte supportvragen als nieuwste activiteit voor sortering", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        supportvragen: [
          {
            data: [
              {
                id: "support-laatste-antwoord",
                onderwerp: "Ik wacht nog even",
                omschrijving: "Eerder aangemaakt",
                status: "actie_nodig",
                created_at: "2026-06-03T08:00:00.000Z",
                updated_at: "2026-06-03T12:30:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              },
              {
                id: "support-oud",
                onderwerp: "Rustiger verzoek",
                omschrijving: "Geen reactie nog",
                status: "actie_nodig",
                created_at: "2026-06-03T12:00:00.000Z",
                updated_at: "2026-06-03T12:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              }
            ],
            error: null
          }
        ],
        tijdlijnberichten: [{ data: [], error: null }],
        signalen: [{ data: [], error: null }],
        voorstellen: [{ data: [], error: null }],
        supportvraag_reacties: [{ data: [], error: null }]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchVisibleTimelineItems();
    const supportItems = items.filter((item) => item.source === "supportvraag");

    expect(supportItems[0].id).toBe("support-laatste-antwoord");
    expect(supportItems[0].status).toBe("actie_nodig");
    expect(supportItems[1].id).toBe("support-oud");
  });

  it("houdt afgehandelde supportvragen uit de actieve aandacht bovenaan", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        supportvragen: [
          {
            data: [
              {
                id: "support-closed",
                onderwerp: "Afgesloten melding",
                omschrijving: "Dit is opgelost",
                status: "gesloten",
                created_at: "2026-06-03T07:00:00.000Z",
                updated_at: "2026-06-03T13:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              },
              {
                id: "support-open",
                onderwerp: "Nog open",
                omschrijving: "Wacht op terugkoppeling",
                status: "actie_nodig",
                created_at: "2026-06-03T12:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              }
            ],
            error: null
          }
        ],
        tijdlijnberichten: [{ data: [], error: null }],
        signalen: [{ data: [], error: null }],
        voorstellen: [{ data: [], error: null }],
        supportvraag_reacties: [{ data: [], error: null }]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchVisibleTimelineItems();
    const supportItems = items.filter((item) => item.source === "supportvraag");

    expect(supportItems[0].id).toBe("support-open");
    expect(supportItems[1].id).toBe("support-closed");
    expect(supportItems[1].status).toBe("gesloten");
  });

  it("toont één timeline-item voor een supportvraag, ook met meerdere reacties", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        supportvragen: [
          {
            data: [
              {
                id: "support-1",
                onderwerp: "Vraag met meerdere reacties",
                omschrijving: "Dit is een terugkerende vraag",
                status: "actie_nodig",
                created_at: "2026-06-03T09:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              }
            ],
            error: null
          }
        ],
        supportvraag_reacties: [
          {
            data: [
              {
                id: "resp-1",
                supportvraag_id: "support-1",
                inhoud: "Dag 1",
                is_support_antwoord: true,
                created_at: "2026-06-03T09:10:00.000Z"
              },
              {
                id: "resp-2",
                supportvraag_id: "support-1",
                inhoud: "Dag 2",
                is_support_antwoord: false,
                created_at: "2026-06-03T09:20:00.000Z"
              },
              {
                id: "resp-3",
                supportvraag_id: "support-1",
                inhoud: "Dag 3",
                is_support_antwoord: false,
                created_at: "2026-06-03T09:30:00.000Z"
              }
            ],
            error: null
          }
        ],
        tijdlijnberichten: [{ data: [], error: null }],
        signalen: [{ data: [], error: null }],
        voorstellen: [{ data: [], error: null }]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchVisibleTimelineItems();
    const supportItems = items.filter((item) => item.source === "supportvraag");

    expect(supportItems).toHaveLength(1);
    expect(supportItems[0].supportResponseCount).toBe(3);
    expect(supportItems[0].hasSupportResponse).toBe(true);
    expect(supportItems[0].latestSupportResponse?.content).toBe("Dag 1");
  });

  it("houdt een supportvraag met requesterreactie zichtbaar als aandacht voor supportperspectief", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        supportvragen: [
          {
            data: [
              {
                id: "support-handler",
                onderwerp: "Support voor support",
                omschrijving: "Vraag met antwoord",
                status: "actie_nodig",
                created_at: "2026-06-03T09:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              }
            ],
            error: null
          }
        ],
        supportvraag_reacties: [
          {
            data: [
              {
                id: "resp-1",
                supportvraag_id: "support-handler",
                inhoud: "Meer info over oorzaak.",
                is_support_antwoord: false,
                created_at: "2026-06-03T10:00:00.000Z"
              }
            ],
            error: null
          }
        ],
        tijdlijnberichten: [{ data: [], error: null }],
        signalen: [{ data: [], error: null }],
        voorstellen: [{ data: [], error: null }]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchVisibleTimelineItems({
      supportContext: { kind: "supportHandlerContext" }
    });
    const supportItems = items.filter((item) => item.source === "supportvraag");

    expect(supportItems).toHaveLength(1);
    expect(supportItems[0].urgency).toBe("actie_nodig");
  });

  it("houdt een supportvraag met supportantwoord actief voor requester-context", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      from: createFromMock({
        supportvragen: [
          {
            data: [
              {
                id: "support-requester",
                onderwerp: "Requester met antwoord",
                omschrijving: "Vraag met antwoord",
                status: "actie_nodig",
                created_at: "2026-06-03T09:00:00.000Z",
                aangemaakt_door_persoon_id:
                  "00000000-0000-4000-8000-000000000004",
                aangemaakt_vanuit_profiel_id:
                  "10000000-0000-4000-8000-000000000004"
              }
            ],
            error: null
          }
        ],
        supportvraag_reacties: [
          {
            data: [
              {
                id: "resp-1",
                supportvraag_id: "support-requester",
                inhoud: "Support reageerde.",
                is_support_antwoord: true,
                created_at: "2026-06-03T10:00:00.000Z"
              }
            ],
            error: null
          }
        ],
        tijdlijnberichten: [{ data: [], error: null }],
        signalen: [{ data: [], error: null }],
        voorstellen: [{ data: [], error: null }]
      })
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const items = await fetchVisibleTimelineItems({
      supportContext: {
        kind: "requesterContext",
        profileId: "10000000-0000-4000-8000-000000000004"
      }
    });
    const supportItems = items.filter((item) => item.source === "supportvraag");

    expect(supportItems).toHaveLength(1);
    expect(supportItems[0].urgency).toBe("actie_nodig");
  });
});
