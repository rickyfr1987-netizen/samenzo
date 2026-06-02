"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  fetchCurrentSamzoContext,
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
  const profileLabel =
    context?.currentProfiel?.weergavenaam ??
    context?.persoon?.accountnaam ??
    context?.authUser?.email ??
    "Niet ingelogd";
  const statusLabel = context?.authUser
    ? context.currentProfiel
      ? "Profiel actief"
      : "Auth zonder profiel"
    : contextState.status === "loading"
      ? "Laden"
      : "Gast";

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
      <Link className="app-header__profile" href="/beheer/dev-login">
        <span>{statusLabel}</span>
        <strong>{profileLabel}</strong>
      </Link>
      {contextState.status === "error" ? (
        <p className="app-header__error">{contextState.message}</p>
      ) : null}
    </header>
  );
}
