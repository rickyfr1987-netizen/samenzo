export const E2E_BROWSER_TEST_DATE = "2026-06-06";

export const e2eBrowserProfiles = {
  bas: {
    email: "bas.beheerder@example.test",
    profileName: "Bas Beheerder",
  },
  sanne: {
    email: "sanne.support@example.test",
    profileName: "Sanne Systeemondersteuner",
  },
  milan: {
    email: "milan.medewerker@example.test",
    profileName: "Milan Medewerker",
  },
  sam: {
    email: "sam.bewoner@example.test",
    profileName: "Sam Bewoner",
  },
  gijs: {
    email: "gijs.gast@example.test",
    profileName: "Gijs Gast",
  },
} as const;

export const e2eBrowserDataIds = {
  proposalMoment: "8e2e1000-0000-4000-8000-000000000001",
  proposalMomentGroup: "8e2e1100-0000-4000-8000-000000000001",
  proposalParticipation: "8e2e2000-0000-4000-8000-000000000001",
  proposal: "8e2e3000-0000-4000-8000-000000000001",
  supportQuestion: "8e2e4000-0000-4000-8000-000000000001",
  taskList: "8e2e5000-0000-4000-8000-000000000001",
  activeTask: "8e2e5100-0000-4000-8000-000000000001",
  claimableTask: "8e2e5100-0000-4000-8000-000000000002",
  activeTaskAssignee: "8e2e5200-0000-4000-8000-000000000001",
  taskListGroupResidents: "8e2e5300-0000-4000-8000-000000000001",
  taskListGroupStaff: "8e2e5300-0000-4000-8000-000000000002",
  roleMoment: "8e2e6000-0000-4000-8000-000000000001",
  roleMomentGroup: "8e2e1100-0000-4000-8000-000000000002",
  claimableRole: "8e2e6100-0000-4000-8000-000000000001",
  activeRole: "8e2e6100-0000-4000-8000-000000000002",
  activeRoleOccupancy: "8e2e6200-0000-4000-8000-000000000001",
  guestMoment: "8e2e7000-0000-4000-8000-000000000001",
  guestMomentGroup: "8e2e1100-0000-4000-8000-000000000003",
  guestParticipation: "8e2e7200-0000-4000-8000-000000000001",
  internalMomentHiddenForGuest: "8e2e7000-0000-4000-8000-000000000002",
  internalMomentGroup: "8e2e1100-0000-4000-8000-000000000004",
  samSignal: "8e2e8000-0000-4000-8000-000000000001",
  samTimelineSupport: "8e2e8100-0000-4000-8000-000000000001",
} as const;
