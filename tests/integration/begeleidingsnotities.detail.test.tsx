import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MomentDetailPage from "@/app/planning/[momentId]/page";
import LijstDetailPage from "@/app/lijsten/[lijstId]/page";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext,
  type CurrentSamzoPersoon
} from "@/src/lib/samzo/current-context";
import {
  archiveBegeleidingsnotitie,
  createBegeleidingsnotitieForLijst,
  createBegeleidingsnotitieForMoment,
  fetchBegeleidingsnotitiesForLijst,
  fetchBegeleidingsnotitiesForMoment,
  type Begeleidingsnotitie,
  updateBegeleidingsnotitie
} from "@/src/lib/begeleidingsnotities/items";
import {
  fetchLijstDetail,
  type LijstDetail,
  type LijstTaskAssignee,
  type LijstTask
} from "@/src/lib/lijsten/items";
import {
  fetchLijstenForMoment,
  type VisibleLijst
} from "@/src/lib/lijsten/items";
import {
  fetchMomentDetail,
  type MomentDetailData
} from "@/src/lib/moment/detail";
import { fetchOpenVoorstelForProfileAndMoment } from "@/src/lib/voorstellen/items";
import { createSamzoContext, SAM_PROFILE_ID, BAS_PROFILE_ID } from "@/tests/fixtures/samzo";

const momentId = "moment-001";
const lijstId = "lijst-001";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ momentId, lijstId }))
}));

vi.mock("@/src/lib/samzo/current-context", () => ({
  fetchCurrentSamzoContext: vi.fn(),
  isOwnProfileActive: vi.fn(
    (context: import("@/src/lib/samzo/current-context").CurrentSamzoContext | null) =>
      Boolean(
        context?.ownProfiel &&
          context.currentProfiel &&
          context.ownProfiel.id === context.currentProfiel.id
      )
  )
}));

vi.mock("@/src/lib/moment/detail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/moment/detail")>();

  return {
    ...actual,
    fetchMomentDetail: vi.fn()
  };
});

vi.mock("@/src/lib/lijsten/items", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/lijsten/items")>();

  return {
    ...actual,
    fetchLijstDetail: vi.fn(),
    fetchLijstenForMoment: vi.fn()
  };
});

vi.mock("@/src/lib/voorstellen/items", () => ({
  fetchOpenVoorstelForProfileAndMoment: vi.fn()
}));

vi.mock("@/src/lib/begeleidingsnotities/items", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/src/lib/begeleidingsnotities/items")
  >();

  return {
    ...actual,
    createBegeleidingsnotitieForMoment: vi.fn(),
    createBegeleidingsnotitieForLijst: vi.fn(),
    updateBegeleidingsnotitie: vi.fn(),
    archiveBegeleidingsnotitie: vi.fn(),
    fetchBegeleidingsnotitiesForMoment: vi.fn(),
    fetchBegeleidingsnotitiesForLijst: vi.fn()
  };
});

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchMomentDetailMock = vi.mocked(fetchMomentDetail);
const fetchLijstenForMomentMock = vi.mocked(fetchLijstenForMoment);
const fetchOpenVoorstelForProfileAndMomentMock = vi.mocked(
  fetchOpenVoorstelForProfileAndMoment
);
const fetchLijstDetailMock = vi.mocked(fetchLijstDetail);
const fetchBegeleidingsnotitiesForMomentMock = vi.mocked(
  fetchBegeleidingsnotitiesForMoment
);
const fetchBegeleidingsnotitiesForLijstMock = vi.mocked(
  fetchBegeleidingsnotitiesForLijst
);
const createBegeleidingsnotitieForMomentMock = vi.mocked(
  createBegeleidingsnotitieForMoment
);
const createBegeleidingsnotitieForLijstMock = vi.mocked(
  createBegeleidingsnotitieForLijst
);
const updateBegeleidingsnotitieMock = vi.mocked(updateBegeleidingsnotitie);
const archiveBegeleidingsnotitieMock = vi.mocked(archiveBegeleidingsnotitie);

function createMomentDetail(overrides: Partial<MomentDetailData> = {}): MomentDetailData {
  return {
    moment: {
      id: momentId,
      title: "Teamstart",
      description: "Rustige start van de dag.",
      startsAt: "2026-06-04T09:00:00.000Z",
      endsAt: null,
      isAllDay: false,
      location: "Zaal 1",
      status: "open",
      capacity: null,
      registrationOpen: true,
      categoryName: "Dag"
    },
    groups: [],
    participations: [],
    roles: [],
    ...overrides
  };
}

function createLijstDetail(overrides: Partial<LijstDetail> = {}): LijstDetail {
  return {
    id: lijstId,
    title: "Huiswerklijst",
    description: "Taken voor het team. ",
    status: "open",
    categoryName: "Begeleiding",
    linkedMoment: null,
    taskCount: 0,
    claimedTaskCount: 0,
    completedTaskCount: 0,
    tasks: [],
    ...overrides
  };
}

function createBegeleidingsnotitie(overrides: Partial<Begeleidingsnotitie> = {}): Begeleidingsnotitie {
  return {
    id: "note-1",
    inhoud: "Gebruik rolcontext voorzichtig.",
    status: "actief",
    contextType: "moment",
    contextId: momentId,
    createdAt: "2026-06-04T08:00:00.000Z",
    updatedAt: null,
    betrokkenProfielId: null,
    zichtbaarVoorRoltype: null,
    ...overrides
  };
}

function createLijstNotitie(): Begeleidingsnotitie {
  return createBegeleidingsnotitie({
    id: "note-2",
    contextType: "lijst",
    contextId: lijstId
  });
}

function createContextForRole(
  role: "lid" | "medewerker" | "systeembeheerder",
  overrides: Partial<CurrentSamzoContext> = {}
) {
  const base = createSamzoContext();
  const persoon = base.persoon as CurrentSamzoPersoon;

  return createSamzoContext({
    persoon: {
      ...persoon,
      id: base.persoon!.id,
      systeemrol: role,
      ...("auth_user_id" in overrides ? {} : {}),
      ...("persoon" in overrides ? (overrides as CurrentSamzoContext).persoon : {})
    },
    ...overrides
  });
}

function createContextWithProfiles(
  currentProfileName: string,
  currentProfileId: string
) {
  return {
    ...createContextForRole("systeembeheerder"),
    ownProfiel: {
      ...createSamzoContext().currentProfiel!,
      id: BASE_CONTEXT.currentProfiel!.id,
      weergavenaam: "Systeembeheerder"
    },
    currentProfiel: {
      ...createSamzoContext().currentProfiel!,
      id: currentProfileId,
      weergavenaam: currentProfileName,
      persoon_id: currentProfileId
    },
    profielen: [
      {
        ...createSamzoContext().currentProfiel!,
        id: BASE_CONTEXT.currentProfiel!.id,
        weergavenaam: "Systeembeheerder"
      },
      {
        ...createSamzoContext().currentProfiel!,
        id: currentProfileId,
        weergavenaam: currentProfileName,
        persoon_id: currentProfileId
      }
    ]
  } as CurrentSamzoContext;
}

const BASE_CONTEXT = createSamzoContext();

beforeEach(() => {
  fetchCurrentSamzoContextMock.mockReset();
  fetchMomentDetailMock.mockReset();
  fetchLijstenForMomentMock.mockReset();
  fetchOpenVoorstelForProfileAndMomentMock.mockReset();
  fetchLijstDetailMock.mockReset();
  fetchBegeleidingsnotitiesForMomentMock.mockReset();
  fetchBegeleidingsnotitiesForLijstMock.mockReset();
  createBegeleidingsnotitieForMomentMock.mockReset();
  createBegeleidingsnotitieForLijstMock.mockReset();
  updateBegeleidingsnotitieMock.mockReset();
  archiveBegeleidingsnotitieMock.mockReset();
  window.localStorage.clear();
});

describe("Momentdetail begeleidingsnotities", () => {
  it("toont begeleidingsnotities met beheeracties wanneer beheerder mag beheren", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createContextForRole("medewerker", {
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: BAS_PROFILE_ID,
          persoon_id: BAS_PROFILE_ID
        }
      })
    );
    fetchMomentDetailMock.mockResolvedValue(createMomentDetail());
    fetchLijstenForMomentMock.mockResolvedValue([] as VisibleLijst[]);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValue([
      createBegeleidingsnotitie()
    ]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);

    render(<MomentDetailPage />);

    expect(await screen.findByRole("heading", { name: "Teamstart" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Begeleidingsnotities" })
    ).toBeInTheDocument();
    expect(screen.getByText("Gebruik rolcontext voorzichtig.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bewerken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archiveren" })).toBeInTheDocument();
  });

  it("verbergt bewerksels bij een regulier lidprofiel", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createContextForRole("lid", {
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: BAS_PROFILE_ID,
          persoon_id: BAS_PROFILE_ID
        },
        persoon: {
          ...createSamzoContext().persoon!,
          systeemrol: "lid"
        }
      })
    );
    fetchMomentDetailMock.mockResolvedValue(createMomentDetail());
    fetchLijstenForMomentMock.mockResolvedValue([] as VisibleLijst[]);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValue([
      createBegeleidingsnotitie()
    ]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);

    render(<MomentDetailPage />);

    expect(
      await screen.findByRole("heading", { name: "Begeleidingsnotities" })
    ).toBeInTheDocument();
    expect(screen.getByText("Gebruik rolcontext voorzichtig.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bewerken" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archiveren" })
    ).not.toBeInTheDocument();
  });

  it("kan een begeleidingsnotitie opslaan op de momentdetailpagina", async () => {
    const medewerkerContext = createContextForRole("medewerker", {
      currentProfiel: {
        ...createSamzoContext().currentProfiel!,
        id: BAS_PROFILE_ID,
        persoon_id: BAS_PROFILE_ID
      }
    });

    fetchCurrentSamzoContextMock.mockResolvedValue(
      medewerkerContext
    );
    fetchMomentDetailMock.mockResolvedValue(createMomentDetail());
    fetchLijstenForMomentMock.mockResolvedValue([] as VisibleLijst[]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValueOnce([]);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValueOnce([
      {
        ...createBegeleidingsnotitie({
          id: "note-new",
          status: "actief"
        })
      }
    ]);
    createBegeleidingsnotitieForMomentMock.mockResolvedValue();

    render(<MomentDetailPage />);

    expect(
      await screen.findByRole("button", { name: "Notitie opslaan" })
    ).toBeInTheDocument();
    expect(screen.getByText("Geen actieve notities.")).toBeInTheDocument();

    const textarea = screen.getByLabelText("Nieuwe begeleidingsnotitie");
    fireEvent.change(textarea, { target: { value: "Nieuwe privacy melding." } });
    fireEvent.click(screen.getByRole("button", { name: "Notitie opslaan" }));

    await waitFor(() =>
      expect(createBegeleidingsnotitieForMomentMock).toHaveBeenCalledWith({
        momentId,
        personId: BASE_CONTEXT.persoon!.id,
        inhoud: "Nieuwe privacy melding.",
        betrokkenProfielId: medewerkerContext.currentProfiel!.id,
        zichtbaarVoorRoltype: null
      })
    );
    expect(
      await screen.findByText("Begeleidingsnotitie is opgeslagen.")
    ).toBeInTheDocument();
  });
});

describe("Lijstdetail begeleidingsnotities", () => {
  it("toont begeleidingsnotities met beheeracties op lijstdetail", async () => {
    const medewerkerContext = createContextForRole("medewerker", {
      currentProfiel: {
        ...createSamzoContext().currentProfiel!,
        id: BAS_PROFILE_ID,
        persoon_id: BAS_PROFILE_ID
      }
    });

    fetchCurrentSamzoContextMock.mockResolvedValue(medewerkerContext);
    fetchLijstDetailMock.mockResolvedValue(createLijstDetail());
    fetchBegeleidingsnotitiesForLijstMock.mockResolvedValue([createLijstNotitie()]);

    render(<LijstDetailPage />);

    expect(
      await screen.findByRole("heading", { name: "Huiswerklijst" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Begeleidingsnotities" })).toBeInTheDocument();
    expect(screen.getByText("Gebruik rolcontext voorzichtig.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bewerken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archiveren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notitie opslaan" })).toBeInTheDocument();
  });

  it("verfrist lijstdetails bij profielwissel via de profielselector", async () => {
    const ownContext = createContextWithProfiles("Systeembeheerder", SAM_PROFILE_ID);
    const switchedContext = createContextWithProfiles("Sam Bewoner", "10000000-0000-4000-8000-000000000004");

    fetchCurrentSamzoContextMock.mockResolvedValueOnce(ownContext);
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(switchedContext);
    fetchLijstDetailMock.mockResolvedValue(createLijstDetail());
    fetchBegeleidingsnotitiesForLijstMock.mockResolvedValue([]);

    render(<LijstDetailPage />);

    expect(await screen.findByText("Geen actieve notities.")).toBeInTheDocument();
    expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(1);
    expect(fetchLijstDetailMock).toHaveBeenCalledTimes(1);

    window.localStorage.setItem("samzo.activeProfileId", "10000000-0000-4000-8000-000000000004");
    window.dispatchEvent(new Event("samzo:activeProfileChanged"));

    await waitFor(() => expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fetchLijstDetailMock).toHaveBeenCalledTimes(2));
  });

  it("kan een begeleidingsnotitie toevoegen op de lijstdetail", async () => {
    const medewerkerContext = createContextForRole("medewerker", {
      currentProfiel: {
        ...createSamzoContext().currentProfiel!,
        id: BAS_PROFILE_ID,
        persoon_id: BAS_PROFILE_ID
      }
    });

    fetchCurrentSamzoContextMock.mockResolvedValue(medewerkerContext);
    fetchLijstDetailMock.mockResolvedValue(createLijstDetail());
    fetchBegeleidingsnotitiesForLijstMock.mockResolvedValueOnce([]);
    fetchBegeleidingsnotitiesForLijstMock.mockResolvedValueOnce([
      createLijstNotitie()
    ]);
    createBegeleidingsnotitieForLijstMock.mockResolvedValue();

    render(<LijstDetailPage />);

    expect(
      await screen.findByLabelText("Nieuwe begeleidingsnotitie")
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nieuwe begeleidingsnotitie"), {
      target: { value: "Nieuwe lijstnotitie" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Notitie opslaan" }));

    await waitFor(() =>
      expect(createBegeleidingsnotitieForLijstMock).toHaveBeenCalledWith({
        lijstId,
        personId: BASE_CONTEXT.persoon!.id,
        inhoud: "Nieuwe lijstnotitie",
        betrokkenProfielId: medewerkerContext.currentProfiel!.id,
        zichtbaarVoorRoltype: null
      })
    );
    expect(
      await screen.findByText("Begeleidingsnotitie is opgeslagen.")
    ).toBeInTheDocument();
  });
});
