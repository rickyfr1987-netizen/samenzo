"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  acceptVoorstel,
  declineVoorstel
} from "@/src/lib/voorstellen/actions";
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

type ProposalActionState =
  | { status: "idle"; message: string | null; proposalId: string | null }
  | { status: "running"; message: string; proposalId: string | null }
  | { status: "success"; message: string; proposalId: string | null }
  | { status: "error"; message: string; proposalId: string | null };

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

  if (source === "supportvraag") {
    return "Supportvraag";
  }

  return "Voorstel";
}

export default function TijdlijnPage() {
  const [timeline, setTimeline] = useState<TimelineState>({
    status: "loading"
  });
  const [proposalActionState, setProposalActionState] =
    useState<ProposalActionState>({
      status: "idle",
      message: null,
      proposalId: null
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
                ? "Tijdlijn kon niet worden geladen."
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

  async function refreshTimeline() {
    try {
      const [context, items] = await Promise.all([
        fetchCurrentSamzoContext(),
        fetchVisibleTimelineItems()
      ]);
      setTimeline({ status: "ready", context, items });
    } catch (error: unknown) {
      setTimeline({
        status: "error",
        message:
          error instanceof Error
            ? "Tijdlijn kon niet worden ververst."
            : "Onbekende fout tijdens verversen van de tijdlijn."
      });
    }
  }

  async function handleProposalDecision(
    actie: "accept" | "reject",
    item: TimelineItem
  ) {
    if (timeline.status !== "ready" || !timeline.context.currentProfiel) {
      setProposalActionState({
        status: "error",
        message: "Je moet ingelogd zijn met een actief profiel.",
        proposalId: item.proposalId ?? null
      });
      return;
    }

    if (!item.proposalId || item.status !== "open" || item.source !== "voorstel") {
      setProposalActionState({
        status: "error",
        message: "Dit voorstel is niet meer actueel.",
        proposalId: item.proposalId ?? null
      });
      return;
    }

    if (item.proposalReceivingProfileId !== timeline.context.currentProfiel.id) {
      setProposalActionState({
        status: "error",
        message: "Dit voorstel hoort niet bij het actieve profiel.",
        proposalId: item.proposalId
      });
      return;
    }

    setProposalActionState({
      status: "running",
      message:
        actie === "accept" ? "Voorstel accepteren..." : "Voorstel afwijzen...",
      proposalId: item.proposalId
    });

    try {
      if (actie === "accept") {
        if (!timeline.context.persoon) {
          throw new Error("missing_persoon");
        }

        await acceptVoorstel({
          voorstelId: item.proposalId,
          profielId: timeline.context.currentProfiel.id,
          persoonId: timeline.context.persoon.id
        });
      } else {
        await declineVoorstel({
          voorstelId: item.proposalId,
          profielId: timeline.context.currentProfiel.id,
          persoonId: null
        });
      }

      await refreshTimeline();
      setProposalActionState({
        status: "success",
        message:
          actie === "accept"
            ? "Het voorstel is geaccepteerd."
            : "Het voorstel is afgewezen.",
        proposalId: item.proposalId
      });
    } catch (error: unknown) {
      setProposalActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Het voorstel kon niet worden verwerkt."
            : "Het voorstel kon niet worden verwerkt.",
        proposalId: item.proposalId
      });
    }
  }

  const context = timeline.status === "ready" ? timeline.context : null;

  return (
    <section className="tijdlijn-page">
      <div className="tijdlijn-page__header">
        <p className="tijdlijn-page__eyebrow">Aandacht en communicatie</p>
        <h1>Tijdlijn</h1>
        <p>
          De tijdlijn toont praktische aandachtspunten. Voorstellen worden als
          moment-aandacht op de betreffende momentpagina zichtbaar.
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
          {timeline.items.map((item) => {
            const isProposal = item.source === "voorstel";
            const isProposalOpen =
              isProposal && item.proposalId !== null && item.status === "open";
            const proposalMomentId =
              isProposal && item.related?.type === "moment"
                ? item.related.id
                : null;
            const showProposalActions =
              isProposalOpen &&
              proposalMomentId !== null &&
              item.proposalReceivingProfileId ===
                timeline.context.currentProfiel?.id;

            return (
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
                    <dd>
                      {item.urgency ? formatStatus(item.urgency) : "Rustig"}
                    </dd>
                  </div>
                  <div>
                    <dt>Gekoppeld</dt>
                    <dd>
                      {proposalMomentId
                        ? `moment ${proposalMomentId}`
                        : item.related
                          ? `${formatStatus(item.related.type)} ${item.related.id}`
                          : "Geen veilige koppeling zichtbaar"}
                    </dd>
                  </div>
                </dl>

                {proposalMomentId ? (
                  <Link
                    className="tijdlijn-card__open"
                    href={`/planning/${proposalMomentId}`}
                  >
                    Open moment
                  </Link>
                ) : null}

                {showProposalActions ? (
                  <div className="mijn-dag-proposal-actions">
                    <button
                      onClick={() =>
                        void handleProposalDecision("accept", item)
                      }
                      disabled={
                        proposalActionState.status === "running" &&
                        proposalActionState.proposalId === item.proposalId
                      }
                      type="button"
                    >
                      Accepteren
                    </button>
                    <button
                      onClick={() =>
                        void handleProposalDecision("reject", item)
                      }
                      disabled={
                        proposalActionState.status === "running" &&
                        proposalActionState.proposalId === item.proposalId
                      }
                      type="button"
                    >
                      Afwijzen
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {proposalActionState.message ? (
        <p
          className={
            proposalActionState.status === "error"
              ? "tijdlijn-state tijdlijn-state--error"
              : "tijdlijn-state"
          }
          role="status"
        >
          {proposalActionState.message}
        </p>
      ) : null}
    </section>
  );
}
