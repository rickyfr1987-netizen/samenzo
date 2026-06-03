import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
  acceptVoorstel,
  declineVoorstel
} from "@/src/lib/voorstellen/actions";
import { SAM_PERSOON_ID, SAM_PROFILE_ID } from "@/tests/fixtures/samzo";

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);

function mockProposalRpc(result: {
  data: {
    voorstel_id: string;
    voorstel_titel: string | null;
    voorstel_type: "deelname_aan_moment" | "uitnodiging_moment";
    gekoppeld_type: string;
    gekoppeld_id: string;
    voorstel_status: "geaccepteerd" | "geweigerd";
    deelname_id: string | null;
    deelname_status: "geaccepteerd" | "geweigerd" | "ingeschreven" | null;
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

describe("voorstelacties", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
  });

  it("accepteert een voorstel via de gecontroleerde momentvoorstel-RPC", async () => {
    const { rpc } = mockProposalRpc({
      data: {
        voorstel_id: "voorstel-accept",
        voorstel_titel: "Samen koken",
        voorstel_type: "deelname_aan_moment",
        gekoppeld_type: "moment",
        gekoppeld_id: "moment-1",
        voorstel_status: "geaccepteerd",
        deelname_id: "deelname-1",
        deelname_status: "geaccepteerd"
      },
      error: null
    });

    const result = await acceptVoorstel({
      persoonId: SAM_PERSOON_ID,
      profielId: SAM_PROFILE_ID,
      voorstelId: "voorstel-accept"
    });

    expect(rpc).toHaveBeenCalledWith("beantwoord_moment_voorstel", {
      antwoord: "accept",
      target_profiel_id: SAM_PROFILE_ID,
      target_voorstel_id: "voorstel-accept"
    });
    expect(result).toEqual({
      id: "voorstel-accept",
      linkedId: "moment-1",
      linkedType: "moment",
      title: "Samen koken",
      type: "deelname_aan_moment"
    });
  });

  it("weigert een voorstel via dezelfde gecontroleerde RPC", async () => {
    const { rpc } = mockProposalRpc({
      data: {
        voorstel_id: "voorstel-reject",
        voorstel_titel: "Wandelen",
        voorstel_type: "uitnodiging_moment",
        gekoppeld_type: "moment",
        gekoppeld_id: "moment-2",
        voorstel_status: "geweigerd",
        deelname_id: "deelname-2",
        deelname_status: "geweigerd"
      },
      error: null
    });

    const result = await declineVoorstel({
      persoonId: null,
      profielId: SAM_PROFILE_ID,
      voorstelId: "voorstel-reject"
    });

    expect(rpc).toHaveBeenCalledWith("beantwoord_moment_voorstel", {
      antwoord: "reject",
      target_profiel_id: SAM_PROFILE_ID,
      target_voorstel_id: "voorstel-reject"
    });
    expect(result.linkedId).toBe("moment-2");
  });

  it("toont een gebruikersveilige melding bij RLS-achtige RPC-fouten", async () => {
    mockProposalRpc({
      data: null,
      error: { message: "new row violates row-level security policy" }
    });

    await expect(
      declineVoorstel({
        persoonId: null,
        profielId: SAM_PROFILE_ID,
        voorstelId: "voorstel-rls"
      })
    ).rejects.toThrow("Je kunt deze voorstelactie niet uitvoeren met dit profiel.");
  });
});
