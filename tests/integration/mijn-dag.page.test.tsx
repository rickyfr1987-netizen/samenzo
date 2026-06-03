import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MijnDagPage from "@/app/mijn-dag/page";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoProfiel
} from "@/src/lib/samzo/current-context";
import {
  fetchMijnDagItems,
  fetchMijnDagTaskItems
} from "@/src/lib/mijn-dag/items";
import { fetchOpenMomentProposalsForProfile } from "@/src/lib/voorstellen/items";
import { fetchVisibleTimelineItems } from "@/src/lib/tijdlijn/items";
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

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchMijnDagItemsMock = vi.mocked(fetchMijnDagItems);
const fetchMijnDagTaskItemsMock = vi.mocked(fetchMijnDagTaskItems);
const fetchOpenMomentProposalsForProfileMock = vi.mocked(
  fetchOpenMomentProposalsForProfile
);
const fetchVisibleTimelineItemsMock = vi.mocked(fetchVisibleTimelineItems);

describe("Mijn dag overzicht", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    fetchCurrentSamzoContextMock.mockReset();
    fetchMijnDagItemsMock.mockReset();
    fetchMijnDagTaskItemsMock.mockReset();
    fetchOpenMomentProposalsForProfileMock.mockReset();
    fetchVisibleTimelineItemsMock.mockReset();
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
        source: "voorstel",
        status: "open",
        title: "Koffieochtend",
        urgency: "actie_nodig"
      }
    ]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Koffieochtend" }))
      .toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Koffieochtend" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Meldpunt" })).toBeInTheDocument();
    expect(screen.getAllByText("Aandacht: actie nodig")).toHaveLength(1);
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
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

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
      expect(fetchVisibleTimelineItemsMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(2);
    expect(fetchOpenMomentProposalsForProfileMock).toHaveBeenNthCalledWith(
      2,
      MILAN_PROFILE_ID
    );
  });
});
