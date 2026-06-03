import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PlanningPage from "@/app/planning/page";
import { fetchPlanningMoments } from "@/src/lib/planning/moments";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";
import { createSamzoContext, currentDayIsoAt } from "@/tests/fixtures/samzo";

vi.mock("@/src/lib/samzo/current-context", () => ({
  fetchCurrentSamzoContext: vi.fn()
}));

vi.mock("@/src/lib/planning/moments", () => ({
  fetchPlanningMoments: vi.fn()
}));

vi.mock("@/src/lib/dev/profile-context", () => ({
  DEVELOPMENT_PROFILES: [],
  getDevelopmentProfileById: vi.fn(() => null),
  isDevelopmentProfileContextEnabled: vi.fn(() => false),
  readStoredDevelopmentProfileId: vi.fn(() => null),
  writeStoredDevelopmentProfileId: vi.fn()
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchPlanningMomentsMock = vi.mocked(fetchPlanningMoments);

describe("Planning laden", () => {
  it("toont RLS-zichtbare momenten zonder technische foutstaat", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchPlanningMomentsMock.mockResolvedValue([
      {
        categoryName: "Beweging",
        description: "Samen rustig zwemmen.",
        endsAt: currentDayIsoAt(12),
        id: "moment-zwemmen",
        isAllDay: false,
        location: "Zwembad",
        startsAt: currentDayIsoAt(11),
        status: "open",
        title: "Zwemmen test"
      }
    ]);

    render(<PlanningPage />);

    expect(
      await screen.findByRole("heading", { name: "Zwemmen test" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Planning kon niet worden geladen" })
    ).not.toBeInTheDocument();
  });
});
