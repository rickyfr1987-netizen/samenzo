"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import {
  fetchDoelById,
  formatDoelStatus,
  type DoelLinkedList,
  type DoelLinkedMoment,
  type DoelenDetail
} from "@/src/lib/doelen/items";

type DoelDetailState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      goal: DoelenDetail | null;
    }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

const allDayFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

function formatDate(dateInput: string | null): string {
  if (!dateInput) {
    return "Onbekend";
  }

  return dateFormatter.format(new Date(dateInput));
}

function formatGoalOwner(owner: DoelenDetail["owner"]) {
  if (!owner) {
    return "Zichtbaarheid: eigenaar niet zichtbaar";
  }

  if (owner.kind === "profiel") {
    return `Profiel: ${owner.displayName}`;
  }

  return `Groep: ${owner.name}`;
}

function formatMomentTime(moment: DoelLinkedMoment) {
  if (!moment.startsAt) {
    return "Datum nog niet bekend";
  }

  const start = new Date(moment.startsAt);
  if (moment.isAllDay) {
    return `${allDayFormatter.format(start)} – Hele dag`;
  }

  return dateFormatter.format(start);
}

function listTaskCount(list: DoelLinkedList) {
  return list.tasks.length;
}

function listCompletedTaskCount(list: DoelLinkedList) {
  return list.tasks.filter((task) => task.status === "afgerond").length;
}

export default function DoelDetailPage() {
  const params = useParams<{ doelId: string }>();
  const doelId = useMemo(() => {
    const value = params.doelId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.doelId]);
  const [state, setState] = useState<DoelDetailState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    async function loadGoal() {
      if (!doelId) {
        setState({
          status: "error",
          message: "Geen doel-id gevonden in de route."
        });
        return;
      }

      try {
        const [context, goal] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchDoelById(doelId)
        ]);

        if (isMounted) {
          setState({ status: "ready", context, goal });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van dit doel."
          });
        }
      }
    }

    loadGoal();

    return () => {
      isMounted = false;
    };
  }, [doelId]);

  const context = state.status === "ready" ? state.context : null;

  return (
    <section className="doelen-detail-page">
      <Link className="moment-detail-back-link" href="/doelen">
        Terug naar doelen
      </Link>

      {state.status === "loading" ? (
        <p className="doelen-state">Doel laden...</p>
      ) : null}

      {state.status === "error" ? (
        <div className="doelen-state doelen-state--error" role="status">
          <h1>Doel kon niet worden geladen</h1>
          <p>{state.message}</p>
        </div>
      ) : null}

      {state.status === "ready" && !state.context.authUser ? (
        <div className="doelen-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om dit doel te tonen.</p>
        </div>
      ) : null}

      {state.status === "ready" &&
      state.context.authUser &&
      !state.context.currentProfiel ? (
        <div className="doelen-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft nog geen gekoppeld profiel voor
            deze doelweergave.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.context.currentProfiel && !state.goal ? (
        <div className="doelen-state">
          <h1>Doel niet zichtbaar</h1>
          <p>
            Dit doel bestaat niet of is niet zichtbaar met de huidige Auth-sessie
            en RLS-regels.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.goal ? (
        <>
          <header className="doelen-detail-hero">
            <p className="doelen-page__eyebrow">Doelen geven richting</p>
            <div className="doelen-card__meta">
              <span>{state.goal.categoryName ?? "Geen categorie"}</span>
              <span>{formatDoelStatus(state.goal.status)}</span>
            </div>
            <h1>{state.goal.title}</h1>
            {state.goal.description ? <p>{state.goal.description}</p> : null}

            <p className="doelen-detail-intro">
              Doelen zijn geen prestatiedashboard. Ze geven richting aan samen
              werken.
            </p>

            <dl className="doelen-detail-facts">
              <div>
                <span>Status</span>
                <strong>{formatDoelStatus(state.goal.status)}</strong>
              </div>
              <div>
                <span>Eigenaar / context</span>
                <strong>{formatGoalOwner(state.goal.owner)}</strong>
              </div>
              <div>
                <span>Periode</span>
                <strong>
                  {formatDate(state.goal.startAt)} - {formatDate(state.goal.endAt)}
                </strong>
              </div>
              <div>
                <span>Gewijzigd</span>
                <strong>{formatDate(state.goal.updatedAt ?? state.goal.createdAt)}</strong>
              </div>
            </dl>
          </header>

          <section className="doelen-detail-section">
            <h2>Gekoppelde momenten</h2>
            {state.goal.links.moments.length === 0 ? (
              <p className="doelen-empty">
                Er zijn geen zichtbare momenten gekoppeld aan dit doel.
              </p>
            ) : (
              <ul className="doelen-detail-list">
                {state.goal.links.moments.map((moment) => (
                  <li key={moment.id}>
                    <article className="doelen-mini-card">
                      <div className="doelen-mini-card__meta">
                        <span>{formatDoelStatus(moment.status)}</span>
                        <span>{formatMomentTime(moment)}</span>
                      </div>
                      <h3>
                        <Link href={`/planning/${moment.id}`}>{moment.title}</Link>
                      </h3>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="doelen-detail-section">
            <h2>Gekoppelde lijsten en taken</h2>
            {state.goal.links.lists.length === 0 ? (
              <p className="doelen-empty">
                Er zijn geen zichtbare lijsten gekoppeld aan dit doel.
              </p>
            ) : (
              <div className="doelen-detail-lists">
                {state.goal.links.lists.map((list) => (
                  <article className="doelen-mini-card" key={list.id}>
                    <div className="doelen-mini-card__meta">
                      <span>{formatDoelStatus(list.status)}</span>
                      <span>
                        {listTaskCount(list)} taken ·{" "}
                        {listCompletedTaskCount(list)} afgerond
                      </span>
                    </div>
                    <h3>
                      <Link href={`/lijsten/${list.id}`}>{list.title}</Link>
                    </h3>
                    {list.description ? <p>{list.description}</p> : null}

                    {list.tasks.length === 0 ? (
                      <p className="doelen-empty">Geen zichtbare taken.</p>
                    ) : (
                      <ul className="doelen-task-list">
                        {list.tasks.map((task) => (
                          <li key={task.id}>
                            <div>
                              <strong>{task.title}</strong>
                              <span>{formatDoelStatus(task.status)}</span>
                            </div>
                            {task.description ? <p>{task.description}</p> : null}
                            {task.deadlineAt ? (
                              <small>Deadline: {formatDate(task.deadlineAt)}</small>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {state.status === "ready" ? (
        <section className="doelen-context" aria-label="Huidige context">
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
