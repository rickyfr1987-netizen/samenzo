import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MijnDagPage from "@/app/mijn-dag/page";
import { fetchMijnDagItems } from "@/src/lib/mijn-dag/items";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";
import type { CurrentSamzoProfiel } from "@/src/lib/samzo/current-context";
import { fetchOpenMomentProposalsForProfile } from "@/src/lib/voorstellen/items";
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
    fetchMijnDagItems: vi.fn()
  };
});

vi.mock("@/src/lib/voorstellen/items", () => ({
  fetchOpenMomentProposalsForProfile: vi.fn()
}));

vi.mock("@/src/lib/voorstellen/actions", () => ({
  acceptVoorstel: vi.fn(),
  declineVoorstel: vi.fn()
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchMijnDagItemsMock = vi.mocked(fetchMijnDagItems);
const fetchOpenMomentProposalsForProfileMock = vi.mocked(
  fetchOpenMomentProposalsForProfile
);

describe("Mijn dag voorstelweergave", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    fetchCurrentSamzoContextMock.mockReset();
    fetchMijnDagItemsMock.mockReset();
    fetchOpenMomentProposalsForProfileMock.mockReset();
    window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, SAM_PROFILE_ID);
  });

  it("toont een open momentvoorstel als momentkaart met status voorgesteld", async () => {
    const startsAt = currentDayIsoAt(10);

    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
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

    render(<MijnDagPage />);

    expect(
      await screen.findByRole("heading", { name: "Koffieochtend" })
    ).toBeInTheDocument();
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
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);

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
    });
    expect(fetchMijnDagItemsMock).toHaveBeenNthCalledWith(
      2,
      MILAN_PROFILE_ID,
      expect.any(Date)
    );
    expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(2);
    expect(fetchOpenMomentProposalsForProfileMock).toHaveBeenNthCalledWith(
      2,
      MILAN_PROFILE_ID
    );
  });
});
