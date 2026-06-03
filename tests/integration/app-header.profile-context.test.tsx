import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppHeader } from "@/components/app-header";
import * as currentContext from "@/src/lib/samzo/current-context";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

vi.mock("@/src/lib/samzo/current-context", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/src/lib/samzo/current-context")
  >();
  return {
    ...actual,
    fetchCurrentSamzoContext: vi.fn(),
    writeStoredActiveProfileId: vi.fn()
  };
});

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

type HeaderProfile = {
  id: string;
  persoon_id: string;
  weergavenaam: string;
  status: "actief";
  avatar_url: null;
  zichtbaar_voor_leden: true;
};

const samProfile: HeaderProfile = {
  id: "10000000-0000-4000-8000-000000000004",
  persoon_id: "00000000-0000-4000-8000-000000000004",
  weergavenaam: "Sam Bewoner",
  status: "actief",
  avatar_url: null,
  zichtbaar_voor_leden: true
};

const basProfile: HeaderProfile = {
  id: "10000000-0000-4000-8000-000000000001",
  persoon_id: "00000000-0000-4000-8000-000000000001",
  weergavenaam: "Bas Beheerder",
  status: "actief",
  avatar_url: null,
  zichtbaar_voor_leden: true
};

const gijsProfile: HeaderProfile = {
  id: "10000000-0000-4000-8000-000000000005",
  persoon_id: "00000000-0000-4000-8000-000000000005",
  weergavenaam: "Gijs Gast",
  status: "actief",
  avatar_url: null,
  zichtbaar_voor_leden: true
};

const milanProfile: HeaderProfile = {
  id: "10000000-0000-4000-8000-000000000003",
  persoon_id: "00000000-0000-4000-8000-000000000003",
  weergavenaam: "Milan Medewerker",
  status: "actief",
  avatar_url: null,
  zichtbaar_voor_leden: true
};

const authUser = {
  id: "auth-main",
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-06-03T00:00:00.000Z",
  user_metadata: {}
};

const createContext = (params: {
  ownProfiel: HeaderProfile;
  profielen: HeaderProfile[];
  currentProfiel: HeaderProfile | null;
}) => ({
  authUser,
  persoon: {
    id: authUser.id,
    auth_user_id: "link-" + authUser.id,
    email: "sam.bewoner@example.test",
    accountnaam: "Sam Bewoner",
    systeemrol: "lid" as const,
    status: "actief" as const
  },
  ownProfiel: params.ownProfiel,
  profielen: params.profielen,
  currentProfiel: params.currentProfiel
});

const fetchCurrentSamzoContextMock = vi.mocked(
  currentContext.fetchCurrentSamzoContext
);
const writeStoredActiveProfileIdMock = vi.mocked(
  currentContext.writeStoredActiveProfileId
);
const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);

describe("AppHeader profielswitchgedrag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCurrentSamzoContextMock.mockReset();
    writeStoredActiveProfileIdMock.mockReset();
    const onAuthStateChange = vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }));

    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        onAuthStateChange
      }
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    window.localStorage.clear();
  });

  it("toont geen profielwisselaar wanneer er maar een actief profiel beschikbaar is", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createContext({
        ownProfiel: samProfile,
        profielen: [samProfile],
        currentProfiel: samProfile
      })
    );

    render(<AppHeader />);

    expect(
      (await screen.findAllByText("Sam Bewoner")).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("combobox", { name: "Bekijk als" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Ingelogd profiel")).toBeInTheDocument();
  });

  it("toont een profielselector en wijzigt de actieve profiellabel na selectie", async () => {
    const user = userEvent.setup();
    const sharedAuthContext = createContext({
      ownProfiel: basProfile,
      profielen: [basProfile, milanProfile],
      currentProfiel: basProfile
    });
    const switchedAuthContext = createContext({
      ownProfiel: basProfile,
      profielen: [basProfile, milanProfile],
      currentProfiel: milanProfile
    });

    fetchCurrentSamzoContextMock.mockResolvedValueOnce(sharedAuthContext);
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(switchedAuthContext);

    render(<AppHeader />);

    const switcher = await screen.findByRole("combobox", {
      name: "Bekijk als"
    });
    await user.selectOptions(switcher, milanProfile.id);

    expect(writeStoredActiveProfileIdMock).toHaveBeenCalledWith(milanProfile.id);
    expect(screen.getAllByText("Ingelogd profiel")).toHaveLength(1);
    expect(screen.getAllByText("Bas Beheerder").length).toBeGreaterThan(1);
    expect(screen.getByText("Bekijkt profiel")).toBeInTheDocument();
    expect(
      (await screen.findAllByText("Milan Medewerker")).length
    ).toBeGreaterThan(1);
    expect(sharedAuthContext.authUser.id).toBe(switchedAuthContext.authUser.id);
    expect(
      screen.queryByText(switchedAuthContext.persoon.auth_user_id)
    ).not.toBeInTheDocument();
  });

  it("houdt het ingelogde profiel stabiel wanneer bekeken profiel wisselt", async () => {
    const user = userEvent.setup();
    const ownFirst = createContext({
      ownProfiel: basProfile,
      profielen: [basProfile, milanProfile],
      currentProfiel: basProfile
    });
    const switched = createContext({
      ownProfiel: basProfile,
      profielen: [basProfile, milanProfile],
      currentProfiel: milanProfile
    });
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(ownFirst);
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(switched);

    const { container } = render(<AppHeader />);
    const switcher = await screen.findByRole("combobox", {
      name: "Bekijk als"
    });
    await user.selectOptions(switcher, milanProfile.id);

    const profileModeValues = container.querySelectorAll(
      ".app-header__profile-mode-value"
    );
    expect(profileModeValues.length).toBe(2);
    expect(profileModeValues[0]).toHaveTextContent("Bas Beheerder");
    expect(profileModeValues[1]).toHaveTextContent("Milan Medewerker");
  });

  it("verbergt 'Bekijkt profiel' wanneer de eigen actieve profiel bekeken wordt", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createContext({
        ownProfiel: basProfile,
        profielen: [basProfile, milanProfile],
        currentProfiel: basProfile
      })
    );

    render(<AppHeader />);

    expect(screen.queryByText("Bekijkt profiel")).not.toBeInTheDocument();
  });

  it("toont alleen de toegestane profielen in de profielselector voor medewerker", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createContext({
        ownProfiel: milanProfile,
        profielen: [milanProfile, samProfile],
        currentProfiel: milanProfile
      })
    );

    render(<AppHeader />);

    const switcher = await screen.findByRole("combobox", {
      name: "Bekijk als"
    });
    const options = Array.from(switcher.querySelectorAll("option"));

    expect(options).toHaveLength(2);
    expect(screen.getByRole("option", { name: "Milan Medewerker" }))
      .toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sam Bewoner" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Sanne Systeemondersteuner" })
    ).not.toBeInTheDocument();
  });

  it("houdt gastscenario beperkt tot een profiel en verbergt interne groepscontext", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createContext({
        ownProfiel: gijsProfile,
        profielen: [gijsProfile],
        currentProfiel: gijsProfile
      })
    );

    render(<AppHeader />);

    expect(
      (await screen.findAllByText("Gijs Gast")).length
    ).toBeGreaterThan(1);
    expect(screen.getByText("Ingelogd profiel")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Bekijk als" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Medewerkers")).not.toBeInTheDocument();
    expect(screen.queryByText("Bewoners")).not.toBeInTheDocument();
  });

  it("verbergt technische accountvelden in profielcontextweergave", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce(
      createContext({
        ownProfiel: gijsProfile,
        profielen: [gijsProfile],
        currentProfiel: gijsProfile
      })
    );

    render(<AppHeader />);

    expect(
      (await screen.findAllByText("Gijs Gast")).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("auth-main")).not.toBeInTheDocument();
    expect(screen.queryByText("link-auth-main")).not.toBeInTheDocument();
  });

  it("handelt ontbrekende actieve profielselectie rustig af", async () => {
    fetchCurrentSamzoContextMock.mockResolvedValueOnce({
      ...createContext({
        ownProfiel: basProfile,
        profielen: [basProfile],
        currentProfiel: basProfile
      }),
      currentProfiel: null
    });

    render(<AppHeader />);

    expect(await screen.findByText("Ingelogd profiel")).toBeInTheDocument();
    expect(await screen.findByText("Bekijkt profiel")).toBeInTheDocument();
    expect(await screen.findByText("Geen actief profiel")).toBeInTheDocument();
    expect((await screen.findAllByText("Bas Beheerder")).length).toBeGreaterThan(1);
  });
});
