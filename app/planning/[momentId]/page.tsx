"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchMomentDetail,
  type MomentDetailData
} from "@/src/lib/moment/detail";

type MomentDetailState =
  | { status: "loading" }
  | { status: "ready"; detail: MomentDetailData }
  | { status: "error"; message: string };

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

export default function MomentDetailPage() {
  const params = useParams<{ momentId: string }>();
  const momentId = useMemo(() => {
    const value = params.momentId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.momentId]);
  const [detailState, setDetailState] = useState<MomentDetailState>({
    status: "loading"
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
        const detail = await fetchMomentDetail(momentId);

        if (isMounted) {
          setDetailState({ status: "ready", detail });
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
            aria-labelledby="moment-participations-heading"
          >
            <h2 id="moment-participations-heading">Deelnames</h2>
            {detailState.detail.participations.length === 0 ? (
              <p className="moment-detail-empty">
                Geen deelnames zichtbaar voor deze sessie.
              </p>
            ) : (
              <div className="moment-detail-list">
                {detailState.detail.participations.map((participation) => (
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
                  <article className="moment-detail-mini-card" key={role.id}>
                    <div className="moment-detail-mini-card__meta">
                      <span>{formatStatus(role.roleType)}</span>
                      <span>{formatStatus(role.status)}</span>
                    </div>
                    <h3>{role.title}</h3>
                    {role.description ? <p>{role.description}</p> : null}
                    <p>
                      Nodig: {role.minimumCount}
                      {role.maximumCount
                        ? ` tot ${role.maximumCount}`
                        : " of meer"}
                    </p>
                    {role.occupancies.length === 0 ? (
                      <p className="moment-detail-empty">
                        Geen bezetting zichtbaar.
                      </p>
                    ) : (
                      <ul className="moment-detail-occupancy-list">
                        {role.occupancies.map((occupancy) => (
                          <li key={occupancy.id}>
                            <strong>{occupancy.profileName}</strong>
                            <span>{formatStatus(occupancy.status)}</span>
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
    </section>
  );
}
