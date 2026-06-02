"use client";

import { useEffect, useState } from "react";

import {
  fetchPlanningMoments,
  type PlanningMoment
} from "@/src/lib/planning/moments";

type PlanningState =
  | { status: "loading" }
  | { status: "ready"; moments: PlanningMoment[] }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

const allDayFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

function formatMomentTime(moment: PlanningMoment) {
  if (!moment.startsAt) {
    return "Datum nog niet bekend";
  }

  const start = new Date(moment.startsAt);

  if (moment.isAllDay) {
    return `${allDayFormatter.format(start)} · Hele dag`;
  }

  const startLabel = dateFormatter.format(start);

  if (!moment.endsAt) {
    return startLabel;
  }

  return `${startLabel} - ${dateFormatter.format(new Date(moment.endsAt))}`;
}

function formatStatus(status: PlanningMoment["status"]) {
  return status.replaceAll("_", " ");
}

export default function PlanningPage() {
  const [planning, setPlanning] = useState<PlanningState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    fetchPlanningMoments()
      .then((moments) => {
        if (isMounted) {
          setPlanning({ status: "ready", moments });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setPlanning({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van de planning."
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="planning-page">
      <div className="planning-page__header">
        <p className="planning-page__eyebrow">Gemeenschappelijke werkelijkheid</p>
        <h1>Planning</h1>
        <p>
          Zichtbare momenten uit Supabase. Wat je hier ziet volgt de bestaande
          RLS-regels.
        </p>
      </div>

      {planning.status === "loading" ? (
        <p className="planning-state">Planning wordt geladen...</p>
      ) : null}

      {planning.status === "error" ? (
        <div className="planning-state planning-state--error" role="status">
          <h2>Planning kon niet worden geladen</h2>
          <p>{planning.message}</p>
        </div>
      ) : null}

      {planning.status === "ready" && planning.moments.length === 0 ? (
        <div className="planning-state">
          <h2>Geen zichtbare momenten</h2>
          <p>
            Er zijn nog geen momenten zichtbaar voor deze sessie, of RLS geeft
            geen rijen terug.
          </p>
        </div>
      ) : null}

      {planning.status === "ready" && planning.moments.length > 0 ? (
        <div className="planning-grid">
          {planning.moments.map((moment) => (
            <article className="planning-card" key={moment.id}>
              <div className="planning-card__meta">
                <span>{moment.categoryName ?? "Geen categorie"}</span>
                <span>{formatStatus(moment.status)}</span>
              </div>
              <h2>{moment.title}</h2>
              <p className="planning-card__time">{formatMomentTime(moment)}</p>
              {moment.location ? (
                <p className="planning-card__location">{moment.location}</p>
              ) : null}
              {moment.description ? <p>{moment.description}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
