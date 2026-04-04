/**
 * Demo Project — "1302 sqft Toronto Duplex Renovation"
 * 100% static mock data. Zero API calls, zero DB queries.
 * Includes a deliberate CONFLICT example in Electrical trade.
 */

export const DEMO_PROJECT = {
  basics: {
    name: "1302 sqft Toronto Duplex Renovation",
    address: "123 Queen St W, Toronto, ON M5H 2M9",
    trade: "General Renovation",
    trades: ["Plumbing", "Electrical"],
    status: "active",
    description: "Full interior renovation of a 1920s duplex. Kitchen, bathroom, and living area modernization with code-compliant electrical upgrade.",
  },

  gfa: {
    totalArea: 1302,
    unit: "sqft",
    zones: [
      { name: "Kitchen", area: 320, color: "#22c55e" },
      { name: "Bathroom", area: 182, color: "#3b82f6" },
      { name: "Living Room", area: 800, color: "#a855f7" },
    ],
  },

  /**
   * MATERIALS & LABOR — includes the CONFLICT example
   * The Electrical trade has a deliberate over-budget item:
   *   Panel Upgrade: budget was 1 unit × $2,800, but the electrician
   *   logged 1 unit × $4,200 → $1,400 overage → RED conflict flag
   */
  materials: [
    // Plumbing — all green ✅
    {
      id: "mat-1",
      trade: "Plumbing",
      item: "Kitchen Faucet (Moen Align)",
      quantity: 1,
      unitPrice: 389,
      total: 389,
      budgetTotal: 389,
      status: "verified" as const,
    },
    {
      id: "mat-2",
      trade: "Plumbing",
      item: "Bathroom Vanity Faucet",
      quantity: 1,
      unitPrice: 249,
      total: 249,
      budgetTotal: 249,
      status: "verified" as const,
    },
    {
      id: "mat-3",
      trade: "Plumbing",
      item: "PEX Piping (½″)",
      quantity: 120,
      unitPrice: 3.5,
      total: 420,
      budgetTotal: 420,
      status: "verified" as const,
    },
    {
      id: "mat-4",
      trade: "Plumbing",
      item: "Shut-off Valves",
      quantity: 8,
      unitPrice: 18,
      total: 144,
      budgetTotal: 144,
      status: "verified" as const,
    },
    // Electrical — contains CONFLICT ⚠️🔴
    {
      id: "mat-5",
      trade: "Electrical",
      item: "200A Panel Upgrade",
      quantity: 1,
      unitPrice: 4200,
      total: 4200,
      budgetTotal: 2800,
      status: "conflict" as const,
      conflictDetail: {
        budgetedPrice: 2800,
        loggedPrice: 4200,
        overage: 1400,
        overagePercent: 50,
        flaggedBy: "System — Operational Truth Engine",
        reason: "Electrician logged $4,200 for 200A panel upgrade. Original budget was $2,800. Variance exceeds 15% threshold → auto-flagged.",
        citation: "[C:MAT-5] Conflict detected: unit_price $4,200 ≠ budget $2,800 (Δ+50%)",
      },
    },
    {
      id: "mat-6",
      trade: "Electrical",
      item: "14/2 NMD90 Wire (150m)",
      quantity: 3,
      unitPrice: 89,
      total: 267,
      budgetTotal: 267,
      status: "verified" as const,
    },
    {
      id: "mat-7",
      trade: "Electrical",
      item: "LED Pot Lights (4″ slim)",
      quantity: 12,
      unitPrice: 24,
      total: 288,
      budgetTotal: 288,
      status: "verified" as const,
    },
    {
      id: "mat-8",
      trade: "Electrical",
      item: "GFCI Outlets",
      quantity: 6,
      unitPrice: 32,
      total: 192,
      budgetTotal: 192,
      status: "verified" as const,
    },
    // More plumbing
    {
      id: "mat-9",
      trade: "Plumbing",
      item: "P-Trap Assembly",
      quantity: 3,
      unitPrice: 22,
      total: 66,
      budgetTotal: 66,
      status: "verified" as const,
    },
    {
      id: "mat-10",
      trade: "Electrical",
      item: "Arc Fault Breakers",
      quantity: 8,
      unitPrice: 45,
      total: 360,
      budgetTotal: 360,
      status: "verified" as const,
    },
  ],

  team: [
    { role: "Owner", name: "Demo Owner", initials: "DO" },
    { role: "Foreman", name: "Mike Torres", initials: "MT" },
    { role: "Worker", name: "Alex Chen", initials: "AC" },
    { role: "Worker", name: "Raj Patel", initials: "RP" },
  ],

  timeline: {
    startDate: "2026-04-01",
    endDate: "2026-04-18",
    weeks: 3,
    phases: [
      { name: "Demolition", start: "2026-04-01", end: "2026-04-02", progress: 100 },
      { name: "Rough-in (Plumbing)", start: "2026-04-03", end: "2026-04-04", progress: 100 },
      { name: "Rough-in (Electrical)", start: "2026-04-03", end: "2026-04-07", progress: 85 },
      { name: "Insulation & Drywall", start: "2026-04-07", end: "2026-04-10", progress: 60 },
      { name: "Finish (Kitchen)", start: "2026-04-11", end: "2026-04-15", progress: 0 },
      { name: "Finish (Bathroom)", start: "2026-04-15", end: "2026-04-17", progress: 0 },
      { name: "Final Inspection", start: "2026-04-18", end: "2026-04-18", progress: 0 },
    ],
  },

  engineScores: {
    gemini: { label: "Visual Intelligence", score: "3 site photos analyzed", icon: "gemini" },
    gpt: { label: "Data Audit", score: "94% verified", icon: "gpt" },
    claude: { label: "OBC Compliance", score: "Div B §9.34 — OK", icon: "claude" },
    lovable: { label: "DNA Integrity", score: "97.2%", icon: "lovable" },
    grok: { label: "Market Pricing", score: "Panel ↑12% YoY", icon: "grok" },
  },

  financialSummary: {
    materialCost: 6375,
    laborCost: 8400,
    totalBudget: 14775,
    totalLogged: 16175,
    variance: 1400,
    variancePercent: 9.5,
    conflictCount: 1,
  },
};

export type DemoMaterial = (typeof DEMO_PROJECT.materials)[number];
