import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  maakPersoonlijkMoment,
  type PersoonlijkMomentInput
} from "@/src/lib/persoonlijke-momenten/actions";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { SAM_PROFILE_ID } from "@/tests/fixtures/samzo";

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);

function mockPersonalMomentRpc(result: {
  data: {
    moment_id: string;
    eigenaar_profiel_id: string;
    eigenaar_groep_id: string | null;
    titel: string;
    start_at: string;
    eind_at: string | null;
    status: "gepland";
  } | null;
  error: null | { message: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn(() => ({ maybeSingle }));
  const from = vi.fn();

  getSupabaseBrowserClientMock.mockReturnValue({
    rpc,
    from
  } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

  return { maybeSingle, rpc, from };
}

function createInput(overrides: Partial<PersoonlijkMomentInput> = {}) {
  return {
    profielId: SAM_PROFILE_ID,
    titel: "Dagstart",
    categorieId: "10000000-0000-4000-8000-000000000001",
    startAt: "2026-06-15T08:30:00.000Z",
    eindAt: null,
    beschrijving: "Korte notitie",
    locatie: "Keuken",
    heleDag: false,
    ...overrides
  };
}

describe("persoonlijk-momenten acties", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
  });

  it("maakt een persoonlijk moment via de dedicated RPC met validatie", async () => {
    const { rpc } = mockPersonalMomentRpc({
      data: {
        moment_id: "moment-persoonlijk",
        eigenaar_profiel_id: SAM_PROFILE_ID,
        eigenaar_groep_id: null,
        titel: "Dagstart",
        start_at: "2026-06-15T08:30:00.000Z",
        eind_at: null,
        status: "gepland"
      },
      error: null
    });

    const result = await maakPersoonlijkMoment(createInput());

    expect(rpc).toHaveBeenCalledWith("maak_persoonlijk_moment", {
      target_profiel_id: SAM_PROFILE_ID,
      target_titel: "Dagstart",
      target_categorie_id: "10000000-0000-4000-8000-000000000001",
      target_start_at: "2026-06-15T08:30:00.000Z",
      target_eind_at: null,
      target_beschrijving: "Korte notitie",
      target_locatie: "Keuken",
      target_hele_dag: false
    });
    expect(result).toEqual({
      id: "moment-persoonlijk",
      eigenaarProfielId: SAM_PROFILE_ID,
      eigenaarGroepId: null,
      eindAt: null,
      startAt: "2026-06-15T08:30:00.000Z",
      status: "gepland",
      titel: "Dagstart"
    });
  });

  it("faalt voor RPC-call als de titel ontbreekt", async () => {
    await expect(
      maakPersoonlijkMoment(createInput({ titel: "   " }))
    ).rejects.toThrow("De titel van een persoonlijk moment is verplicht.");

    expect(getSupabaseBrowserClientMock).not.toHaveBeenCalled();
  });

  it("faalt voor RPC-call als starttijd ontbreekt", async () => {
    await expect(
      maakPersoonlijkMoment(createInput({ startAt: "" }))
    ).rejects.toThrow("Een starttijd is verplicht voor een persoonlijk moment.");

    expect(getSupabaseBrowserClientMock).not.toHaveBeenCalled();
  });

  it("mapt een RPC-fout naar een nette gebruikersmelding", async () => {
    mockPersonalMomentRpc({
      data: null,
      error: { message: "new row violates row-level security policy" }
    });

    await expect(
      maakPersoonlijkMoment(createInput())
    ).rejects.toThrow("Je kunt dit persoonlijk moment niet aanmaken voor dit profiel.");
  });

  it("roept geen directe tableinsert aan en gebruikt alleen RPC", async () => {
    const { from } = mockPersonalMomentRpc({
      data: {
        moment_id: "moment-persoonlijk-2",
        eigenaar_profiel_id: SAM_PROFILE_ID,
        eigenaar_groep_id: null,
        titel: "Dagstart",
        start_at: "2026-06-15T08:30:00.000Z",
        eind_at: null,
        status: "gepland"
      },
      error: null
    });

    await maakPersoonlijkMoment(createInput());

    expect(from).not.toHaveBeenCalled();
  });
});
