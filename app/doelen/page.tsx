// app/doelen/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchVisibleDoelen,
  formatDoelStatus,
  type DoelenSamenvatting
} from "@/src/lib/doelen/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";

type DoelenState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      goals: DoelenSamenvatting[];
    }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatDate(dateInput: string | null) {
  if (!dateInput) {
    return "Onbekend";
  }

  return dateFormatter.format(new Date(dateInput));
}

function formatGoalOwnerLabel(goal: DoelenSamenvatting) {
  if (!goal.owner) {
    return "Zichtbaarheid: niet zichtbaar eigenaar";
  }

  if (goal.owner.kind === "profiel") {
    return `Profiel: ${goal.owner.displayName}`;
  }

  return `Groep: ${goal.owner.name}`;
}

export default function DoelenPage() {
  const [state, setState] = useState<DoelenState>({
    status: "loading"
  });
  const activeProfileId = useActiveProfileSwitchTrigger();

  useEffect(() => {
    let isMounted = true;

    async function loadDoelen() {
      try {
        const [context, goals] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchVisibleDoelen()
        ]);

        if (isMounted) {
          setState({ status: "ready", context, goals });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van doelen."
          });
        }
      }
    }

    loadDoelen();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);

  const context = state.status === "ready" ? state.context : null;

  return (
    <section className="doelen-page">
      <div className="doelen-page__header">
        <p className="doelen-page__eyebrow">Doelen geven richting</p>
        <h1>Doelen</h1>
        <p>
          Doelen geven richting. Ze zijn bedoeld als lichte richting in de
          werkelijkheid, niet als prestatiedashboard.
        </p>
      </div>

      <section className="doelen-context" aria-label="Huidige context">
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
        <p className="doelen-state">Doelen worden geladen...</p>
      ) : null}

      {state.status === "error" ? (
        <div className="doelen-state doelen-state--error" role="status">
          <h2>Doelen konden niet worden geladen</h2>
          <p>{state.message}</p>
        </div>
      ) : null}

      {state.status === "ready" && !state.context.authUser ? (
        <div className="doelen-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om doelen te tonen door RLS.</p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.authUser &&
      !state.context.currentProfiel ? (
        <div className="doelen-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft nog geen gekoppeld profiel dat doelen
            kan tonen.
          </p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.currentProfiel &&
      state.goals.length === 0 ? (
        <div className="doelen-state">
          <h2>Geen doelen zichtbaar</h2>
          <p>Er zijn geen zichtbare doelen voor dit profiel.</p>
        </div>
      ) : null}

      {state.status === "ready" && state.goals.length > 0 ? (
        <div className="doelen-grid">
          {state.goals.map((goal) => (
            <Link
              className="doelen-card-link"
              href={`/doelen/${goal.id}`}
              key={goal.id}
            >
              <article className="doelen-card">
                <div className="doelen-card__meta">
                  <span>{goal.categoryName ?? "Geen categorie"}</span>
                  <span>{formatDoelStatus(goal.status)}</span>
                </div>
                <h2>{goal.title}</h2>
                {goal.description ? <p>{goal.description}</p> : null}
                <dl className="doelen-card__facts">
                  <div>
                    <dt>Status</dt>
                    <dd>{formatDoelStatus(goal.status)}</dd>
                  </div>
                  <div>
                    <dt>Eigenaar / context</dt>
                    <dd>{formatGoalOwnerLabel(goal)}</dd>
                  </div>
                  <div>
                    <dt>Periode</dt>
                    <dd>
                      {formatDate(goal.startAt)} - {formatDate(goal.endAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Gewijzigd</dt>
                    <dd>{formatDate(goal.updatedAt ?? goal.createdAt)}</dd>
                  </div>
                </dl>
                <p className="doelen-card__open">Open doel</p>
              </article>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
