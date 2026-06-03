import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MijnDagPage from "@/app/mijn-dag/page";
import { fetchMijnDagItems } from "@/src/lib/mijn-dag/items";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";
import { fetchOpenMomentProposalsForProfile } from "@/src/lib/voorstellen/items";
import {
  createSamzoContext,
  currentDayIsoAt,
  SAM_PROFILE_ID
} from "@/tests/fixtures/samzo";

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
});
