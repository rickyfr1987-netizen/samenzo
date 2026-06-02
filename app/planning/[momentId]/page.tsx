"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchLijstenForMoment,
  type VisibleLijst
} from "@/src/lib/lijsten/items";
import {
  fetchMomentDetail,
  type MomentDetailParticipation,
  type MomentDetailRole,
  type MomentDetailData
} from "@/src/lib/moment/detail";
import {
  isActiveParticipationStatus,
  isBlockingParticipationStatus,
  registerForMoment,
  unregisterFromMoment
} from "@/src/lib/moment/participation";
import {
  claimMomentRole,
  releaseMomentRole
} from "@/src/lib/moment/role-claims";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type MomentDetailState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      detail: MomentDetailData;
      linkedLists: VisibleLijst[];
    }
  | { status: "error"; message: string };

type ActionState =
  | { status: "idle"; message: string | null }
  | { status: "running"; message: string | null }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type MomentDetailRoleOccupancy = MomentDetailRole["occupancies"][number];

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

function formatDateTime(
  startsAt: string | null,
  endsAt: string | null,
  isAllDay: boolean
) {
  if (!startsAt) {
    return "Datum nog niet bekend";
  }

  const start = new Date(startsAt);

  if (isAllDay) {
    return `${dateFormatter.format(start)} - Hele dag`;
  }

  const startLabel = dateTimeFormatter.format(start);

  if (!endsAt) {
    return startLabel;
  }

  return `${startLabel} - ${dateTimeFormatter.format(new Date(endsAt))}`;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

const ROLE_BLOCKING_PARTICIPATION_STATUSES: MomentDetailParticipation["status"][] =
  [
    "voorgesteld",
    "uitgenodigd",
    "wachtlijst",
    "afgemeld",
    "geweigerd",
    "geannuleerd",
    "verlopen"
  ];

const ROLE_BLOCKING_CLAIM_MESSAGE =
  "Je kunt deze rol nog niet claimen omdat je deelname nog niet actief is.";

function isRoleBlockingParticipationStatus(
  status: MomentDetailParticipation["status"]
) {
  return ROLE_BLOCKING_PARTICIPATION_STATUSES.includes(status);
}

function formatParticipationState(participation: MomentDetailParticipation | null) {
  if (!participation) {
    return "Niet aangemeld";
  }

  if (participation.status === "ingeschreven") {
    return "Ingeschreven";
  }

  if (participation.status === "afgemeld") {
    return "Afgemeld";
  }

  if (participation.status === "voorgesteld") {
    return "Voorgesteld";
  }

  if (participation.status === "uitgenodigd") {
    return "Uitgenodigd";
  }

  if (participation.status === "wachtlijst") {
    return "Op wachtlijst";
  }

  return formatStatus(participation.status);
}

function findCurrentParticipation(
  participations: MomentDetailParticipation[],
  profielId: string
) {
  const currentProfileParticipations = participations.filter(
    (participation) => participation.profileId === profielId
  );

  return (
    currentProfileParticipations.find((participation) =>
      isActiveParticipationStatus(participation.status)
    ) ??
    currentProfileParticipations.find((participation) =>
      isBlockingParticipationStatus(participation.status)
    ) ??
    currentProfileParticipations[0] ??
    null
  );
}

function isRoleOpenForClaim(role: MomentDetailRole) {
  return role.status === "open" || role.status === "incompleet";
}

function getActiveRoleOccupancies(role: MomentDetailRole) {
  return role.occupancies.filter((occupancy) => occupancy.status === "actief");
}

function findCurrentRoleOccupancy(role: MomentDetailRole, profielId: string) {
  const currentProfileOccupancies = role.occupancies.filter(
    (occupancy) => occupancy.profileId === profielId
  );

  return (
    currentProfileOccupancies.find(
      (occupancy) => occupancy.status === "actief"
    ) ??
    currentProfileOccupancies[0] ??
    null
  );
}

function hasRoleSpace(role: MomentDetailRole) {
  return (
    role.maximumCount === null ||
    getActiveRoleOccupancies(role).length < role.maximumCount
  );
}

export default function MomentDetailPage() {
  const params = useParams<{ momentId: string }>();
  const momentId = useMemo(() => {
    const value = params.momentId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.momentId]);
  const [detailState, setDetailState] = useState<MomentDetailState>({
    status: "loading"
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    message: null
  });

  useEffect(() => {
    let isMounted = true;

    async function loadMomentDetail() {
      if (!momentId) {
        setDetailState({
          status: "error",
          message: "Geen moment-id gevonden in de route."
        });
        return;
      }

      try {
        const [context, detail, linkedLists] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchMomentDetail(momentId),
          fetchLijstenForMoment(momentId)
        ]);

        if (isMounted) {
          setDetailState({ status: "ready", context, detail, linkedLists });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDetailState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van dit moment."
          });
        }
      }
    }

    loadMomentDetail();

    return () => {
      isMounted = false;
    };
  }, [momentId]);

  async function refreshMomentDetail(successMessage?: string) {
    const [context, detail, linkedLists] = await Promise.all([
      fetchCurrentSamzoContext(),
      fetchMomentDetail(momentId),
      fetchLijstenForMoment(momentId)
    ]);

    setDetailState({ status: "ready", context, detail, linkedLists });

    if (successMessage) {
      setActionState({ status: "success", message: successMessage });
    }
  }

  async function handleRegister() {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Aanmelden kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Aanmelding wordt opgeslagen..."
    });

    try {
      const result = await registerForMoment({
        momentId,
        persoonId: detailState.context.persoon.id,
        profielId: detailState.context.currentProfiel.id
      });

      if (result.status === "already_registered") {
        await refreshMomentDetail(
          `Je deelname staat al op ${formatStatus(result.deelnameStatus)}.`
        );
        return;
      }

      await refreshMomentDetail(
        result.status === "reactivated"
          ? "Je deelname is opnieuw aangemeld."
          : "Je bent aangemeld voor dit moment."
      );
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Aanmelden is niet gelukt."
      });
    }
  }

  async function handleUnregister(participationId: string) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Afmelden kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Afmelding wordt opgeslagen..."
    });

    try {
      await unregisterFromMoment({
        deelnameId: participationId,
        momentId,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshMomentDetail("Je bent afgemeld voor dit moment.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Afmelden is niet gelukt."
      });
    }
  }

  async function handleClaimRole(role: MomentDetailRole) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Rol claimen kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    if (
      currentParticipation &&
      isRoleBlockingParticipationStatus(currentParticipation.status)
    ) {
      setActionState({
        status: "error",
        message: ROLE_BLOCKING_CLAIM_MESSAGE
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Rolclaim wordt opgeslagen..."
    });

    try {
      await claimMomentRole({
        momentRoleId: role.id,
        persoonId: detailState.context.persoon.id,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshMomentDetail(`Je hebt de rol "${role.title}" geclaimd.`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Rol claimen is niet gelukt."
      });
    }
  }

  async function handleReleaseRole(
    role: MomentDetailRole,
    occupancy: MomentDetailRoleOccupancy
  ) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Rol vrijgeven kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Rol wordt vrijgegeven..."
    });

    try {
      await releaseMomentRole({
        roleOccupancyId: occupancy.id,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshMomentDetail(`Je hebt de rol "${role.title}" vrijgegeven.`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Rol vrijgeven is niet gelukt."
      });
    }
  }

  const currentProfiel =
    detailState.status === "ready"
      ? detailState.context.currentProfiel
      : null;
  const currentParticipation =
    detailState.status === "ready" && currentProfiel
      ? findCurrentParticipation(
          detailState.detail.participations,
          currentProfiel.id
        )
      : null;
  const hasBlockingParticipation = currentParticipation
    ? isBlockingParticipationStatus(currentParticipation.status)
    : false;
  const hasRoleBlockingParticipation = currentParticipation
    ? isRoleBlockingParticipationStatus(currentParticipation.status)
    : false;
  const canRegister =
    detailState.status === "ready" &&
    Boolean(detailState.detail.moment?.registrationOpen) &&
    Boolean(detailState.context.persoon) &&
    Boolean(currentProfiel) &&
    !hasBlockingParticipation &&
    actionState.status !== "running";
  const canUnregister =
    detailState.status === "ready" &&
    Boolean(currentProfiel) &&
    Boolean(currentParticipation) &&
    isActiveParticipationStatus(currentParticipation!.status) &&
    actionState.status !== "running";
  const activeParticipants =
    detailState.status === "ready"
      ? detailState.detail.participations.filter((participation) =>
          isActiveParticipationStatus(participation.status)
        )
      : [];
  const activeRoleProfileIds =
    detailState.status === "ready"
      ? new Set(
          detailState.detail.roles.flatMap((role) =>
            getActiveRoleOccupancies(role).map(
              (occupancy) => occupancy.profileId
            )
          )
        )
      : new Set<string>();
  const regularActiveParticipants = activeParticipants.filter(
    (participation) => !activeRoleProfileIds.has(participation.profileId)
  );

  return (
    <section className="moment-detail-page">
      <Link className="moment-detail-back-link" href="/planning">
        Terug naar planning
      </Link>

      {detailState.status === "loading" ? (
        <p className="moment-detail-state">Moment wordt geladen...</p>
      ) : null}

      {detailState.status === "error" ? (
        <div
          className="moment-detail-state moment-detail-state--error"
          role="status"
        >
          <h1>Moment kon niet worden geladen</h1>
          <p>{detailState.message}</p>
        </div>
      ) : null}

      {detailState.status === "ready" && !detailState.detail.moment ? (
        <div className="moment-detail-state">
          <h1>Moment niet zichtbaar</h1>
          <p>
            Dit moment bestaat niet of is niet zichtbaar voor de huidige
            Supabase Auth sessie en RLS-regels.
          </p>
        </div>
      ) : null}

      {detailState.status === "ready" && detailState.detail.moment ? (
        <>
          <header className="moment-detail-hero">
            <p className="moment-detail-hero__eyebrow">
              Moment detail - toegestane werkelijkheid
            </p>
            <div className="moment-detail-hero__meta">
              <span>
                {detailState.detail.moment.categoryName ?? "Geen categorie"}
              </span>
              <span>{formatStatus(detailState.detail.moment.status)}</span>
            </div>
            <h1>{detailState.detail.moment.title}</h1>
            <p className="moment-detail-hero__time">
              {formatDateTime(
                detailState.detail.moment.startsAt,
                detailState.detail.moment.endsAt,
                detailState.detail.moment.isAllDay
              )}
            </p>
            {detailState.detail.moment.location ? (
              <p className="moment-detail-hero__location">
                {detailState.detail.moment.location}
              </p>
            ) : null}
            {detailState.detail.moment.description ? (
              <p>{detailState.detail.moment.description}</p>
            ) : null}
          </header>

          <section className="moment-detail-facts" aria-label="Momentgegevens">
            <div>
              <span>Inschrijving</span>
              <strong>
                {detailState.detail.moment.registrationOpen ? "Open" : "Dicht"}
              </strong>
            </div>
            <div>
              <span>Capaciteit</span>
              <strong>
                {detailState.detail.moment.capacity?.toString() ??
                  "Niet ingesteld"}
              </strong>
            </div>
            <div>
              <span>Perspectief</span>
              <strong>RLS bepaalt wat zichtbaar is</strong>
            </div>
          </section>

          <section
            className="moment-detail-participation-panel"
            aria-labelledby="moment-own-participation-heading"
          >
            <div>
              <p className="moment-detail-participation-panel__label">
                Jouw deelname
              </p>
              <h2 id="moment-own-participation-heading">
                {formatParticipationState(currentParticipation)}
              </h2>
              <p>
                Acties gebruiken de huidige Supabase Auth sessie, het gekoppelde
                SAM&ZO profiel en de bestaande RLS-regels.
              </p>
            </div>

            <dl className="moment-detail-participation-facts">
              <div>
                <dt>Profiel</dt>
                <dd>
                  {currentProfiel?.weergavenaam ??
                    "Geen actief gekoppeld profiel"}
                </dd>
              </div>
              <div>
                <dt>Deelnamestatus</dt>
                <dd>{formatParticipationState(currentParticipation)}</dd>
              </div>
              <div>
                <dt>Inschrijving</dt>
                <dd>
                  {detailState.detail.moment.registrationOpen
                    ? "Open"
                    : "Gesloten"}
                </dd>
              </div>
            </dl>

            {!detailState.context.authUser ? (
              <p className="moment-detail-action-note">
                Log in via beheer om je voor dit moment aan of af te melden.
              </p>
            ) : null}

            {detailState.context.authUser && !currentProfiel ? (
              <p className="moment-detail-action-note">
                Deze gebruiker heeft geen enkel actief gekoppeld profiel voor
                deelname-acties.
              </p>
            ) : null}

            {currentParticipation &&
            !isActiveParticipationStatus(currentParticipation.status) &&
            isBlockingParticipationStatus(currentParticipation.status) ? (
              <p className="moment-detail-action-note">
                Er is al een lopende deelname met status{" "}
                {formatStatus(currentParticipation.status)}. Deze eerste versie
                wijzigt die status nog niet.
              </p>
            ) : null}

            {currentProfiel &&
            !currentParticipation &&
            !detailState.detail.moment.registrationOpen ? (
              <p className="moment-detail-action-note">
                Aanmelden staat uit omdat de inschrijving voor dit moment
                gesloten is.
              </p>
            ) : null}

            <div className="moment-detail-actions">
              {canRegister ? (
                <button onClick={handleRegister} type="button">
                  Aanmelden
                </button>
              ) : null}
              {canUnregister && currentParticipation ? (
                <button
                  onClick={() => handleUnregister(currentParticipation.id)}
                  type="button"
                >
                  Afmelden
                </button>
              ) : null}
            </div>

            {actionState.message ? (
              <p
                className={
                  actionState.status === "error"
                    ? "moment-detail-action-message moment-detail-action-message--error"
                    : "moment-detail-action-message"
                }
                role="status"
              >
                {actionState.message}
              </p>
            ) : null}
          </section>

          <section
            className="moment-detail-section"
            aria-labelledby="moment-groups-heading"
          >
            <h2 id="moment-groups-heading">Zichtbare groepen</h2>
            {detailState.detail.groups.length === 0 ? (
              <p className="moment-detail-empty">
                Geen groepen zichtbaar voor deze sessie, of niet gekoppeld aan
                dit moment.
              </p>
            ) : (
              <div className="moment-detail-list">
                {detailState.detail.groups.map((group) => (
                  <article className="moment-detail-mini-card" key={group.id}>
                    <div className="moment-detail-mini-card__meta">
                      <span>{group.contextType ?? "context onbekend"}</span>
                      <span>{formatStatus(group.status)}</span>
                    </div>
                    <h3>{group.name}</h3>
                    <p>{formatStatus(group.visibility)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="moment-detail-section"
            aria-labelledby="moment-lists-heading"
          >
            <h2 id="moment-lists-heading">Gekoppelde lijsten en taken</h2>
            {detailState.linkedLists.length === 0 ? (
              <p className="moment-detail-empty">
                Geen gekoppelde lijsten of taken zichtbaar voor deze sessie.
              </p>
            ) : (
              <div className="moment-detail-list">
                {detailState.linkedLists.map((list) => (
                  <article className="moment-detail-mini-card" key={list.id}>
                    <div className="moment-detail-mini-card__meta">
                      <span>{list.categoryName ?? "Lijst"}</span>
                      <span>{formatStatus(list.status)}</span>
                    </div>
                    <h3>{list.title}</h3>
                    {list.description ? <p>{list.description}</p> : null}
                    <p>
                      {list.taskCount === 1
                        ? "1 zichtbare taak"
                        : `${list.taskCount} zichtbare taken`}
                    </p>

                    {list.tasks.length === 0 ? (
                      <p className="moment-detail-empty">
                        Geen taken zichtbaar.
                      </p>
                    ) : (
                      <ul className="moment-detail-task-list">
                        {list.tasks.map((task) => (
                          <li key={task.id}>
                            <div className="moment-detail-task-list__meta">
                              <span>
                                {task.sortOrder === null
                                  ? "Geen volgorde"
                                  : `Stap ${task.sortOrder}`}
                              </span>
                              <span>{formatStatus(task.status)}</span>
                            </div>
                            <strong>{task.title}</strong>
                            {task.description ? <p>{task.description}</p> : null}
                            {task.assignees.length > 0 ? (
                              <div className="moment-detail-task-list__assignees">
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
            )}
          </section>

          <section
            className="moment-detail-section"
            aria-labelledby="moment-participations-heading"
          >
            <h2 id="moment-participations-heading">Actieve deelnemers</h2>
            {regularActiveParticipants.length === 0 ? (
              <p className="moment-detail-empty">
                Geen actieve deelnemers zonder rol zichtbaar voor deze sessie.
              </p>
            ) : (
              <div className="moment-detail-list">
                {regularActiveParticipants.map((participation) => (
                  <article
                    className="moment-detail-mini-card"
                    key={participation.id}
                  >
                    <div className="moment-detail-mini-card__meta">
                      <span>Deelname</span>
                      <span>{formatStatus(participation.status)}</span>
                    </div>
                    <h3>{participation.profileName}</h3>
                    <p>
                      Profielstatus:{" "}
                      {participation.profileStatus
                        ? formatStatus(participation.profileStatus)
                        : "niet zichtbaar"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="moment-detail-section"
            aria-labelledby="moment-roles-heading"
          >
            <h2 id="moment-roles-heading">Rollen en bezetting</h2>
            {detailState.detail.roles.length === 0 ? (
              <p className="moment-detail-empty">
                Geen rollen zichtbaar voor deze sessie.
              </p>
            ) : (
              <div className="moment-detail-list">
                {detailState.detail.roles.map((role) => (
                  (() => {
                    const currentRoleOccupancy = currentProfiel
                      ? findCurrentRoleOccupancy(role, currentProfiel.id)
                      : null;
                    const activeOccupancies = getActiveRoleOccupancies(role);
                    const roleHasSpace = hasRoleSpace(role);
                    const roleClaimBlockedByParticipation =
                      hasRoleBlockingParticipation &&
                      currentRoleOccupancy?.status !== "actief";
                    const canClaimRole =
                      detailState.context.persoon &&
                      currentProfiel &&
                      isRoleOpenForClaim(role) &&
                      roleHasSpace &&
                      currentRoleOccupancy?.status !== "actief" &&
                      !hasRoleBlockingParticipation &&
                      actionState.status !== "running";

                    return (
                      <article
                        className="moment-detail-mini-card"
                        key={role.id}
                      >
                        <div className="moment-detail-mini-card__meta">
                          <span>{formatStatus(role.roleType)}</span>
                          <span>{formatStatus(role.status)}</span>
                        </div>
                        <h3>{role.title}</h3>
                        {role.description ? <p>{role.description}</p> : null}
                        <p>
                          Bezetting: {activeOccupancies.length} /{" "}
                          {role.maximumCount ?? "geen maximum"}
                        </p>
                        <p>
                          Nodig: {role.minimumCount}
                          {role.maximumCount
                            ? ` tot ${role.maximumCount}`
                            : " of meer"}
                        </p>

                        {currentRoleOccupancy?.status === "actief" ? (
                          <p className="moment-detail-role-note">
                            Jij hebt deze rol.
                          </p>
                        ) : null}

                        {!roleHasSpace ? (
                          <p className="moment-detail-role-note">
                            Deze rol is volgens de zichtbare bezetting gevuld.
                          </p>
                        ) : null}

                        {roleClaimBlockedByParticipation ? (
                          <p className="moment-detail-role-note">
                            {ROLE_BLOCKING_CLAIM_MESSAGE}
                          </p>
                        ) : null}

                        {activeOccupancies.length === 0 ? (
                          <p className="moment-detail-empty">
                            Geen actieve bezetting zichtbaar.
                          </p>
                        ) : (
                          <ul className="moment-detail-occupancy-list">
                            {activeOccupancies.map((occupancy) => (
                              <li key={occupancy.id}>
                                <strong>{occupancy.profileName}</strong>
                                <span>{formatStatus(occupancy.status)}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {canClaimRole ? (
                          <div className="moment-detail-actions moment-detail-actions--role">
                            <button
                              onClick={() => handleClaimRole(role)}
                              type="button"
                            >
                              Rol claimen
                            </button>
                          </div>
                        ) : null}
                        {currentRoleOccupancy?.status === "actief" &&
                        actionState.status !== "running" ? (
                          <div className="moment-detail-actions moment-detail-actions--role">
                            <button
                              onClick={() =>
                                handleReleaseRole(role, currentRoleOccupancy)
                              }
                              type="button"
                            >
                              Rol vrijgeven
                            </button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })()
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
