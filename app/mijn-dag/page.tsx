"use client";

import { useEffect, useState } from "react";

import {
  fetchMijnDagItems,
  getLocalDayRange,
  type MijnDagItem
} from "@/src/lib/mijn-dag/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type MijnDagState =
  | { status: "loading" }
  | { status: "ready"; context: CurrentSamzoContext; items: MijnDagItem[] }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatItemTime(item: MijnDagItem) {
  if (!item.startsAt) {
    return "Tijd nog niet bekend";
  }

  const start = new Date(item.startsAt);

  if (item.isAllDay) {
    return `${dateFormatter.format(start)} - Hele dag`;
  }

  if (!item.endsAt) {
    return dateTimeFormatter.format(start);
  }

  return `${dateTimeFormatter.format(start)} - ${dateTimeFormatter.format(
    new Date(item.endsAt)
  )}`;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export default function MijnDagPage() {
  const [mijnDag, setMijnDag] = useState<MijnDagState>({
    status: "loading"
  });
  const [today] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    let isMounted = true;

    async function loadMijnDag() {
      try {
        const context = await fetchCurrentSamzoContext();
        const currentProfiel = context.currentProfiel;
        const items = currentProfiel
          ? await fetchMijnDagItems(currentProfiel.id, selectedDate)
          : [];

        if (isMounted) {
          setMijnDag({ status: "ready", context, items });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setMijnDag({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van Mijn dag."
          });
        }
      }
    }

    loadMijnDag();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const context = mijnDag.status === "ready" ? mijnDag.context : null;
  const { start } = getLocalDayRange(selectedDate);
  const selectedDateValue = toDateInputValue(selectedDate);

  function updateSelectedDate(date: Date) {
    setMijnDag({ status: "loading" });
    setSelectedDate(date);
  }

  function updateSelectedDateFromInput(value: string) {
    if (!value) {
      return;
    }

    updateSelectedDate(fromDateInputValue(value));
  }

  return (
    <section className="mijn-dag-page">
      <div className="mijn-dag-page__header">
        <p className="mijn-dag-page__eyebrow">Persoonlijke werkelijkheid</p>
        <h1>Mijn dag</h1>
        <p>
          Persoonlijke momenten voor de gekozen datum op basis van je gekoppelde
          profiel, deelnames en actieve rolbezettingen.
        </p>
      </div>

      <section className="mijn-dag-date-controls" aria-label="Datum kiezen">
        <button onClick={() => updateSelectedDate(addDays(selectedDate, -1))}>
          Vorige dag
        </button>
        <button onClick={() => updateSelectedDate(new Date(today))}>
          Vandaag
        </button>
        <button onClick={() => updateSelectedDate(addDays(selectedDate, 1))}>
          Volgende dag
        </button>
        <label>
          <span>Datum</span>
          <input
            onChange={(event) =>
              updateSelectedDateFromInput(event.target.value)
            }
            onInput={(event) =>
              updateSelectedDateFromInput(event.currentTarget.value)
            }
            type="date"
            value={selectedDateValue}
          />
        </label>
      </section>

      <section className="mijn-dag-context" aria-label="Huidige context">
        <div>
          <span>Gekozen datum</span>
          <strong>{dateFormatter.format(start)}</strong>
        </div>
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

      {mijnDag.status === "loading" ? (
        <p className="mijn-dag-state">Mijn dag wordt geladen...</p>
      ) : null}

      {mijnDag.status === "error" ? (
        <div className="mijn-dag-state mijn-dag-state--error" role="status">
          <h2>Mijn dag kon niet worden geladen</h2>
          <p>{mijnDag.message}</p>
        </div>
      ) : null}

      {mijnDag.status === "ready" && !mijnDag.context.authUser ? (
        <div className="mijn-dag-state">
          <h2>Nog niet ingelogd</h2>
          <p>
            Log in via beheer om je persoonlijke dagoverzicht door RLS te laten
            bepalen.
          </p>
        </div>
      ) : null}

      {mijnDag.status === "ready" &&
      mijnDag.context.authUser &&
      !mijnDag.context.currentProfiel ? (
        <div className="mijn-dag-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft geen enkel actief profiel dat deze
            sessie mag zien.
          </p>
        </div>
      ) : null}

      {mijnDag.status === "ready" &&
      mijnDag.context.currentProfiel &&
      mijnDag.items.length === 0 ? (
        <div className="mijn-dag-state">
          <h2>Niets zichtbaar voor deze datum</h2>
          <p>
            Er zijn op deze datum geen deelnames of actieve rolbezettingen
            zichtbaar voor dit profiel.
          </p>
        </div>
      ) : null}

      {mijnDag.status === "ready" && mijnDag.items.length > 0 ? (
        <div className="mijn-dag-grid">
          {mijnDag.items.map((item) => (
            <article className="mijn-dag-card" key={item.id}>
              <div className="mijn-dag-card__meta">
                <span>{item.categoryName ?? "Geen categorie"}</span>
                <span>{formatStatus(item.status)}</span>
              </div>
              <h2>{item.title}</h2>
              <p className="mijn-dag-card__time">{formatItemTime(item)}</p>
              {item.location ? (
                <p className="mijn-dag-card__location">{item.location}</p>
              ) : null}
              {item.description ? <p>{item.description}</p> : null}
              <div className="mijn-dag-card__reasons">
                {item.reasons.map((reason) => (
                  <span key={`${item.id}-${reason.type}-${reason.label}`}>
                    {reason.label}: {formatStatus(reason.status)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
