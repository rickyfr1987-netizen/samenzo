import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { CurrentSamzoProfiel } from "@/src/lib/samzo/current-context";
import { fetchCurrentSamzoContext } from "@/src/lib/samzo/current-context";

vi.mock("@/src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn()
}));

type QueryPayload = {
  data: unknown;
  error: null | { message: string };
};

function createProfile(overrides: Partial<CurrentSamzoProfiel>) {
  return {
    id: "10000000-0000-4000-8000-000000000000",
    persoon_id: "00000000-0000-4000-8000-000000000000",
    weergavenaam: "Testprofiel",
    status: "actief" as const,
    avatar_url: null,
    zichtbaar_voor_leden: true,
    ...overrides
  };
}

function createQueryMock(payload: QueryPayload) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => payload),
    then: vi.fn((onFulfilled: (value: QueryPayload) => void) =>
      Promise.resolve(payload).then(onFulfilled)
    )
  };

  return query;
}

function createAuthMock(sessionUserId: string) {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: { user: { id: sessionUserId } }
        },
        error: null
      }))
    }
  };
}

const getSupabaseBrowserClientMock = vi.mocked(getSupabaseBrowserClient);
const getItemSpy = vi.spyOn(window.localStorage, "getItem");
const setItemSpy = vi.spyOn(window.localStorage, "setItem");
const removeItemSpy = vi.spyOn(window.localStorage, "removeItem");

describe("current-context helper", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    getItemSpy.mockReturnValue(null);
    setItemSpy.mockReturnValue(undefined);
    removeItemSpy.mockReturnValue(undefined);
  });

  it("selecteert eigen profiel automatisch als standaard actief profiel", async () => {
    const person = createProfile({
      id: "10000000-0000-4000-8000-000000000004",
      persoon_id: "00000000-0000-4000-8000-000000000004",
      weergavenaam: "Sam Bewoner"
    });
    const persoonRow = {
      id: "00000000-0000-4000-8000-000000000004",
      auth_user_id: "auth-sam",
      email: "sam.bewoner@example.test",
      accountnaam: "Sam Bewoner",
      systeemrol: "lid",
      status: "actief"
    };

    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(
          createQueryMock({ data: persoonRow, error: null }) // personen
        )
        .mockReturnValueOnce(createQueryMock({ data: person, error: null })) // ownProfiel
        .mockReturnValueOnce(
          createQueryMock({
            data: [],
            error: null
          }) // profieltoegangen
        )
        .mockReturnValueOnce(createQueryMock({ data: [person], error: null })), // profielen op id-lijst
      ...createAuthMock("auth-sam")
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const context = await fetchCurrentSamzoContext();

    expect(context.authUser?.id).toBe("auth-sam");
    expect(context.currentProfiel?.id).toBe(person.id);
    expect(context.profielen).toEqual([person]);
  });

  it("stelt toegankelijke profielen samen uit eigen profiel en expliciete toegang", async () => {
    const ownProfile = createProfile({
      id: "10000000-0000-4000-8000-000000000004",
      weergavenaam: "Sam Bewoner"
    });
    const extraProfile = createProfile({
      id: "10000000-0000-4000-8000-000000000001",
      weergavenaam: "Bas Beheerder"
    });

    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(
          createQueryMock({
            data: {
              id: "00000000-0000-4000-8000-000000000004",
              auth_user_id: "auth-sam",
              email: "sam.bewoner@example.test",
              accountnaam: "Sam Bewoner",
              systeemrol: "lid",
              status: "actief"
            },
            error: null
          })
        )
        .mockReturnValueOnce(createQueryMock({ data: ownProfile, error: null }))
        .mockReturnValueOnce(
          createQueryMock({
            data: [{ profiel_id: extraProfile.id }],
            error: null
          })
        )
        .mockReturnValueOnce(
          createQueryMock({
            data: [ownProfile, extraProfile],
            error: null
          })
        ),
      ...createAuthMock("auth-sam")
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const context = await fetchCurrentSamzoContext();

    expect(context.currentProfiel?.id).toBe(ownProfile.id);
    expect(context.profielen).toHaveLength(2);
    expect(context.profielen.map((profile) => profile.id)).toEqual([
      ownProfile.id,
      extraProfile.id
    ]);
  });

  it("valt terug op eigen profiel als opgeslagen actieve profiel-id onbekend is", async () => {
    const ownProfile = createProfile({
      id: "10000000-0000-4000-8000-000000000004",
      weergavenaam: "Sam Bewoner"
    });
    const extraProfile = createProfile({
      id: "10000000-0000-4000-8000-000000000001",
      weergavenaam: "Bas Beheerder"
    });

    getItemSpy.mockReturnValue("10000000-0000-4000-8000-000000000099");

    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(
          createQueryMock({
            data: {
              id: "00000000-0000-4000-8000-000000000004",
              auth_user_id: "auth-sam",
              email: "sam.bewoner@example.test",
              accountnaam: "Sam Bewoner",
              systeemrol: "lid",
              status: "actief"
            },
            error: null
          })
        )
        .mockReturnValueOnce(createQueryMock({ data: ownProfile, error: null }))
        .mockReturnValueOnce(
          createQueryMock({
            data: [{ profiel_id: extraProfile.id }],
            error: null
          })
        )
        .mockReturnValueOnce(
          createQueryMock({
            data: [ownProfile, extraProfile],
            error: null
          })
        ),
      ...createAuthMock("auth-sam")
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const context = await fetchCurrentSamzoContext();

    expect(context.currentProfiel?.id).toBe(ownProfile.id);
    expect(removeItemSpy).not.toHaveBeenCalled();
  });

  it("houdt medewerkertoegang beperkt tot de expliciet beschikbare profielen", async () => {
    const medewerkerProfile = createProfile({
      id: "10000000-0000-4000-8000-000000000003",
      weergavenaam: "Milan Medewerker"
    });
    const clientProfile = createProfile({
      id: "10000000-0000-4000-8000-000000000004",
      weergavenaam: "Sam Bewoner"
    });

    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(
          createQueryMock({
            data: {
              id: "00000000-0000-4000-8000-000000000003",
              auth_user_id: "auth-milan",
              email: "milan.medewerker@example.test",
              accountnaam: "Milan Medewerker",
              systeemrol: "medewerker",
              status: "actief"
            },
            error: null
          })
        )
        .mockReturnValueOnce(
          createQueryMock({ data: medewerkerProfile, error: null })
        )
        .mockReturnValueOnce(
          createQueryMock({
            data: [{ profiel_id: clientProfile.id }],
            error: null
          })
        )
        .mockReturnValueOnce(
          createQueryMock({
            data: [medewerkerProfile, clientProfile],
            error: null
          })
        ),
      ...createAuthMock("auth-milan")
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const context = await fetchCurrentSamzoContext();

    const profileIds = context.profielen.map((profile) => profile.id);
    expect(profileIds).toContain(medewerkerProfile.id);
    expect(profileIds).toContain(clientProfile.id);
    expect(profileIds).toHaveLength(2);
  });

  it("handelt ontbrekende toegang rustig af wanneer alleen auth context aanwezig is", async () => {
    getItemSpy.mockReturnValue(null);

    getSupabaseBrowserClientMock.mockReturnValue({
      from: vi.fn().mockReturnValueOnce(
        createQueryMock({
          data: null,
          error: null
        })
      ),
      ...createAuthMock("auth-unknown")
    } as unknown as ReturnType<typeof getSupabaseBrowserClient>);

    const context = await fetchCurrentSamzoContext();

    expect(context.authUser?.id).toBe("auth-unknown");
    expect(context.persoon).toBeNull();
    expect(context.currentProfiel).toBeNull();
    expect(context.profielen).toEqual([]);
  });
});
