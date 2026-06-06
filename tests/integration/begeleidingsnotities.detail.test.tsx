import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MomentDetailPage from "@/app/planning/[momentId]/page";
import LijstDetailPage from "@/app/lijsten/[lijstId]/page";
import {
  archivePlanningGroupMoment,
  createPlanningGroupMoment,
  updatePlanningGroupMoment
} from "@/src/lib/planning/moment-management";
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
import {
  fetchPlanningFilterCategories,
  fetchPlanningFilterGroups,
  type PlanningCategoryOption,
  type PlanningGroupOption
} from "@/src/lib/planning/moments";
import { fetchOpenVoorstelForProfileAndMoment } from "@/src/lib/voorstellen/items";
import { createSamzoContext, SAM_PROFILE_ID, BAS_PROFILE_ID } from "@/tests/fixtures/samzo";

const momentId = "moment-001";
const lijstId = "lijst-001";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ momentId, lijstId })),
  useRouter: vi.fn(() => ({ push: pushMock }))
}));

vi.mock("@/src/lib/planning/moment-management", () => ({
  createPlanningGroupMoment: vi.fn(),
  updatePlanningGroupMoment: vi.fn(),
  archivePlanningGroupMoment: vi.fn()
}));

vi.mock("@/src/lib/planning/moments", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/src/lib/planning/moments")>();

  return {
    ...actual,
    fetchPlanningFilterCategories: vi.fn(),
    fetchPlanningFilterGroups: vi.fn()
  };
});

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
const fetchPlanningFilterCategoriesMock = vi.mocked(fetchPlanningFilterCategories);
const fetchPlanningFilterGroupsMock = vi.mocked(fetchPlanningFilterGroups);
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
const createPlanningGroupMomentMock = vi.mocked(createPlanningGroupMoment);
const updatePlanningGroupMomentMock = vi.mocked(updatePlanningGroupMoment);
const archivePlanningGroupMomentMock = vi.mocked(archivePlanningGroupMoment);

type MomentDetailOverrides = Partial<
  Omit<MomentDetailData, "moment">
> & {
  moment?: Partial<NonNullable<MomentDetailData["moment"]>>;
};

function createMomentDetail(overrides: MomentDetailOverrides = {}): MomentDetailData {
  const { moment: momentOverrides, ...otherOverrides } = overrides;
  const baseMoment: NonNullable<MomentDetailData["moment"]> = {
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
    guestAccess: false,
    categoryId: "cat-1",
    ownerGroupId: "groep-1",
    categoryName: "Dag"
  };

  return {
    moment: { ...baseMoment, ...momentOverrides },
    groups: [],
    participations: [],
    roles: [],
    ...otherOverrides
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

const MANAGEMENT_CATEGORIES: PlanningCategoryOption[] = [
  { id: "cat-1", name: "Activiteit" }
];

const MANAGEMENT_GROUPS: PlanningGroupOption[] = [
  { id: "groep-1", name: "Bewonersgroep" }
];

beforeEach(() => {
  fetchCurrentSamzoContextMock.mockReset();
  fetchMomentDetailMock.mockReset();
  fetchLijstenForMomentMock.mockReset();
  fetchOpenVoorstelForProfileAndMomentMock.mockReset();
  fetchPlanningFilterCategoriesMock.mockReset();
  fetchPlanningFilterGroupsMock.mockReset();
  fetchLijstDetailMock.mockReset();
  fetchBegeleidingsnotitiesForMomentMock.mockReset();
  fetchBegeleidingsnotitiesForLijstMock.mockReset();
  createBegeleidingsnotitieForMomentMock.mockReset();
  createBegeleidingsnotitieForLijstMock.mockReset();
  updateBegeleidingsnotitieMock.mockReset();
  archiveBegeleidingsnotitieMock.mockReset();
  createPlanningGroupMomentMock.mockReset();
  updatePlanningGroupMomentMock.mockReset();
  archivePlanningGroupMomentMock.mockReset();
  pushMock.mockReset();
  window.localStorage.clear();
});

describe("Momentdetail begeleidingsnotities", () => {
  it("toont beheeracties op de momentdetailpagina voor systeembeheerder", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createContextForRole("systeembeheerder", {
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: BAS_PROFILE_ID,
          persoon_id: BAS_PROFILE_ID
        }
      })
    );
    fetchMomentDetailMock.mockResolvedValue(createMomentDetail());
    fetchLijstenForMomentMock.mockResolvedValue([] as VisibleLijst[]);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValue([]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);
    fetchPlanningFilterCategoriesMock.mockResolvedValue(MANAGEMENT_CATEGORIES);
    fetchPlanningFilterGroupsMock.mockResolvedValue(MANAGEMENT_GROUPS);

    render(<MomentDetailPage />);

    expect(await screen.findByRole("heading", { name: "Momentbeheer" })).toBeInTheDocument();
    expect(
      screen.getByText("Nieuw planningmoment maken")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Bestaand moment beheren")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Planningmoment aanmaken" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Moment bijwerken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archiveren" })).toBeInTheDocument();
  });

  it("verbergt de beheersectie voor een niet-beheerder", async () => {
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
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValue([]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);

    render(<MomentDetailPage />);

    expect(
      await screen.findByRole("heading", { name: "Begeleidingsnotities" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Momentbeheer" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Moment bijwerken" })
    ).not.toBeInTheDocument();
  });

  it("kan een planningmoment aanmaken via systeembeheerderbeheer", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createContextForRole("systeembeheerder", {
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: BAS_PROFILE_ID,
          persoon_id: BAS_PROFILE_ID
        }
      })
    );
    fetchMomentDetailMock.mockResolvedValue(
      createMomentDetail({
        moment: { categoryId: "cat-1", ownerGroupId: "groep-1" }
      })
    );
    fetchLijstenForMomentMock.mockResolvedValue([] as VisibleLijst[]);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValue([]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);
    fetchPlanningFilterCategoriesMock.mockResolvedValue(MANAGEMENT_CATEGORIES);
    fetchPlanningFilterGroupsMock.mockResolvedValue(MANAGEMENT_GROUPS);
    createPlanningGroupMomentMock.mockResolvedValue({
      id: "moment-new",
      status: "gepland"
    });

    render(<MomentDetailPage />);

    const managementSection = await screen.findByRole("heading", {
      name: "Nieuw planningmoment maken"
    });
    const createForm = managementSection.closest("form");
    if (!createForm) {
      throw new Error("Kan create formulier voor momentbeheer niet vinden.");
    }
    const form = within(createForm);

    const createTitle = form.getByLabelText("Titel");
    const createCategory = form.getByLabelText("Categorie");
    const createGroup = form.getByLabelText("Eigenaar groep");
    const createStartsAt = form.getByLabelText("Starttijd");

    fireEvent.change(createTitle, { target: { value: "Nieuwe start" } });
    fireEvent.change(createCategory, { target: { value: "cat-1" } });
    fireEvent.change(createGroup, { target: { value: "groep-1" } });
    fireEvent.change(createStartsAt, { target: { value: "2026-06-10T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Planningmoment aanmaken" }));

    await waitFor(() =>
      expect(createPlanningGroupMomentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nieuwe start",
          categoryId: "cat-1",
          groupId: "groep-1",
          startsAt: expect.any(String),
          isAllDay: false,
          registrationOpen: false,
          guestAccess: false
        })
      )
    );
    expect(pushMock).toHaveBeenCalledWith("/planning/moment-new");
  });

  it("kan een planningmoment archiveren via beheeractie", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createContextForRole("systeembeheerder", {
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: BAS_PROFILE_ID,
          persoon_id: BAS_PROFILE_ID
        }
      })
    );
    fetchMomentDetailMock.mockResolvedValue(
      createMomentDetail({
        moment: { categoryId: "cat-1", ownerGroupId: "groep-1" }
      })
    );
    fetchLijstenForMomentMock.mockResolvedValue([] as VisibleLijst[]);
    fetchBegeleidingsnotitiesForMomentMock.mockResolvedValue([]);
    fetchOpenVoorstelForProfileAndMomentMock.mockResolvedValue(null);
    fetchPlanningFilterCategoriesMock.mockResolvedValue(MANAGEMENT_CATEGORIES);
    fetchPlanningFilterGroupsMock.mockResolvedValue(MANAGEMENT_GROUPS);
    archivePlanningGroupMomentMock.mockResolvedValue({
      id: momentId,
      status: "gearchiveerd"
    });

    render(<MomentDetailPage />);

    expect(await screen.findByRole("button", { name: "Archiveren" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Archiveren" }));

    await waitFor(() =>
      expect(archivePlanningGroupMomentMock).toHaveBeenCalledWith({
        momentId
      })
    );
    expect(
      await screen.findByText("Planningmoment is gearchiveerd.")
    ).toBeInTheDocument();
  });

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
