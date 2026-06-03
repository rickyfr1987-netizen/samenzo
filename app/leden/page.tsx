"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import {
  fetchVisibleProfielen,
  type VisibleLid
} from "@/src/lib/leden/items";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";

type LedenState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      profiles: VisibleLid[];
    }
  | { status: "error"; message: string };

function formatVisibilityHint(profile: VisibleLid) {
  const hints = [];
  if (profile.visibleForMembers) {
    hints.push("voor leden");
  }
  if (profile.visibleForGuests) {
    hints.push("voor gasten");
  }

  return hints.length > 0 ? hints.join(" / ") : "beperkt zichtbaar";
}

function formatProfileRole(status: VisibleLid["status"]) {
  return status.replaceAll("_", " ");
}

function groupLabel(profile: VisibleLid) {
  if (profile.groups.length === 0) {
    return "Geen groepen zichtbaar";
  }

  return profile.groups.map((group) => group.name).join(", ");
}

export default function LedenPage() {
  const [state, setState] = useState<LedenState>({
    status: "loading"
  });
  const activeProfileId = useActiveProfileSwitchTrigger();

  useEffect(() => {
    let isMounted = true;

    async function loadLeden() {
      try {
        const context = await fetchCurrentSamzoContext();

        if (!context.authUser) {
          if (isMounted) {
            setState({ status: "ready", context, profiles: [] });
          }
          return;
        }

        const profiles = await fetchVisibleProfielen();

        if (isMounted) {
          setState({ status: "ready", context, profiles });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van leden."
          });
        }
      }
    }

    loadLeden();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);

  const context = state.status === "ready" ? state.context : null;

  return (
    <section className="leden-page">
      <div className="leden-page__header">
        <p className="leden-page__eyebrow">Samen in beeld</p>
        <h1>Leden</h1>
        <p>
          Leden zijn profielen binnen de huidige context. Je ziet alleen wat de
          Auth-sessie en RLS toestaat.
        </p>
      </div>

      <section className="leden-context" aria-label="Huidige context">
        <div>
          <span>Auth</span>
          <strong>{context?.authUser ? "Ingelogd" : "Niet ingelogd"}</strong>
        </div>
        <div>
          <span>Profiel</span>
          <strong>
            {context?.currentProfiel?.weergavenaam ??
              "Geen actief gekoppeld profiel"}
          </strong>
        </div>
      </section>

      {state.status === "loading" ? (
        <p className="leden-state">Leden laden...</p>
      ) : null}

      {state.status === "error" ? (
        <div className="leden-state leden-state--error" role="status">
          <h2>Leden konden niet worden geladen</h2>
          <p>{state.message}</p>
        </div>
      ) : null}

      {state.status === "ready" && !state.context.authUser ? (
        <div className="leden-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om ledenlijsten te tonen onder RLS.</p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.authUser &&
      !state.context.currentProfiel ? (
        <div className="leden-state">
          <h2>Geen actief profiel</h2>
          <p>Deze Auth-sessie heeft nog geen actief SAM&ZO-profiel.</p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.currentProfiel &&
      state.profiles.length === 0 ? (
        <div className="leden-state">
          <h2>Geen profielen zichtbaar</h2>
          <p>Er zijn momenteel geen leden zichtbaar voor deze sessie.</p>
        </div>
      ) : null}

      {state.status === "ready" && state.profiles.length > 0 ? (
        <div className="leden-grid">
          {state.profiles.map((profile) => (
            <Link
              className="leden-card-link"
              href={`/leden/${profile.id}`}
              key={profile.id}
            >
              <article className="leden-card">
                <div className="leden-card__meta">
                  <span>{groupLabel(profile)}</span>
                  <span>{formatVisibilityHint(profile)}</span>
                </div>
                <h2>{profile.displayName}</h2>
                <p>{formatProfileRole(profile.status)}</p>
                {profile.shortDescription ? (
                  <p>{profile.shortDescription}</p>
                ) : null}
                <p className="leden-card__open">Open profiel</p>
              </article>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
