import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlanningPage from "@/app/planning/page";
import {
  fetchPlanningFilterCategories,
  fetchPlanningFilterGroups,
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
    fetchPlanningFilterCategories: vi.fn(),
    fetchPlanningFilterGroups: vi.fn()
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
const fetchPlanningFilterGroupsMock = vi.mocked(fetchPlanningFilterGroups);

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
  fetchPlanningFilterGroupsMock.mockReset();
  replaceMock.mockReset();
  searchParams.delete("from");
  searchParams.delete("to");
  searchParams.delete("group");
  searchParams.delete("category");
  searchParams.delete("status");
});

describe("Planning laden", () => {
  it("toont RLS-zichtbare momenten zonder technische foutstaat", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);
    fetchPlanningFilterGroupsMock.mockResolvedValue([]);

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
      groupId: null,
      status: null
    });
  });

  it("laadt momenten met statusfilter uit de filterset", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([createPlanningMoment()]);
    fetchPlanningFilterCategoriesMock.mockResolvedValue([]);
    fetchPlanningFilterGroupsMock.mockResolvedValue([]);

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

  it("laadt gefilterde opties uit de status-, categorie- en groepkeuzes", async () => {
    const filteredMoment = createPlanningMoment({
      id: "moment-open-zondag",
      title: "Vrijwilligerswerk",
      categoryName: "Ontmoeting"
    });
    const categoryId = "cat-1";
    const groupId = "groep-1";

    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningFilterCategoriesMock.mockResolvedValue([
      { id: categoryId, name: "Ontmoeting" }
    ]);
    fetchPlanningFilterGroupsMock.mockResolvedValue([{ id: groupId, name: "Zorgteam" }]);
    fetchPlanningMomentsMock.mockResolvedValue([filteredMoment]);

    render(<PlanningPage />);

    expect(await screen.findByLabelText("Categorie")).toBeInTheDocument();
    expect(await screen.findByLabelText("Groep")).toBeInTheDocument();

    const categorySelect = screen.getByLabelText("Categorie");
    fireEvent.change(categorySelect, { target: { value: categoryId } });

    const groupSelect = screen.getByLabelText("Groep");
    fireEvent.change(groupSelect, { target: { value: groupId } });

    const dateFrom = screen.getByLabelText("Vanaf datum");
    fireEvent.change(dateFrom, { target: { value: "2026-06-04" } });

    const dateTo = screen.getByLabelText("Tot en met datum");
    fireEvent.change(dateTo, { target: { value: "2026-06-06" } });

    await waitFor(() =>
      expect(fetchPlanningMomentsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categoryId,
          groupId,
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
    expect(urlState).toContain("group=groep-1");
    expect(urlState).toContain("from=2026-06-04");
    expect(urlState).toContain("to=2026-06-06");
    expect(scroll).toBe(false);
    expect(replaceMock).toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalledWith("/planning", { scroll: false });
  });
});
