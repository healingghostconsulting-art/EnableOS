export type LibraryAssetSummary = {
  id: string;
  title: string;
  linkedRoles: string[];
  sourceKind: string;
  createdAt: string;
};

export type TargetDemographicGroup = {
  id: string;
  title: string;
  description: string;
  assets: LibraryAssetSummary[];
};

const TARGET_DEMOGRAPHIC_ORDER = ["learner", "coach", "manager", "executive", "client_admin", "all"] as const;

const TARGET_DEMOGRAPHIC_META: Record<(typeof TARGET_DEMOGRAPHIC_ORDER)[number], { title: string; description: string }> = {
  learner: {
    title: "Learner-ready assets",
    description: "Frontline guidance, practice material, and job-behavior support designed for learners.",
  },
  coach: {
    title: "Coach-ready assets",
    description: "Coaching aids, transfer prompts, and observation material designed for coach and supervisor workflows.",
  },
  manager: {
    title: "Manager-ready assets",
    description: "Operational governance, QA reinforcement, and coaching assets designed for managers.",
  },
  executive: {
    title: "Executive-ready assets",
    description: "Decision-support, portfolio-readiness, and ROI assets designed for executives.",
  },
  client_admin: {
    title: "Client-admin assets",
    description: "Governance, compliance, and tenant-administration assets designed for client administrators.",
  },
  all: {
    title: "Cross-audience assets",
    description: "Shared assets intentionally designed to work across multiple audiences or for all roles.",
  },
};

function normalizeRole(role: string) {
  return role === "all" ? "all" : role;
}

function getPrimaryTargetRole(linkedRoles: string[]) {
  const normalizedRoles = linkedRoles.map(normalizeRole);

  if (normalizedRoles.includes("all") || normalizedRoles.length > 1) {
    return "all" as const;
  }

  const matchedRole = TARGET_DEMOGRAPHIC_ORDER.find((role) => normalizedRoles.includes(role));
  return matchedRole ?? "all";
}

export function groupAssetsByTargetDemographic<T extends LibraryAssetSummary>(assets: T[]) {
  const seededGroups = TARGET_DEMOGRAPHIC_ORDER.map((role) => ({
    id: role,
    title: TARGET_DEMOGRAPHIC_META[role].title,
    description: TARGET_DEMOGRAPHIC_META[role].description,
    assets: [] as T[],
  }));

  for (const asset of assets) {
    const role = getPrimaryTargetRole(asset.linkedRoles);
    const targetGroup = seededGroups.find((group) => group.id === role);
    targetGroup?.assets.push(asset);
  }

  const sortedGroups = seededGroups
    .map((group) => ({
      ...group,
      assets: [...group.assets].sort((left, right) => left.title.localeCompare(right.title)),
    }))
    .filter((group) => group.assets.length > 0);

  return sortedGroups as TargetDemographicGroup[];
}
