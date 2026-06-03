import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TijdlijnPage from "@/app/tijdlijn/page";
import type { TimelineItem } from "@/src/lib/tijdlijn/items";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";
import type { CurrentSamzoPersoon } from "@/src/lib/samzo/current-context";
import { fetchVisibleTimelineItems } from "@/src/lib/tijdlijn/items";
import {
  createSupportVraag,
  createSupportVraagResponse,
  markOwnSupportVraagSolved,
  updateSupportVraagStatus
} from "@/src/lib/tijdlijn/actions";
import {
  BAS_PROFILE_ID,
  createSamzoProfile,
  createSamzoContext,
  SAM_PERSOON_ID,
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

vi.mock("@/src/lib/tijdlijn/actions", () => ({
  createSupportVraag: vi.fn(),
  createSupportVraagResponse: vi.fn(),
  markOwnSupportVraagSolved: vi.fn(),
  updateSupportVraagStatus: vi.fn()
}));

const fetchCurrentSamzoContextMock = vi.mocked(fetchCurrentSamzoContext);
const fetchVisibleTimelineItemsMock = vi.mocked(fetchVisibleTimelineItems);
const createSupportVraagMock = vi.mocked(createSupportVraag);
const createSupportVraagResponseMock = vi.mocked(createSupportVraagResponse);
const markOwnSupportVraagSolvedMock = vi.mocked(markOwnSupportVraagSolved);
const updateSupportVraagStatusMock = vi.mocked(updateSupportVraagStatus);

const SANNE_PERSOON_ID = "00000000-0000-4000-8000-000000000005";
const SANNE_PROFILE_ID = "10000000-0000-4000-8000-000000000005";

function createSupportTimelineItem(
  overrides: Partial<TimelineItem> = {}
): TimelineItem {
  return {
    id: "support-vraag-1",
    source: "supportvraag",
    title: "Geen ondersteuning voor tablet",
    body: "Vraag over aanmelden met tablet op iPad.",
    status: "actie_nodig",
    urgency: "actie_nodig",
    createdAt: "2026-06-03T09:30:00.000Z",
    targetProfileId: SAM_PROFILE_ID,
    targetGroupId: null,
    proposalId: null,
    proposalReceivingProfileId: null,
    supportVraagCreatorPersonId: "00000000-0000-4000-8000-000000000004",
    supportResponseCount: 0,
    latestSupportResponse: null,
    related: null,
    ...overrides
  };
}

function createSupportContext(role: "lid" | "systeembeheerder" | "systeemondersteuner") {
  const base = createSamzoContext();
  const basePersoon = base.persoon as CurrentSamzoPersoon;
  const supportPersoon: CurrentSamzoPersoon = {
    id: basePersoon.id,
    auth_user_id: basePersoon.auth_user_id ?? null,
    email: basePersoon.email,
    accountnaam: basePersoon.accountnaam,
    systeemrol: role,
    status: "actief"
  };

  return createSamzoContext({
    persoon: supportPersoon
  });
}

function createSanneContextViewingSanne() {
  const sanneProfile = createSamzoProfile({
    id: SANNE_PROFILE_ID,
    persoon_id: SANNE_PERSOON_ID,
    weergavenaam: "Sanne Systeemondersteuner"
  });

  return createSamzoContext({
    persoon: {
      id: SANNE_PERSOON_ID,
      auth_user_id: "auth-sanne",
      email: "sanne.support@example.test",
      accountnaam: "Sanne Systeemondersteuner",
      systeemrol: "systeemondersteuner",
      status: "actief"
    },
    currentProfiel: sanneProfile,
    ownProfiel: sanneProfile,
    profielen: [sanneProfile]
  });
}

function createSanneContextViewingSam() {
  const sanneProfile = createSamzoProfile({
    id: SANNE_PROFILE_ID,
    persoon_id: SANNE_PERSOON_ID,
    weergavenaam: "Sanne Systeemondersteuner"
  });
  const samProfile = createSamzoProfile();

  return createSamzoContext({
    persoon: {
      id: SANNE_PERSOON_ID,
      auth_user_id: "auth-sanne",
      email: "sanne.support@example.test",
      accountnaam: "Sanne Systeemondersteuner",
      systeemrol: "systeemondersteuner",
      status: "actief"
    },
    currentProfiel: samProfile,
    ownProfiel: sanneProfile,
    profielen: [sanneProfile, samProfile]
  });
}

beforeEach(() => {
  fetchCurrentSamzoContextMock.mockReset();
  fetchVisibleTimelineItemsMock.mockReset();
  createSupportVraagMock.mockReset();
  createSupportVraagResponseMock.mockReset();
  markOwnSupportVraagSolvedMock.mockReset();
  updateSupportVraagStatusMock.mockReset();
});

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
        targetProfileId: SAM_PROFILE_ID,
        targetGroupId: null,
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
        targetProfileId: BAS_PROFILE_ID,
        targetGroupId: null,
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

  it("toont geen supportacties voor reguliere gebruikers", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSupportContext("lid"));
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createSupportTimelineItem()
    ]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Geen ondersteuning voor tablet"
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Markeer actie nodig" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Afhandelen" })
    ).not.toBeInTheDocument();
  });

  it("toont supportacties voor ondersteunende rollen", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createSanneContextViewingSanne()
    );
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createSupportTimelineItem({
        id: "support-vraag-beheer",
        title: "Melding toestelinstelling",
        urgency: "actie_nodig",
        status: "actie_nodig"
      })
    ]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", { name: "Melding toestelinstelling" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Afhandelen" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Markeer afgehandeld" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Afhandelen" })
    ).toBeInTheDocument();
    expect(fetchVisibleTimelineItemsMock).toHaveBeenCalledWith({
      supportContext: { kind: "supportHandlerContext" }
    });
  });

  it("toont bekeken profielcontext zonder supporthandler-knoppen", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSanneContextViewingSam());
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createSupportTimelineItem({
        id: "support-sam-viewed",
        supportVraagCreatorPersonId: SAM_PERSOON_ID,
        targetProfileId: SAM_PROFILE_ID,
        hasSupportResponse: true,
        latestSupportResponse: {
          id: "resp-support",
          content: "Support heeft gereageerd.",
          isSupportResponse: true,
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      })
    ]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Geen ondersteuning voor tablet"
      })
    ).toBeInTheDocument();
    expect(fetchVisibleTimelineItemsMock).toHaveBeenCalledWith({
      supportContext: {
        kind: "viewedProfileContext",
        profileId: SAM_PROFILE_ID
      }
    });
    expect(
      screen.queryByRole("button", { name: "Markeer afgehandeld" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Antwoord toevoegen")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dit is opgelost" })
    ).not.toBeInTheDocument();
  });

  it("maakt een supportvraag aan vanuit de Tijdlijn met het actieve profiel", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSupportContext("lid"));
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([]);
    createSupportVraagMock.mockResolvedValue({
      id: "support-nieuw",
      onderwerp: "Tablet hapering",
      status: "nieuw"
    });

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", { name: "Nieuwe supportvraag" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Onderwerp"), {
      target: { value: "Tablet hapering" }
    });
    fireEvent.change(screen.getByLabelText("Omschrijving"), {
      target: { value: "Ik krijg een foutmelding bij inloggen." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Supportvraag insturen" }));

    await waitFor(() =>
      expect(createSupportVraagMock).toHaveBeenCalledWith({
        profielId: SAM_PROFILE_ID,
        persoonId: "00000000-0000-4000-8000-000000000004",
        onderwerp: "Tablet hapering",
        omschrijving: "Ik krijg een foutmelding bij inloggen."
      })
    );
    expect(await screen.findByText("Supportvraag is opgeslagen.")).toBeInTheDocument();
  });

  it("toont een rustige fout als supportvragen niet vanuit het eigen profiel kunnen worden aangemaakt", async () => {
    const switchedContext = createSamzoContext({
      ownProfiel: {
        ...createSamzoProfile(),
        weergavenaam: "Sam Bewoner"
      },
      currentProfiel: createSamzoProfile({
        id: "20000000-0000-4000-8000-000000000099",
        persoon_id: "00000000-0000-4000-8000-000000000003",
        weergavenaam: "Milan Medewerker"
      })
    });

    fetchCurrentSamzoContextMock.mockResolvedValue(switchedContext);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", { name: "Nieuwe supportvraag" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Onderwerp"), {
      target: { value: "Tablet hapering" }
    });
    fireEvent.change(screen.getByLabelText("Omschrijving"), {
      target: { value: "Ik krijg een foutmelding bij inloggen." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Supportvraag insturen" }));

    expect(createSupportVraagMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Supportvragen worden vanaf je eigen profiel aangemaakt. Selecteer hiervoor je eigen profiel."
      )
    ).toBeInTheDocument();
  });

  it("laat supportbeheerder een supportvraagstatus updaten via veilige update", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createSanneContextViewingSanne()
    );
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "actie_nodig",
        supportVraagCreatorPersonId: SAM_PERSOON_ID,
        targetProfileId: SAM_PROFILE_ID
      })
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "afgehandeld",
        supportVraagCreatorPersonId: SAM_PERSOON_ID,
        targetProfileId: SAM_PROFILE_ID
      })
    ]);
    updateSupportVraagStatusMock.mockResolvedValue({
      id: "support-update",
      onderwerp: "Geen ondersteuning voor tablet",
      status: "afgehandeld"
    });

    render(<TijdlijnPage />);

    const doneButton = await screen.findByRole("button", {
      name: "Markeer afgehandeld"
    });
    fireEvent.click(doneButton);

    await waitFor(() =>
      expect(updateSupportVraagStatusMock).toHaveBeenCalledWith({
        persoonId: SANNE_PERSOON_ID,
        supportVraagId: "support-update",
        status: "afgehandeld"
      })
    );
    expect(await screen.findByText("Supportstatus is bijgewerkt.")).toBeInTheDocument();
  });

  it("laat aanvrager reageren op eigen supportvraag en status terug naar actie nodig", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSupportContext("lid"));
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "actie_nodig",
        supportResponseCount: 0,
        latestSupportResponse: null
      })
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "actie_nodig",
        supportResponseCount: 1,
        latestSupportResponse: {
          id: "resp-1",
          content: "Ik heb nog een vraag.",
          isSupportResponse: false,
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      })
    ]);
    createSupportVraagResponseMock.mockResolvedValue({
      id: "resp-1",
      inhoud: "Ik heb nog een vraag.",
      isSupportAntwoord: false,
      nextStatus: "actie_nodig"
    });

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Geen ondersteuning voor tablet"
      })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ik heb nog een vraag"), {
      target: { value: "Kan je nogmaals controleren?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Reageren" }));

    await waitFor(() =>
      expect(createSupportVraagResponseMock).toHaveBeenCalledWith({
        inhoud: "Kan je nogmaals controleren?",
        isSupportAntwoord: false,
        nextStatusOnCreate: "actie_nodig",
        profielId: SAM_PROFILE_ID,
        persoonId: "00000000-0000-4000-8000-000000000004",
        supportVraagId: "support-update"
      })
    );
    expect(await screen.findByText("Je reactie is opgeslagen.")).toBeInTheDocument();
  });

  it("laat support reageren en een actieve supportactie bijwerken", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(
      createSanneContextViewingSanne()
    );
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "actie_nodig",
        supportResponseCount: 0,
        latestSupportResponse: null,
        supportVraagCreatorPersonId: SAM_PERSOON_ID,
        targetProfileId: SAM_PROFILE_ID
      })
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "in_behandeling",
        supportResponseCount: 1,
        supportVraagCreatorPersonId: SAM_PERSOON_ID,
        targetProfileId: SAM_PROFILE_ID,
        latestSupportResponse: {
          id: "resp-2",
          content: "Support kijkt mee.",
          isSupportResponse: true,
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      })
    ]);
    createSupportVraagResponseMock.mockResolvedValue({
      id: "resp-2",
      inhoud: "Support kijkt mee.",
      isSupportAntwoord: true,
      nextStatus: "actie_nodig"
    });

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Geen ondersteuning voor tablet"
      })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Antwoord toevoegen"), {
      target: { value: "Support kijkt mee." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Reageren" }));

    await waitFor(() =>
      expect(createSupportVraagResponseMock).toHaveBeenCalledWith({
        inhoud: "Support kijkt mee.",
        isSupportAntwoord: true,
        nextStatusOnCreate: "actie_nodig",
        profielId: SANNE_PROFILE_ID,
        persoonId: SANNE_PERSOON_ID,
        supportVraagId: "support-update"
      })
    );
    expect(await screen.findByText("Je reactie is opgeslagen.")).toBeInTheDocument();
  });

  it("laat een aanvrager aangeven dat de vraag kan worden gesloten", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSupportContext("lid"));
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "actie_nodig",
        supportResponseCount: 2,
        hasSupportResponse: true,
        latestSupportResponse: {
          id: "resp-3",
          content: "Alles werkt nu.",
          isSupportResponse: true,
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      })
    ]);
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-update",
        status: "gesloten",
        supportResponseCount: 1
      })
    ]);
    markOwnSupportVraagSolvedMock.mockResolvedValue({
      id: "support-update",
      onderwerp: "Geen ondersteuning voor tablet",
      status: "gesloten"
    });

    render(<TijdlijnPage />);

    const closeButton = await screen.findByRole("button", {
      name: "Dit is opgelost"
    });
    fireEvent.click(closeButton);

    await waitFor(() =>
      expect(markOwnSupportVraagSolvedMock).toHaveBeenCalledWith({
        persoonId: "00000000-0000-4000-8000-000000000004",
        profielId: SAM_PROFILE_ID,
        supportVraagId: "support-update",
      })
    );
    expect(updateSupportVraagStatusMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Fijn, deze supportvraag is als opgelost gemarkeerd."
      )
    ).toBeInTheDocument();
  });

  it("toont de opgelost-knop na supportantwoord zolang de vraag niet gesloten of afgehandeld is", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSupportContext("lid"));
    fetchVisibleTimelineItemsMock.mockResolvedValueOnce([
      createSupportTimelineItem({
        id: "support-in-behandeling",
        status: "in_behandeling",
        hasSupportResponse: true,
        latestSupportResponse: {
          id: "resp-2",
          content: "We zijn ermee bezig.",
          isSupportResponse: true,
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      })
    ]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", { name: "Geen ondersteuning voor tablet" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dit is opgelost" })
    ).toBeInTheDocument();
  });

  it("toont geen sluitknop zonder supportantwoord op de supportvraag", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValue(createSupportContext("lid"));
    fetchVisibleTimelineItemsMock.mockResolvedValue([
      createSupportTimelineItem({
        id: "support-update",
        status: "actie_nodig",
        supportResponseCount: 1,
        hasSupportResponse: false,
        latestSupportResponse: {
          id: "resp-4",
          content: "Ik wacht op antwoord.",
          isSupportResponse: false,
          createdAt: "2026-06-03T10:00:00.000Z"
        }
      })
    ]);

    render(<TijdlijnPage />);

    expect(
      await screen.findByRole("heading", { name: "Geen ondersteuning voor tablet" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dit is opgelost" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Markeer afgehandeld" })
    ).not.toBeInTheDocument();
  });
});
