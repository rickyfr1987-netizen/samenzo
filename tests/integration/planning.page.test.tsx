import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlanningPage from "@/app/planning/page";
import {
  fetchPlanningFilterCategories,
  fetchPlanningMoments,
  type PlanningMoment
} from "@/src/lib/planning/moments";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";
import { createSamzoContext, currentDayIsoAt } from "@/tests/fixtures/samzo";

const replaceMock = vi.fn();
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/planning"),
  useRouter: vi.fn(() => ({ replace: replaceMock })),
  useSearchParams: vi.fn(() => searchParams)
}));

vi.mock("@/src/lib/samzo/current-context", () => ({
  fetchCurrentSamzoContext: vi.fn()
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

vi.mock("@/src/lib/dev/profile-context", () => ({
  DEVELOPMENT_PROFILES: [],
  getDevelopmentProfileById: vi.fn(() => null),
  isDevelopmentProfileContextEnabled: vi.fn(() => false),
  readStoredDevelopmentProfileId: vi.fn(() => null),
  writeStoredDevelopmentProfileId: vi.fn()
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchPlanningMomentsMock = vi.mocked(fetchPlanningMoments);
const fetchPlanningFilterCategoriesMock = vi.mocked(fetchPlanningFilterCategories);

function createPlanningMoment(overrides: Partial<PlanningMoment> = {}) {
  return {
    categoryId: null,
    categoryName: "Beweging",
    description: "Samen rustig zwemmen.",
    endsAt: currentDayIsoAt(12),
    groupIds: ["groep-1"],
    id: "moment-zwemmen",
    isAllDay: false,
    location: "Zwembad",
    startsAt: currentDayIsoAt(11),
    status: "open",
    title: "Zwemmen test",
    ...overrides
  } satisfies PlanningMoment;
}

beforeEach(() => {
  fetchCurrentSamzoContextMock.mockReset();
  fetchPlanningMomentsMock.mockReset();
  fetchPlanningFilterCategoriesMock.mockReset();
  replaceMock.mockReset();
  searchParams.delete("from");
  searchParams.delete("to");
  searchParams.delete("category");
  searchParams.delete("status");
  window.localStorage.clear();
});

describe("Planning laden", () => {
  it("toont RLS-zichtbare momenten zonder technische foutstaat", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    expect(
      await screen.findByRole("heading", { name: "Zwemmen test" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Planning kon niet worden geladen" })
    ).not.toBeInTheDocument();
    expect(fetchPlanningMomentsMock).toHaveBeenCalledWith({
      categoryId: null,
      dateFrom: null,
      dateTo: null,
      status: null
    });
  });

  it("toont geen zichtbare groepsfilter voor reguliere gebruikers", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    expect(await screen.findByRole("heading", { name: "Zwemmen test" })).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Groep" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Tag" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Tags" })
    ).not.toBeInTheDocument();
  });

  it("laadt momenten met statusfilter uit de filterset", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    const statusSelect = await screen.findByLabelText("Status");
    fireEvent.change(statusSelect, { target: { value: "open" } });

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/planning?status=open", {
        scroll: false
      })
    );
    await waitFor(() =>
      expect(fetchPlanningMomentsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: "open"
        })
      )
    );
  });

  it("update de datumfilter en querystatus in de URL", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    const fromDate = await screen.findByLabelText("Vanaf datum");
    fireEvent.change(fromDate, { target: { value: "2026-06-04" } });

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/planning?from=2026-06-04", {
        scroll: false
      })
    );
    await waitFor(() =>
      expect(fetchPlanningMomentsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dateFrom: "2026-06-04",
          dateTo: null,
          categoryId: null,
          status: null
        })
      )
    );
  });

  it("ververst de planning na profielwissel en herlaadt zichtbare momenten", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createSamzoContext({
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          weergavenaam: "Bas Beheerder",
          id: "10000000-0000-4000-8000-000000000001"
        }
      })
    );
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createSamzoContext({
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          weergavenaam: "Milan Medewerker",
          id: "10000000-0000-4000-8000-000000000003"
        }
      })
    );
    fetchPlanningMomentsMock.mockResolvedValueOnce([
      createPlanningMoment({
        id: "moment-bas",
        title: "Open rolsessie"
      })
    ]);
    fetchPlanningMomentsMock.mockResolvedValueOnce([
      createPlanningMoment({
        id: "moment-milan",
        title: "Milan moment"
      })
    ]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    window.localStorage.setItem(
      "samzo.activeProfileId",
      "10000000-0000-4000-8000-000000000001"
    );

    render(<PlanningPage />);

    expect(await screen.findByRole("heading", { name: "Open rolsessie" })).toBeInTheDocument();
    expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(1);
    expect(fetchPlanningMomentsMock).toHaveBeenCalledTimes(1);

    window.localStorage.setItem(
      "samzo.activeProfileId",
      "10000000-0000-4000-8000-000000000003"
    );
    window.dispatchEvent(new Event("samzo:activeProfileChanged"));

    expect(await screen.findByRole("heading", { name: "Milan moment" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchCurrentSamzoContextMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(fetchPlanningMomentsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("toont een rustige lege staat bij filters zonder resultaten", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValueOnce([createPlanningMoment()]);
    fetchPlanningMomentsMock.mockResolvedValueOnce([]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([
      { id: "cat-empty", name: "Lege test" }
    ]);

    render(<PlanningPage />);

    const categorySelect = await screen.findByLabelText("Categorie");
    fireEvent.change(categorySelect, { target: { value: "cat-empty" } });

    await waitFor(() => {
      expect(fetchPlanningMomentsMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() =>
      expect(screen.getByText("Geen zichtbare momenten")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        "Probeer een andere combinatie van filters; er zijn geen momenten binnen deze selectie."
      )
    ).toBeInTheDocument();
  });

  it("reset filterherstel terug naar standaard zonder queryparameters", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([
      createPlanningMoment()
    ]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([
      { id: "cat-open", name: "Open" }
    ]);

    render(<PlanningPage />);

    const categorySelect = await screen.findByLabelText("Categorie");
    fireEvent.change(categorySelect, { target: { value: "cat-open" } });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/planning?category=cat-open",
        { scroll: false }
      );
    });

    fireEvent.change(categorySelect, { target: { value: "" } });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/planning", { scroll: false });
    });
  });

  it("linkt planningkaart naar detailpagina", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    const planningLinks = await screen.findAllByRole("link");
    const titleLink = planningLinks.find(
      (link) => link.getAttribute("href") === "/planning/moment-zwemmen"
    );

    expect(titleLink).toBeDefined();
    if (titleLink) {
      expect(titleLink).toHaveAttribute("href", "/planning/moment-zwemmen");
    }
  });

  it("laadt gefilterde opties uit de status-, categorie- en datumkeuzes", async () => {
    const filteredMoment = createPlanningMoment({
      id: "moment-open-zondag",
      title: "Vrijwilligerswerk",
      categoryName: "Ontmoeting"
    });
    const categoryId = "cat-1";

    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningFilterCategoriesMock.mockResolvedValue([
      { id: categoryId, name: "Ontmoeting" }
    ]);
    fetchPlanningMomentsMock.mockResolvedValue([filteredMoment]);

    render(<PlanningPage />);

    expect(await screen.findByLabelText("Categorie")).toBeInTheDocument();

    const categorySelect = screen.getByLabelText("Categorie");
    fireEvent.change(categorySelect, { target: { value: categoryId } });

    const dateFrom = screen.getByLabelText("Vanaf datum");
    fireEvent.change(dateFrom, { target: { value: "2026-06-04" } });

    const dateTo = screen.getByLabelText("Tot en met datum");
    fireEvent.change(dateTo, { target: { value: "2026-06-06" } });

    await waitFor(() =>
      expect(fetchPlanningMomentsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categoryId,
          dateFrom: "2026-06-04",
          dateTo: "2026-06-06",
          status: null
        })
      )
    );

    expect(
      await screen.findByRole("heading", { name: "Vrijwilligerswerk" })
    ).toBeInTheDocument();
    const [urlState, { scroll }] = replaceMock.mock.calls.at(-1) ?? ["", {}];
    expect(urlState).toContain("category=cat-1");
    expect(urlState).toContain("from=2026-06-04");
    expect(urlState).toContain("to=2026-06-06");
    expect(urlState).not.toContain("group=");
    expect(scroll).toBe(false);
    expect(replaceMock).toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalledWith("/planning", { scroll: false });
  });

  it("verbergt verborgen technische internals en auth_user_id in de planningpagina", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createSamzoContext({
        persoon: {
          ...createSamzoContext().persoon!,
          auth_user_id: "auth-internal-token"
        }
      })
    );
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    expect(
      await screen.findByRole("heading", { name: "Zwemmen test" })
    ).toBeInTheDocument();
    expect(screen.queryByText("auth-internal-token")).not.toBeInTheDocument();
    expect(screen.queryByText("auth-sam")).not.toBeInTheDocument();
  });

  it("toont geen interne groepscontext bij gast-achtige restricties in filterweergave", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createSamzoContext({
        persoon: {
          ...createSamzoContext().persoon!,
          auth_user_id: "guest-token"
        },
        ownProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: "10000000-0000-4000-8000-000000000005",
          weergavenaam: "Gijs Gast"
        },
        currentProfiel: {
          ...createSamzoContext().currentProfiel!,
          id: "10000000-0000-4000-8000-000000000005",
          weergavenaam: "Gijs Gast"
        },
        profielen: [
          {
            ...createSamzoContext().currentProfiel!,
            id: "10000000-0000-4000-8000-000000000005",
            weergavenaam: "Gijs Gast"
          }
        ]
      })
    );
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);

    render(<PlanningPage />);

    expect(await screen.findByRole("heading", { name: "Zwemmen test" })).toBeInTheDocument();
    expect(
      screen.queryByText("Alle groepen")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Groep" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Medewerkers")).not.toBeInTheDocument();
    expect(screen.queryByText("Bewoners")).not.toBeInTheDocument();
  });
});
