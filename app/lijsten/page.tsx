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
        <p className="lijsten-page__eyebrow">Uitvoeringslaag</p>
        <h1>Lijsten</h1>
        <p>
          Lijsten helpen uitvoeren. Taken zijn praktische stappen die zichtbaar
          zijn via de huidige Supabase Auth sessie en RLS-regels.
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
          <p>
            Log in via beheer om lijsten en taken door RLS te laten bepalen.
          </p>
        </div>
      ) : null}

      {lijsten.status === "ready" &&
      lijsten.context.authUser &&
      !lijsten.context.currentProfiel ? (
        <div className="lijsten-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft geen actief gekoppeld SAM&ZO profiel
            voor deze read-only lijstweergave.
          </p>
        </div>
      ) : null}

      {lijsten.status === "ready" &&
      lijsten.context.currentProfiel &&
      lijsten.lists.length === 0 ? (
        <div className="lijsten-state">
          <h2>Geen zichtbare lijsten</h2>
          <p>
            Er zijn geen praktische lijsten of taken zichtbaar voor dit profiel.
          </p>
        </div>
      ) : null}

      {lijsten.status === "ready" && lijsten.lists.length > 0 ? (
        <div className="lijsten-grid">
          {lijsten.lists.map((list) => (
            <article className="lijsten-card" key={list.id}>
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
                  <dt>Moment</dt>
                  <dd>
                    {list.linkedMoment ? (
                      <Link href={`/planning/${list.linkedMoment.id}`}>
                        {list.linkedMoment.title}
                      </Link>
                    ) : (
                      "Niet gekoppeld"
                    )}
                  </dd>
                </div>
              </dl>

              {list.linkedMoment && formatMomentTime(list) ? (
                <p className="lijsten-card__moment-time">
                  {formatMomentTime(list)}
                </p>
              ) : null}

              {list.tasks.length === 0 ? (
                <p className="lijsten-empty">Geen taken zichtbaar.</p>
              ) : (
                <ul className="lijsten-task-list">
                  {list.tasks.map((task) => (
                    <li key={task.id}>
                      <div className="lijsten-task-list__header">
                        <span>
                          {task.sortOrder === null
                            ? "Geen volgorde"
                            : `Stap ${task.sortOrder}`}
                        </span>
                        <span>{formatStatus(task.status)}</span>
                      </div>
                      <h3>{task.title}</h3>
                      {task.description ? <p>{task.description}</p> : null}
                      {task.assignees.length > 0 ? (
                        <div className="lijsten-task-list__assignees">
                          {task.assignees.map((assignee) => (
                            <span key={assignee.id}>
                              {assignee.profileName}:{" "}
                              {formatStatus(assignee.status)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
