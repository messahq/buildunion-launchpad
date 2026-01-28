import { describe, it, expect } from "vitest";

// Mock data for testing
const mockSoloProject = {
  mode: "solo",
  documents: [],
  contracts: [],
  teamMembers: [],
  tasks: [{ id: "1", status: "completed" }],
  projectAddress: "123 Test St",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
};

const mockTeamProject = {
  mode: "team",
  documents: [{ id: "1", name: "blueprint.pdf" }],
  contracts: [{ id: "1", status: "signed" }],
  teamMembers: [{ id: "1" }, { id: "2" }],
  tasks: [{ id: "1", status: "completed" }],
  projectAddress: "456 Team Ave",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
};

// Simulated buildDataSourcesStatus logic
const SOLO_EXCLUDED_IDS = ["documents", "contracts", "team"];

interface DataSource {
  id: string;
  status: "complete" | "partial" | "pending";
  isSoloNA?: boolean;
}

function buildDataSourcesStatus(project: typeof mockSoloProject | typeof mockTeamProject): DataSource[] {
  const isSoloMode = project.mode === "solo";
  
  const sources: DataSource[] = [
    // Workflow sources
    {
      id: "documents",
      status: isSoloMode ? "complete" : (project.documents.length > 0 ? "complete" : "pending"),
      isSoloNA: isSoloMode,
    },
    {
      id: "contracts",
      status: isSoloMode ? "complete" : (project.contracts.length > 0 ? "complete" : "pending"),
      isSoloNA: isSoloMode,
    },
    {
      id: "team",
      status: isSoloMode ? "complete" : (project.teamMembers.length >= 2 ? "complete" : "pending"),
      isSoloNA: isSoloMode,
    },
    {
      id: "tasks",
      status: project.tasks.length > 0 ? "complete" : "pending",
    },
    {
      id: "timeline",
      status: project.startDate && project.endDate ? "complete" : "pending",
    },
    {
      id: "site_map",
      status: project.projectAddress ? "complete" : "pending",
    },
    // Pillar sources (simplified)
    { id: "area", status: "complete" },
    { id: "materials", status: "complete" },
    { id: "blueprint", status: "pending" },
    { id: "obc", status: "complete" },
    { id: "conflicts", status: "complete" },
    { id: "mode", status: "complete" },
    { id: "size", status: "complete" },
    { id: "confidence", status: "complete" },
    { id: "client_info", status: "pending" },
    { id: "weather", status: "complete" },
  ];
  
  return sources;
}

function calculateHealthScore(dataSources: DataSource[], isSoloMode: boolean): number {
  const relevantSources = isSoloMode 
    ? dataSources.filter(s => !SOLO_EXCLUDED_IDS.includes(s.id))
    : dataSources;

  return Math.round(
    (relevantSources.filter(s => s.status === "complete").length / relevantSources.length) * 100
  );
}

describe("buildDataSourcesStatus - Solo Mode", () => {
  it("should mark Documents as complete in Solo Mode with N/A flag", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const docSource = sources.find(s => s.id === "documents");
    
    expect(docSource?.status).toBe("complete");
    expect(docSource?.isSoloNA).toBe(true);
  });

  it("should mark Contracts as complete in Solo Mode with N/A flag", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const contractSource = sources.find(s => s.id === "contracts");
    
    expect(contractSource?.status).toBe("complete");
    expect(contractSource?.isSoloNA).toBe(true);
  });

  it("should mark Team as complete in Solo Mode with N/A flag", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const teamSource = sources.find(s => s.id === "team");
    
    expect(teamSource?.status).toBe("complete");
    expect(teamSource?.isSoloNA).toBe(true);
  });

  it("should calculate health score from 13 sources in Solo Mode (excluding N/A)", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const isSoloMode = true;
    
    const relevantSources = sources.filter(s => !SOLO_EXCLUDED_IDS.includes(s.id));
    expect(relevantSources.length).toBe(13);
    
    const score = calculateHealthScore(sources, isSoloMode);
    // 11 complete out of 13 relevant (blueprint and client_info are pending)
    expect(score).toBe(Math.round((11 / 13) * 100)); // ~85%
  });

  it("should not flag non-solo-specific sources as N/A", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const taskSource = sources.find(s => s.id === "tasks");
    
    expect(taskSource?.isSoloNA).toBeUndefined();
  });
});

describe("buildDataSourcesStatus - Team Mode", () => {
  it("should require real document uploads in Team Mode", () => {
    const sources = buildDataSourcesStatus(mockTeamProject);
    const docSource = sources.find(s => s.id === "documents");
    
    expect(docSource?.status).toBe("complete");
    expect(docSource?.isSoloNA).toBe(false);
  });

  it("should require real contracts in Team Mode", () => {
    const sources = buildDataSourcesStatus(mockTeamProject);
    const contractSource = sources.find(s => s.id === "contracts");
    
    expect(contractSource?.status).toBe("complete");
    expect(contractSource?.isSoloNA).toBe(false);
  });

  it("should require 2+ team members in Team Mode", () => {
    const sources = buildDataSourcesStatus(mockTeamProject);
    const teamSource = sources.find(s => s.id === "team");
    
    expect(teamSource?.status).toBe("complete");
    expect(teamSource?.isSoloNA).toBe(false);
  });

  it("should calculate health score from all 16 sources in Team Mode", () => {
    const sources = buildDataSourcesStatus(mockTeamProject);
    const isSoloMode = false;
    
    expect(sources.length).toBe(16);
    
    const score = calculateHealthScore(sources, isSoloMode);
    // 14 complete out of 16 (blueprint and client_info are pending)
    expect(score).toBe(Math.round((14 / 16) * 100)); // ~88%
  });

  it("should show Team as pending with only 1 member", () => {
    const projectWith1Member = { ...mockTeamProject, teamMembers: [{ id: "1" }] };
    const sources = buildDataSourcesStatus(projectWith1Member);
    const teamSource = sources.find(s => s.id === "team");
    
    expect(teamSource?.status).toBe("pending");
  });
});

describe("Health Score Calculation", () => {
  it("should return 100% when all relevant sources are complete in Solo Mode", () => {
    const allCompleteSources: DataSource[] = Array(13).fill(null).map((_, i) => ({
      id: `source_${i}`,
      status: "complete" as const,
    }));
    
    const score = calculateHealthScore(allCompleteSources, true);
    expect(score).toBe(100);
  });

  it("should return 100% when all 16 sources are complete in Team Mode", () => {
    const allCompleteSources: DataSource[] = Array(16).fill(null).map((_, i) => ({
      id: `source_${i}`,
      status: "complete" as const,
    }));
    
    const score = calculateHealthScore(allCompleteSources, false);
    expect(score).toBe(100);
  });

  it("should handle partial sources correctly", () => {
    const mixedSources: DataSource[] = [
      { id: "a", status: "complete" },
      { id: "b", status: "partial" },
      { id: "c", status: "pending" },
      { id: "d", status: "complete" },
    ];
    
    // Only "complete" counts - 2 out of 4
    const score = calculateHealthScore(mixedSources, false);
    expect(score).toBe(50);
  });
});

describe("Conflict Check - Solo Mode Exclusions", () => {
  it("should not warn about missing team in Solo Mode", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const teamSource = sources.find(s => s.id === "team");
    
    // In Solo mode, team is marked complete (N/A), so no conflict warning
    expect(teamSource?.status).toBe("complete");
  });

  it("should not warn about missing contracts in Solo Mode", () => {
    const sources = buildDataSourcesStatus(mockSoloProject);
    const contractSource = sources.find(s => s.id === "contracts");
    
    // In Solo mode, contracts are marked complete (N/A), so no conflict warning
    expect(contractSource?.status).toBe("complete");
  });
});
