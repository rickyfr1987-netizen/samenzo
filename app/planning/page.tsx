"use client";

import { useEffect, useState } from "react";

import {
  DEVELOPMENT_PROFILES,
  getDevelopmentProfileById,
  isDevelopmentProfileContextEnabled,
  readStoredDevelopmentProfileId,
  writeStoredDevelopmentProfileId
} from "@/src/lib/dev/profile-context";
import {
  fetchPlanningAuthContext,
  fetchPlanningMoments,
  type PlanningAuthContext,
  type PlanningMoment
} from "@/src/lib/planning/moments";

type PlanningState =
  | { status: "loading" }
  | {
      status: "ready";
      authContext: PlanningAuthContext;
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
          fetchPlanningAuthContext(),
          fetchPlanningMoments()
        ]);

        if (isMounted) {
          setPlanning({ status: "ready", authContext, moments });
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

  const authContext =
    planning.status === "ready" ? planning.authContext : null;

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

      {developmentProfileContextEnabled ? (
        <section
          aria-labelledby="development-profile-heading"
          className="planning-dev-panel"
        >
          <div>
            <p className="planning-dev-panel__label">Alleen ontwikkeling</p>
            <h2 id="development-profile-heading">SAM&ZO testprofiel</h2>
            <p>
              Deze keuze staat alleen in localStorage. Supabase RLS gebruikt
              nog steeds de Auth-sessie en personen.auth_user_id.
            </p>
          </div>

          <label className="planning-dev-panel__field">
            <span>Geselecteerd testprofiel</span>
            <select
              onChange={(event) =>
                handleDevelopmentProfileChange(event.target.value)
              }
              value={selectedDevelopmentProfileId ?? ""}
            >
              <option value="">Geen lokaal testprofiel</option>
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
                {authContext?.isAuthenticated
                  ? "Aangemeld"
                  : "Niet aangemeld"}
              </dd>
            </div>
            <div>
              <dt>Actief testprofiel</dt>
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
            RLS geeft geen rijen terug voor deze Supabase sessie. Zonder
            aangemelde Auth-gebruiker met een gekoppelde personen.auth_user_id
            blijft current_profiel_id() leeg, ook als er lokaal een testprofiel
            is gekozen.
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
