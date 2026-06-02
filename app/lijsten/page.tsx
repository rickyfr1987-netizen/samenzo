"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchVisibleLijsten,
  type VisibleLijst
} from "@/src/lib/lijsten/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type LijstenState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      lists: VisibleLijst[];
    }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

const allDayFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatMomentTime(list: VisibleLijst) {
  const startsAt = list.linkedMoment?.startsAt;

  if (!startsAt) {
    return null;
  }

  const start = new Date(startsAt);

  if (list.linkedMoment?.isAllDay) {
    return `${allDayFormatter.format(start)} - Hele dag`;
  }

  return dateFormatter.format(start);
}

export default function LijstenPage() {
  const [lijsten, setLijsten] = useState<LijstenState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    async function loadLijsten() {
      try {
        const [context, lists] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchVisibleLijsten()
        ]);

        if (isMounted) {
          setLijsten({ status: "ready", context, lists });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setLijsten({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van lijsten."
          });
        }
      }
    }

    loadLijsten();

    return () => {
      isMounted = false;
    };
  }, []);

  const context = lijsten.status === "ready" ? lijsten.context : null;

  return (
    <section className="lijsten-page">
      <div className="lijsten-page__header">
        <p className="lijsten-page__eyebrow">Lijsten helpen uitvoeren</p>
        <h1>Lijsten</h1>
        <p>
          Lijsten helpen uitvoeren. Dit overzicht toont praktische lijsten als
          rustige kaarten; taken en acties staan op de lijstdetailpagina.
        </p>
      </div>

      <section className="lijsten-context" aria-label="Huidige context">
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

      {lijsten.status === "loading" ? (
        <p className="lijsten-state">Lijsten worden geladen...</p>
      ) : null}

      {lijsten.status === "error" ? (
        <div className="lijsten-state lijsten-state--error" role="status">
          <h2>Lijsten konden niet worden geladen</h2>
          <p>{lijsten.message}</p>
        </div>
      ) : null}

      {lijsten.status === "ready" && !lijsten.context.authUser ? (
        <div className="lijsten-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om lijsten door RLS te laten bepalen.</p>
        </div>
      ) : null}

      {lijsten.status === "ready" &&
      lijsten.context.authUser &&
      !lijsten.context.currentProfiel ? (
        <div className="lijsten-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft geen actief gekoppeld SAM&ZO profiel
            voor deze lijstweergave.
          </p>
        </div>
      ) : null}

      {lijsten.status === "ready" &&
      lijsten.context.currentProfiel &&
      lijsten.lists.length === 0 ? (
        <div className="lijsten-state">
          <h2>Geen zichtbare lijsten</h2>
          <p>Er zijn geen praktische lijsten zichtbaar voor dit profiel.</p>
        </div>
      ) : null}

      {lijsten.status === "ready" && lijsten.lists.length > 0 ? (
        <div className="lijsten-grid">
          {lijsten.lists.map((list) => (
            <Link
              className="lijsten-card-link"
              href={`/lijsten/${list.id}`}
              key={list.id}
            >
              <article className="lijsten-card">
                <div className="lijsten-card__meta">
                  <span>{list.categoryName ?? "Geen categorie"}</span>
                  <span>{formatStatus(list.status)}</span>
                </div>
                <h2>{list.title}</h2>
                {list.description ? <p>{list.description}</p> : null}

                <dl className="lijsten-card__facts">
                  <div>
                    <dt>Taken</dt>
                    <dd>{list.taskCount}</dd>
                  </div>
                  <div>
                    <dt>Geclaimd</dt>
                    <dd>{list.claimedTaskCount}</dd>
                  </div>
                  <div>
                    <dt>Afgerond</dt>
                    <dd>{list.completedTaskCount}</dd>
                  </div>
                  <div>
                    <dt>Moment</dt>
                    <dd>{list.linkedMoment?.title ?? "Niet gekoppeld"}</dd>
                  </div>
                </dl>

                {list.linkedMoment && formatMomentTime(list) ? (
                  <p className="lijsten-card__moment-time">
                    {formatMomentTime(list)}
                  </p>
                ) : null}

                <p className="lijsten-card__open">Open lijst</p>
              </article>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
