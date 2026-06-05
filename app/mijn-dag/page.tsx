"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  acceptDoelacceptatie,
  bekijkDoelacceptatieLater,
  weigerDoelacceptatie,
  type DoelacceptatieAntwoord
} from "@/src/lib/doelacceptaties/actions";
import {
  acceptVoorstel,
  declineVoorstel
} from "@/src/lib/voorstellen/actions";
import {
  fetchOpenMomentProposalsForProfile,
  type VoorstelItem
} from "@/src/lib/voorstellen/items";
import {
  fetchMijnDagAcceptedGoalItems,
  fetchMijnDagDocumentAttentionItems,
  fetchMijnDagGoalAttentionItems,
  fetchMijnDagItems,
  fetchMijnDagTaskItems,
  getLocalDayRange,
  type MijnDagAcceptedGoalItem,
  type MijnDagDocumentAttentionItem,
  type MijnDagGoalAttentionItem,
  type MijnDagItem,
  type MijnDagTaskItem
} from "@/src/lib/mijn-dag/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import {
  fetchVisibleTimelineItems,
  type TimelineItem
} from "@/src/lib/tijdlijn/items";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";

type MijnDagProposalCardItem = MijnDagItem & {
  proposal: VoorstelItem | null;
};

type MijnDagGoalAcceptanceAction = {
  acceptanceId: string;
  acceptanceStatus: MijnDagGoalAttentionItem["acceptanceStatus"];
  goalId: string;
};

type MijnDagDisplayItem = MijnDagProposalCardItem & {
  kind: "moment" | "task" | "attention" | "goal";
  linkHref: string | null;
  goalAcceptance: MijnDagGoalAcceptanceAction | null;
};

type MijnDagState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      items: MijnDagDisplayItem[];
    }
  | { status: "error"; message: string };

type ActionState =
  | { status: "idle"; message: string | null; actionId: string | null }
  | { status: "running"; message: string; actionId: string | null }
  | { status: "success"; message: string; actionId: string | null }
  | { status: "error"; message: string; actionId: string | null };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatItemTime(item: MijnDagDisplayItem) {
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

function isDateForSelectedDay(startsAt: string | null, day: Date) {
  if (!startsAt) {
    return false;
  }

  const start = new Date(startsAt);
  const { start: dayStart, end: dayEnd } = getLocalDayRange(day);

  return start >= dayStart && start < dayEnd;
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

function isAttentionTimelineItem(item: TimelineItem) {
  if (item.source === "voorstel") {
    return item.status === "open";
  }

  if (item.source === "supportvraag") {
    return (
      item.status === "nieuw" ||
      item.status === "actie_nodig" ||
      item.status === "in_behandeling"
    );
  }

  return (
    item.urgency === "urgent" ||
    item.urgency === "escalatie" ||
    item.urgency === "actie_nodig" ||
    item.urgency === "aandacht_nodig"
  );
}

function mergeMomentItemsWithProposals(
  moments: MijnDagItem[],
  proposals: VoorstelItem[],
  selectedDate: Date
) {
  const proposalsByMoment = new Map<string, VoorstelItem[]>();

  proposals
    .filter(
      (voorstel) =>
        voorstel.linkedType === "moment" &&
        voorstel.linkedMoment !== null &&
        isDateForSelectedDay(voorstel.linkedMoment.startsAt, selectedDate)
    )
    .forEach((voorstel) => {
      const list = proposalsByMoment.get(voorstel.linkedId) ?? [];
      proposalsByMoment.set(voorstel.linkedId, [...list, voorstel]);
    });

  const mergedByMoment = new Map<string, MijnDagProposalCardItem>();
  const mergedItems: MijnDagDisplayItem[] = [];

  for (const moment of moments) {
    const momentProposals = proposalsByMoment.get(moment.id) ?? [];
    const activeProposal = momentProposals.find((proposal) => proposal.canRespond) ?? null;
    const reasons: MijnDagItem["reasons"] = [...moment.reasons];

    if (activeProposal) {
      const hasProposalReason = reasons.some(
        (reason) => reason.type === "voorstel"
      );

      if (!hasProposalReason) {
        reasons.push({
          type: "voorstel",
          label: "Voorstel",
          status: "voorgesteld"
        });
      }
    }

    const mergedItem: MijnDagProposalCardItem = {
      ...moment,
      proposal: activeProposal,
      reasons
    };

    mergedByMoment.set(moment.id, mergedItem);
    mergedItems.push({
      ...mergedItem,
      kind: "moment",
      linkHref: `/planning/${moment.id}`,
      goalAcceptance: null
    });
  }

  for (const proposalsForMoment of proposalsByMoment.values()) {
    const proposal = proposalsForMoment.find((item) => item.canRespond) ?? proposalsForMoment[0];

    if (!proposal?.linkedMoment) {
      continue;
    }

    if (mergedByMoment.has(proposal.linkedMoment.id)) {
      continue;
    }

    const reasons: MijnDagItem["reasons"] = [
      {
        type: "voorstel",
        label: "Voorstel",
        status: "voorgesteld"
      }
    ];

    const mergedItem: MijnDagProposalCardItem = {
      id: proposal.linkedMoment.id,
      title: proposal.linkedMoment.title,
      description: proposal.linkedMoment.description,
      startsAt: proposal.linkedMoment.startsAt,
      endsAt: proposal.linkedMoment.endsAt,
      isAllDay: proposal.linkedMoment.isAllDay,
      location: proposal.linkedMoment.location,
      status: proposal.linkedMoment.status,
      categoryName: proposal.linkedMoment.categoryName,
      reasons,
      proposal
    };

    mergedByMoment.set(proposal.linkedMoment.id, mergedItem);
    mergedItems.push({
      ...mergedItem,
      kind: "moment",
      linkHref: `/planning/${proposal.linkedMoment.id}`,
      goalAcceptance: null
    });
  }

  return {
    mergedItems: mergedItems.sort((first, second) => {
      const firstTime = first.startsAt ? new Date(first.startsAt).getTime() : 0;
      const secondTime = second.startsAt ? new Date(second.startsAt).getTime() : 0;

      return firstTime - secondTime;
    }),
    mergedMomentIds: mergedByMoment
  };
}

function mapTaskItems(tasks: MijnDagTaskItem[]) {
  return tasks.map((task) => ({
    ...task,
    kind: "task" as const,
    linkHref: task.listId ? `/lijsten/${task.listId}` : null,
    proposal: null,
    goalAcceptance: null
  }));
}

function mapDocumentAttentionItems(items: MijnDagDocumentAttentionItem[]) {
  return items.map((item) => ({
    ...item,
    kind: "attention" as const,
    linkHref: `/documenten/${item.documentId}`,
    proposal: null,
    goalAcceptance: null
  }));
}

function mapGoalAttentionItems(items: MijnDagGoalAttentionItem[]) {
  return items.map((item) => ({
    ...item,
    kind: "attention" as const,
    linkHref: `/doelen/${item.goalId}`,
    proposal: null,
    goalAcceptance: {
      acceptanceId: item.acceptanceId,
      acceptanceStatus: item.acceptanceStatus,
      goalId: item.goalId
    }
  }));
}

function mapAcceptedGoalItems(items: MijnDagAcceptedGoalItem[]) {
  return items.map((item) => ({
    ...item,
    kind: "goal" as const,
    linkHref: `/doelen/${item.goalId}`,
    proposal: null,
    goalAcceptance: null
  }));
}

function mapTimelineAttentionItems(
  timelineItems: TimelineItem[],
  activeProfileId: string,
  selectedDate: Date,
  shownMomentIds: Set<string>
) {
  const seenTimelineIds = new Set<string>();

  return timelineItems
    .filter((item) => {
      if (!isAttentionTimelineItem(item)) {
        return false;
      }

      if (!isDateForSelectedDay(item.createdAt, selectedDate)) {
        return false;
      }

      if (item.related?.type === "document") {
        return false;
      }

      if (item.source === "voorstel") {
        return (
          item.proposalReceivingProfileId !== null &&
          item.proposalReceivingProfileId === activeProfileId
        );
      }

      if (item.source === "signaal") {
        return item.targetProfileId === activeProfileId;
      }

      if (item.source === "supportvraag") {
        return item.targetProfileId === activeProfileId;
      }

      if (item.source === "tijdlijnbericht") {
        return item.targetProfileId === activeProfileId;
      }

      return true;
    })
    .filter((item) => {
      const linkedMomentId =
        item.related?.type === "moment" ? item.related.id : null;
      return linkedMomentId ? !shownMomentIds.has(linkedMomentId) : true;
    })
    .filter((item) => {
      const key = `${item.source}-${item.id}`;

      if (seenTimelineIds.has(key)) {
        return false;
      }

      seenTimelineIds.add(key);
      return true;
    })
    .map((item) => ({
      id: `${item.source}-${item.id}`,
      title: item.title,
      description: item.body,
      startsAt: item.createdAt,
      endsAt: null,
      isAllDay: false,
      location: null,
      status: item.status,
      categoryName: getSourceLabel(item.source),
      reasons: [
        {
          type: "aandacht" as const,
          label: "Aandacht",
          status: item.urgency ?? item.status
        }
      ],
      proposal: null,
      goalAcceptance: null,
      kind: "attention",
      linkHref:
        item.related?.type === "moment" ? `/planning/${item.related.id}` : null
    } as MijnDagDisplayItem));
}

export default function MijnDagPage() {
  const [mijnDag, setMijnDag] = useState<MijnDagState>({
    status: "loading"
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    message: null,
    actionId: null
  });
  const [today] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const activeProfileId = useActiveProfileSwitchTrigger();

  async function loadMijnDag(date: Date) {
    try {
      const context = await fetchCurrentSamzoContext();
      const currentProfiel = context.currentProfiel;
      if (!currentProfiel) {
        setMijnDag({ status: "ready", context, items: [] });
        return;
      }

      const [
        items,
        proposals,
        tasks,
        documentAttentionItems,
        goalAttentionItems,
        acceptedGoalItems,
        timelineItems
      ] = await Promise.all([
        fetchMijnDagItems(currentProfiel.id, date),
        fetchOpenMomentProposalsForProfile(currentProfiel.id),
        fetchMijnDagTaskItems(currentProfiel.id, date),
        fetchMijnDagDocumentAttentionItems(currentProfiel.id, date),
        fetchMijnDagGoalAttentionItems(currentProfiel.id, date),
        fetchMijnDagAcceptedGoalItems(currentProfiel.id, date),
        fetchVisibleTimelineItems()
      ]);

      const { mergedItems, mergedMomentIds } = mergeMomentItemsWithProposals(
        items,
        proposals,
        date
      );

      const merged = [
        ...mergedItems,
        ...mapTaskItems(tasks),
        ...mapDocumentAttentionItems(documentAttentionItems),
        ...mapGoalAttentionItems(goalAttentionItems),
        ...mapAcceptedGoalItems(acceptedGoalItems)
      ]
        .concat(
          mapTimelineAttentionItems(
            timelineItems,
            currentProfiel.id,
            date,
            new Set(mergedMomentIds.keys())
          )
        )
        .sort((first, second) => {
          const firstTime = first.startsAt
            ? new Date(first.startsAt).getTime()
            : 0;
          const secondTime = second.startsAt
            ? new Date(second.startsAt).getTime()
            : 0;

          return firstTime - secondTime;
        });

      setMijnDag({ status: "ready", context, items: merged });
    } catch {
      setMijnDag({
        status: "error",
        message: "Mijn dag kon niet worden geladen. Probeer later opnieuw."
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) {
        return;
      }

      await loadMijnDag(selectedDate);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, activeProfileId]);

  const context = mijnDag.status === "ready" ? mijnDag.context : null;
  const canActOnCurrentProfile = Boolean(
    context?.currentProfiel &&
      context?.ownProfiel &&
      context.currentProfiel.id === context.ownProfiel.id
  );
  const { start } = getLocalDayRange(selectedDate);

  async function handleProposalDecision(
    actie: "accept" | "reject",
    voorstel: VoorstelItem
  ) {
    if (
      mijnDag.status !== "ready" ||
      !mijnDag.context.authUser ||
      !mijnDag.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Je moet ingelogd zijn met een actief profiel.",
        actionId: voorstel.id
      });
      return;
    }

    if (!canActOnCurrentProfile) {
      setActionState({
        status: "error",
        message:
          "Voorstelacties zijn tijdelijk alleen beschikbaar vanuit je eigen profiel.",
        actionId: voorstel.id
      });
      return;
    }

    setActionState({
      status: "running",
      message:
        actie === "accept"
          ? "Voorstel accepteren..."
          : "Voorstel afwijzen...",
      actionId: voorstel.id
    });

    try {
      if (actie === "accept") {
        if (!mijnDag.context.persoon) {
          throw new Error();
        }

        await acceptVoorstel({
          voorstelId: voorstel.id,
          profielId: mijnDag.context.currentProfiel.id,
          persoonId: mijnDag.context.persoon.id
        });
      } else {
        await declineVoorstel({
          voorstelId: voorstel.id,
          profielId: mijnDag.context.currentProfiel.id,
          persoonId: null
        });
      }

      await loadMijnDag(selectedDate);
      setActionState({
        status: "success",
        message:
          actie === "accept"
            ? "Het voorstel is geaccepteerd."
            : "Het voorstel is afgewezen.",
        actionId: voorstel.id
      });
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Het voorstel kon niet worden verwerkt. Probeer opnieuw."
            : "Het voorstel kon niet worden verwerkt. Probeer opnieuw.",
        actionId: voorstel.id
      });
    }
  }

  async function handleGoalAcceptanceDecision(
    actie: DoelacceptatieAntwoord,
    goalAcceptance: MijnDagGoalAcceptanceAction
  ) {
    if (
      mijnDag.status !== "ready" ||
      !mijnDag.context.authUser ||
      !mijnDag.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Je moet ingelogd zijn met een actief profiel.",
        actionId: goalAcceptance.acceptanceId
      });
      return;
    }

    if (!canActOnCurrentProfile) {
      setActionState({
        status: "error",
        message:
          "Doelacceptatieacties zijn alleen beschikbaar vanuit je eigen profiel.",
        actionId: goalAcceptance.acceptanceId
      });
      return;
    }

    const actionLabel =
      actie === "accept"
        ? "Doel accepteren..."
        : actie === "reject"
          ? "Doel weigeren..."
          : "Doel later bekijken...";

    setActionState({
      status: "running",
      message: actionLabel,
      actionId: goalAcceptance.acceptanceId
    });

    try {
      const input = {
        acceptatieId: goalAcceptance.acceptanceId,
        profielId: mijnDag.context.currentProfiel.id
      };

      if (actie === "accept") {
        await acceptDoelacceptatie(input);
      } else if (actie === "reject") {
        await weigerDoelacceptatie(input);
      } else {
        await bekijkDoelacceptatieLater(input);
      }

      await loadMijnDag(selectedDate);
      setActionState({
        status: "success",
        message:
          actie === "accept"
            ? "Het doel is geaccepteerd."
            : actie === "reject"
              ? "Het doel is geweigerd."
              : "Het doel blijft bewaard voor later bekijken.",
        actionId: goalAcceptance.acceptanceId
      });
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "De doelacceptatieactie kon niet worden uitgevoerd. Probeer opnieuw.",
        actionId: goalAcceptance.acceptanceId
      });
    }
  }

  function updateSelectedDate(date: Date) {
    setActionState({ status: "idle", message: null, actionId: null });
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
          Persoonlijke momenten, taken en aandachtspunten voor de gekozen datum
          op basis van je gekoppelde profiel.
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
            value={toDateInputValue(selectedDate)}
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
          <h2>Geen activiteiten</h2>
          <p>Er staat niets in deze dag voor dit profiel.</p>
        </div>
      ) : null}

      {mijnDag.status === "ready" &&
      !canActOnCurrentProfile &&
      context?.ownProfiel ? (
        <div className="mijn-dag-state mijn-dag-state--error">
          <h2>Acties niet beschikbaar</h2>
          <p>
            Je bekijkt momenteel {mijnDag.context.currentProfiel?.weergavenaam}.
            Voorstellen en doelacceptaties beantwoorden is alleen actief voor
            je eigen profiel: {context.ownProfiel.weergavenaam}.
          </p>
        </div>
      ) : null}

      {mijnDag.status === "ready" && mijnDag.items.length > 0 ? (
        <div className="mijn-dag-grid">
          {mijnDag.items.map((item) => (
            <article
              className="mijn-dag-card"
              key={`${item.id}-${item.kind}`}
            >
              <div className="mijn-dag-card__meta">
                <span>{item.categoryName ?? "Geen categorie"}</span>
                <span>{formatStatus(item.status)}</span>
              </div>
              {item.linkHref ? (
                <Link className="mijn-dag-card-link" href={item.linkHref}>
                  <h2>{item.title}</h2>
                </Link>
              ) : (
                <h2>{item.title}</h2>
              )}
              <p className="mijn-dag-card__time">
                {formatItemTime(item)}
              </p>
              {item.location ? (
                <p className="mijn-dag-card__location">{item.location}</p>
              ) : null}
              {item.description ? <p>{item.description}</p> : null}
              <div className="mijn-dag-card__kind">
                {item.kind === "moment"
                  ? "Moment"
                  : item.kind === "task"
                    ? "Taak"
                    : item.kind === "goal"
                      ? "Doel"
                      : "Aandacht"}
              </div>
              <div className="mijn-dag-card__reasons">
                {item.reasons.map((reason) => (
                  <span key={`${item.id}-${reason.type}-${reason.label}`}>
                    {reason.label}
                    {reason.type === "voorstel"
                      ? ": voorgesteld"
                      : `: ${formatStatus(reason.status)}`}
                  </span>
                ))}
              </div>

              {item.proposal && item.proposal.canRespond ? (
                <div className="mijn-dag-proposal-actions">
                  {canActOnCurrentProfile ? (
                    <>
                      <button
                        onClick={() =>
                          void handleProposalDecision("accept", item.proposal!)
                        }
                        disabled={
                          actionState.status === "running" &&
                          actionState.actionId === item.proposal.id
                        }
                        type="button"
                      >
                        Accepteren
                      </button>
                      <button
                        onClick={() =>
                          void handleProposalDecision("reject", item.proposal!)
                        }
                        disabled={
                          actionState.status === "running" &&
                          actionState.actionId === item.proposal.id
                        }
                        type="button"
                      >
                        Afwijzen
                      </button>
                    </>
                  ) : (
                    <p className="mijn-dag-state mijn-dag-state--error">
                      Actie niet beschikbaar voor dit bekeken profiel.
                    </p>
                  )}
                </div>
              ) : null}

              {item.goalAcceptance ? (
                <div className="mijn-dag-proposal-actions">
                  {canActOnCurrentProfile ? (
                    <>
                      <button
                        onClick={() =>
                          void handleGoalAcceptanceDecision(
                            "accept",
                            item.goalAcceptance!
                          )
                        }
                        disabled={
                          actionState.status === "running" &&
                          actionState.actionId ===
                            item.goalAcceptance.acceptanceId
                        }
                        type="button"
                      >
                        Accepteren
                      </button>
                      <button
                        onClick={() =>
                          void handleGoalAcceptanceDecision(
                            "reject",
                            item.goalAcceptance!
                          )
                        }
                        disabled={
                          actionState.status === "running" &&
                          actionState.actionId ===
                            item.goalAcceptance.acceptanceId
                        }
                        type="button"
                      >
                        Weigeren
                      </button>
                      {item.goalAcceptance.acceptanceStatus ===
                      "voorgesteld" ? (
                        <button
                          onClick={() =>
                            void handleGoalAcceptanceDecision(
                              "later",
                              item.goalAcceptance!
                            )
                          }
                          disabled={
                            actionState.status === "running" &&
                            actionState.actionId ===
                              item.goalAcceptance.acceptanceId
                          }
                          type="button"
                        >
                          Later bekijken
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p className="mijn-dag-state mijn-dag-state--error">
                      Doelacceptatie niet beschikbaar voor dit bekeken profiel.
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {actionState.message ? (
        <p
          className={
            actionState.status === "error"
              ? "mijn-dag-state mijn-dag-state--error"
              : "mijn-dag-state"
          }
          role="status"
        >
          {actionState.message}
        </p>
      ) : null}
    </section>
  );
}
