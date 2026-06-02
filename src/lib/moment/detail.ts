import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { Tables } from "@/src/lib/database.types";

type MomentDetailRow = Pick<
  Tables<"momenten">,
  | "id"
  | "titel"
  | "beschrijving"
  | "start_at"
  | "eind_at"
  | "hele_dag"
  | "locatie"
  | "status"
  | "capaciteit"
  | "inschrijving_open"
> & {
  categorieen: Pick<Tables<"categorieen">, "naam"> | null;
};

type MomentGroupRow = Pick<
  Tables<"moment_groepen">,
  "id" | "context_type"
> & {
  groepen:
    | Pick<Tables<"groepen">, "id" | "naam" | "zichtbaarheid" | "status">
    | null;
};

type DeelnameRow = Pick<Tables<"deelnames">, "id" | "status"> & {
  profielen: Pick<Tables<"profielen">, "id" | "weergavenaam" | "status"> | null;
};

type MomentRolRow = Pick<
  Tables<"momentrollen">,
  | "id"
  | "titel"
  | "omschrijving"
  | "roltype"
  | "status"
  | "minimum_aantal"
  | "maximum_aantal"
> & {
  rolbezettingen:
    | (Pick<Tables<"rolbezettingen">, "id" | "status"> & {
        profielen:
          | Pick<Tables<"profielen">, "id" | "weergavenaam" | "status">
          | null;
      })[]
    | null;
};

export type MomentDetail = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isAllDay: boolean;
  location: string | null;
  status: Tables<"momenten">["status"];
  capacity: number | null;
  registrationOpen: boolean;
  categoryName: string | null;
};

export type MomentDetailGroup = {
  id: string;
  name: string;
  contextType: string | null;
  visibility: Tables<"groepen">["zichtbaarheid"];
  status: Tables<"groepen">["status"];
};

export type MomentDetailParticipation = {
  id: string;
  profileName: string;
  profileStatus: Tables<"profielen">["status"] | null;
  status: Tables<"deelnames">["status"];
};

export type MomentDetailRole = {
  id: string;
  title: string;
  description: string | null;
  roleType: Tables<"momentrollen">["roltype"];
  status: Tables<"momentrollen">["status"];
  minimumCount: number;
  maximumCount: number | null;
  occupancies: {
    id: string;
    profileName: string;
    profileStatus: Tables<"profielen">["status"] | null;
    status: Tables<"rolbezettingen">["status"];
  }[];
};

export type MomentDetailData = {
  moment: MomentDetail | null;
  groups: MomentDetailGroup[];
  participations: MomentDetailParticipation[];
  roles: MomentDetailRole[];
};

export async function fetchMomentDetail(
  momentId: string
): Promise<MomentDetailData> {
  const supabase = getSupabaseBrowserClient();

  const { data: moment, error: momentError } = await supabase
    .from("momenten")
    .select(
      `
        id,
        titel,
        beschrijving,
        start_at,
        eind_at,
        hele_dag,
        locatie,
        status,
        capaciteit,
        inschrijving_open,
        categorieen (
          naam
        )
      `
    )
    .eq("id", momentId)
    .maybeSingle();

  if (momentError) {
    throw new Error(momentError.message);
  }

  if (!moment) {
    return {
      moment: null,
      groups: [],
      participations: [],
      roles: []
    };
  }

  const [groupsResult, participationsResult, rolesResult] = await Promise.all([
    supabase
      .from("moment_groepen")
      .select(
        `
          id,
          context_type,
          groepen (
            id,
            naam,
            zichtbaarheid,
            status
          )
        `
      )
      .eq("moment_id", momentId),
    supabase
      .from("deelnames")
      .select(
        `
          id,
          status,
          profielen!deelnames_profiel_id_fkey (
            id,
            weergavenaam,
            status
          )
        `
      )
      .eq("moment_id", momentId),
    supabase
      .from("momentrollen")
      .select(
        `
          id,
          titel,
          omschrijving,
          roltype,
          status,
          minimum_aantal,
          maximum_aantal,
          rolbezettingen (
            id,
            status,
            profielen (
              id,
              weergavenaam,
              status
            )
          )
        `
      )
      .eq("moment_id", momentId)
  ]);

  if (groupsResult.error) {
    throw new Error(groupsResult.error.message);
  }

  if (participationsResult.error) {
    throw new Error(participationsResult.error.message);
  }

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  return {
    moment: mapMoment(moment as MomentDetailRow),
    groups: ((groupsResult.data ?? []) as MomentGroupRow[])
      .filter((group) => group.groepen)
      .map((group) => ({
        id: group.groepen!.id,
        name: group.groepen!.naam,
        contextType: group.context_type,
        visibility: group.groepen!.zichtbaarheid,
        status: group.groepen!.status
      })),
    participations: ((participationsResult.data ?? []) as DeelnameRow[]).map(
      (participation) => ({
        id: participation.id,
        profileName: participation.profielen?.weergavenaam ?? "Onbekend profiel",
        profileStatus: participation.profielen?.status ?? null,
        status: participation.status
      })
    ),
    roles: ((rolesResult.data ?? []) as MomentRolRow[]).map((role) => ({
      id: role.id,
      title: role.titel ?? `Rol: ${role.roltype}`,
      description: role.omschrijving,
      roleType: role.roltype,
      status: role.status,
      minimumCount: role.minimum_aantal,
      maximumCount: role.maximum_aantal,
      occupancies: (role.rolbezettingen ?? []).map((occupancy) => ({
        id: occupancy.id,
        profileName: occupancy.profielen?.weergavenaam ?? "Onbekend profiel",
        profileStatus: occupancy.profielen?.status ?? null,
        status: occupancy.status
      }))
    }))
  };
}

function mapMoment(moment: MomentDetailRow): MomentDetail {
  return {
    id: moment.id,
    title: moment.titel,
    description: moment.beschrijving,
    startsAt: moment.start_at,
    endsAt: moment.eind_at,
    isAllDay: moment.hele_dag,
    location: moment.locatie,
    status: moment.status,
    capacity: moment.capaciteit,
    registrationOpen: moment.inschrijving_open,
    categoryName: moment.categorieen?.naam ?? null
  };
}
