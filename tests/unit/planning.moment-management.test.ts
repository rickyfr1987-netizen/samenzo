import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archivePlanningGroupMoment,
  createPlanningGroupMoment,
  updatePlanningGroupMoment
} from "@/src/lib/planning/moment-management";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);

function mockRpc(result: { data: unknown; error: null | { message: string } }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn(() => ({ maybeSingle }));

  getSupabaseBrowserClientMock.mockReturnValue({
    rpc
  } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

  return { maybeSingle, rpc };
}

const baseInput = {
  groupId: "groep-bewoners",
  categoryId: "categorie-activiteit",
  title: "Samen koken",
  description: "Rustige activiteit.",
  startsAt: "2026-06-20T08:00:00.000Z",
  endsAt: "2026-06-20T09:00:00.000Z",
  isAllDay: false,
  location: "Keuken",
  capacity: 8,
  registrationOpen: false,
  guestAccess: false
};

describe("planning momentbeheer helpers", () => {
  beforeEach(() => {
    getSupabaseBrowserClientMock.mockReset();
  });

  it("maakt een groepmoment via de gecontroleerde RPC", async () => {
    const { rpc } = mockRpc({
      data: {
        moment_id: "moment-1",
        titel: "Samen koken",
        status: "gepland",
        eigenaar_groep_id: "groep-bewoners",
        start_at: "2026-06-20T08:00:00.000Z",
        eind_at: "2026-06-20T09:00:00.000Z"
      },
      error: null
    });

    const result = await createPlanningGroupMoment(baseInput);

    expect(rpc).toHaveBeenCalledWith("maak_groep_moment", {
      target_groep_id: "groep-bewoners",
      target_categorie_id: "categorie-activiteit",
      target_titel: "Samen koken",
      target_beschrijving: "Rustige activiteit.",
      target_start_at: "2026-06-20T08:00:00.000Z",
      target_eind_at: "2026-06-20T09:00:00.000Z",
      target_hele_dag: false,
      target_locatie: "Keuken",
      target_capaciteit: 8,
      target_inschrijving_open: false,
      target_gasttoegang: false
    });
    expect(result).toEqual({
      endsAt: "2026-06-20T09:00:00.000Z",
      groupId: "groep-bewoners",
      id: "moment-1",
      startsAt: "2026-06-20T08:00:00.000Z",
      status: "gepland",
      title: "Samen koken"
    });
  });

  it("wijzigt een groepmoment zonder eigenaar-groep als updateveld mee te sturen", async () => {
    const { rpc } = mockRpc({
      data: {
        moment_id: "moment-1",
        titel: "Samen koken gewijzigd",
        status: "gewijzigd",
        eigenaar_groep_id: "groep-bewoners",
        start_at: "2026-06-20T08:30:00.000Z",
        eind_at: "2026-06-20T09:30:00.000Z",
        updated_at: "2026-06-06T18:00:00.000Z"
      },
      error: null
    });

    await updatePlanningGroupMoment({
      ...baseInput,
      momentId: "moment-1",
      title: "Samen koken gewijzigd",
      startsAt: "2026-06-20T08:30:00.000Z",
      endsAt: "2026-06-20T09:30:00.000Z",
      status: "gewijzigd"
    });

    expect(rpc).toHaveBeenCalledWith("wijzig_groep_moment", {
      target_moment_id: "moment-1",
      target_categorie_id: "categorie-activiteit",
      target_titel: "Samen koken gewijzigd",
      target_beschrijving: "Rustige activiteit.",
      target_start_at: "2026-06-20T08:30:00.000Z",
      target_eind_at: "2026-06-20T09:30:00.000Z",
      target_hele_dag: false,
      target_locatie: "Keuken",
      target_capaciteit: 8,
      target_inschrijving_open: false,
      target_gasttoegang: false,
      target_status: "gewijzigd"
    });
  });

  it("archiveert een groepmoment via de archiveer-RPC", async () => {
    const { rpc } = mockRpc({
      data: {
        moment_id: "moment-1",
        status: "gearchiveerd",
        archived_at: "2026-06-06T18:00:00.000Z"
      },
      error: null
    });

    const result = await archivePlanningGroupMoment({ momentId: "moment-1" });

    expect(rpc).toHaveBeenCalledWith("archiveer_groep_moment", {
      target_moment_id: "moment-1"
    });
    expect(result).toEqual({
      archivedAt: "2026-06-06T18:00:00.000Z",
      id: "moment-1",
      status: "gearchiveerd"
    });
  });

  it("vertaalt RLS-achtige fouten naar een veilige melding", async () => {
    mockRpc({
      data: null,
      error: { message: "Alleen systeembeheerder mag planningmomenten beheren." }
    });

    await expect(createPlanningGroupMoment(baseInput)).rejects.toThrow(
      "Je kunt dit planningmoment niet beheren met dit profiel."
    );
  });

  it("vertaalt validatiefouten specifiek genoeg voor formuliergebruik", async () => {
    mockRpc({
      data: null,
      error: { message: "Eindtijd moet na starttijd liggen." }
    });

    await expect(createPlanningGroupMoment(baseInput)).rejects.toThrow(
      "De eindtijd moet na de starttijd liggen."
    );
  });
});
