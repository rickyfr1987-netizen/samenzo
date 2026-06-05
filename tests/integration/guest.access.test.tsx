import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DocumentenPage from "@/app/documenten/page";
import LedenDetailPage from "@/app/leden/[profielId]/page";
import LedenPage from "@/app/leden/page";
import MijnDagPage from "@/app/mijn-dag/page";
import PlanningPage from "@/app/planning/page";
import TijdlijnPage from "@/app/tijdlijn/page";
import { fetchCurrentSamzoContext, type CurrentSamzoContext, type CurrentSamzoPersoon } from "@/src/lib/samzo/current-context";
import { fetchOpenMomentProposalsForProfile } from "@/src/lib/voorstellen/items";
import { fetchVisibleTimelineItems, type TimelineItem } from "@/src/lib/tijdlijn/items";
import { fetchMijnDagAcceptedGoalItems, fetchMijnDagDocumentAttentionItems, fetchMijnDagGoalAttentionItems, fetchMijnDagItems, fetchMijnDagTaskItems, type MijnDagItem, type MijnDagTaskItem } from "@/src/lib/mijn-dag/items";
import { fetchPlanningFilterCategories, fetchPlanningMoments, type PlanningMoment } from "@/src/lib/planning/moments";
import { fetchVisibleDocumenten, type DocumentSummary } from "@/src/lib/documenten/items";
import { fetchProfileById, fetchVisibleProfielen, type VisibleLid, type VisibleLidDetail } from "@/src/lib/leden/items";
import { createSamzoContext, createSamzoProfile, currentDayIsoAt, SAM_PROFILE_ID } from "@/tests/fixtures/samzo";

const GUEST_PROFILE_ID = "10000000-0000-4000-8000-000000000005";
const GUEST_PERSOON_ID = "00000000-0000-4000-8000-000000000005";

const replaceMock = vi.fn();
const searchParams = new URLSearchParams();
const useParamsMock = vi.fn(() => ({ profielId: "sam-profile" }));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/planning"),
  useRouter: vi.fn(() => ({ replace: replaceMock })),
  useSearchParams: vi.fn(() => searchParams),
  useParams: () => useParamsMock()
}));

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

vi.mock("@/src/lib/planning/moments", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/src/lib/planning/moments")>();

  return {
    ...actual,
    fetchPlanningMoments: vi.fn(),
    fetchPlanningFilterCategories: vi.fn()
  };
});

vi.mock("@/src/lib/documenten/items", () => ({
  fetchVisibleDocumenten: vi.fn(),
  formatDocumentStatus: (status: string) => status
}));

vi.mock("@/src/lib/leden/items", () => ({
  fetchVisibleProfielen: vi.fn(),
  fetchProfileById: vi.fn(),
  formatProfileVisibility: (profile: { visibleForMembers: boolean; visibleForGuests: boolean }) => {
    if (profile.visibleForMembers && profile.visibleForGuests) {
      return "voor leden en gasten";
    }
    if (profile.visibleForMembers) {
      return "voor leden";
    }
    if (profile.visibleForGuests) {
      return "voor gasten";
    }
    return "beperkt zichtbaar";
  }
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchMijnDagAcceptedGoalItemsMock = vi.mocked(fetchMijnDagAcceptedGoalItems);
const fetchMijnDagDocumentAttentionItemsMock = vi.mocked(fetchMijnDagDocumentAttentionItems);
const fetchMijnDagGoalAttentionItemsMock = vi.mocked(fetchMijnDagGoalAttentionItems);
const fetchMijnDagItemsMock = vi.mocked(fetchMijnDagItems);
const fetchMijnDagTaskItemsMock = vi.mocked(fetchMijnDagTaskItems);
const fetchOpenMomentProposalsForProfileMock = vi.mocked(fetchOpenMomentProposalsForProfile);
const fetchVisibleTimelineItemsMock = vi.mocked(fetchVisibleTimelineItems);
const fetchPlanningMomentsMock = vi.mocked(fetchPlanningMoments);
const fetchPlanningFilterCategoriesMock = vi.mocked(fetchPlanningFilterCategories);
const fetchVisibleDocumentenMock = vi.mocked(fetchVisibleDocumenten);
const fetchVisibleProfielenMock = vi.mocked(fetchVisibleProfielen);
const fetchProfileByIdMock = vi.mocked(fetchProfileById);

function createGuestContext(overrides: Partial<CurrentSamzoContext> = {}): CurrentSamzoContext {
  const guestProfile = createSamzoProfile({
    id: GUEST_PROFILE_ID,
    persoon_id: GUEST_PERSOON_ID,
    weergavenaam: "Gijs Gast"
  });

  const base = createSamzoContext();
  const basePersoon = base.persoon as CurrentSamzoPersoon;

  return {
    ...base,
    ...overrides,
    authUser: {
      ...(base.authUser ?? {
        id: "auth-gijs",
        app_metadata: {},
        aud: "authenticated",
        created_at: "2026-06-03T00:00:00.000Z",
        user_metadata: {}
      })
    },
    persoon: {
      ...basePersoon,
      id: GUEST_PERSOON_ID,
      auth_user_id: "auth-guest-token",
      email: "gijs.gast@example.test",
      accountnaam: "Gijs Gast",
      systeemrol: "gast",
      status: "actief"
    },
    ownProfiel: guestProfile,
    currentProfiel: guestProfile,
    profielen: [guestProfile],
    ...overrides
  };
}

function createMijnDagMoment(
  overrides: Partial<MijnDagItem> = {}
): MijnDagItem {
  return {
    id: "moment-gast",
    title: "Gastmoment",
    description: "Gastvriendelijke activiteit.",
    startsAt: currentDayIsoAt(10),
    endsAt: null,
    isAllDay: false,
    location: "Gastruimte",
    status: "geaccepteerd",
    categoryName: "Gast",
    reasons: [],
    ...overrides
  };
}

function createTaskItem(overrides: Partial<MijnDagTaskItem> = {}): MijnDagTaskItem {
  return {
    id: "taak-gast",
    title: "Gasttaak",
    description: "Korte ondersteuning afronden.",
    status: "open",
    categoryName: "Daglijst",
    listId: null,
    listTitle: null,
    assigneeStatus: "actief",
    startsAt: currentDayIsoAt(9),
    endsAt: null,
    location: null,
    isAllDay: false,
    reasons: [{ label: "Taak", status: "actief", type: "taak" }],
    ...overrides
  };
}

function createTimelineSupportItem(
  id: string,
  title: string,
  overrides: Partial<TimelineItem> = {}
): TimelineItem {
  return {
    id,
    source: "supportvraag",
    title,
    body: "Vraag over gasttoegang.",
    status: "in_behandeling",
    urgency: "actie_nodig",
    createdAt: currentDayIsoAt(10),
    targetProfileId: GUEST_PROFILE_ID,
    targetGroupId: null,
    proposalId: null,
    proposalReceivingProfileId: null,
    supportVraagCreatorPersonId: GUEST_PERSOON_ID,
    supportResponseCount: 1,
    latestSupportResponse: {
      id: "resp-1",
      content: "Antwoord is vastgelegd.",
      isSupportResponse: true,
      createdAt: currentDayIsoAt(10)
    },
    related: null,
    ...overrides
  };
}

function createPlanningMoment(
  overrides: Partial<PlanningMoment> = {}
): PlanningMoment {
  return {
    id: "moment-gast-1",
    title: "Gastopening",
    description: "Open voor gasten.",
    startsAt: currentDayIsoAt(11),
    endsAt: currentDayIsoAt(12),
    location: "Gastlounge",
    isAllDay: false,
    status: "open",
    categoryId: null,
    categoryName: "Bezoek",
    groupIds: ["gasten"],
    ...overrides
  };
}

function createDocumentSummary(
  overrides: Partial<DocumentSummary> = {}
): DocumentSummary {
  return {
    id: "doc-gast",
    title: "Gast protocol",
    summary: "Alleen zichtbaar voor gasten.",
    status: "gepubliceerd",
    categoryName: "Beleid",
    createdAt: currentDayIsoAt(0),
    updatedAt: currentDayIsoAt(0),
    groups: [],
    ...overrides
  };
}

function createVisibleProfile(overrides: Partial<VisibleLid> = {}): VisibleLid {
  return {
    id: "profiel-gast",
    displayName: "Gastkamer",
    status: "actief",
    shortDescription: "Gast-gebruiker",
    visibleForGuests: true,
    visibleForMembers: false,
    joinedAt: currentDayIsoAt(0),
    groups: [],
    ...overrides
  };
}

function createProfileDetail(overrides: Partial<VisibleLidDetail> = {}): VisibleLidDetail {
  return {
    ...createVisibleProfile(),
    hasGroups: false,
    ...overrides
  };
}

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
  fetchPlanningMomentsMock.mockReset();
  fetchPlanningFilterCategoriesMock.mockReset();
  fetchVisibleDocumentenMock.mockReset();
  fetchVisibleProfielenMock.mockReset();
  fetchProfileByIdMock.mockReset();
  useParamsMock.mockReset();
  replaceMock.mockClear();
  searchParams.delete("from");
  searchParams.delete("to");
  searchParams.delete("category");
  searchParams.delete("status");
  fetchMijnDagAcceptedGoalItemsMock.mockResolvedValue([]);
  fetchMijnDagDocumentAttentionItemsMock.mockResolvedValue([]);
  fetchMijnDagGoalAttentionItemsMock.mockResolvedValue([]);
  window.localStorage.setItem("samzo.activeProfileId", GUEST_PROFILE_ID);
});

describe("Gasttoegang in Mijn dag", () => {
  it("toont gastcontext zonder interne accountwaarden", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchMijnDagItemsMock.mockResolvedValue([createMijnDagMoment()]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([createTaskItem()]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Gastmoment" })).toBeInTheDocument();
    expect(screen.getByText("Gijs Gast")).toBeInTheDocument();
    expect(screen.getByText("Ingelogd")).toBeInTheDocument();
    expect(screen.queryByText("auth-guest-token")).not.toBeInTheDocument();
  });

  it("filtert aandacht op actieve gastprofiel in mijn dag", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchMijnDagItemsMock.mockResolvedValue([]);
    fetchMijnDagTaskItemsMock.mockResolvedValue([]);
    fetchOpenMomentProposalsForProfileMock.mockResolvedValue([]);
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createTimelineSupportItem("sam-support", "Sam-support", {
        targetProfileId: SAM_PROFILE_ID,
        title: "Interne supportvraag"
      }),
      createTimelineSupportItem("gast-support", "Gast supportvraag", {
        hasSupportResponse: false,
        supportResponseCount: 0
      })
    ]);

    render(<MijnDagPage />);

    expect(await screen.findByRole("heading", { name: "Gast supportvraag" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Interne supportvraag" })).not.toBeInTheDocument();
  });
});

describe("Gasttoegang in Planning", () => {
  it("verbergt groepsfilter en toont gasttoegankelijkheid via RLS-resultaat", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    expect(await screen.findByRole("heading", { name: "Gastopening" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Groep" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Tag" })).not.toBeInTheDocument();
    expect(screen.queryByText("Medewerkers")).not.toBeInTheDocument();
    expect(screen.queryByText("Bewoners")).not.toBeInTheDocument();
  });

  it("herlaadt planning na profielwissel zonder fout", async () => {
    const switchedGuestProfile = createSamzoProfile({
      id: "10000000-0000-4000-8000-000000000050",
      persoon_id: GUEST_PERSOON_ID,
      weergavenaam: "Gijs Gast"
    });
    const baseGuestProfile = createSamzoProfile({
      id: GUEST_PROFILE_ID,
      persoon_id: GUEST_PERSOON_ID,
      weergavenaam: "Gijs Gast"
    });

    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createGuestContext({
        currentProfiel: baseGuestProfile,
        profielen: [baseGuestProfile, switchedGuestProfile]
      })
    );
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createGuestContext({
        currentProfiel: switchedGuestProfile,
        profielen: [baseGuestProfile, switchedGuestProfile]
      })
    );
    fetchPlanningMomentsMock.mockResolvedValueOnce([createPlanningMoment()]);
    fetchPlanningMomentsMock.mockResolvedValueOnce([
      createPlanningMoment({ title: "Gastopening 2", id: "moment-gast-2" })
    ]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    expect(await screen.findByRole("heading", { name: "Gastopening" })).toBeInTheDocument();
    window.localStorage.setItem("samzo.activeProfileId", switchedGuestProfile.id);
    window.dispatchEvent(new Event("samzo:activeProfileChanged"));

    expect(await screen.findByRole("heading", { name: "Gastopening 2" })).toBeInTheDocument();
    await waitFor(() => expect(fetchPlanningMomentsMock).toHaveBeenCalledTimes(2));
  });
});

describe("Gasttoegang in Documenten", () => {
  it("toont alleen gastzichtbaar document en verbergt interne technische waarden", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchVisibleDocumentenMock.mockResolvedValue([createDocumentSummary()]);

    render(<DocumentenPage />);

    expect(await screen.findByRole("heading", { name: "Documenten" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Gast protocol" })).toBeInTheDocument();
    expect(screen.queryByText("auth-guest-token")).not.toBeInTheDocument();
  });
});

describe("Gasttoegang in Tijdlijn", () => {
  it("toont eigen supportvraag op gastprofiel met aanvragercontrole en geen support-handler controls", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createTimelineSupportItem("guest-support", "Gast supportvraag", {
        hasSupportResponse: true,
        supportResponseCount: 2,
        latestSupportResponse: {
          id: "resp-1",
          content: "Antwoord van support aanwezig.",
          isSupportResponse: true,
          createdAt: currentDayIsoAt(10)
        }
      }),
      createTimelineSupportItem("staff-support", "Staff supportvraag", {
        targetProfileId: GUEST_PROFILE_ID,
        supportVraagCreatorPersonId: "00000000-0000-4000-8000-000000000001",
        latestSupportResponse: {
          id: "resp-staff-1",
          content: "Support intern.",
          isSupportResponse: true,
          createdAt: currentDayIsoAt(10)
        },
        supportResponseCount: 0,
        status: "gesloten",
        hasSupportResponse: true
      })
    ]);

    render(<TijdlijnPage />);

    expect(await screen.findByRole("heading", { name: "Gast supportvraag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dit is opgelost" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Markeer afgehandeld" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sluiten" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Afhandelen" })).not.toBeInTheDocument();
    expect(screen.queryByText("auth-guest-token")).not.toBeInTheDocument();
  });

  it("verbergt reactiecontrols voor niet-eigen supportvraag in gastprofiel", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createTimelineSupportItem("not-owner", "Vraag van ander", {
        supportVraagCreatorPersonId: "00000000-0000-4000-8000-000000000002",
        hasSupportResponse: false,
        supportResponseCount: 0,
        latestSupportResponse: null
      })
    ]);

    render(<TijdlijnPage />);

    expect(await screen.findByRole("heading", { name: "Vraag van ander" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reageren" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dit is opgelost" })).not.toBeInTheDocument();
  });
});

describe("Gasttoegang in Leden", () => {
  it("toont alleen toegankelijke profielen in ledenlijst", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchVisibleProfielenMock.mockResolvedValue([
      createVisibleProfile({ displayName: "Gastkamer", visibleForMembers: true })
    ]);

    render(<LedenPage />);

    expect(await screen.findByRole("heading", { name: "Gastkamer" })).toBeInTheDocument();
    expect(screen.queryByText("auth-guest-token")).not.toBeInTheDocument();
  });

  it("geeft geen detail voor niet-zichtbaar profiel via RLS", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchProfileByIdMock.mockResolvedValue(null);
    useParamsMock.mockReturnValue({ profielId: "sam-profile" });

    render(<LedenDetailPage />);

    expect(await screen.findByRole("heading", { name: "Profiel niet zichtbaar" })).toBeInTheDocument();
  });

  it("toont detail voor toegankelijke gastprofielcontext", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createGuestContext());
    fetchProfileByIdMock.mockResolvedValue(
      createProfileDetail({
        id: "sam-profile",
        displayName: "Gast detail",
        shortDescription: "Zichtbaar profiel voor gasten",
        visibleForGuests: true,
        visibleForMembers: false
      })
    );
    useParamsMock.mockReturnValue({ profielId: "sam-profile" });

    render(<LedenDetailPage />);

    expect(await screen.findByRole("heading", { name: "Gast detail" })).toBeInTheDocument();
    expect(screen.getByText("Lid sinds")).toBeInTheDocument();
  });
});
