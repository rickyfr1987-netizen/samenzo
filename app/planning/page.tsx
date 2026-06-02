"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  DEVELOPMENT_PROFILES,
  getDevelopmentProfileById,
  isDevelopmentProfileContextEnabled,
  readStoredDevelopmentProfileId,
  writeStoredDevelopmentProfileId
} from "@/src/lib/dev/profile-context";
import {
  fetchPlanningMoments,
  type PlanningMoment
} from "@/src/lib/planning/moments";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type PlanningState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      moments: PlanningMoment[];
    }
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
    return `${allDayFormatter.format(start)} - Hele dag`;
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
  const [selectedDevelopmentProfileId, setSelectedDevelopmentProfileId] =
    useState<string | null>(() =>
      isDevelopmentProfileContextEnabled()
        ? readStoredDevelopmentProfileId()
        : null
    );

  const developmentProfileContextEnabled =
    isDevelopmentProfileContextEnabled();
  const selectedDevelopmentProfile = getDevelopmentProfileById(
    selectedDevelopmentProfileId
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPlanning() {
      try {
        const [authContext, moments] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchPlanningMoments()
        ]);

        if (isMounted) {
          setPlanning({ status: "ready", context: authContext, moments });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setPlanning({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van de planning."
          });
        }
      }
    }

    loadPlanning();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleDevelopmentProfileChange(profileId: string) {
    const nextProfileId = profileId || null;

    writeStoredDevelopmentProfileId(nextProfileId);
    setSelectedDevelopmentProfileId(nextProfileId);
  }

  const context = planning.status === "ready" ? planning.context : null;

  return (
    <section className="planning-page">
      <div className="planning-page__header">
        <p className="planning-page__eyebrow">Gemeenschappelijke werkelijkheid</p>
        <h1>Planning</h1>
        <p>
          Zichtbare momenten uit Supabase voor de huidige Auth sessie. Wat je
          hier ziet komt rechtstreeks door de bestaande RLS-regels.
        </p>
      </div>

      {developmentProfileContextEnabled ? (
        <section
          aria-labelledby="development-profile-heading"
          className="planning-dev-panel"
        >
          <div>
            <p className="planning-dev-panel__label">Alleen ontwikkeling</p>
            <h2 id="development-profile-heading">
              Verwachte seed-zichtbaarheid
            </h2>
            <p>
              Deze keuze is alleen uitleg bij de seeddata. Supabase RLS gebruikt
              de echte Auth-sessie, personen.auth_user_id en het gekoppelde
              profiel.
            </p>
          </div>

          <label className="planning-dev-panel__field">
            <span>Seedprofiel voor uitleg</span>
            <select
              onChange={(event) =>
                handleDevelopmentProfileChange(event.target.value)
              }
              value={selectedDevelopmentProfileId ?? ""}
            >
              <option value="">Geen seedprofiel gekozen</option>
              {DEVELOPMENT_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>

          <dl className="planning-dev-panel__facts">
            <div>
              <dt>Supabase Auth</dt>
              <dd>
                {context?.authUser
                  ? "Aangemeld"
                  : "Niet aangemeld"}
              </dd>
            </div>
            <div>
              <dt>Huidig profiel</dt>
              <dd>
                {context?.currentProfiel?.weergavenaam ??
                  "Geen actief gekoppeld profiel"}
              </dd>
            </div>
            <div>
              <dt>Seedprofiel</dt>
              <dd>{selectedDevelopmentProfile?.name ?? "Geen"}</dd>
            </div>
            <div>
              <dt>Groepen</dt>
              <dd>
                {selectedDevelopmentProfile
                  ? selectedDevelopmentProfile.groups.join(", ")
                  : "Geen"}
              </dd>
            </div>
            <div>
              <dt>Seedverwachting</dt>
              <dd>
                {selectedDevelopmentProfile?.expectedPlanningVisibility ??
                  "Kies een testprofiel om de verwachte zichtbaarheid te zien."}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

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
            RLS geeft geen momenten terug voor deze Auth sessie. Controleer of
            de ingelogde Supabase gebruiker is gekoppeld aan
            personen.auth_user_id en minstens een actief profiel heeft.
          </p>
        </div>
      ) : null}

      {planning.status === "ready" && planning.moments.length > 0 ? (
        <div className="planning-grid">
          {planning.moments.map((moment) => (
            <Link
              className="planning-card-link"
              href={`/planning/${moment.id}`}
              key={moment.id}
            >
              <article className="planning-card">
                <div className="planning-card__meta">
                  <span>{moment.categoryName ?? "Geen categorie"}</span>
                  <span>{formatStatus(moment.status)}</span>
                </div>
                <h2>{moment.title}</h2>
                <p className="planning-card__time">
                  {formatMomentTime(moment)}
                </p>
                {moment.location ? (
                  <p className="planning-card__location">{moment.location}</p>
                ) : null}
                {moment.description ? <p>{moment.description}</p> : null}
              </article>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
