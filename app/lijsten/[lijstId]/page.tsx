"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchLijstDetail,
  type LijstDetail,
  type LijstTask,
  type LijstTaskAssignee
} from "@/src/lib/lijsten/items";
import {
  canCompleteTask,
  canClaimTask,
  claimTask,
  completeTask,
  COMPLETED_TASK_ASSIGNEE_STATUS,
  getTaskClaimState,
  isCompletedTaskStatus,
  releaseTask,
  type TaskClaimResult
} from "@/src/lib/lijsten/task-actions";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type LijstDetailState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      list: LijstDetail | null;
    }
  | { status: "error"; message: string };

type ActionState =
  | { status: "idle"; message: string | null }
  | { status: "running"; message: string | null }
  | { status: "success"; message: string }
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

function formatMomentTime(list: LijstDetail) {
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

function formatTaskClaimResult(result: TaskClaimResult, task: LijstTask) {
  if (result.status === "already_claimed") {
    return `Je voert "${task.title}" al uit.`;
  }

  if (result.status === "existing_not_reclaimable") {
    return `Deze taak heeft voor jouw profiel al status ${formatStatus(
      result.assigneeStatus
    )}.`;
  }

  return result.status === "reactivated"
    ? `Je voert "${task.title}" opnieuw uit.`
    : `Je voert "${task.title}" uit.`;
}

export default function LijstDetailPage() {
  const params = useParams<{ lijstId: string }>();
  const lijstId = useMemo(() => {
    const value = params.lijstId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.lijstId]);
  const [detailState, setDetailState] = useState<LijstDetailState>({
    status: "loading"
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    message: null
  });

  useEffect(() => {
    let isMounted = true;

    async function loadList() {
      if (!lijstId) {
        setDetailState({
          status: "error",
          message: "Geen lijst-id gevonden in de route."
        });
        return;
      }

      try {
        const [context, list] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchLijstDetail(lijstId)
        ]);

        if (isMounted) {
          setDetailState({ status: "ready", context, list });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDetailState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van deze lijst."
          });
        }
      }
    }

    loadList();

    return () => {
      isMounted = false;
    };
  }, [lijstId]);

  async function refreshList(successMessage?: string) {
    const [context, list] = await Promise.all([
      fetchCurrentSamzoContext(),
      fetchLijstDetail(lijstId)
    ]);

    setDetailState({ status: "ready", context, list });

    if (successMessage) {
      setActionState({ status: "success", message: successMessage });
    }
  }

  async function handleClaimTask(task: LijstTask) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Taak claimen kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Taakclaim wordt opgeslagen..."
    });

    try {
      const result = await claimTask({
        taakId: task.id,
        persoonId: detailState.context.persoon.id,
        profielId: detailState.context.currentProfiel.id
      });

      await refreshList(formatTaskClaimResult(result, task));
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Taak claimen is niet gelukt."
      });
    }
  }

  async function handleReleaseTask(
    task: LijstTask,
    assignee: LijstTaskAssignee
  ) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Taak vrijgeven kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Taak wordt vrijgegeven..."
    });

    try {
      await releaseTask({
        taakuitvoerderId: assignee.id,
        taakId: task.id,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshList(`Je hebt "${task.title}" vrijgegeven.`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Taak vrijgeven is niet gelukt."
      });
    }
  }

  async function handleCompleteTask(
    task: LijstTask,
    assignee: LijstTaskAssignee
  ) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Taak afvinken kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Taak wordt afgevinkt..."
    });

    try {
      await completeTask({
        taakuitvoerderId: assignee.id,
        taakId: task.id,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshList(`Je hebt "${task.title}" afgevinkt.`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Taak afvinken is niet gelukt."
      });
    }
  }

  const context =
    detailState.status === "ready" ? detailState.context : null;
  const list = detailState.status === "ready" ? detailState.list : null;
  const currentProfielId = context?.currentProfiel?.id ?? null;
  const hasCurrentProfile = Boolean(context?.persoon && context.currentProfiel);

  return (
    <section className="lijsten-page">
      <Link className="moment-detail-back-link" href="/lijsten">
        Terug naar lijsten
      </Link>

      {detailState.status === "loading" ? (
        <p className="lijsten-state">Lijst wordt geladen...</p>
      ) : null}

      {detailState.status === "error" ? (
        <div className="lijsten-state lijsten-state--error" role="status">
          <h1>Lijst kon niet worden geladen</h1>
          <p>{detailState.message}</p>
        </div>
      ) : null}

      {detailState.status === "ready" && !list ? (
        <div className="lijsten-state">
          <h1>Lijst niet zichtbaar</h1>
          <p>
            Deze lijst bestaat niet of is niet zichtbaar voor de huidige
            Supabase Auth sessie en RLS-regels.
          </p>
        </div>
      ) : null}

      {detailState.status === "ready" && list ? (
        <>
          <header className="lijsten-detail-hero">
            <div className="lijsten-card__meta">
              <span>{list.categoryName ?? "Geen categorie"}</span>
              <span>{formatStatus(list.status)}</span>
            </div>
            <h1>{list.title}</h1>
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
                <dt>Profiel</dt>
                <dd>
                  {context?.currentProfiel?.weergavenaam ??
                    "Geen actief profiel"}
                </dd>
              </div>
            </dl>

            {list.linkedMoment ? (
              <p className="lijsten-card__moment-time">
                Moment:{" "}
                <Link href={`/planning/${list.linkedMoment.id}`}>
                  {list.linkedMoment.title}
                </Link>
                {formatMomentTime(list) ? ` - ${formatMomentTime(list)}` : ""}
              </p>
            ) : null}
          </header>

          {actionState.message ? (
            <p
              className={
                actionState.status === "error"
                  ? "lijsten-action-message lijsten-action-message--error"
                  : "lijsten-action-message"
              }
              role="status"
            >
              {actionState.message}
            </p>
          ) : null}

          {!context?.authUser ? (
            <div className="lijsten-state">
              <h2>Nog niet ingelogd</h2>
              <p>Log in via beheer om taken en acties door RLS te bepalen.</p>
            </div>
          ) : null}

          {context?.authUser && !context.currentProfiel ? (
            <div className="lijsten-state">
              <h2>Geen actief profiel</h2>
              <p>
                De ingelogde gebruiker heeft geen actief gekoppeld SAM&ZO
                profiel voor taakacties.
              </p>
            </div>
          ) : null}

          <section
            className="lijsten-detail-section"
            aria-labelledby="lijst-taken-heading"
          >
            <h2 id="lijst-taken-heading">Taken</h2>
            {list.tasks.length === 0 ? (
              <p className="lijsten-state">Geen taken zichtbaar.</p>
            ) : (
              <ul className="lijsten-task-list lijsten-task-list--detail">
                {list.tasks.map((task) => {
                  const claimState = getTaskClaimState(task, currentProfielId);
                  const completedAssignees = task.assignees.filter(
                    (assignee) =>
                      assignee.status === COMPLETED_TASK_ASSIGNEE_STATUS
                  );
                  const taskIsCompleted = isCompletedTaskStatus(task.status);
                  const taskCanClaim =
                    canClaimTask(task, claimState, hasCurrentProfile) &&
                    actionState.status !== "running";
                  const taskCanComplete =
                    canCompleteTask(task, claimState, hasCurrentProfile) &&
                    actionState.status !== "running";
                  const taskCanRelease =
                    claimState.status === "claimed_by_current" &&
                    !taskIsCompleted &&
                    actionState.status !== "running";

                  return (
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
                      <div className="lijsten-task-list__claim-state">
                        {taskIsCompleted ? <span>Afgevinkt</span> : null}
                        {claimState.status === "claimed_by_current" ? (
                          <span>Jij voert deze taak uit</span>
                        ) : null}
                        {claimState.status === "claimed_by_other"
                          ? claimState.activeAssignees.map((assignee) => (
                              <span key={assignee.id}>
                                Geclaimd door {assignee.profileName}
                              </span>
                            ))
                          : null}
                        {claimState.status === "not_claimed" ? (
                          <span>Niet geclaimd</span>
                        ) : null}
                        {completedAssignees.length > 0
                          ? completedAssignees.map((assignee) => (
                              <span key={assignee.id}>
                                Afgevinkt door {assignee.profileName}
                              </span>
                            ))
                          : null}
                        {claimState.status === "not_claimed" &&
                        claimState.currentAssignee ? (
                          <span>
                            Jouw eerdere status:{" "}
                            {formatStatus(claimState.currentAssignee.status)}
                          </span>
                        ) : null}
                      </div>
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
                      <div className="lijsten-task-list__actions">
                        {taskCanClaim ? (
                          <button
                            onClick={() => handleClaimTask(task)}
                            type="button"
                          >
                            Taak claimen
                          </button>
                        ) : null}
                        {taskCanComplete &&
                        claimState.status === "claimed_by_current" ? (
                          <button
                            onClick={() =>
                              handleCompleteTask(
                                task,
                                claimState.currentAssignee
                              )
                            }
                            type="button"
                          >
                            Taak afvinken
                          </button>
                        ) : null}
                        {taskCanRelease ? (
                          <button
                            onClick={() =>
                              handleReleaseTask(
                                task,
                                claimState.currentAssignee
                              )
                            }
                            type="button"
                          >
                            Taak vrijgeven
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
