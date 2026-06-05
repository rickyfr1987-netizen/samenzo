import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MijnDagPage from "@/app/mijn-dag/page";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoProfiel
} from "@/src/lib/samzo/current-context";
import {
  fetchMijnDagAcceptedGoalItems,
  fetchMijnDagDocumentAttentionItems,
  fetchMijnDagGoalAttentionItems,
  fetchMijnDagItems,
  fetchMijnDagTaskItems
} from "@/src/lib/mijn-dag/items";
import { fetchOpenMomentProposalsForProfile } from "@/src/lib/voorstellen/items";
import { fetchVisibleTimelineItems } from "@/src/lib/tijdlijn/items";
import {
  acceptDoelacceptatie,
  bekijkDoelacceptatieLater,
  weigerDoelacceptatie
} from "@/src/lib/doelacceptaties/actions";
import {
  createSamzoContext,
  currentDayIsoAt,
  MILAN_PROFILE_ID,
  SAM_PROFILE_ID
} from "@/tests/fixtures/samzo";

const ACTIVE_PROFILE_STORAGE_KEY = "samzo.activeProfileId";
const ACTIVE_PROFILE_CHANGED_EVENT = "samzo:activeProfileChanged";

vi.mock("@/src/lib/samzo/current-context", () => ({
  fetchCurrentSamzoContext: vi.fn()
}));

vi.mock("@/src/lib/mijn-dag/items", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/src/lib/mijn-dag/items")>();

  return {
    ...actual,
    fetchMijnDagAcceptedGoalItems: vi.fn(),
    fetchMijnDagDocumentAttentionItems: vi.fn(),
    fetchMijnDagGoalAttentionItems: vi.fn(),
    fetchMijnDagItems: vi.fn(),
    fetchMijnDagTaskItems: vi.fn()
  };
});

vi.mock("@/src/lib/voorstellen/items", () => ({
  fetchOpenMomentProposalsForProfile: vi.fn()
}));

vi.mock("@/src/lib/tijdlijn/items", () => ({
  fetchVisibleTimelineItems: vi.fn()
}));

vi.mock("@/src/lib/voorstellen/actions", () => ({
  acceptVoorstel: vi.fn(),
  declineVoorstel: vi.fn()
}));

vi.mock("@/src/lib/doelacceptaties/actions", () => ({
  acceptDoelacceptatie: vi.fn(),
  bekijkDoelacceptatieLater: vi.fn(),
  weigerDoelacceptatie: vi.fn()
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchMijnDagAcceptedGoalItemsMock = vi.mocked(
  fetchMijnDagAcceptedGoalItems
);
const fetchMijnDagDocumentAttentionItemsMock = vi.mocked(
  fetchMijnDagDocumentAttentionItems
);
const fetchMijnDagGoalAttentionItemsMock = vi.mocked(
  fetchMijnDagGoalAttentionItems
);
const fetchMijnDagItemsMock = vi.mocked(fetchMijnDagItems);
const fetchMijnDagTaskItemsMock = vi.mocked(fetchMijnDagTaskItems);
const fetchOpenMomentProposalsForProfileMock = vi.mocked(
  fetchOpenMomentProposalsForProfile
);
const fetchVisibleTimelineItemsMock = vi.mocked(fetchVisibleTimelineItems);
const acceptDoelacceptatieMock = vi.mocked(acceptDoelacceptatie);
const bekijkDoelacceptatieLaterMock = vi.mocked(bekijkDoelacceptatieLater);
const weigerDoelacceptatieMock = vi.mocked(weigerDoelacceptatie);

describe("Mijn dag overzicht", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    fetchCurrentSamzoContextMock.mockReset();
    fetchMijnDagAcceptedGoalItemsMock.mockReset();
    fetchMijnDagDocumentAttentionItemsMock.mockReset();
    fetchMijnDagGoalAttentionItemsMock.mockReset();
    fetchMijnDagItemsMock.mockReset();
    fetchMijnDagTaskItemsMock.mockReset();
    fetchOpenMomentProposalsForProfileMock.mockReset();
    fetchVisibleTimelineItemsMock.mockReset();
    acceptDoelacceptatieMock.mockReset();
    bekijkDoelacceptatieLaterMock.mockReset();
    weigerDoelacceptatieMock.mockReset();
    fetchMijnDagAcceptedGoalItemsMock.mockResolvedValue([]);
    fetchMijnDagDocumentAttentionItemsMock.mockResolvedValue([]);
    fetchMijnDagGoalAttentionItemsMock.mockResolvedValue([]);
    window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, SAM_PROFILE_ID);
  });

  it("toont een open momentvoorstel als momentkaart met status voorgesteld", async () => {
    const startsAt = currentDayIsoAt(10);

    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([
      {
        acceptedAt: null,
        canRespond: true,
        createdAt: "2026-06-03T08:00:00.000Z",
        declinedAt: null,
        explanation: "Sam kan aansluiten bij de koffieochtend.",
        id: "voorstel-1",
        linkedId: "moment-1",
        linkedMoment: {
          categoryName: "Ontmoeting",
          description: "Rustig samen koffiedrinken.",
          endsAt: currentDayIsoAt(11),
          id: "moment-1",
          isAllDay: false,
          location: "Huiskamer",
          startsAt,
          status: "open",
          title: "Koffieochtend"
        },
        linkedType: "moment",
        status: "open",
        title: "Voorstel koffieochtend",
        type: "deelname_aan_moment",
        updatedAt: null
      }
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    const title = await screen.findByRole("heading", { name: "Koffieochtend" });
    expect(title).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Koffieochtend" })).toHaveLength(
      1
    );
    expect(screen.getByText("Voorstel: voorgesteld")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accepteren" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Afwijzen" })
    ).toBeInTheDocument();
    expect(fetchOpenMomentProposalsForProfileMock).toHaveBeenCalledWith(
      SAM_PROFILE_ID
    );
  });

  it("toont een rustige lege staat wanneer geen activiteiten aanwezig zijn", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Geen activiteiten" }))
      .toBeInTheDocument();
    expect(
      screen.getByText("Er staat niets in deze dag voor dit profiel.")
    ).toBeInTheDocument();
  });

  it("toont een geaccepteerde deelname als persoonlijke activiteit", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([
      {
        categoryName: "Dagactiviteiten",
        description: "Vrijdagmiddag in het park.",
        endsAt: currentDayIsoAt(10),
        id: "moment-accepted",
        isAllDay: false,
        location: "Park",
        reasons: [
          {
            label: "Deelname",
            status: "geaccepteerd",
            type: "deelname"
          }
        ],
        startsAt: currentDayIsoAt(9),
        status: "geaccepteerd",
        title: "Wandeling met Sam"
      }
    ]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(
      await screen.findByRole("heading", { name: "Wandeling met Sam" })
    ).toBeInTheDocument();
    expect(screen.getByText("Deelname: geaccepteerd")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accepteren" })).not.toBeInTheDocument();
  });

  it("toont rolbezetting op een momentkaart", async () => {
    const startsAt = currentDayIsoAt(9);

    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([
      {
        categoryName: "Dagactiviteiten",
        description: "Rolgericht moment.",
        endsAt: currentDayIsoAt(10),
        id: "moment-role",
        isAllDay: false,
        location: "Gemeenschapszaal",
        reasons: [
          {
            label: "Begeleider",
            status: "actief",
            type: "rolbezetting"
          }
        ],
        startsAt,
        status: "open",
        title: "Begeleid groepsmoment"
      }
    ]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    const card = await screen.findByRole("heading", {
      name: "Begeleid groepsmoment"
    }).then((heading) => heading.closest("article"));
    if (!card) {
      throw new Error("Mijn dag card not found");
    }

    expect(within(card).getByText("Begeleider: actief")).toBeInTheDocument();
    expect(screen.queryByText("Deelname")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Begeleid groepsmoment" })
    ).toHaveLength(1);
  });

  it("toont een geclaimde taak op de gekozen dag als persoonlijk item", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([
      {
        assigneeStatus: "actief",
        description: "Bereid medicatiebak voor.",
        endsAt: null,
        id: "taak-claimed",
        isAllDay: false,
        listId: "lijst-1",
        listTitle: "Dagtaken",
        location: null,
        reasons: [{ label: "Taak", status: "actief", type: "taak" }],
        startsAt: currentDayIsoAt(9),
        status: "open",
        title: "Medicatie klaarzetten",
        categoryName: "Daglijst"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(
      await screen.findByRole("heading", { name: "Medicatie klaarzetten" })
    ).toBeInTheDocument();
    expect(screen.getByText("Taak: actief")).toBeInTheDocument();
    expect(screen.getByText("Taak")).toBeInTheDocument();
  });

  it("toont een niet-geclaimde taak niet als persoonlijke activiteit", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Geen activiteiten" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Niet-geclaimde taak" })).not.toBeInTheDocument();
  });

  it("toont een geweigerde proposal niet als open persoonlijke momentactie", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([
      {
        acceptedAt: null,
        canRespond: false,
        createdAt: "2026-06-03T08:00:00.000Z",
        declinedAt: "2026-06-03T08:30:00.000Z",
        explanation: "Voorstel is afgewezen.",
        id: "voorstel-rejected",
        linkedId: "moment-missing",
        linkedMoment: null,
        linkedType: "moment",
        status: "geweigerd",
        title: "Afgewezen voorstel",
        type: "deelname_aan_moment",
        updatedAt: null
      }
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Geen activiteiten" }))
      .toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Afgewezen voorstelmoment" })
    ).not.toBeInTheDocument();
  });

  it("toont geen technische auth_user_id in de ui", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Geen activiteiten" }))
      .toBeInTheDocument();
    expect(screen.queryByText("auth-sam")).not.toBeInTheDocument();
    expect(screen.queryByText("link-auth-sam")).not.toBeInTheDocument();
  });

  it("toont een taak op de geselecteerde datum met taskcontext", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([
      {
        assigneeStatus: "actief",
        description:
          "Kies de benodigde materialen voor het ochtendbezoek.",
        endsAt: null,
        id: "taak-1",
        isAllDay: false,
        listId: "lijst-1",
        listTitle: "Dagtaken",
        location: null,
        reasons: [{ label: "Taak", status: "actief", type: "taak" }],
        startsAt: currentDayIsoAt(9),
        status: "open",
        title: "Medicatie klaarzetten",
        categoryName: "Daglijst"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(
      await screen.findByRole("heading", { name: "Medicatie klaarzetten" })
    ).toBeInTheDocument();
    expect(screen.getByText("Taak: actief")).toBeInTheDocument();
  });

  it("toont relevante aandacht uit de tijdlijn zonder momentduplicatie", async () => {
    const startsAt = currentDayIsoAt(8);
    const linkedMomentId = "moment-1";

    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([
      {
        acceptedAt: null,
        canRespond: true,
        createdAt: "2026-06-03T08:00:00.000Z",
        declinedAt: null,
        explanation: "Sam kan aansluiten bij de koffieochtend.",
        id: "voorstel-1",
        linkedId: linkedMomentId,
        linkedMoment: {
          categoryName: "Ontmoeting",
          description: "Rustig samen koffiedrinken.",
          endsAt: currentDayIsoAt(11),
          id: linkedMomentId,
          isAllDay: false,
          location: "Huiskamer",
          startsAt,
          status: "open",
          title: "Koffieochtend"
        },
        linkedType: "moment",
        status: "open",
        title: "Voorstel koffieochtend",
        type: "deelname_aan_moment",
        updatedAt: null
      }
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      {
        body: "Open signaal voor dit moment.",
        createdAt: currentDayIsoAt(9),
        id: "signaal-1",
        proposalId: null,
        proposalReceivingProfileId: null,
        related: null,
        targetProfileId: SAM_PROFILE_ID,
        targetGroupId: null,
        source: "signaal",
        status: "nieuw",
        title: "Meldpunt",
        urgency: "actie_nodig"
      },
      {
        body: "Voorstel voor Sam.",
        createdAt: currentDayIsoAt(8),
        id: "voorstel-1",
        proposalId: "voorstel-1",
        proposalReceivingProfileId: SAM_PROFILE_ID,
        related: { id: linkedMomentId, type: "moment" },
        targetProfileId: null,
        targetGroupId: null,
        source: "voorstel",
        status: "open",
        title: "Koffieochtend",
        urgency: "actie_nodig"
      },
      {
        body: "Algemene aandacht zonder persoonlijk doelwit.",
        createdAt: currentDayIsoAt(7),
        id: "bericht-1",
        proposalId: null,
        proposalReceivingProfileId: null,
        related: null,
        targetProfileId: null,
        targetGroupId: null,
        source: "tijdlijnbericht",
        status: "actie_nodig",
        title: "Algemeen Signaal",
        urgency: "actie_nodig"
      }
    ]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Koffieochtend" }))
      .toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Koffieochtend" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Meldpunt" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Algemeen Signaal" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Aandacht: actie nodig")).toHaveLength(1);
  });

  it("toont alleen aandacht die duidelijk naar het actieve profiel verwijst", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      {
        body: "Signaal voor Bas.",
        createdAt: currentDayIsoAt(9),
        id: "signaal-bas",
        proposalId: null,
        proposalReceivingProfileId: null,
        related: null,
        targetProfileId: "10000000-0000-4000-8000-000000000001",
        targetGroupId: null,
        source: "signaal",
        status: "actie_nodig",
        title: "Bas krijgt dit",
        urgency: "actie_nodig"
      },
      {
        body: "Signaal voor Sam.",
        createdAt: currentDayIsoAt(10),
        id: "signaal-sam",
        proposalId: null,
        proposalReceivingProfileId: null,
        related: null,
        targetProfileId: SAM_PROFILE_ID,
        targetGroupId: null,
        source: "signaal",
        status: "actie_nodig",
        title: "Sam krijgt dit",
        urgency: "actie_nodig"
      },
      {
        body: "Groepsgericht signaal zonder personalisatie.",
        createdAt: currentDayIsoAt(10),
        id: "signaal-groep",
        proposalId: null,
        proposalReceivingProfileId: null,
        related: null,
        targetProfileId: null,
        targetGroupId: "20000000-0000-4000-8000-000000000003",
        source: "signaal",
        status: "actie_nodig",
        title: "Groepstoegang",
        urgency: "actie_nodig"
      }
    ]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Sam krijgt dit" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bas krijgt dit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Groepstoegang" })).not.toBeInTheDocument();
  });

  it("toont document-attenties alleen via de veilige document-RLS compositie", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchMijnDagDocumentAttentionItemsMock.mockResolvedValue([
      {
        categoryName: "Document algemeen",
        description: "Document-RLS gaf dit document vrij.",
        documentId: "document-zichtbaar",
        endsAt: null,
        id: "tijdlijnbericht-document-attentie",
        isAllDay: false,
        location: null,
        reasons: [
          {
            label: "Document onder aandacht",
            status: "actie_nodig",
            type: "aandacht"
          }
        ],
        source: "tijdlijnbericht",
        sourceId: "document-attentie",
        startsAt: currentDayIsoAt(9),
        status: "actie_nodig",
        title: "Zichtbaar document"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      {
        body: "Deze generieke document-attentie mag niet los verschijnen.",
        createdAt: currentDayIsoAt(9),
        id: "timeline-document",
        proposalId: null,
        proposalReceivingProfileId: null,
        related: { id: "document-verboden", type: "document" },
        targetProfileId: SAM_PROFILE_ID,
        targetGroupId: null,
        source: "tijdlijnbericht",
        status: "actie_nodig",
        title: "Generieke document-attentie",
        urgency: "actie_nodig"
      }
    ]);

    render(<MijnDagPage />);

    const documentLink = await screen.findByRole("link", {
      name: "Zichtbaar document"
    });

    expect(documentLink).toHaveAttribute("href", "/documenten/document-zichtbaar");
    expect(
      screen.getByText("Document onder aandacht: actie nodig")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Generieke document-attentie" })
    ).not.toBeInTheDocument();
  });

  it("toont doelacceptatie-acties alleen bij toegestane doel-attenties voor eigen profiel", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchMijnDagGoalAttentionItemsMock.mockResolvedValue([
      {
        acceptanceId: "acceptatie-voorgesteld",
        acceptanceStatus: "voorgesteld",
        categoryName: "Doel licht",
        description: "Doel-RLS gaf dit doel vrij.",
        endsAt: null,
        goalId: "doel-voorgesteld",
        id: "doelacceptatie-acceptatie-voorgesteld",
        isAllDay: false,
        location: null,
        reasons: [
          {
            label: "Doel onder aandacht",
            status: "voorgesteld",
            type: "aandacht"
          }
        ],
        startsAt: currentDayIsoAt(9),
        status: "voorgesteld",
        title: "Rustig weekdoel"
      },
      {
        acceptanceId: "acceptatie-later",
        acceptanceStatus: "later_bekijken",
        categoryName: "Doel licht",
        description: "Later opnieuw bekijken.",
        endsAt: null,
        goalId: "doel-later",
        id: "doelacceptatie-acceptatie-later",
        isAllDay: false,
        location: null,
        reasons: [
          {
            label: "Doel onder aandacht",
            status: "later_bekijken",
            type: "aandacht"
          }
        ],
        startsAt: currentDayIsoAt(10),
        status: "later_bekijken",
        title: "Later bekijken doel"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);
    acceptDoelacceptatieMock.mockResolvedValue({
      goalId: "doel-voorgesteld",
      id: "acceptatie-voorgesteld",
      profileId: SAM_PROFILE_ID,
      status: "geaccepteerd"
    });

    render(<MijnDagPage />);

    const proposedGoalLink = await screen.findByRole("link", {
      name: "Rustig weekdoel"
    });
    const laterGoalLink = screen.getByRole("link", {
      name: "Later bekijken doel"
    });

    expect(proposedGoalLink).toHaveAttribute("href", "/doelen/doel-voorgesteld");
    expect(laterGoalLink).toHaveAttribute("href", "/doelen/doel-later");
    const proposedGoalCard = proposedGoalLink.closest("article");
    const laterGoalCard = laterGoalLink.closest("article");
    if (!proposedGoalCard || !laterGoalCard) {
      throw new Error("Goal cards not found");
    }

    expect(
      screen.getByText("Doel onder aandacht: voorgesteld")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Doel onder aandacht: later bekijken")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Aandacht")).toHaveLength(2);
    expect(
      within(proposedGoalCard).getByRole("button", { name: "Accepteren" })
    ).toBeInTheDocument();
    expect(
      within(proposedGoalCard).getByRole("button", { name: "Weigeren" })
    ).toBeInTheDocument();
    expect(
      within(proposedGoalCard).getByRole("button", { name: "Later bekijken" })
    ).toBeInTheDocument();
    expect(
      within(laterGoalCard).getByRole("button", { name: "Accepteren" })
    ).toBeInTheDocument();
    expect(
      within(laterGoalCard).getByRole("button", { name: "Weigeren" })
    ).toBeInTheDocument();
    expect(
      within(laterGoalCard).queryByRole("button", { name: "Later bekijken" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(proposedGoalCard).getByRole("button", { name: "Accepteren" })
    );

    await waitFor(() => {
      expect(acceptDoelacceptatieMock).toHaveBeenCalledWith({
        acceptatieId: "acceptatie-voorgesteld",
        profielId: SAM_PROFILE_ID
      });
    });
    expect(weigerDoelacceptatieMock).not.toHaveBeenCalled();
    expect(bekijkDoelacceptatieLaterMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Het doel is geaccepteerd."))
      .toBeInTheDocument();
    expect(fetchMijnDagGoalAttentionItemsMock).toHaveBeenCalledWith(
      SAM_PROFILE_ID,
      expect.any(Date)
    );
  });

  it("toont geen doelacceptatieknoppen in andermans profielperspectief", async () => {
    const samContext = createSamzoContext();
    const ownProfile = samContext.currentProfiel as CurrentSamzoProfiel;
    const milanProfile: CurrentSamzoProfiel = {
      ...ownProfile,
      id: MILAN_PROFILE_ID,
      persoon_id: ownProfile.persoon_id ?? "10000000-0000-4000-8000-000000000000",
      weergavenaam: "Milan Medewerker"
    };

    fetchCurrentSamzoContextMock.mockResolvedValue(
      createSamzoContext({
        currentProfiel: milanProfile,
        ownProfiel: ownProfile,
        profielen: [milanProfile, ownProfile]
      })
    );
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchMijnDagGoalAttentionItemsMock.mockResolvedValue([
      {
        acceptanceId: "acceptatie-milan",
        acceptanceStatus: "voorgesteld",
        categoryName: "Doel licht",
        description: "Alleen kijken vanuit dit profiel.",
        endsAt: null,
        goalId: "doel-milan",
        id: "doelacceptatie-acceptatie-milan",
        isAllDay: false,
        location: null,
        reasons: [
          {
            label: "Doel onder aandacht",
            status: "voorgesteld",
            type: "aandacht"
          }
        ],
        startsAt: currentDayIsoAt(9),
        status: "voorgesteld",
        title: "Doel in bekeken profiel"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(
      await screen.findByRole("heading", { name: "Doel in bekeken profiel" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accepteren" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Weigeren" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Later bekijken" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Doelacceptatie niet beschikbaar voor dit bekeken profiel.")
    ).toBeInTheDocument();
    expect(acceptDoelacceptatieMock).not.toHaveBeenCalled();
  });

  it("toont een rustige foutmelding wanneer een doelacceptatieactie mislukt", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchMijnDagGoalAttentionItemsMock.mockResolvedValue([
      {
        acceptanceId: "acceptatie-fout",
        acceptanceStatus: "voorgesteld",
        categoryName: "Doel licht",
        description: "Actie faalt veilig.",
        endsAt: null,
        goalId: "doel-fout",
        id: "doelacceptatie-acceptatie-fout",
        isAllDay: false,
        location: null,
        reasons: [
          {
            label: "Doel onder aandacht",
            status: "voorgesteld",
            type: "aandacht"
          }
        ],
        startsAt: currentDayIsoAt(9),
        status: "voorgesteld",
        title: "Doel met foutpad"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);
    acceptDoelacceptatieMock.mockRejectedValue(
      new Error("Je kunt deze doelacceptatieactie niet uitvoeren met dit profiel.")
    );

    render(<MijnDagPage />);

    const goalLink = await screen.findByRole("link", {
      name: "Doel met foutpad"
    });
    const goalCard = goalLink.closest("article");
    if (!goalCard) {
      throw new Error("Goal card not found");
    }

    fireEvent.click(
      within(goalCard).getByRole("button", { name: "Accepteren" })
    );

    expect(
      await screen.findByText(
        "Je kunt deze doelacceptatieactie niet uitvoeren met dit profiel."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/row-level security/i)).not.toBeInTheDocument();
  });

  it("toont geaccepteerde doelen als read-only persoonlijk doelitem", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchMijnDagAcceptedGoalItemsMock.mockResolvedValue([
      {
        acceptanceId: "acceptatie-geaccepteerd",
        acceptedAt: currentDayIsoAt(8),
        categoryName: "Doel licht",
        description: "Alleen veilige doelinformatie via doel-RLS.",
        endsAt: currentDayIsoAt(18),
        goalId: "doel-geaccepteerd",
        id: "geaccepteerd-doel-acceptatie-geaccepteerd",
        isAllDay: false,
        location: null,
        reasons: [
          {
            label: "Persoonlijk doel",
            status: "geaccepteerd",
            type: "doel"
          }
        ],
        startsAt: currentDayIsoAt(8),
        status: "geaccepteerd",
        title: "Eigen weekritme"
      }
    ]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    const acceptedGoalLink = await screen.findByRole("link", {
      name: "Eigen weekritme"
    });

    expect(acceptedGoalLink).toHaveAttribute("href", "/doelen/doel-geaccepteerd");
    expect(screen.getByText("Persoonlijk doel: geaccepteerd")).toBeInTheDocument();
    expect(screen.getByText("Doel")).toBeInTheDocument();
    expect(
      screen.queryByText("Doel onder aandacht: geaccepteerd")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accepteren" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Afwijzen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Later bekijken/i })).not.toBeInTheDocument();
    expect(fetchMijnDagAcceptedGoalItemsMock).toHaveBeenCalledWith(
      SAM_PROFILE_ID,
      expect.any(Date)
    );
  });

  it("herlaadt data direct na profielwissel", async () => {
    const samContext = createSamzoContext();
    const ownProfile = samContext.currentProfiel as CurrentSamzoProfiel;
    const milanProfile: CurrentSamzoProfiel = {
      ...ownProfile,
      id: MILAN_PROFILE_ID,
      persoon_id: ownProfile.persoon_id ?? "10000000-0000-4000-8000-000000000000",
      weergavenaam: "Milan Medewerker"
    };
    const milanContext = createSamzoContext({
      currentProfiel: milanProfile,
      ownProfiel: ownProfile,
      profielen: [milanProfile, ownProfile]
    });

    fetchCurrentSamzoContextMock.mockResolvedValueOnce(samContext);
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(milanContext);
    fetchMijnDagItemsMock.mockResolvedValueOnce([
      {
        categoryName: "Dagactiviteiten",
        description: "Sam route",
        endsAt: currentDayIsoAt(10),
        id: "route-sam",
        isAllDay: false,
        location: "Wandeling",
        reasons: [
          {
            label: "Deelname",
            status: "geaccepteerd",
            type: "deelname"
          }
        ],
        startsAt: currentDayIsoAt(9),
        status: "open",
        title: "Wandel route"
      }
    ]);
    fetchMijnDagItemsMock.mockResolvedValueOnce([
      {
        categoryName: "Dagactiviteiten",
        description: "Milan route",
        endsAt: currentDayIsoAt(12),
        id: "route-milan",
        isAllDay: false,
        location: "Tuin",
        reasons: [
          {
            label: "Deelname",
            status: "voorgesteld",
            type: "rolbezetting"
          }
        ],
        startsAt: currentDayIsoAt(11),
        status: "open",
        title: "Milan route"
      }
    ]);
    fetchMijnDagTaskItemsMock.mockResolvedValueOnce([]);
    fetchMijnDagTaskItemsMock.mockResolvedValueOnce([]);
    fetchMijnDagAcceptedGoalItemsMock.mockResolvedValueOnce([]);
    fetchMijnDagAcceptedGoalItemsMock.mockResolvedValueOnce([]);
    fetchMijnDagGoalAttentionItemsMock.mockResolvedValueOnce([]);
    fetchMijnDagGoalAttentionItemsMock.mockResolvedValueOnce([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValueOnce([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValueOnce([]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([]);

    render(<MijnDagPage />);

    await waitFor(() => {
      expect(fetchMijnDagItemsMock).toHaveBeenCalledTimes(1);
      expect(fetchMijnDagItemsMock).toHaveBeenNthCalledWith(
        1,
        SAM_PROFILE_ID,
        expect.any(Date)
      );
    });
    expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(1);

    window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, MILAN_PROFILE_ID);
    window.dispatchEvent(
      new CustomEvent(ACTIVE_PROFILE_CHANGED_EVENT, {
        detail: { profileId: MILAN_PROFILE_ID }
      })
    );

    await waitFor(() => {
      expect(fetchMijnDagItemsMock).toHaveBeenCalledTimes(2);
      expect(fetchMijnDagTaskItemsMock).toHaveBeenCalledTimes(2);
      expect(fetchMijnDagAcceptedGoalItemsMock).toHaveBeenCalledTimes(2);
      expect(fetchMijnDagDocumentAttentionItemsMock).toHaveBeenCalledTimes(2);
      expect(fetchMijnDagGoalAttentionItemsMock).toHaveBeenCalledTimes(2);
      expect(fetchVisibleTimelineItemsMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(2);
    expect(fetchOpenMomentProposalsForProfileMock).toHaveBeenNthCalledWith(
      2,
      MILAN_PROFILE_ID
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Milan route" }))
        .toBeInTheDocument();
    });
    expect(screen.queryByText("Wandel route")).not.toBeInTheDocument();
  });
});
