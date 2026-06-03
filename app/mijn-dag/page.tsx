"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  acceptVoorstel,
  declineVoorstel
} from "@/src/lib/voorstellen/actions";
import {
  fetchOpenMomentProposalsForProfile,
  type VoorstelItem
} from "@/src/lib/voorstellen/items";
import {
  fetchMijnDagItems,
  getLocalDayRange,
  type MijnDagItem
} from "@/src/lib/mijn-dag/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";

type MijnDagProposalCardItem = MijnDagItem & {
  proposal: VoorstelItem | null;
};

type MijnDagState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      items: MijnDagProposalCardItem[];
    }
  | { status: "error"; message: string };

type ActionState =
  | { status: "idle"; message: string | null; voorstelId: string | null }
  | { status: "running"; message: string; voorstelId: string | null }
  | { status: "success"; message: string; voorstelId: string | null }
  | { status: "error"; message: string; voorstelId: string | null };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatItemTime(item: MijnDagProposalCardItem) {
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

function formatDateLabel(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
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

function mergeMomentsWithProposals(
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
        voorstel.status === "open" &&
        isDateForSelectedDay(voorstel.linkedMoment.startsAt, selectedDate)
    )
    .forEach((voorstel) => {
      const list = proposalsByMoment.get(voorstel.linkedId) ?? [];
      proposalsByMoment.set(voorstel.linkedId, [...list, voorstel]);
    });

  const mergedByMoment = new Map<string, MijnDagProposalCardItem>();
  const mergedItems: MijnDagProposalCardItem[] = [];

  for (const moment of moments) {
    const momentProposals = proposalsByMoment.get(moment.id) ?? [];
    const activeProposal = momentProposals.find((proposal) => proposal.canRespond) ?? null;

    const reasons = [...moment.reasons];

    if (activeProposal) {
      const hasReasonAlready = reasons.some(
        (reason) => reason.type === "voorstel"
      );

      if (!hasReasonAlready) {
        reasons.push({
          type: "voorstel",
          label: "Voorstel",
          status: "voorgesteld"
        });
      }
    }

    mergedByMoment.set(moment.id, {
      ...moment,
      proposal: activeProposal,
      reasons
    });

    mergedItems.push({
      ...moment,
      proposal: activeProposal,
      reasons
    });
  }

  for (const list of proposalsByMoment.values()) {
    const proposal = list.find((item) => item.canRespond) ?? list[0];

    if (!proposal?.linkedMoment) {
      continue;
    }

    const existing = mergedByMoment.get(proposal.linkedMoment.id);

    if (!existing) {
      mergedItems.push({
        id: proposal.linkedMoment.id,
        title: proposal.linkedMoment.title,
        description: proposal.linkedMoment.description,
        startsAt: proposal.linkedMoment.startsAt,
        endsAt: proposal.linkedMoment.endsAt,
        isAllDay: proposal.linkedMoment.isAllDay,
        location: proposal.linkedMoment.location,
        status: proposal.linkedMoment.status,
        categoryName: proposal.linkedMoment.categoryName,
        reasons: [
          {
            type: "voorstel",
            label: "Voorstel",
            status: "voorgesteld"
          }
        ],
        proposal
      });
    }
  }

  return mergedItems.sort((first, second) => {
    const firstTime = first.startsAt ? new Date(first.startsAt).getTime() : 0;
    const secondTime = second.startsAt ? new Date(second.startsAt).getTime() : 0;

    return firstTime - secondTime;
  });
}

export default function MijnDagPage() {
  const [mijnDag, setMijnDag] = useState<MijnDagState>({
    status: "loading"
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    message: null,
    voorstelId: null
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

      const [items, proposals] = await Promise.all([
        fetchMijnDagItems(currentProfiel.id, date),
        fetchOpenMomentProposalsForProfile(currentProfiel.id)
      ]);
      const merged = mergeMomentsWithProposals(items, proposals, date);

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
  const selectedDateValue = toDateInputValue(selectedDate);

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
        voorstelId: voorstel.id
      });
      return;
    }

    if (!canActOnCurrentProfile) {
      setActionState({
        status: "error",
        message:
          "Voorstelacties zijn tijdelijk alleen beschikbaar vanuit je eigen profiel.",
        voorstelId: voorstel.id
      });
      return;
    }

    setActionState({
      status: "running",
      message:
        actie === "accept"
          ? "Voorstel accepteren..."
          : "Voorstel afwijzen...",
      voorstelId: voorstel.id
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
        voorstelId: voorstel.id
      });
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Het voorstel kon niet worden verwerkt. Probeer opnieuw."
            : "Het voorstel kon niet worden verwerkt. Probeer opnieuw.",
        voorstelId: voorstel.id
      });
    }
  }

  function updateSelectedDate(date: Date) {
    setActionState({ status: "idle", message: null, voorstelId: null });
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
          profiel, deelnames en open voorstellen.
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
            Er zijn op deze datum geen deelnames of actieve voorstellen zichtbaar
            voor dit profiel.
          </p>
        </div>
      ) : null}

      {mijnDag.status === "ready" &&
      mijnDag.context.currentProfiel &&
      !canActOnCurrentProfile &&
      context?.ownProfiel ? (
        <div className="mijn-dag-state mijn-dag-state--error">
          <h2>Voorstelactie niet beschikbaar</h2>
          <p>
            Je bekijkt momenteel {mijnDag.context.currentProfiel.weergavenaam}.
            Voorstellen accepteren/afwijzen is tijdelijk alleen actief voor je eigen
            profiel: {context.ownProfiel.weergavenaam}.
          </p>
        </div>
      ) : null}

      {mijnDag.status === "ready" && mijnDag.items.length > 0 ? (
        <div className="mijn-dag-grid">
          {mijnDag.items.map((item) => (
            <article className="mijn-dag-card" key={item.id}>
              <Link className="mijn-dag-card-link" href={`/planning/${item.id}`}>
                <div className="mijn-dag-card__meta">
                  <span>{item.categoryName ?? "Geen categorie"}</span>
                  <span>{formatStatus(item.status)}</span>
                </div>
                <h2>{item.title}</h2>
                <p className="mijn-dag-card__time">
                  {formatItemTime(item)}
                </p>
                {item.location ? (
                  <p className="mijn-dag-card__location">{item.location}</p>
                ) : null}
                {item.description ? <p>{item.description}</p> : null}
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
              </Link>

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
                          actionState.voorstelId === item.proposal.id
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
                          actionState.voorstelId === item.proposal.id
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
