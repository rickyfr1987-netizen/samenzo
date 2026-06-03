import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TijdlijnPage from "@/app/tijdlijn/page";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";
import { fetchVisibleTimelineItems } from "@/src/lib/tijdlijn/items";
import {
  BAS_PROFILE_ID,
  createSamzoContext,
  SAM_PROFILE_ID
} from "@/tests/fixtures/samzo";

vi.mock("@/src/lib/samzo/current-context", () => ({
  fetchCurrentSamzoContext: vi.fn()
}));

vi.mock("@/src/lib/tijdlijn/items", () => ({
  fetchVisibleTimelineItems: vi.fn()
}));

vi.mock("@/src/lib/voorstellen/actions", () => ({
  acceptVoorstel: vi.fn(),
  declineVoorstel: vi.fn()
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchVisibleTimelineItemsMock = vi.mocked(fetchVisibleTimelineItems);

describe("Tijdlijn voorstelknoppen", () => {
  it("toont accept/weiger alleen voor het ontvangende profiel", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSamzoContext());
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      {
        body: "Voorstel voor Sam.",
        createdAt: "2026-06-03T09:00:00.000Z",
        id: "voorstel-sam",
        proposalId: "voorstel-sam",
        proposalReceivingProfileId: SAM_PROFILE_ID,
        related: { id: "moment-sam", type: "moment" },
        source: "voorstel",
        status: "open",
        title: "Koffieochtend",
        urgency: "actie_nodig"
      },
      {
        body: "Voorstel voor Bas.",
        createdAt: "2026-06-03T10:00:00.000Z",
        id: "voorstel-bas",
        proposalId: "voorstel-bas",
        proposalReceivingProfileId: BAS_PROFILE_ID,
        related: { id: "moment-bas", type: "moment" },
        source: "voorstel",
        status: "open",
        title: "Beheeroverleg",
        urgency: "actie_nodig"
      }
    ]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", { name: "Koffieochtend" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Beheeroverleg" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Accepteren" })).toHaveLength(
      1
    );
    expect(screen.getAllByRole("button", { name: "Afwijzen" })).toHaveLength(1);
  });
});
