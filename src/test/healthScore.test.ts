import { describe, it, expect } from "vitest";

// Inline pillar definitions to avoid jsdom/canvas dependency chain
// These mirror the exports from useProjectHealthScore.tsx
const DATA_SOURCE_PILLARS = [
  // 8 CORE PILLARS (Solo Mode)
  { id: 'work_type', citationType: 'WORK_TYPE', requiredInSoloMode: true, weight: 1 },
  { id: 'photos', citationType: 'SITE_PHOTO', requiredInSoloMode: true, weight: 1 },
  { id: 'documents_core', citationType: 'BLUEPRINT_UPLOAD', requiredInSoloMode: true, weight: 1 },
  { id: 'description', citationType: 'PROJECT_NAME', requiredInSoloMode: true, weight: 1 },
  { id: 'data_source', citationType: 'GFA_LOCK', requiredInSoloMode: true, weight: 1.5 },
  { id: 'timeline', citationType: 'TIMELINE', requiredInSoloMode: true, weight: 1 },
  { id: 'mode', citationType: 'DNA_FINALIZED', requiredInSoloMode: true, weight: 1 },
  { id: 'ai_analysis', citationType: 'TEMPLATE_LOCK', requiredInSoloMode: true, weight: 1.5 },
  // 8 TEAM PILLARS (Team Mode Only)
  { id: 'trades', citationType: 'TRADE_SELECTION', requiredInSoloMode: false, weight: 1 },
  { id: 'team_members', citationType: 'TEAM_STRUCTURE', requiredInSoloMode: false, weight: 1 },
  { id: 'tasks', citationType: 'TASK', requiredInSoloMode: false, weight: 1 },
  { id: 'contracts', citationType: 'CONTRACT', requiredInSoloMode: false, weight: 1 },
  { id: 'client_info', citationType: 'CLIENT', requiredInSoloMode: false, weight: 1 },
  { id: 'site_map', citationType: 'LOCATION', requiredInSoloMode: false, weight: 1 },
  { id: 'documents_team', citationType: 'DOCUMENT', requiredInSoloMode: false, weight: 1 },
  { id: 'weather', citationType: 'WEATHER', requiredInSoloMode: false, weight: 0.5 },
];

// Replicate health score calculation logic
function calculateHealthScore(
  citations: { cite_type: string }[],
  teamMemberCount: number,
) {
  const isSoloMode = teamMemberCount === 0;
  const relevantPillars = isSoloMode
    ? DATA_SOURCE_PILLARS.filter(p => p.requiredInSoloMode)
    : DATA_SOURCE_PILLARS;

  let totalWeight = 0;
  let completedWeight = 0;

  for (const pillar of relevantPillars) {
    totalWeight += pillar.weight;
    if (citations.some(c => c.cite_type === pillar.citationType)) {
      completedWeight += pillar.weight;
    }
  }

  return {
    score: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0,
    totalCount: relevantPillars.length,
    isSoloMode,
  };
}

describe("Health Score - Pillar Architecture", () => {
  it("should have exactly 8 Solo-mode pillars", () => {
    const soloPillars = DATA_SOURCE_PILLARS.filter(p => p.requiredInSoloMode);
    expect(soloPillars).toHaveLength(8);
  });

  it("should have exactly 8 Team-only pillars", () => {
    const teamOnlyPillars = DATA_SOURCE_PILLARS.filter(p => !p.requiredInSoloMode);
    expect(teamOnlyPillars).toHaveLength(8);
  });

  it("should have 16 total pillars", () => {
    expect(DATA_SOURCE_PILLARS).toHaveLength(16);
  });

  it("GFA_LOCK and TEMPLATE_LOCK should have higher weight (1.5)", () => {
    const gfa = DATA_SOURCE_PILLARS.find(p => p.citationType === "GFA_LOCK");
    const template = DATA_SOURCE_PILLARS.find(p => p.citationType === "TEMPLATE_LOCK");
    expect(gfa!.weight).toBe(1.5);
    expect(template!.weight).toBe(1.5);
  });

  it("Team-only pillars should include contracts, team_members, tasks", () => {
    const teamPillarIds = DATA_SOURCE_PILLARS.filter(p => !p.requiredInSoloMode).map(p => p.id);
    expect(teamPillarIds).toContain("contracts");
    expect(teamPillarIds).toContain("team_members");
    expect(teamPillarIds).toContain("tasks");
  });
});

describe("Health Score - Solo Mode Calculation", () => {
  it("Solo mode should count from 8 pillars only", () => {
    const result = calculateHealthScore([], 0);
    expect(result.totalCount).toBe(8);
    expect(result.isSoloMode).toBe(true);
  });

  it("Solo mode 100% when all 8 core citations present", () => {
    const allCoreCitations = DATA_SOURCE_PILLARS
      .filter(p => p.requiredInSoloMode)
      .map(p => ({ cite_type: p.citationType }));
    const result = calculateHealthScore(allCoreCitations, 0);
    expect(result.score).toBe(100);
  });

  it("Solo mode should ignore team-only citations", () => {
    const teamCitations = [{ cite_type: "CONTRACT" }, { cite_type: "TEAM_STRUCTURE" }];
    const result = calculateHealthScore(teamCitations, 0);
    expect(result.score).toBe(0); // these don't count in Solo
  });

  it("Solo mode partial completion calculates correctly", () => {
    // GFA_LOCK (1.5) + WORK_TYPE (1) = 2.5 / 9 total = 28%
    const partial = [{ cite_type: "GFA_LOCK" }, { cite_type: "WORK_TYPE" }];
    const result = calculateHealthScore(partial, 0);
    expect(result.score).toBe(28); // Math.round(2.5/9 * 100)
  });
});

describe("Health Score - Team Mode Calculation", () => {
  it("Team mode should count from all 16 pillars", () => {
    const result = calculateHealthScore([], 3);
    expect(result.totalCount).toBe(16);
    expect(result.isSoloMode).toBe(false);
  });

  it("Team mode 100% when all 16 citations present", () => {
    const allCitations = DATA_SOURCE_PILLARS.map(p => ({ cite_type: p.citationType }));
    const result = calculateHealthScore(allCitations, 5);
    expect(result.score).toBe(100);
  });

  it("Team mode with only core citations should be ~58%", () => {
    const coreCitations = DATA_SOURCE_PILLARS
      .filter(p => p.requiredInSoloMode)
      .map(p => ({ cite_type: p.citationType }));
    const result = calculateHealthScore(coreCitations, 3);
    // 9 / 15.5 = 58%
    expect(result.score).toBe(58);
  });
});

describe("Health Score - Weighted Totals", () => {
  it("Solo mode total weight = 9 (6×1 + 2×1.5)", () => {
    const soloWeight = DATA_SOURCE_PILLARS
      .filter(p => p.requiredInSoloMode)
      .reduce((sum, p) => sum + p.weight, 0);
    expect(soloWeight).toBe(9);
  });

  it("Team mode total weight = 15.5 (9 + 6×1 + 0.5)", () => {
    const totalWeight = DATA_SOURCE_PILLARS.reduce((sum, p) => sum + p.weight, 0);
    expect(totalWeight).toBe(15.5);
  });
});
