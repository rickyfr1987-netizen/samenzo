"use client";

import { useEffect, useState } from "react";

import {
  fetchVisibleTimelineItems,
  type TimelineItem
} from "@/src/lib/tijdlijn/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type TimelineState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      items: TimelineItem[];
    }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function isAttentionItem(item: TimelineItem) {
  return (
    item.urgency === "urgent" ||
    item.urgency === "escalatie" ||
    item.urgency === "actie_nodig" ||
    item.urgency === "aandacht_nodig" ||
    item.status === "actie_nodig"
  );
}

function getSourceLabel(source: TimelineItem["source"]) {
  if (source === "tijdlijnbericht") {
    return "Tijdlijnbericht";
  }

  if (source === "signaal") {
    return "Signaal";
  }

  return "Supportvraag";
}

export default function TijdlijnPage() {
  const [timeline, setTimeline] = useState<TimelineState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTimeline() {
      try {
        const [context, items] = await Promise.all([
          fetchCurrentSamzoContext(),
          fetchVisibleTimelineItems()
        ]);

        if (isMounted) {
          setTimeline({ status: "ready", context, items });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setTimeline({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van de tijdlijn."
          });
        }
      }
    }

    loadTimeline();

    return () => {
      isMounted = false;
    };
  }, []);

  const context = timeline.status === "ready" ? timeline.context : null;

  return (
    <section className="tijdlijn-page">
      <div className="tijdlijn-page__header">
        <p className="tijdlijn-page__eyebrow">Aandacht en communicatie</p>
        <h1>Tijdlijn</h1>
        <p>
          De tijdlijn toont praktische aandachtspunten. Geen chat, geen
          reacties, geen afhandelknoppen: alleen wat RLS voor jouw sessie
          zichtbaar maakt.
        </p>
      </div>

      <section className="tijdlijn-context" aria-label="Huidige context">
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

      {timeline.status === "loading" ? (
        <p className="tijdlijn-state">Tijdlijn wordt geladen...</p>
      ) : null}

      {timeline.status === "error" ? (
        <div className="tijdlijn-state tijdlijn-state--error" role="status">
          <h2>Tijdlijn kon niet worden geladen</h2>
          <p>{timeline.message}</p>
        </div>
      ) : null}

      {timeline.status === "ready" && !timeline.context.authUser ? (
        <div className="tijdlijn-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om de tijdlijn door RLS te laten bepalen.</p>
        </div>
      ) : null}

      {timeline.status === "ready" &&
      timeline.context.authUser &&
      !timeline.context.currentProfiel ? (
        <div className="tijdlijn-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft geen actief gekoppeld SAM&ZO profiel
            voor deze tijdlijn.
          </p>
        </div>
      ) : null}

      {timeline.status === "ready" &&
      timeline.context.currentProfiel &&
      timeline.items.length === 0 ? (
        <div className="tijdlijn-state">
          <h2>Geen aandachtspunten</h2>
          <p>Er zijn nu geen berichten of acties voor jou.</p>
        </div>
      ) : null}

      {timeline.status === "ready" && timeline.items.length > 0 ? (
        <div className="tijdlijn-list">
          {timeline.items.map((item) => (
            <article
              className={
                isAttentionItem(item)
                  ? "tijdlijn-card tijdlijn-card--attention"
                  : "tijdlijn-card"
              }
              key={`${item.source}-${item.id}`}
            >
              <div className="tijdlijn-card__meta">
                <span>{getSourceLabel(item.source)}</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              <h2>{item.title}</h2>
              {item.body ? <p>{item.body}</p> : null}

              <dl className="tijdlijn-card__facts">
                <div>
                  <dt>Status</dt>
                  <dd>{formatStatus(item.status)}</dd>
                </div>
                <div>
                  <dt>Urgentie</dt>
                  <dd>{item.urgency ? formatStatus(item.urgency) : "Rustig"}</dd>
                </div>
                <div>
                  <dt>Gekoppeld</dt>
                  <dd>
                    {item.related
                      ? `${formatStatus(item.related.type)} ${item.related.id}`
                      : "Geen veilige koppeling zichtbaar"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
