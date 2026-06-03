"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  fetchCurrentSamzoContext,
  writeStoredActiveProfileId,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

type HeaderContextState =
  | { status: "loading" }
  | { status: "ready"; context: CurrentSamzoContext }
  | { status: "error"; message: string };

const routes = [
  { href: "/mijn-dag", label: "Mijn dag" },
  { href: "/planning", label: "Planning" },
  { href: "/lijsten", label: "Lijsten" },
  { href: "/documenten", label: "Documenten" },
  { href: "/doelen", label: "Doelen" },
  { href: "/leden", label: "Leden" },
  { href: "/tijdlijn", label: "Tijdlijn" },
  { href: "/beheer", label: "Beheer" }
];

export function AppHeader() {
  const [contextState, setContextState] = useState<HeaderContextState>({
    status: "loading"
  });

  const refreshContext = useCallback(async () => {
    const context = await fetchCurrentSamzoContext();
    setContextState({ status: "ready", context });
  }, []);

  const handleProfileSelect = useCallback(
    async (profileId: string) => {
      writeStoredActiveProfileId(profileId || null);
      await refreshContext();
    },
    [refreshContext]
  );

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    const initialRefresh = window.setTimeout(() => {
      refreshContext().catch((error: unknown) => {
        if (isMounted) {
          setContextState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens laden van gebruikerscontext."
          });
        }
      });
    }, 0);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      refreshContext().catch((error: unknown) => {
        if (isMounted) {
          setContextState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout na Auth statuswijziging."
          });
        }
      });
    });

    return () => {
      isMounted = false;
      window.clearTimeout(initialRefresh);
      subscription.unsubscribe();
    };
  }, [refreshContext]);

  const context =
    contextState.status === "ready" ? contextState.context : null;
  const ownProfile = context?.ownProfiel ?? null;
  const activeProfile = context?.currentProfiel ?? null;
  const profileSummaryLabel =
    ownProfile?.weergavenaam ??
    context?.persoon?.accountnaam ??
    context?.authUser?.email ??
    "Niet ingelogd";
  const isViewingOwnProfile =
    context?.ownProfiel && context?.currentProfiel
      ? context.currentProfiel.id === context.ownProfiel.id
      : false;
  const canSwitchProfile =
    contextState.status === "ready" && (context?.profielen.length ?? 0) > 1;
  const ownProfileLabel =
    ownProfile?.weergavenaam ??
    context?.persoon?.accountnaam ??
    context?.authUser?.email ??
    "Onbekend profiel";
  const activeProfileLabel =
    activeProfile?.weergavenaam ?? "Geen actief profiel";
  const statusLabel = context?.authUser ? "Ingelogd" : "Gast";

  return (
    <header className="app-header">
      <Link className="app-header__brand" href="/">
        SAM&ZO
      </Link>
      <nav className="app-header__nav" aria-label="Hoofdnavigatie">
        {routes.map((route) => (
          <Link href={route.href} key={route.href}>
            {route.label}
          </Link>
        ))}
      </nav>
      <div className="app-header__profile">
        <Link className="app-header__profile-summary" href="/beheer/dev-login">
          <span>{statusLabel}</span>
          <strong>{profileSummaryLabel}</strong>
        </Link>
        {context?.authUser ? (
          <>
            <p className="app-header__profile-mode">
              {ownProfile ? "Ingelogd profiel" : "Ingelogd profiel (beperkt)"}
            </p>
            <p className="app-header__profile-mode-value">{ownProfileLabel}</p>
            {!isViewingOwnProfile ? (
              <>
                <p className="app-header__profile-mode">
                  Bekijkt profiel
                </p>
                <p className="app-header__profile-mode-value">
                  {activeProfileLabel}
                </p>
              </>
            ) : null}
            {canSwitchProfile ? (
              <label className="app-header__profile-switch">
                <span>Bekijk als</span>
                <select
                  onChange={(event) =>
                    handleProfileSelect(event.target.value)
                  }
                  value={context.currentProfiel?.id ?? ""}
                >
                  {context.profielen.map((profiel) => (
                    <option key={profiel.id} value={profiel.id}>
                      {profiel.weergavenaam}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : (
          <p className="app-header__profile-mode">
            Geen actief profiel beschikbaar
          </p>
        )}
      </div>
      {contextState.status === "error" ? (
        <p className="app-header__error">{contextState.message}</p>
      ) : null}
    </header>
  );
}
