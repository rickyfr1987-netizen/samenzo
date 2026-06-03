"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createSupportVraag,
  createSupportVraagResponse,
  markOwnSupportVraagSolved,
  updateSupportVraagStatus,
  type SupportVraagStatus
} from "@/src/lib/tijdlijn/actions";
import {
  acceptVoorstel,
  declineVoorstel
} from "@/src/lib/voorstellen/actions";
import {
  fetchVisibleTimelineItems,
  type TimelineItem,
  type TimelineSupportContext
} from "@/src/lib/tijdlijn/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";

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

type SupportComposeState = {
  onderwerp: string;
  omschrijving: string;
};

type SupportActionState =
  | { status: "idle"; message: string | null; supportVraagId: string | null }
  | { status: "running"; message: string; supportVraagId: string | null }
  | { status: "success"; message: string; supportVraagId: string | null }
  | { status: "error"; message: string; supportVraagId: string | null };

type SupportComposeMessageState = {
  status: "idle" | "running" | "success" | "error";
  message: string | null;
};

type SupportResponseComposeState = {
  status: "idle" | "running" | "success" | "error";
  message: string | null;
  supportVraagId: string | null;
};

type TimelineSupportPerspective =
  | "requesterContext"
  | "supportHandlerContext"
  | "viewedProfileContext";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

const SUPPORT_STATUS_LABELS: Record<
  Exclude<SupportVraagStatus, "nieuw">,
  string
> = {
  actie_nodig: "Markeer actie nodig",
  afgehandeld: "Markeer afgehandeld",
  gesloten: "Sluiten",
  in_behandeling: "Afhandelen"
};

const NEW_SUPPORT_TRANSITIONS: Exclude<SupportVraagStatus, "nieuw">[] = [
  "in_behandeling",
  "actie_nodig"
];

const SUPPORTED_SUPPORT_TRANSITIONS: Record<
  Exclude<SupportVraagStatus, "nieuw">,
  Exclude<SupportVraagStatus, "nieuw">[]
> = {
  in_behandeling: ["actie_nodig", "afgehandeld", "gesloten"],
  actie_nodig: ["in_behandeling", "afgehandeld", "gesloten"],
  afgehandeld: ["gesloten"],
  gesloten: []
};

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
    item.urgency === "in_behandeling" ||
    item.status === "actie_nodig" ||
    item.status === "in_behandeling"
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

function isSupportRole(context: CurrentSamzoContext | null): boolean {
  if (!context?.persoon?.systeemrol) {
    return false;
  }

  return (
    context.persoon.systeemrol === "systeemondersteuner" ||
    context.persoon.systeemrol === "systeembeheerder"
  );
}

function getTimelineSupportPerspective(
  context: CurrentSamzoContext | null
): TimelineSupportPerspective {
  if (!context?.currentProfiel || !context?.ownProfiel) {
    return "viewedProfileContext";
  }

  const isOwnProfile = context.currentProfiel.id === context.ownProfiel.id;

  if (isOwnProfile && isSupportRole(context)) {
    return "supportHandlerContext";
  }

  if (isOwnProfile) {
    return "requesterContext";
  }

  return "viewedProfileContext";
}

function getTimelineSupportContext(
  context: CurrentSamzoContext | null
): TimelineSupportContext | undefined {
  if (!context?.currentProfiel) {
    return undefined;
  }

  const perspective = getTimelineSupportPerspective(context);

  if (perspective === "supportHandlerContext") {
    return { kind: "supportHandlerContext" };
  }

  return {
    kind: perspective,
    profileId: context.currentProfiel.id
  };
}

function isRequesterForSupportVraag(
  context: CurrentSamzoContext | null,
  item: TimelineItem
) {
  if (!context?.persoon || !context?.currentProfiel || !context?.ownProfiel) {
    return false;
  }

  if (context.currentProfiel.id !== context.ownProfiel.id) {
    return false;
  }

  return (
    item.source === "supportvraag" &&
    item.targetProfileId === context.currentProfiel.id &&
    item.supportVraagCreatorPersonId === context.persoon.id
  );
}

function canRequesterCloseSupportVraag(
  context: CurrentSamzoContext | null,
  item: TimelineItem
) {
  if (!item.hasSupportResponse) {
    return false;
  }

  return (
    isRequesterForSupportVraag(context, item) &&
    item.status !== "gesloten" &&
    item.status !== "afgehandeld"
  );
}

function isSupportVraagStatus(
  status: string
): status is SupportVraagStatus {
  return (
    status === "nieuw" ||
    status === "in_behandeling" ||
    status === "actie_nodig" ||
    status === "afgehandeld" ||
    status === "gesloten"
  );
}

function getSupportTransitionTargets(
  status: SupportVraagStatus
): Exclude<SupportVraagStatus, "nieuw">[] {
  if (status === "nieuw") {
    return NEW_SUPPORT_TRANSITIONS;
  }

  return SUPPORTED_SUPPORT_TRANSITIONS[status];
}

export default function TijdlijnPage() {
  const [timeline, setTimeline] = useState<TimelineState>({
    status: "loading"
  });
  const activeProfileId = useActiveProfileSwitchTrigger();
  const [proposalActionState, setProposalActionState] =
    useState<ProposalActionState>({
      status: "idle",
      message: null,
      proposalId: null
    });
  const [supportComposeState, setSupportComposeState] =
    useState<SupportComposeState>({
      onderwerp: "",
      omschrijving: ""
    });
  const [supportCreateState, setSupportCreateState] =
    useState<SupportComposeMessageState>({ status: "idle", message: null });
  const [supportActionState, setSupportActionState] =
    useState<SupportActionState>({
      status: "idle",
      message: null,
      supportVraagId: null
    });
  const [supportResponseState, setSupportResponseState] =
    useState<SupportResponseComposeState>({
      status: "idle",
      message: null,
      supportVraagId: null
    });
  const [supportResponseDrafts, setSupportResponseDrafts] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let isMounted = true;

    async function loadTimeline() {
      try {
        const context = await fetchCurrentSamzoContext();
        const items = await fetchVisibleTimelineItems({
          supportContext: getTimelineSupportContext(context)
        });

        if (!isMounted) {
          return;
        }

        setTimeline({
          status: "ready",
          context,
          items: context.currentProfiel ? items : []
        });
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        setTimeline({
          status: "error",
          message:
            error instanceof Error
              ? "Tijdlijn kon niet worden geladen."
              : "Onbekende fout tijdens het laden van de tijdlijn."
        });
      }
    }

    loadTimeline();

    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);

  const context = timeline.status === "ready" ? timeline.context : null;
  const canActOnCurrentProfile = useMemo(
    () =>
      Boolean(
        context?.currentProfiel &&
          context?.ownProfiel &&
          context.currentProfiel.id === context.ownProfiel.id
      ),
    [context]
  );
  const supportPerspective = useMemo(
    () => getTimelineSupportPerspective(context),
    [context]
  );
  const canActAsSupport = useMemo(
    () => supportPerspective === "supportHandlerContext",
    [supportPerspective]
  );

  async function refreshTimeline() {
    try {
      const nextContext = await fetchCurrentSamzoContext();
      const items = await fetchVisibleTimelineItems({
        supportContext: getTimelineSupportContext(nextContext)
      });

      setTimeline({
        status: "ready",
        context: nextContext,
        items: nextContext.currentProfiel ? items : []
      });
      setProposalActionState({ status: "idle", message: null, proposalId: null });
      setSupportActionState({ status: "idle", message: null, supportVraagId: null });
      setSupportResponseState({
        status: "idle",
        message: null,
        supportVraagId: null
      });
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

  async function handleCreateSupportVraag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!context?.currentProfiel || !context?.persoon) {
      setSupportCreateState({
        status: "error",
        message: "Je bent niet ingelogd met een zichtbaar profiel."
      });
      return;
    }

    if (
      !context?.ownProfiel ||
      context.currentProfiel.id !== context.ownProfiel.id
    ) {
      setSupportCreateState({
        status: "error",
        message:
          "Supportvragen worden vanaf je eigen profiel aangemaakt. Selecteer hiervoor je eigen profiel."
      });
      return;
    }

    const onderwerp = supportComposeState.onderwerp.trim();
    const omschrijving = supportComposeState.omschrijving.trim();

    if (!onderwerp || !omschrijving) {
      setSupportCreateState({
        status: "error",
        message: "Onderwerp en omschrijving zijn verplicht voor een supportvraag."
      });
      return;
    }

    setSupportCreateState({
      status: "running",
      message: "Supportvraag wordt opgeslagen..."
    });

    try {
      await createSupportVraag({
        profielId: context.ownProfiel.id,
        persoonId: context.persoon.id,
        onderwerp,
        omschrijving
      });
      await refreshTimeline();
      setSupportComposeState({
        onderwerp: "",
        omschrijving: ""
      });
      setSupportCreateState({
        status: "success",
        message: "Supportvraag is opgeslagen."
      });
    } catch {
      setSupportCreateState({
        status: "error",
        message: "Het was niet mogelijk om de supportvraag op te slaan."
      });
    }
  }

  function setSupportResponseDraft(itemId: string, value: string) {
    setSupportResponseDrafts((current) => ({
      ...current,
      [itemId]: value
    }));
  }

  function getSupportResponseDraft(itemId: string) {
    return supportResponseDrafts[itemId] ?? "";
  }

  async function handleSupportVraagResponse(
    item: TimelineItem,
    isSupportAntwoord: boolean
  ) {
    if (!context?.currentProfiel || !context?.persoon) {
      setSupportResponseState({
        status: "error",
        message: "Je moet ingelogd zijn met een actief profiel.",
        supportVraagId: item.id
      });
      return;
    }

    if (!isSupportVraagStatus(item.status) || item.source !== "supportvraag") {
      setSupportResponseState({
        status: "error",
        message: "Deze reactie is niet van toepassing op dit item.",
        supportVraagId: item.id
      });
      return;
    }

    const content = getSupportResponseDraft(item.id).trim();

    if (!content) {
      setSupportResponseState({
        status: "error",
        message: "Een reactie moet niet leeg zijn.",
        supportVraagId: item.id
      });
      return;
    }

    if (isSupportAntwoord && !canActAsSupport) {
      setSupportResponseState({
        status: "error",
        message: "Je hebt niet de juiste rol om vanuit support te reageren.",
        supportVraagId: item.id
      });
      return;
    }

    if (!isSupportAntwoord && !isRequesterForSupportVraag(context, item)) {
      setSupportResponseState({
        status: "error",
        message:
          "Deze supportvraag kan alleen door de aanvrager worden beantwoord.",
        supportVraagId: item.id
      });
      return;
    }

    setSupportResponseState({
      status: "running",
      message: "Reactie wordt opgeslagen...",
      supportVraagId: item.id
    });

    try {
      await createSupportVraagResponse({
        inhoud: content,
        isSupportAntwoord,
        nextStatusOnCreate: "actie_nodig",
        profielId: context.currentProfiel.id,
        persoonId: context.persoon.id,
        supportVraagId: item.id
      });

      setSupportResponseDrafts((current) => ({
        ...current,
        [item.id]: ""
      }));
      await refreshTimeline();
      setSupportResponseState({
        status: "success",
        message: "Je reactie is opgeslagen.",
        supportVraagId: item.id
      });
    } catch {
      setSupportResponseState({
        status: "error",
        message:
          "Deze reactie kon niet worden opgeslagen. Probeer opnieuw of ververs de pagina.",
        supportVraagId: item.id
      });
    }
  }

  async function handleSupportVraagDecision(
    item: TimelineItem,
    nextStatus: Exclude<SupportVraagStatus, "nieuw">
  ) {
    if (!context?.currentProfiel || !context?.persoon) {
      setSupportActionState({
        status: "error",
        message: "Je moet ingelogd zijn met een actief profiel.",
        supportVraagId: item.id
      });
      return;
    }

    if (!isSupportVraagStatus(item.status) || item.source !== "supportvraag") {
      setSupportActionState({
        status: "error",
        message: "Deze supportactie is niet van toepassing op dit item.",
        supportVraagId: item.id
      });
      return;
    }

    const isRequesterClose =
      nextStatus === "gesloten" && canRequesterCloseSupportVraag(context, item);
    if (!canActAsSupport && !isRequesterClose) {
      setSupportActionState({
        status: "error",
        message: "Je hebt hiervoor niet de juiste rol in deze sessie.",
        supportVraagId: item.id
      });
      return;
    }

    setSupportActionState({
      status: "running",
      message: "Supportstatus bijwerken...",
      supportVraagId: item.id
    });

    try {
      if (isRequesterClose) {
        await markOwnSupportVraagSolved({
          persoonId: context.persoon.id,
          profielId: context.currentProfiel.id,
          supportVraagId: item.id
        });
      } else {
        await updateSupportVraagStatus({
          persoonId: context.persoon.id,
          supportVraagId: item.id,
          status: nextStatus
        });
      }
      await refreshTimeline();
      setSupportActionState({
        status: "success",
        message: isRequesterClose
          ? "Fijn, deze supportvraag is als opgelost gemarkeerd."
          : "Supportstatus is bijgewerkt.",
        supportVraagId: item.id
      });
    } catch {
      setSupportActionState({
        status: "error",
        message:
          "Deze statuswijziging kon niet worden opgeslagen.",
        supportVraagId: item.id
      });
    }
  }

  async function handleProposalDecision(
    actie: "accept" | "reject",
    item: TimelineItem
  ) {
    if (timeline.status !== "ready" || !context || !context.currentProfiel) {
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

    if (item.proposalReceivingProfileId !== context.currentProfiel.id) {
      setProposalActionState({
        status: "error",
        message: "Dit voorstel hoort niet bij het actieve profiel.",
        proposalId: item.proposalId
      });
      return;
    }

    if (!canActOnCurrentProfile) {
      setProposalActionState({
        status: "error",
        message:
          "Voorstelacties zijn tijdelijk alleen beschikbaar vanuit je eigen profiel.",
        proposalId: item.proposalId
      });
      return;
    }

    setProposalActionState({
      status: "running",
      message:
        actie === "accept"
          ? "Voorstel accepteren..."
          : "Voorstel afwijzen...",
      proposalId: item.proposalId
    });

    try {
      if (actie === "accept") {
        if (!context.persoon) {
          throw new Error("missing_persoon");
        }

        await acceptVoorstel({
          voorstelId: item.proposalId,
          profielId: context.currentProfiel.id,
          persoonId: context.persoon.id
        });
      } else {
        await declineVoorstel({
          voorstelId: item.proposalId,
          profielId: context.currentProfiel.id,
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

  const hasVisibleOpenProposalForActiveProfile = timeline.status === "ready" &&
    Boolean(context?.currentProfiel) &&
    timeline.items.some(
      (item) =>
        item.source === "voorstel" &&
        item.status === "open" &&
        item.proposalReceivingProfileId === context?.currentProfiel?.id
    );

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
      !canActOnCurrentProfile &&
      hasVisibleOpenProposalForActiveProfile ? (
        <div className="tijdlijn-state tijdlijn-state--error">
          <h2>Geen actieve profielactie</h2>
          <p>
            Voorstelacties zijn op dit moment alleen beschikbaar voor je eigen
            profiel.
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

      {timeline.status === "ready" && timeline.context.currentProfiel ? (
        <section className="tijdlijn-support-form" aria-label="Nieuwe supportvraag">
          <h2>Nieuwe supportvraag</h2>
          <form
            className="tijdlijn-support-form__form"
            onSubmit={handleCreateSupportVraag}
          >
            <label>
              <span>Onderwerp</span>
              <input
                onChange={(event) =>
                  setSupportComposeState((current) => ({
                    ...current,
                    onderwerp: event.target.value
                  }))
                }
                required
                type="text"
                value={supportComposeState.onderwerp}
              />
            </label>
            <label>
              <span>Omschrijving</span>
              <textarea
                onChange={(event) =>
                  setSupportComposeState((current) => ({
                    ...current,
                    omschrijving: event.target.value
                  }))
                }
                required
                rows={4}
                value={supportComposeState.omschrijving}
              />
            </label>
            <div className="tijdlijn-support-form__actions">
              <button
                disabled={supportCreateState.status === "running"}
                type="submit"
              >
                Supportvraag insturen
              </button>
              <small>
                Een supportvraag heeft alleen onderwerp, omschrijving en status.
              </small>
            </div>
          </form>

          {supportCreateState.message ? (
            <p
              className={
                supportCreateState.status === "error"
                  ? "tijdlijn-state tijdlijn-state--error"
                  : "tijdlijn-state"
              }
              role="status"
            >
              {supportCreateState.message}
            </p>
          ) : null}
        </section>
      ) : null}

      {timeline.status === "ready" && timeline.items.length > 0 ? (
        <div className="tijdlijn-list">
          {timeline.items.map((item) => {
            const isProposal = item.source === "voorstel";
            const isProposalOpen =
              isProposal && item.proposalId !== null && item.status === "open";
            const proposalMomentId =
              isProposal && item.related?.type === "moment" ? item.related.id : null;
            const proposalForActiveProfile =
              isProposal &&
              item.proposalReceivingProfileId === context?.currentProfiel?.id;
            const showProposalActions =
              isProposalOpen &&
              proposalForActiveProfile &&
              canActOnCurrentProfile;
            const isSupportVraag = item.source === "supportvraag";
            const supportStatus =
              isSupportVraagStatus(item.status) ? item.status : null;
            const isRequesterOwnedSupportVraag =
              isRequesterForSupportVraag(context, item);
            const canRespondAsRequester = isRequesterForSupportVraag(context, item);
            const canRespondAsSupport =
              isSupportVraag && canActAsSupport && !isRequesterOwnedSupportVraag;
            const canShowSupportActions =
              isSupportVraag &&
              canActAsSupport &&
              !isRequesterOwnedSupportVraag &&
              supportStatus !== null &&
              getSupportTransitionTargets(supportStatus).length > 0;
            const supportTransitions =
              supportStatus !== null
                ? getSupportTransitionTargets(supportStatus)
                : [];
            const canShowSupportResponseActions =
              isSupportVraag &&
              item.status !== "gesloten" &&
              (canRespondAsSupport || canRespondAsRequester) &&
              supportStatus !== null;
            const canRequesterClose =
              canRequesterCloseSupportVraag(context, item);
            const latestSupportResponseText = item.latestSupportResponse
              ? item.latestSupportResponse.isSupportResponse
                ? "Antwoord van support"
                : "Vraag/terugkoppeling van aanvrager"
              : null;
            const supportResponseDraft = getSupportResponseDraft(item.id);
            const isResponsePendingForItem =
              supportResponseState.status === "running" &&
              supportResponseState.supportVraagId === item.id;
            const responseActionLabel = canRespondAsSupport
              ? "Antwoord toevoegen"
              : "Ik heb nog een vraag";

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
                      {item.related
                        ? `${formatStatus(item.related.type)} ${item.related.id}`
                        : "Geen veilige koppeling zichtbaar"}
                    </dd>
                  </div>
                </dl>

                {item.source === "supportvraag" ? (
                  <div className="tijdlijn-card__support-summary">
                    <dl>
                      <dt>Reacties</dt>
                      <dd>
                        {item.supportResponseCount
                          ? `${item.supportResponseCount} reactie${item.supportResponseCount > 1 ? "n" : ""}`
                          : "Nog geen reacties"}
                      </dd>
                    </dl>
                    {item.latestSupportResponse ? (
                      <p>
                        <strong>
                          {latestSupportResponseText}
                          {": "}
                        </strong>
                        {item.latestSupportResponse.content}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {proposalMomentId ? (
                  <Link
                    className="tijdlijn-card__open"
                    href={`/planning/${proposalMomentId}`}
                  >
                    Open moment
                  </Link>
                ) : null}

                {proposalForActiveProfile &&
                isProposalOpen &&
                !canActOnCurrentProfile ? (
                  <p className="tijdlijn-state tijdlijn-state--error">
                    Voorstelacties zijn alleen zichtbaar voor het eigen profiel.
                  </p>
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

                {canShowSupportActions ? (
                  <div className="tijdlijn-card__support-actions">
                    {supportTransitions.map((nextStatus) => (
                      <button
                        key={nextStatus}
                        onClick={() =>
                          void handleSupportVraagDecision(item, nextStatus)
                        }
                        disabled={
                          supportActionState.status === "running" &&
                          supportActionState.supportVraagId === item.id
                        }
                        type="button"
                      >
                        {SUPPORT_STATUS_LABELS[nextStatus]}
                      </button>
                    ))}
                  </div>
                ) : null}

                {canRequesterClose ? (
                  <div className="tijdlijn-card__support-actions">
                    <button
                      onClick={() =>
                        void handleSupportVraagDecision(item, "gesloten")
                      }
                      disabled={
                        supportActionState.status === "running" &&
                        supportActionState.supportVraagId === item.id
                      }
                      type="button"
                    >
                      Dit is opgelost
                    </button>
                  </div>
                ) : null}

                {canShowSupportResponseActions ? (
                  <form
                    className="tijdlijn-card__support-reply-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSupportVraagResponse(item, canRespondAsSupport);
                    }}
                  >
                    <label>
                      <span>{responseActionLabel}</span>
                      <textarea
                        onChange={(event) =>
                          setSupportResponseDraft(item.id, event.target.value)
                        }
                        rows={2}
                        value={supportResponseDraft}
                      />
                    </label>
                    <button
                      disabled={isResponsePendingForItem}
                      type="submit"
                    >
                      Reageren
                    </button>
                    <small>
                      {canRespondAsSupport
                        ? "Antwoord van support."
                        : "Ik heb nog een vraag."}
                    </small>
                  </form>
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

      {supportActionState.message ? (
        <p
          className={
            supportActionState.status === "error"
              ? "tijdlijn-state tijdlijn-state--error"
              : "tijdlijn-state"
          }
          role="status"
        >
          {supportActionState.message}
        </p>
        ) : null}
      {supportResponseState.message ? (
        <p
          className={
            supportResponseState.status === "error"
              ? "tijdlijn-state tijdlijn-state--error"
              : "tijdlijn-state"
          }
          role="status"
        >
          {supportResponseState.message}
        </p>
      ) : null}
    </section>
  );
}
