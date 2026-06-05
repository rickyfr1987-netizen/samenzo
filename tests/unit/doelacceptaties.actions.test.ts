import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  acceptDoelacceptatie,
  bekijkDoelacceptatieLater,
  respondToDoelacceptatie,
  weigerDoelacceptatie
} from "@/src/lib/doelacceptaties/actions";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { SAM_PROFILE_ID } from "@/tests/fixtures/samzo";

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);

function mockGoalAcceptanceRpc(result: {
  data: {
    acceptatie_id: string;
    doel_id: string;
    profiel_id: string;
    doelacceptatie_status: "geaccepteerd" | "geweigerd" | "later_bekijken";
    geaccepteerd_at: string | null;
    geweigerd_at: string | null;
    later_bekijken_at: string | null;
  } | null;
  error: null | { message: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn(() => ({ maybeSingle }));

  getSupabaseBrowserClientMock.mockReturnValue({
    rpc
  } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

  return { maybeSingle, rpc };
}

describe("doelacceptatieacties", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
  });

  it("accepteert een doelacceptatie via de gecontroleerde RPC", async () => {
    const { rpc } = mockGoalAcceptanceRpc({
      data: {
        acceptatie_id: "acceptatie-accept",
        doel_id: "doel-1",
        profiel_id: SAM_PROFILE_ID,
        doelacceptatie_status: "geaccepteerd",
        geaccepteerd_at: "2026-06-05T20:00:00.000Z",
        geweigerd_at: null,
        later_bekijken_at: null
      },
      error: null
    });

    const result = await acceptDoelacceptatie({
      acceptatieId: "acceptatie-accept",
      profielId: SAM_PROFILE_ID
    });

    expect(rpc).toHaveBeenCalledWith("beantwoord_doelacceptatie", {
      antwoord: "accept",
      target_acceptatie_id: "acceptatie-accept",
      target_profiel_id: SAM_PROFILE_ID
    });
    expect(result).toEqual({
      goalId: "doel-1",
      id: "acceptatie-accept",
      profileId: SAM_PROFILE_ID,
      status: "geaccepteerd"
    });
  });

  it("weigert en later-bekijkt via dezelfde RPC met alleen het actiewoord anders", async () => {
    const { rpc } = mockGoalAcceptanceRpc({
      data: {
        acceptatie_id: "acceptatie-reject",
        doel_id: "doel-2",
        profiel_id: SAM_PROFILE_ID,
        doelacceptatie_status: "geweigerd",
        geaccepteerd_at: null,
        geweigerd_at: "2026-06-05T20:01:00.000Z",
        later_bekijken_at: null
      },
      error: null
    });

    await weigerDoelacceptatie({
      acceptatieId: "acceptatie-reject",
      profielId: SAM_PROFILE_ID
    });

    expect(rpc).toHaveBeenCalledWith("beantwoord_doelacceptatie", {
      antwoord: "reject",
      target_acceptatie_id: "acceptatie-reject",
      target_profiel_id: SAM_PROFILE_ID
    });

    const { rpc: laterRpc } = mockGoalAcceptanceRpc({
      data: {
        acceptatie_id: "acceptatie-later",
        doel_id: "doel-3",
        profiel_id: SAM_PROFILE_ID,
        doelacceptatie_status: "later_bekijken",
        geaccepteerd_at: null,
        geweigerd_at: null,
        later_bekijken_at: "2026-06-05T20:02:00.000Z"
      },
      error: null
    });

    await bekijkDoelacceptatieLater({
      acceptatieId: "acceptatie-later",
      profielId: SAM_PROFILE_ID
    });

    expect(laterRpc).toHaveBeenCalledWith("beantwoord_doelacceptatie", {
      antwoord: "later",
      target_acceptatie_id: "acceptatie-later",
      target_profiel_id: SAM_PROFILE_ID
    });
  });

  it("weigert onbekende acties voordat de RPC wordt aangeroepen", async () => {
    await expect(
      respondToDoelacceptatie(
        {
          acceptatieId: "acceptatie-unknown",
          profielId: SAM_PROFILE_ID
        },
        "archive" as "accept"
      )
    ).rejects.toThrow("Onbekende doelacceptatieactie.");

    expect(getSupabaseBrowserClientMock).not.toHaveBeenCalled();
  });

  it("toont een gebruikersveilige melding bij RLS-achtige RPC-fouten", async () => {
    mockGoalAcceptanceRpc({
      data: null,
      error: { message: "new row violates row-level security policy" }
    });

    await expect(
      acceptDoelacceptatie({
        acceptatieId: "acceptatie-rls",
        profielId: SAM_PROFILE_ID
      })
    ).rejects.toThrow(
      "Je kunt deze doelacceptatieactie niet uitvoeren met dit profiel."
    );
  });

  it("toont een specifieke melding wanneer de acceptatie niet meer open is", async () => {
    mockGoalAcceptanceRpc({
      data: null,
      error: { message: "Doelacceptatie is niet meer open." }
    });

    await expect(
      weigerDoelacceptatie({
        acceptatieId: "acceptatie-closed",
        profielId: SAM_PROFILE_ID
      })
    ).rejects.toThrow("Deze doelacceptatie is niet meer open.");
  });
});
