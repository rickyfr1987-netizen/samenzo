"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

import {
  DEVELOPMENT_PROFILES,
  getDevelopmentProfileById,
  isDevelopmentProfileContextEnabled,
  readStoredDevelopmentProfileId,
  writeStoredDevelopmentProfileId
} from "@/src/lib/dev/profile-context";
import {
  PLANNING_MOMENT_STATUSES,
  fetchPlanningFilterCategories,
  fetchPlanningMoments,
  type PlanningCategoryOption,
  type PlanningFilterParams,
  type PlanningMoment
} from "@/src/lib/planning/moments";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";

type PlanningFilterState = {
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
};

type PlanningState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      moments: PlanningMoment[];
    }
  | { status: "error"; message: string };

const DEFAULT_FILTERS: PlanningFilterState = {
  categoryId: "",
  dateFrom: "",
  dateTo: "",
  status: ""
};

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

function isPlanningStatus(
  value: string | null
): value is PlanningMoment["status"] {
  return (
    typeof value === "string" &&
    PLANNING_MOMENT_STATUSES.includes(value as PlanningMoment["status"])
  );
}

function getFilterFromSearchParams(
  params: Readonly<URLSearchParams>,
  defaults: PlanningFilterState
): PlanningFilterState {
  const status = params.get("status");

  return {
    categoryId: params.get("category") ?? defaults.categoryId,
    dateFrom: params.get("from") ?? defaults.dateFrom,
    dateTo: params.get("to") ?? defaults.dateTo,
    status: status && isPlanningStatus(status) ? status : defaults.status
  };
}

function mapUrlStateToQuery(
  filters: PlanningFilterState
): PlanningFilterParams {
  return {
    categoryId: filters.categoryId || null,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    status: isPlanningStatus(filters.status) ? filters.status : null
  };
}

export default function PlanningPage() {
  return (
    <Suspense fallback={<p className="planning-state">Planning wordt geladen...</p>}>
      <PlanningPageContent />
    </Suspense>
  );
}

function PlanningPageContent() {
  const [planning, setPlanning] = useState<PlanningState>({
    status: "loading"
  });
  const activeProfileId = useActiveProfileSwitchTrigger();
  const [selectedDevelopmentProfileId, setSelectedDevelopmentProfileId] =
    useState<string | null>(() =>
      isDevelopmentProfileContextEnabled()
        ? readStoredDevelopmentProfileId()
        : null
    );

  const developmentProfileContextEnabled = isDevelopmentProfileContextEnabled();
  const selectedDevelopmentProfile = getDevelopmentProfileById(
    selectedDevelopmentProfileId
  );
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PlanningFilterState>(() =>
    getFilterFromSearchParams(searchParams, DEFAULT_FILTERS)
  );
  const [categoryOptions, setCategoryOptions] = useState<PlanningCategoryOption[]>(
    []
  );
  const pathname = usePathname();
  const router = useRouter();

  const planningFilterParams = useMemo(
    () => mapUrlStateToQuery(filters),
    [filters]
  );

  function syncFiltersToUrl(nextFilters: PlanningFilterState) {
    const params = new URLSearchParams(searchParams);

    if (nextFilters.categoryId) {
      params.set("category", nextFilters.categoryId);
    } else {
      params.delete("category");
    }

    if (nextFilters.dateFrom) {
      params.set("from", nextFilters.dateFrom);
    } else {
      params.delete("from");
    }

    if (nextFilters.dateTo) {
      params.set("to", nextFilters.dateTo);
    } else {
      params.delete("to");
    }

    if (nextFilters.status) {
      params.set("status", nextFilters.status);
    } else {
      params.delete("status");
    }

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      scroll: false
    });
  }

  function setFilter<K extends keyof PlanningFilterState>(
    key: K,
    value: PlanningFilterState[K]
  ) {
    setFilters((current) => {
      if (current[key] === value) {
        return current;
      }

      const next = { ...current, [key]: value };
      syncFiltersToUrl(next);
      return next;
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      try {
        const categories = await fetchPlanningFilterCategories();

        if (!isMounted) {
          return;
        }

        setCategoryOptions(categories);
      } catch (error: unknown) {
        if (isMounted) {
          setCategoryOptions([]);
        }
      }
    }

    loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPlanning() {
      try {
        const [authContext, moments] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchPlanningMoments(planningFilterParams)
        ]);

        if (isMounted) {
          setPlanning({
            status: "ready",
            context: authContext,
            moments
          });
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
  }, [activeProfileId, planningFilterParams]);

  function handleDevelopmentProfileChange(profileId: string) {
    const nextProfileId = profileId || null;

    writeStoredDevelopmentProfileId(nextProfileId);
    setSelectedDevelopmentProfileId(nextProfileId);
  }

  const context = planning.status === "ready" ? planning.context : null;
  const hasActiveFilter =
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    Boolean(filters.categoryId) ||
    Boolean(filters.status);

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

      <section className="planning-filters" aria-label="Planning filters">
        <h2 className="planning-filters__heading">Filters</h2>
        <div className="planning-filters__row">
          <label className="planning-filters__field">
            <span>Vanaf datum</span>
            <input
              onChange={(event) =>
                setFilter("dateFrom", event.target.value)
              }
              type="date"
              value={filters.dateFrom}
            />
          </label>
          <label className="planning-filters__field">
            <span>Tot en met datum</span>
            <input
              onChange={(event) => setFilter("dateTo", event.target.value)}
              type="date"
              value={filters.dateTo}
            />
          </label>
          <label className="planning-filters__field">
            <span>Categorie</span>
            <select
              onChange={(event) =>
                setFilter("categoryId", event.target.value)
              }
              value={filters.categoryId}
            >
              <option value="">Alle categorieën</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          {/* TODO: tag filtering may be added later as a findability-only filter. */}
          <label className="planning-filters__field">
            <span>Status</span>
            <select
              onChange={(event) => setFilter("status", event.target.value)}
              value={filters.status}
            >
              <option value="">Alle statussen</option>
              {PLANNING_MOMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

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
              <dd>{context?.authUser ? "Aangemeld" : "Niet aangemeld"}</dd>
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
            {hasActiveFilter
              ? "Probeer een andere combinatie van filters; er zijn geen momenten binnen deze selectie."
              : "RLS geeft geen momenten terug voor deze Auth sessie. Controleer of de ingelogde Supabase gebruiker is gekoppeld aan personen.auth_user_id en minstens een actief profiel heeft."}
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
                <p className="planning-card__time">{formatMomentTime(moment)}</p>
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
