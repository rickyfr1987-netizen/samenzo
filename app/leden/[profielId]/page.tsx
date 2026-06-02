"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import {
  fetchProfileById,
  formatProfileVisibility,
  type VisibleLidDetail
} from "@/src/lib/leden/items";

type LedenDetailState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      profile: VisibleLidDetail | null;
    }
  | { status: "error"; message: string };

function formatDate(dateInput: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateInput));
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function LedenDetailPage() {
  const params = useParams<{ profielId: string }>();
  const profielId = useMemo(() => {
    const value = params.profielId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.profielId]);

  const [state, setState] = useState<LedenDetailState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfileDetail() {
      if (!profielId) {
        setState({
          status: "error",
          message: "Geen profiel-id in route gevonden."
        });
        return;
      }

      try {
        const context = await fetchCurrentSamzoContext();

        if (!context.authUser) {
          if (isMounted) {
            setState({ status: "ready", context, profile: null });
          }
          return;
        }

        const profile = await fetchProfileById(profielId);

        if (isMounted) {
          setState({ status: "ready", context, profile });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van dit profiel."
          });
        }
      }
    }

    loadProfileDetail();

    return () => {
      isMounted = false;
    };
  }, [profielId]);

  const context = state.status === "ready" ? state.context : null;

  return (
    <section className="leden-detail-page">
      <Link className="moment-detail-back-link" href="/leden">
        Terug naar leden
      </Link>

      {state.status === "loading" ? (
        <p className="leden-state">Profiel laden...</p>
      ) : null}

      {state.status === "error" ? (
        <div className="leden-state leden-state--error" role="status">
          <h2>Profiel kon niet worden geladen</h2>
          <p>{state.message}</p>
        </div>
      ) : null}

      {state.status === "ready" && !state.context.authUser ? (
        <div className="leden-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om liddetails te tonen.</p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.authUser &&
      !state.context.currentProfiel ? (
        <div className="leden-state">
          <h2>Geen actief profiel</h2>
          <p>
            Deze Auth-sessie heeft nog geen gekoppeld profiel voor
            liddetails.
          </p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.currentProfiel &&
      !state.profile ? (
        <div className="leden-state">
          <h2>Profiel niet zichtbaar</h2>
          <p>
            Dit profiel is niet gevonden of niet zichtbaar met de huidige RLS
            rechten.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.profile ? (
        <>
          <header className="leden-detail-hero">
            <p className="leden-page__eyebrow">Zichtbare profielen</p>
            <div className="leden-card__meta">
              <span>{formatProfileVisibility(state.profile)}</span>
              <span>{formatStatus(state.profile.status)}</span>
            </div>
            <h1>{state.profile.displayName}</h1>
            {state.profile.shortDescription ? (
              <p>{state.profile.shortDescription}</p>
            ) : (
              <p>Geen korte beschrijving beschikbaar.</p>
            )}

            <dl className="leden-detail-facts">
              <div>
                <span>Status</span>
                <strong>{formatStatus(state.profile.status)}</strong>
              </div>
              <div>
                <span>Lid sinds</span>
                <strong>{formatDate(state.profile.joinedAt)}</strong>
              </div>
              <div>
                <span>Zichtbaarheid</span>
                <strong>
                  {state.profile.visibleForMembers ? "Leden" : "Beperkt"}
                  {state.profile.visibleForGuests ? " + gasten" : ""}
                </strong>
              </div>
            </dl>
          </header>

          <section className="leden-detail-section">
            <h2>Groepen</h2>
            {state.profile.groups.length === 0 ? (
              <p className="leden-state">Geen zichtbaar lidmaatschap.</p>
            ) : (
              <ul className="leden-groups-list">
                {state.profile.groups.map((group) => (
                  <li key={group.id}>
                    <article className="leden-group-card">
                      <div>
                        <strong>{group.name}</strong>
                        <small>{formatStatus(group.status)}</small>
                      </div>
                      <small>{formatStatus(group.visibility)}</small>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {state.status === "ready" ? (
        <section className="leden-context" aria-label="Huidige context">
          <div>
            <span>Auth</span>
            <strong>{context?.authUser ? "Ingelogd" : "Niet ingelogd"}</strong>
          </div>
          <div>
            <span>Profiel</span>
            <strong>
              {context?.currentProfiel?.weergavenaam ?? "Geen actief profiel"}
            </strong>
          </div>
        </section>
      ) : null}
    </section>
  );
}
