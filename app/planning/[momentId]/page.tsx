"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchLijstenForMoment,
  type VisibleLijst
} from "@/src/lib/lijsten/items";
import {
  acceptVoorstel,
  declineVoorstel
} from "@/src/lib/voorstellen/actions";
import {
  fetchOpenVoorstelForProfileAndMoment,
  type VoorstelItem
} from "@/src/lib/voorstellen/items";
import {
  fetchMomentDetail,
  type MomentDetailParticipation,
  type MomentDetailRole,
  type MomentDetailData
} from "@/src/lib/moment/detail";
import {
  isActiveParticipationStatus,
  isBlockingParticipationStatus,
  registerForMoment,
  unregisterFromMoment
} from "@/src/lib/moment/participation";
import {
  claimMomentRole,
  releaseMomentRole
} from "@/src/lib/moment/role-claims";
import {
  fetchCurrentSamzoContext,
  isOwnProfileActive,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";
import { useActiveProfileSwitchTrigger } from "@/src/lib/samzo/profile-switch-events";
import {
  archiveBegeleidingsnotitie,
  createBegeleidingsnotitieForMoment,
  type Begeleidingsnotitie,
  fetchBegeleidingsnotitiesForMoment,
  updateBegeleidingsnotitie
} from "@/src/lib/begeleidingsnotities/items";
import {
  createPlanningGroupMoment,
  updatePlanningGroupMoment,
  archivePlanningGroupMoment
} from "@/src/lib/planning/moment-management";
import {
  fetchPlanningFilterCategories,
  fetchPlanningFilterGroups,
  type PlanningCategoryOption,
  type PlanningGroupOption
} from "@/src/lib/planning/moments";

type MomentDetailState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      detail: MomentDetailData;
      linkedLists: VisibleLijst[];
      proposal: VoorstelItem | null;
      begeleidingsnotities: Begeleidingsnotitie[];
    }
  | { status: "error"; message: string };

type ActionState =
  | { status: "idle"; message: string | null }
  | { status: "running"; message: string | null }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type MomentDetailRoleOccupancy = MomentDetailRole["occupancies"][number];

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium"
});

const noteDateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
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

function formatNoteDate(value: string | null) {
  if (!value) {
    return null;
  }

  return noteDateFormatter.format(new Date(value));
}

function fromIsoToDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 16);
}

function toMomentManagementCapacity(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? null : parsed;
}

const ROLE_BLOCKING_PARTICIPATION_STATUSES: MomentDetailParticipation["status"][] =
  [
    "voorgesteld",
    "uitgenodigd",
    "wachtlijst",
    "afgemeld",
    "geweigerd",
    "geannuleerd",
    "verlopen"
  ];

const ROLE_BLOCKING_CLAIM_MESSAGE =
  "Je kunt deze rol nog niet claimen omdat je deelname nog niet actief is.";
const ROLE_REQUIRES_ACTIVE_PARTICIPATION_MESSAGE =
  "Je kunt deze rol claimen zodra je actief deelneemt aan dit moment.";

function canManageBegeleidingsnotities(context: CurrentSamzoContext | null) {
  return (
    context?.persoon?.systeemrol !== "gast" &&
    (context?.persoon?.systeemrol === "medewerker" ||
      context?.persoon?.systeemrol === "systeembeheerder")
  );
}

function canManageMoment(context: CurrentSamzoContext | null) {
  return context?.persoon?.systeemrol === "systeembeheerder";
}

const EDITABLE_MOMENT_STATUSES = [
  "gepland",
  "open",
  "gewijzigd",
  "geannuleerd"
] as const;

type EditableMomentStatus = (typeof EDITABLE_MOMENT_STATUSES)[number];

function isEditableMomentStatus(
  value: string
): value is EditableMomentStatus {
  return (EDITABLE_MOMENT_STATUSES as readonly string[]).includes(value);
}

function toManagementEditDraft(
  moment: MomentDetailData["moment"]
): MomentManagementEditDraft | null {
  if (!moment || !isEditableMomentStatus(moment.status)) {
    return null;
  }

  return {
    title: moment.title,
    description: moment.description ?? "",
    categoryId: moment.categoryId ?? "",
    groupId: moment.ownerGroupId ?? "",
    startsAt: fromIsoToDateTimeInput(moment.startsAt),
    endsAt: fromIsoToDateTimeInput(moment.endsAt),
    isAllDay: moment.isAllDay,
    location: moment.location ?? "",
    capacity: moment.capacity ? moment.capacity.toString() : "",
    registrationOpen: moment.registrationOpen,
    guestAccess: moment.guestAccess,
    status: moment.status
  };
}

type MomentManagementCreateDraft = {
  title: string;
  description: string;
  categoryId: string;
  groupId: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  location: string;
  capacity: string;
  registrationOpen: boolean;
  guestAccess: boolean;
};

type MomentManagementEditDraft = MomentManagementCreateDraft & {
  status: EditableMomentStatus;
};

const EMPTY_MOMENT_CREATE_DRAFT: MomentManagementCreateDraft = {
  title: "",
  description: "",
  categoryId: "",
  groupId: "",
  startsAt: "",
  endsAt: "",
  isAllDay: false,
  location: "",
  capacity: "",
  registrationOpen: false,
  guestAccess: false
};

function isRoleBlockingParticipationStatus(
  status: MomentDetailParticipation["status"]
) {
  return ROLE_BLOCKING_PARTICIPATION_STATUSES.includes(status);
}

function formatParticipationState(participation: MomentDetailParticipation | null) {
  if (!participation) {
    return "Niet aangemeld";
  }

  if (participation.status === "ingeschreven") {
    return "Ingeschreven";
  }

  if (participation.status === "afgemeld") {
    return "Afgemeld";
  }

  if (participation.status === "voorgesteld") {
    return "Voorgesteld";
  }

  if (participation.status === "uitgenodigd") {
    return "Uitgenodigd";
  }

  if (participation.status === "wachtlijst") {
    return "Op wachtlijst";
  }

  return formatStatus(participation.status);
}

function findCurrentParticipation(
  participations: MomentDetailParticipation[],
  profielId: string
) {
  const currentProfileParticipations = participations.filter(
    (participation) => participation.profileId === profielId
  );

  return (
    currentProfileParticipations.find((participation) =>
      isActiveParticipationStatus(participation.status)
    ) ??
    currentProfileParticipations.find((participation) =>
      isBlockingParticipationStatus(participation.status)
    ) ??
    currentProfileParticipations[0] ??
    null
  );
}

function isRoleOpenForClaim(role: MomentDetailRole) {
  return (
    role.status === "open" ||
    role.status === "incompleet" ||
    role.status === "gevuld"
  );
}

function getActiveRoleOccupancies(role: MomentDetailRole) {
  return role.occupancies.filter((occupancy) => occupancy.status === "actief");
}

function findCurrentRoleOccupancy(role: MomentDetailRole, profielId: string) {
  const currentProfileOccupancies = role.occupancies.filter(
    (occupancy) => occupancy.profileId === profielId
  );

  return (
    currentProfileOccupancies.find(
      (occupancy) => occupancy.status === "actief"
    ) ??
    currentProfileOccupancies[0] ??
    null
  );
}

function hasRoleSpace(role: MomentDetailRole) {
  return (
    role.maximumCount === null ||
    getActiveRoleOccupancies(role).length < role.maximumCount
  );
}

export default function MomentDetailPage() {
  const params = useParams<{ momentId: string }>();
  const momentId = useMemo(() => {
    const value = params.momentId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.momentId]);
  const activeProfileId = useActiveProfileSwitchTrigger();
  const router = useRouter();
  const [detailState, setDetailState] = useState<MomentDetailState>({
    status: "loading"
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    message: null
  });
  const [managementCategories, setManagementCategories] = useState<
    PlanningCategoryOption[]
  >([]);
  const [managementGroups, setManagementGroups] = useState<PlanningGroupOption[]>(
    []
  );
  const [managementCreateDraft, setManagementCreateDraft] =
    useState<MomentManagementCreateDraft>(EMPTY_MOMENT_CREATE_DRAFT);
  const [managementEditDraft, setManagementEditDraft] =
    useState<MomentManagementEditDraft | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteDraft, setEditingNoteDraft] = useState("");

  const loadMomentDetail = useCallback(async () => {
    if (!momentId) {
      setDetailState({
        status: "error",
        message: "Geen moment-id gevonden in de route."
      });
      return;
    }

    const [context, detail, linkedLists, begeleidingsnotities] = await Promise.all([
      fetchCurrentSamzoContext(),
      fetchMomentDetail(momentId),
      fetchLijstenForMoment(momentId),
      fetchBegeleidingsnotitiesForMoment(momentId)
    ]);

    const proposal =
      context.currentProfiel !== null
        ? await fetchOpenVoorstelForProfileAndMoment(
            context.currentProfiel.id,
            momentId
          )
        : null;
    const canManage = canManageMoment(context);
    const shouldEditDraft = canManage && detail.moment !== null;
    const editDraft = shouldEditDraft ? toManagementEditDraft(detail.moment) : null;

    try {
      const [categories, groups] = canManage
        ? await Promise.all([
            fetchPlanningFilterCategories(),
            fetchPlanningFilterGroups()
          ])
        : [[], []];

      setManagementCategories(categories);
      setManagementGroups(groups);
    } catch (error: unknown) {
      setManagementCategories([]);
      setManagementGroups([]);
    }

    setDetailState({
      status: "ready",
      context,
      detail,
      linkedLists,
      proposal,
      begeleidingsnotities
    });
    setNoteDraft("");
    setEditingNoteId(null);
    setEditingNoteDraft("");
    setManagementEditDraft(editDraft);
  }, [momentId]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        await loadMomentDetail();
      } catch (error: unknown) {
        if (isMounted) {
          setDetailState({
            status: "error",
            message:
              error instanceof Error
                ? "Momentscherm kon niet worden geladen."
                : "Onbekende fout tijdens het laden van dit moment."
          });
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [momentId, activeProfileId, loadMomentDetail]);

  async function refreshMomentDetail(successMessage?: string) {
    try {
      await loadMomentDetail();

      if (successMessage) {
        setActionState({ status: "success", message: successMessage });
      }
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Vernieuwen van het moment is niet gelukt."
            : "Vernieuwen van het moment is niet gelukt."
      });
    }
  }

  function parseDateTimeForMutation(label: string, value: string) {
    const parsed = new Date(value);

    if (!value.trim() || Number.isNaN(parsed.getTime())) {
      throw new Error(`${label} is ongeldig.`);
    }

    return parsed.toISOString();
  }

  function buildManagementPayload(
    draft: MomentManagementCreateDraft,
    status?: EditableMomentStatus
  ) {
    const title = draft.title.trim();
    const description = draft.description.trim();
    const startsAt = parseDateTimeForMutation("Starttijd", draft.startsAt);
    const endsAt = draft.endsAt.trim()
      ? parseDateTimeForMutation("Eindtijd", draft.endsAt)
      : "";

    const capacity = toMomentManagementCapacity(draft.capacity);
    if (draft.capacity.trim() && capacity === null) {
      throw new Error("Capaciteit moet een getal zijn.");
    }

    if (draft.categoryId === "") {
      throw new Error("Kies eerst een categorie.");
    }

    if (draft.groupId === "") {
      throw new Error("Kies eerst een eigenaar-groep.");
    }

    return {
      title,
      description: description || undefined,
      categoryId: draft.categoryId,
      groupId: draft.groupId,
      startsAt,
      endsAt: endsAt || undefined,
      isAllDay: draft.isAllDay,
      location: draft.location.trim() || undefined,
      capacity,
      registrationOpen: draft.registrationOpen,
      guestAccess: draft.guestAccess,
      ...(status !== undefined ? { status } : {})
    };
  }

  async function handleCreateMoment() {
    if (actionState.status === "running") {
      return;
    }

    setActionState({
      status: "running",
      message: "Planningmoment wordt aangemaakt..."
    });

    try {
      const payload = buildManagementPayload(managementCreateDraft);
      const result = await createPlanningGroupMoment(payload);

      setManagementCreateDraft(EMPTY_MOMENT_CREATE_DRAFT);
      setActionState({
        status: "success",
        message: "Planningmoment is aangemaakt."
      });
      router.push(`/planning/${result.id}`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Aanmaken van planningmoment is niet gelukt."
      });
    }
  }

  async function handleUpdateMoment() {
    if (detailState.status !== "ready" || !managementEditDraft || !momentId) {
      setActionState({
        status: "error",
        message: "Dit moment kan niet worden bijgewerkt."
      });
      return;
    }

    if (
      !canManageMoment(detailState.context) ||
      !detailState.detail.moment ||
      !EDITABLE_MOMENT_STATUSES.includes(managementEditDraft.status)
    ) {
      setActionState({
        status: "error",
        message:
          "Je hebt geen rechten of status om dit planningmoment te wijzigen."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Planningmoment wordt bijgewerkt..."
    });

    try {
      const payload = buildManagementPayload(managementEditDraft);

      await updatePlanningGroupMoment({
        ...payload,
        momentId,
        status: managementEditDraft.status
      });

      await refreshMomentDetail("Planningmoment is bijgewerkt.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Bijwerken van planningmoment is niet gelukt."
      });
    }
  }

  async function handleArchiveMoment() {
    if (
      detailState.status !== "ready" ||
      !detailState.detail.moment ||
      !canManageMoment(detailState.context)
    ) {
      setActionState({
        status: "error",
        message: "Dit moment kan niet worden gearchiveerd."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Planningmoment wordt gearchiveerd..."
    });

    try {
      await archivePlanningGroupMoment({ momentId });
      await loadMomentDetail();
      setActionState({
        status: "success",
        message: "Planningmoment is gearchiveerd."
      });
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Archiveren van planningmoment is niet gelukt."
      });
    }
  }

  async function handleCreateBegeleidingsnotitie() {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Notities kan je alleen toevoegen met een actief profiel."
      });
      return;
    }

    if (!canManageBegeleidingsnotities(detailState.context)) {
      setActionState({
        status: "error",
        message:
          "Je hebt geen rechten om begeleidingsnotities voor dit moment toe te voegen."
      });
      return;
    }

    const inhoud = noteDraft.trim();
    if (!inhoud) {
      setActionState({
        status: "error",
        message: "Vul eerst de tekst van de begeleidingsnotitie in."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Begeleidingsnotitie wordt opgeslagen..."
    });

    try {
      await createBegeleidingsnotitieForMoment({
        momentId,
        personId: detailState.context.persoon.id,
        inhoud,
        betrokkenProfielId: detailState.context.currentProfiel.id,
        zichtbaarVoorRoltype: null
      });
      setNoteDraft("");
      await refreshMomentDetail("Begeleidingsnotitie is opgeslagen.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Opslaan van de begeleidingsnotitie is niet gelukt."
      });
    }
  }

  async function handleUpdateBegeleidingsnotitie() {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !editingNoteId
    ) {
      setActionState({
        status: "error",
        message: "Bijwerken van deze begeleidingsnotitie is niet mogelijk."
      });
      return;
    }

    if (!canManageBegeleidingsnotities(detailState.context)) {
      setActionState({
        status: "error",
        message:
          "Je hebt geen rechten om deze begeleidingsnotitie bij te werken."
      });
      return;
    }

    const inhoud = editingNoteDraft.trim();
    if (!inhoud) {
      setActionState({
        status: "error",
        message: "De begeleidingsnotitie mag niet leeg zijn."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Begeleidingsnotitie wordt bijgewerkt..."
    });

    try {
      await updateBegeleidingsnotitie({
        noteId: editingNoteId,
        persoonId: detailState.context.persoon.id,
        inhoud
      });
      setEditingNoteId(null);
      setEditingNoteDraft("");
      await refreshMomentDetail("Begeleidingsnotitie is bijgewerkt.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Bijwerken van de begeleidingsnotitie is niet gelukt."
      });
    }
  }

  async function handleArchiveBegeleidingsnotitie(noteId: string) {
    if (detailState.status !== "ready" || !detailState.context.persoon) {
      setActionState({
        status: "error",
        message: "Archiveren van deze begeleidingsnotitie is niet mogelijk."
      });
      return;
    }

    if (!canManageBegeleidingsnotities(detailState.context)) {
      setActionState({
        status: "error",
        message:
          "Je hebt geen rechten om deze begeleidingsnotitie te archiveren."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Begeleidingsnotitie wordt gearchiveerd..."
    });

    try {
      await archiveBegeleidingsnotitie({
        noteId,
        persoonId: detailState.context.persoon.id
      });
      await refreshMomentDetail("Begeleidingsnotitie is gearchiveerd.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Archiveren van de begeleidingsnotitie is niet gelukt."
      });
    }
  }

  async function handleRegister() {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Aanmelden kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Aanmelding wordt opgeslagen..."
    });

    try {
      const result = await registerForMoment({
        momentId,
        persoonId: detailState.context.persoon.id,
        profielId: detailState.context.currentProfiel.id
      });

      if (result.status === "already_registered") {
        await refreshMomentDetail(
          `Je deelname staat al op ${formatStatus(
            result.deelnameStatus
          )}.`
        );
        return;
      }

      await refreshMomentDetail(
        result.status === "reactivated"
          ? "Je deelname is opnieuw aangemeld."
          : "Je bent aangemeld voor dit moment."
      );
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Aanmelden is niet gelukt."
            : "Aanmelden is niet gelukt."
      });
    }
  }

  async function handleUnregister(participationId: string) {
    if (detailState.status !== "ready" || !detailState.context.currentProfiel) {
      setActionState({
        status: "error",
        message: "Afmelden kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Afmelding wordt opgeslagen..."
    });

    try {
      const result = await unregisterFromMoment({
        deelnameId: participationId,
        momentId,
        profielId: detailState.context.currentProfiel.id
      });
      const releasedParts = [
        result.roleClaimsReleased > 0
          ? `${result.roleClaimsReleased} rol${
              result.roleClaimsReleased === 1 ? "" : "len"
            }`
          : null,
        result.taskClaimsReleased > 0
          ? `${result.taskClaimsReleased} taakclaim${
              result.taskClaimsReleased === 1 ? "" : "s"
            }`
          : null
      ].filter(Boolean);

      await refreshMomentDetail(
        releasedParts.length > 0
          ? `Je bent afgemeld. Ook je ${releasedParts.join(
              " en "
            )} voor dit moment zijn vrijgegeven.`
          : "Je bent afgemeld voor dit moment."
      );
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Afmelden is niet gelukt."
            : "Afmelden is niet gelukt."
      });
    }
  }

  async function handleAcceptProposal() {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel ||
      !detailState.proposal
    ) {
      setActionState({
        status: "error",
        message: "Deze voorstelactie kan niet worden voltooid."
      });
      return;
    }

    if (!isOwnProfileActive(detailState.context)) {
      setActionState({
        status: "error",
        message:
          "Voorstelacties zijn alleen beschikbaar vanuit je eigen profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Voorstel accepteren..."
    });

    try {
      await acceptVoorstel({
        voorstelId: detailState.proposal.id,
        profielId: detailState.context.currentProfiel.id,
        persoonId: detailState.context.persoon.id
      });
      await refreshMomentDetail("Het voorstel is geaccepteerd.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Het voorstel kon niet worden geaccepteerd."
            : "Het voorstel kon niet worden geaccepteerd."
      });
    }
  }

  async function handleRejectProposal() {
    if (
      detailState.status !== "ready" ||
      !detailState.context.currentProfiel ||
      !detailState.proposal
    ) {
      setActionState({
        status: "error",
        message: "Deze afwijzingsactie kan niet worden voltooid."
      });
      return;
    }

    if (!isOwnProfileActive(detailState.context)) {
      setActionState({
        status: "error",
        message:
          "Voorstelacties zijn alleen beschikbaar vanuit je eigen profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Voorstel afwijzen..."
    });

    try {
      await declineVoorstel({
        voorstelId: detailState.proposal.id,
        profielId: detailState.context.currentProfiel.id,
        persoonId: null
      });
      await refreshMomentDetail("Het voorstel is afgewezen.");
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Het voorstel kon niet worden afgewezen."
            : "Het voorstel kon niet worden afgewezen."
      });
    }
  }

  async function handleClaimRole(role: MomentDetailRole) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.persoon ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Rol claimen kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    if (
      currentParticipation &&
      isRoleBlockingParticipationStatus(currentParticipation.status)
    ) {
      setActionState({
        status: "error",
        message: ROLE_BLOCKING_CLAIM_MESSAGE
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Rolclaim wordt opgeslagen..."
    });

    try {
      await claimMomentRole({
        momentRoleId: role.id,
        persoonId: detailState.context.persoon.id,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshMomentDetail(`Je hebt de rol "${role.title}" geclaimd.`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Rol claimen is niet gelukt."
            : "Rol claimen is niet gelukt."
      });
    }
  }

  async function handleReleaseRole(
    role: MomentDetailRole,
    occupancy: MomentDetailRoleOccupancy
  ) {
    if (
      detailState.status !== "ready" ||
      !detailState.context.currentProfiel
    ) {
      setActionState({
        status: "error",
        message: "Rol vrijgeven kan alleen met een gekoppeld actief profiel."
      });
      return;
    }

    setActionState({
      status: "running",
      message: "Rol wordt vrijgegeven..."
    });

    try {
      await releaseMomentRole({
        roleOccupancyId: occupancy.id,
        profielId: detailState.context.currentProfiel.id
      });
      await refreshMomentDetail(`Je hebt de rol "${role.title}" vrijgegeven.`);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? "Rol vrijgeven is niet gelukt."
            : "Rol vrijgeven is niet gelukt."
      });
    }
  }

  const currentProfiel =
    detailState.status === "ready" ? detailState.context.currentProfiel : null;
  const currentParticipation =
    detailState.status === "ready" && currentProfiel
      ? findCurrentParticipation(
          detailState.detail.participations,
          currentProfiel.id
        )
      : null;
  const hasBlockingParticipation = currentParticipation
    ? isBlockingParticipationStatus(currentParticipation.status)
    : false;
  const hasRoleBlockingParticipation = currentParticipation
    ? isRoleBlockingParticipationStatus(currentParticipation.status)
    : false;
  const hasActiveParticipation = currentParticipation
    ? isActiveParticipationStatus(currentParticipation.status)
    : false;
  const activeProposal =
    detailState.status === "ready" && detailState.proposal?.status === "open"
      ? detailState.proposal
      : null;
  const hasActionableProposal =
    detailState.status === "ready" &&
    activeProposal !== null &&
    detailState.context.currentProfiel !== null &&
    isOwnProfileActive(detailState.context);
  const canActOnCurrentProfile =
    detailState.status === "ready" && isOwnProfileActive(detailState.context);
  const canRegister =
    detailState.status === "ready" &&
    Boolean(detailState.detail.moment?.registrationOpen) &&
    Boolean(detailState.context.persoon) &&
    Boolean(currentProfiel) &&
    !hasBlockingParticipation &&
    actionState.status !== "running";
  const canUnregister =
    detailState.status === "ready" &&
    Boolean(currentProfiel) &&
    Boolean(currentParticipation) &&
    isActiveParticipationStatus(currentParticipation!.status) &&
    actionState.status !== "running";
  const canManageCurrentMoment =
    detailState.status === "ready" &&
    canManageMoment(detailState.context);
  const canEditCurrentMoment =
    canManageCurrentMoment &&
    detailState.detail.moment !== null &&
    isEditableMomentStatus(detailState.detail.moment.status);
  const activeParticipants =
    detailState.status === "ready"
      ? detailState.detail.participations.filter((participation) =>
          isActiveParticipationStatus(participation.status)
        )
      : [];
  const activeRoleProfileIds =
    detailState.status === "ready"
      ? new Set(
          detailState.detail.roles.flatMap((role) =>
            getActiveRoleOccupancies(role).map(
              (occupancy) => occupancy.profileId
            )
          )
        )
      : new Set<string>();
  const regularActiveParticipants = activeParticipants.filter(
    (participation) => !activeRoleProfileIds.has(participation.profileId)
  );
  const canManageNotes =
    detailState.status === "ready" &&
    canManageBegeleidingsnotities(detailState.context);
  const momentBegeleidingsnotities =
    detailState.status === "ready"
      ? detailState.begeleidingsnotities
      : [];

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
              <span>{detailState.detail.moment.categoryName ?? "Geen categorie"}</span>
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

          {canManageCurrentMoment ? (
            <section
              className="moment-detail-section"
              aria-labelledby="moment-management-heading"
            >
              <h2 id="moment-management-heading">Momentbeheer</h2>
              <p className="moment-detail-action-note">
                Alle wijzigingen in planningmomenten gaan via de gecontroleerde
                beheer-RPC.
              </p>

              <form
                className="moment-detail-notes-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateMoment();
                }}
              >
                <h3>Nieuw planningmoment maken</h3>
                <label>
                  <span>Titel</span>
                  <input
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    value={managementCreateDraft.title}
                  />
                </label>
                <label>
                  <span>Beschrijving</span>
                  <textarea
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    rows={3}
                    value={managementCreateDraft.description}
                  />
                </label>
                <label>
                  <span>Categorie</span>
                  <select
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        categoryId: event.target.value
                      }))
                    }
                    value={managementCreateDraft.categoryId}
                  >
                    <option value="">Kies categorie</option>
                    {managementCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Eigenaar groep</span>
                  <select
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        groupId: event.target.value
                      }))
                    }
                    value={managementCreateDraft.groupId}
                  >
                    <option value="">Kies eigenaar-groep</option>
                    {managementGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Starttijd</span>
                  <input
                    type="datetime-local"
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        startsAt: event.target.value
                      }))
                    }
                    value={managementCreateDraft.startsAt}
                  />
                </label>
                <label>
                  <span>Eindtijd (optioneel)</span>
                  <input
                    type="datetime-local"
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        endsAt: event.target.value
                      }))
                    }
                    value={managementCreateDraft.endsAt}
                  />
                </label>
                <label>
                  <span>Locatie</span>
                  <input
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        location: event.target.value
                      }))
                    }
                    value={managementCreateDraft.location}
                  />
                </label>
                <label>
                  <span>Capaciteit</span>
                  <input
                    onChange={(event) =>
                      setManagementCreateDraft((current) => ({
                        ...current,
                        capacity: event.target.value
                      }))
                    }
                    value={managementCreateDraft.capacity}
                    type="number"
                  />
                </label>
                <label>
                  <span>
                    <input
                      checked={managementCreateDraft.isAllDay}
                      onChange={(event) =>
                        setManagementCreateDraft((current) => ({
                          ...current,
                          isAllDay: event.target.checked
                        }))
                      }
                      type="checkbox"
                    />
                    Hele dag
                  </span>
                </label>
                <label>
                  <span>
                    <input
                      checked={managementCreateDraft.registrationOpen}
                      onChange={(event) =>
                        setManagementCreateDraft((current) => ({
                          ...current,
                          registrationOpen: event.target.checked
                        }))
                      }
                      type="checkbox"
                    />
                    Inschrijving staat open
                  </span>
                </label>
                <label>
                  <span>
                    <input
                      checked={managementCreateDraft.guestAccess}
                      onChange={(event) =>
                        setManagementCreateDraft((current) => ({
                          ...current,
                          guestAccess: event.target.checked
                        }))
                      }
                      type="checkbox"
                    />
                    Gasten mogen deelnemen
                  </span>
                </label>
                <div className="moment-detail-actions moment-detail-actions--role">
                  <button
                    disabled={
                      actionState.status === "running" ||
                      !managementCreateDraft.title.trim() ||
                      !managementCreateDraft.startsAt
                    }
                    type="submit"
                  >
                    Planningmoment aanmaken
                  </button>
                </div>
              </form>

              {managementEditDraft ? (
                <form
                  className="moment-detail-notes-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleUpdateMoment();
                  }}
                >
                  <h3>Bestaand moment beheren</h3>
                  <label>
                    <span>Titel</span>
                    <input
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                title: event.target.value
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.title}
                    />
                  </label>
                  <label>
                    <span>Beschrijving</span>
                    <textarea
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                description: event.target.value
                              }
                            : null
                        )
                      }
                      rows={3}
                      value={managementEditDraft.description}
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                status: event.target.value as EditableMomentStatus
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.status}
                    >
                      {EDITABLE_MOMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatStatus(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Categorie</span>
                    <select
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                categoryId: event.target.value
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.categoryId}
                    >
                      <option value="">Kies categorie</option>
                      {managementCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Owner groep</span>
                    <select
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                groupId: event.target.value
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.groupId}
                    >
                      <option value="">Kies owner-groep</option>
                      {managementGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Starttijd</span>
                    <input
                      type="datetime-local"
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                startsAt: event.target.value
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.startsAt}
                    />
                  </label>
                  <label>
                    <span>Eindtijd (optioneel)</span>
                    <input
                      type="datetime-local"
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                endsAt: event.target.value
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.endsAt}
                    />
                  </label>
                  <label>
                    <span>Locatie</span>
                    <input
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                location: event.target.value
                              }
                            : null
                        )
                      }
                      value={managementEditDraft.location}
                    />
                  </label>
                  <label>
                    <span>Capaciteit</span>
                    <input
                      onChange={(event) =>
                        setManagementEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                capacity: event.target.value
                              }
                            : null
                        )
                      }
                      type="number"
                      value={managementEditDraft.capacity}
                    />
                  </label>
                  <label>
                    <span>
                      <input
                        checked={managementEditDraft.isAllDay}
                        onChange={(event) =>
                          setManagementEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  isAllDay: event.target.checked
                                }
                              : null
                          )
                        }
                        type="checkbox"
                      />
                      Hele dag
                    </span>
                  </label>
                  <label>
                    <span>
                      <input
                        checked={managementEditDraft.registrationOpen}
                        onChange={(event) =>
                          setManagementEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  registrationOpen: event.target.checked
                                }
                              : null
                          )
                        }
                        type="checkbox"
                      />
                      Inschrijving staat open
                    </span>
                  </label>
                  <label>
                    <span>
                      <input
                        checked={managementEditDraft.guestAccess}
                        onChange={(event) =>
                          setManagementEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  guestAccess: event.target.checked
                                }
                              : null
                          )
                        }
                        type="checkbox"
                      />
                      Gasten mogen deelnemen
                    </span>
                  </label>
                  <div className="moment-detail-actions moment-detail-actions--role">
                    <button
                      disabled={
                        actionState.status === "running" ||
                        !canEditCurrentMoment ||
                        !managementEditDraft.title.trim() ||
                        !managementEditDraft.startsAt
                      }
                      type="submit"
                    >
                      Moment bijwerken
                    </button>
                    <button
                      onClick={async () => {
                        await handleArchiveMoment();
                      }}
                      disabled={actionState.status === "running"}
                      type="button"
                    >
                      Archiveren
                    </button>
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}

          <section
            className="moment-detail-participation-panel"
            aria-labelledby="moment-own-participation-heading"
          >
            <div>
              <p className="moment-detail-participation-panel__label">
                Jouw deelname
              </p>
              <h2 id="moment-own-participation-heading">
                {formatParticipationState(currentParticipation)}
              </h2>
              <p>
                Acties gebruiken de huidige Supabase Auth sessie, het gekoppelde
                SAM&ZO profiel en de bestaande RLS-regels.
              </p>
            </div>

            {activeProposal ? (
              <p className="moment-detail-action-note">
                Er is een open voorstel voor dit moment. Status:
                {` ${formatStatus(activeProposal.status)}.`}
              </p>
            ) : null}

            <dl className="moment-detail-participation-facts">
              <div>
                <dt>Profiel</dt>
                <dd>
                  {currentProfiel?.weergavenaam ??
                    "Geen actief gekoppeld profiel"}
                </dd>
              </div>
              <div>
                <dt>Deelnamestatus</dt>
                <dd>{formatParticipationState(currentParticipation)}</dd>
              </div>
              <div>
                <dt>Inschrijving</dt>
                <dd>
                  {detailState.detail.moment.registrationOpen
                    ? "Open"
                    : "Gesloten"}
                </dd>
              </div>
            </dl>

            {!detailState.context.authUser ? (
              <p className="moment-detail-action-note">
                Log in via beheer om je voor dit moment aan of af te melden.
              </p>
            ) : null}

            {detailState.context.authUser && !currentProfiel ? (
              <p className="moment-detail-action-note">
                Deze gebruiker heeft geen enkel actief gekoppeld profiel voor
                deelname-acties.
              </p>
            ) : null}

            {currentParticipation &&
            !isActiveParticipationStatus(currentParticipation.status) &&
            isBlockingParticipationStatus(currentParticipation.status) ? (
              <p className="moment-detail-action-note">
                Er is al een lopende deelname met status{" "}
                {formatStatus(currentParticipation.status)}. Deze eerste versie
                wijzigt die status nog niet.
              </p>
            ) : null}

            {currentProfiel &&
            !currentParticipation &&
            !detailState.detail.moment.registrationOpen ? (
              <p className="moment-detail-action-note">
                Aanmelden staat uit omdat de inschrijving voor dit moment
                gesloten is.
              </p>
            ) : null}

            <div className="moment-detail-actions">
              {canRegister ? (
                <button onClick={handleRegister} type="button">
                  Aanmelden
                </button>
              ) : null}
              {canUnregister && currentParticipation ? (
                <button
                  onClick={() => handleUnregister(currentParticipation.id)}
                  type="button"
                >
                  Afmelden
                </button>
              ) : null}
            </div>

            {hasActionableProposal ? (
              <div className="moment-detail-actions">
                <button
                  onClick={() => void handleAcceptProposal()}
                  disabled={actionState.status === "running"}
                  type="button"
                >
                  Voorstel accepteren
                </button>
                <button
                  onClick={() => void handleRejectProposal()}
                  disabled={actionState.status === "running"}
                  type="button"
                >
                  Voorstel afwijzen
                </button>
              </div>
            ) : null}

            {detailState.context.currentProfiel &&
            !canActOnCurrentProfile &&
            detailState.proposal ? (
              <p className="moment-detail-action-note moment-detail-action-note--error">
                Voorstelacties zijn tijdelijk alleen beschikbaar voor je eigen
                profiel.
              </p>
            ) : null}

            {actionState.message ? (
              <p
                className={
                  actionState.status === "error"
                    ? "moment-detail-action-message moment-detail-action-message--error"
                    : "moment-detail-action-message"
                }
                role="status"
              >
                {actionState.message}
              </p>
            ) : null}
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
            aria-labelledby="moment-lists-heading"
          >
            <h2 id="moment-lists-heading">Gekoppelde lijsten</h2>
            {detailState.linkedLists.length === 0 ? (
              <p className="moment-detail-empty">
                Geen gekoppelde lijsten zichtbaar voor deze sessie.
              </p>
            ) : (
              <div className="moment-detail-list">
                {detailState.linkedLists.map((list) => (
                  <article className="moment-detail-mini-card" key={list.id}>
                    <div className="moment-detail-mini-card__meta">
                      <span>{list.categoryName ?? "Lijst"}</span>
                      <span>{formatStatus(list.status)}</span>
                    </div>
                    <h3>{list.title}</h3>
                    {list.description ? <p>{list.description}</p> : null}
                    <dl className="lijsten-card__facts">
                      <div>
                        <dt>Taken</dt>
                        <dd>{list.taskCount}</dd>
                      </div>
                      <div>
                        <dt>Geclaimd</dt>
                        <dd>{list.claimedTaskCount}</dd>
                      </div>
                      <div>
                        <dt>Afgerond</dt>
                        <dd>{list.completedTaskCount}</dd>
                      </div>
                    </dl>
                    <Link
                      className="moment-detail-list-link"
                      href={`/lijsten/${list.id}`}
                    >
                      Open lijst
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="moment-detail-section"
            aria-labelledby="moment-participations-heading"
          >
            <h2 id="moment-participations-heading">Actieve deelnemers</h2>
            {regularActiveParticipants.length === 0 ? (
              <p className="moment-detail-empty">
                Geen actieve deelnemers zonder rol zichtbaar voor deze sessie.
              </p>
            ) : (
              <div className="moment-detail-list">
                {regularActiveParticipants.map((participation) => (
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
                {detailState.detail.roles.map((role) => {
                  const currentRoleOccupancy = currentProfiel
                    ? findCurrentRoleOccupancy(role, currentProfiel.id)
                    : null;
                  const activeOccupancies = getActiveRoleOccupancies(role);
                  const roleHasSpace = hasRoleSpace(role);
                  const roleClaimBlockedByParticipation =
                    hasRoleBlockingParticipation &&
                    currentRoleOccupancy?.status !== "actief";
                  const roleClaimNeedsActiveParticipation =
                    !hasActiveParticipation &&
                    !hasRoleBlockingParticipation &&
                    currentRoleOccupancy?.status !== "actief";
                  const canClaimRole =
                    detailState.context.persoon &&
                    currentProfiel &&
                    isRoleOpenForClaim(role) &&
                    roleHasSpace &&
                    currentRoleOccupancy?.status !== "actief" &&
                    hasActiveParticipation &&
                    !hasRoleBlockingParticipation &&
                    actionState.status !== "running";

                  return (
                    <article className="moment-detail-mini-card" key={role.id}>
                      <div className="moment-detail-mini-card__meta">
                        <span>{formatStatus(role.roleType)}</span>
                        <span>{formatStatus(role.status)}</span>
                      </div>
                      <h3>{role.title}</h3>
                      {role.description ? <p>{role.description}</p> : null}
                      <p>
                        Bezetting: {activeOccupancies.length} /{" "}
                        {role.maximumCount ?? "geen maximum"}
                      </p>
                      <p>
                        Nodig: {role.minimumCount}
                        {role.maximumCount
                          ? ` tot ${role.maximumCount}`
                          : " of meer"}
                      </p>

                      {currentRoleOccupancy?.status === "actief" ? (
                        <p className="moment-detail-role-note">
                          Jij hebt deze rol.
                        </p>
                      ) : null}

                      {!roleHasSpace ? (
                        <p className="moment-detail-role-note">
                          Deze rol is volgens de zichtbare bezetting gevuld.
                        </p>
                      ) : null}

                      {roleClaimBlockedByParticipation ? (
                        <p className="moment-detail-role-note">
                          {ROLE_BLOCKING_CLAIM_MESSAGE}
                        </p>
                      ) : null}

                      {roleClaimNeedsActiveParticipation ? (
                        <p className="moment-detail-role-note">
                          {ROLE_REQUIRES_ACTIVE_PARTICIPATION_MESSAGE}
                        </p>
                      ) : null}

                      {activeOccupancies.length === 0 ? (
                        <p className="moment-detail-empty">
                          Geen actieve bezetting zichtbaar.
                        </p>
                      ) : (
                        <ul className="moment-detail-occupancy-list">
                          {activeOccupancies.map((occupancy) => (
                            <li key={occupancy.id}>
                              <strong>{occupancy.profileName}</strong>
                              <span>{formatStatus(occupancy.status)}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {canClaimRole ? (
                        <div className="moment-detail-actions moment-detail-actions--role">
                          <button
                            onClick={() => handleClaimRole(role)}
                            type="button"
                          >
                            Rol claimen
                          </button>
                        </div>
                      ) : null}
                      {currentRoleOccupancy?.status === "actief" &&
                      actionState.status !== "running" ? (
                        <div className="moment-detail-actions moment-detail-actions--role">
                          <button
                            onClick={() =>
                              handleReleaseRole(role, currentRoleOccupancy)
                            }
                            type="button"
                          >
                            Rol vrijgeven
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="moment-detail-section"
            aria-labelledby="moment-begeleidingsnotities-heading"
          >
            <h2 id="moment-begeleidingsnotities-heading">
              Begeleidingsnotities
            </h2>
            <p className="moment-detail-action-note">
              Begeleidingsnotities zijn interne context-notities en geen
              documenten.
            </p>

            {canManageNotes ? (
              <form
                className="moment-detail-notes-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateBegeleidingsnotitie();
                }}
              >
                <label htmlFor="moment-note-content">
                  <span>Nieuwe begeleidingsnotitie</span>
                  <textarea
                    id="moment-note-content"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="Korte begeleidingsnotitie toevoegen..."
                    rows={4}
                  />
                </label>
                <div className="moment-detail-actions moment-detail-actions--role">
                  <button
                    type="submit"
                    disabled={
                      actionState.status === "running" ||
                      noteDraft.trim().length === 0
                    }
                  >
                    Notitie opslaan
                  </button>
                </div>
              </form>
            ) : null}

            {momentBegeleidingsnotities.length === 0 ? (
              <p className="moment-detail-empty">Geen actieve notities.</p>
            ) : (
              <div className="moment-detail-list">
                {momentBegeleidingsnotities.map((note) => {
                  const isEditing = editingNoteId === note.id;

                  return (
                    <article className="moment-detail-mini-card" key={note.id}>
                      <div className="moment-detail-mini-card__meta">
                        <span>Begeleiding</span>
                        <span>{formatStatus(note.status)}</span>
                      </div>
                      <p>{formatNoteDate(note.updatedAt)}</p>
                      {isEditing ? (
                        <label htmlFor={`edit-note-${note.id}`}>
                          <span>Notitie aanpassen</span>
                          <textarea
                            id={`edit-note-${note.id}`}
                            value={editingNoteDraft}
                            onChange={(event) =>
                              setEditingNoteDraft(event.target.value)
                            }
                            rows={4}
                          />
                        </label>
                      ) : (
                        <p>{note.inhoud}</p>
                      )}
                      {canManageNotes ? (
                        <div className="moment-detail-actions moment-detail-actions--role">
                          {!isEditing ? (
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteDraft(note.inhoud);
                              }}
                              type="button"
                            >
                              Bewerken
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => void handleUpdateBegeleidingsnotitie()}
                                disabled={actionState.status === "running"}
                                type="button"
                              >
                                Opslaan
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteDraft("");
                                }}
                                type="button"
                              >
                                Annuleren
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => void handleArchiveBegeleidingsnotitie(note.id)}
                            disabled={actionState.status === "running"}
                            type="button"
                          >
                            Archiveren
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
