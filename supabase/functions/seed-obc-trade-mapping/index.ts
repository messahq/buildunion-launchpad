import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// OBC Part 9 szekciók definíciója (tipikus szekciók építési kereskedésekhez)
const obcSections = [
  {
    part_number: 9,
    section_number: "9.1",
    section_title: "General Requirements",
    subsection_number: "9.1.1",
    content:
      "General requirements for buildings and facilities in accordance with this Part.",
  },
  {
    part_number: 9,
    section_number: "9.2",
    section_title: "Electrical Safety",
    subsection_number: "9.2.1",
    content: "Electrical installations shall be designed, constructed and maintained in conformance with the Canadian Electrical Code.",
  },
  {
    part_number: 9,
    section_number: "9.3",
    section_title: "Plumbing",
    subsection_number: "9.3.1",
    content:
      "Water supply, waste disposal and ventilation systems shall be installed in compliance with provincial plumbing code.",
  },
  {
    part_number: 9,
    section_number: "9.4",
    section_title: "Heating and Ventilation",
    subsection_number: "9.4.1",
    content:
      "Mechanical systems shall be designed to provide adequate heating, cooling and ventilation.",
  },
  {
    part_number: 9,
    section_number: "9.5",
    section_title: "Protection from Moisture",
    subsection_number: "9.5.1",
    content:
      "Buildings shall be constructed to protect against infiltration of moisture from exterior sources.",
  },
  {
    part_number: 9,
    section_number: "9.6",
    section_title: "Wood and Wood-based Products",
    subsection_number: "9.6.1",
    content:
      "Wood and wood-based products used in buildings shall meet specified standards and be properly treated.",
  },
  {
    part_number: 9,
    section_number: "9.7",
    section_title: "Fire-Resistance Ratings",
    subsection_number: "9.7.1",
    content:
      "Building components shall have fire-resistance ratings as required by the applicable provisions.",
  },
  {
    part_number: 9,
    section_number: "9.8",
    section_title: "Roofing and Roofing Assemblies",
    subsection_number: "9.8.1",
    content:
      "Roofs shall be constructed to prevent water leakage and provide adequate structural support.",
  },
  {
    part_number: 9,
    section_number: "9.9",
    section_title: "Interior Finishes",
    subsection_number: "9.9.1",
    content:
      "Interior finishes shall have flame-spread ratings and smoke development ratings as required.",
  },
  {
    part_number: 9,
    section_number: "9.10",
    section_title: "Accessibility",
    subsection_number: "9.10.1",
    content:
      "Buildings shall be designed and constructed to provide safe and independent access for persons with disabilities.",
  },
];

// Trade → OBC szekció mappingek
const tradeMappings = [
  // Electrician
  { trade_type: "electrician", section_numbers: ["9.2.1"], relevance_score: 1.0, required: true },
  // Plumber
  { trade_type: "plumber", section_numbers: ["9.3.1"], relevance_score: 1.0, required: true },
  // HVAC
  { trade_type: "hvac_technician", section_numbers: ["9.4.1"], relevance_score: 1.0, required: true },
  // Roofer
  { trade_type: "roofer", section_numbers: ["9.8.1"], relevance_score: 1.0, required: true },
  // Carpenter
  { trade_type: "carpenter", section_numbers: ["9.6.1", "9.7.1", "9.9.1"], relevance_score: 0.9, required: true },
  // Painter
  { trade_type: "painter", section_numbers: ["9.9.1", "9.5.1"], relevance_score: 0.7, required: false },
  // Mason
  { trade_type: "mason", section_numbers: ["9.5.1", "9.6.1", "9.7.1"], relevance_score: 0.85, required: true },
  // Drywall installer
  { trade_type: "drywall_installer", section_numbers: ["9.9.1", "9.7.1"], relevance_score: 0.8, required: false },
  // Concrete worker
  { trade_type: "concrete_worker", section_numbers: ["9.5.1", "9.7.1"], relevance_score: 0.75, required: true },
  // Flooring specialist
  { trade_type: "flooring_specialist", section_numbers: ["9.9.1", "9.5.1"], relevance_score: 0.7, required: false },
  // General contractor
  { trade_type: "general_contractor", section_numbers: ["9.1.1", "9.2.1", "9.3.1", "9.4.1", "9.5.1", "9.7.1"], relevance_score: 0.9, required: true },
  // Project manager
  { trade_type: "project_manager", section_numbers: ["9.1.1", "9.7.1"], relevance_score: 0.6, required: false },
  // Inspector
  { trade_type: "inspector", section_numbers: ["9.1.1", "9.2.1", "9.3.1", "9.4.1", "9.5.1", "9.6.1", "9.7.1", "9.8.1", "9.9.1", "9.10.1"], relevance_score: 1.0, required: true },
];

export const handler = async (req: Request): Promise<Response> => {
  try {
    // 1. OBC szekciók beinsertálása
    const { data: insertedSections, error: sectionError } = await supabase
      .from("obc_sections")
      .insert(obcSections)
      .select();

    if (sectionError) {
      console.error("OBC szekciók insertálásának hibája:", sectionError);
      return new Response(JSON.stringify({ error: "Failed to insert OBC sections", details: sectionError }), { status: 500 });
    }

    console.log(`${insertedSections.length} OBC szekció beinsertálva`);

    // 2. Trade mappingek beinsertálása
    const sectionMap: Record<string, string> = {};
    (insertedSections as any[]).forEach((section) => {
      sectionMap[section.section_number] = section.id;
    });

    const tradeInserts: any[] = [];
    tradeMappings.forEach((mapping) => {
      mapping.section_numbers.forEach((sectionNum) => {
        const sectionId = sectionMap[sectionNum];
        if (sectionId) {
          tradeInserts.push({
            trade_type: mapping.trade_type,
            obc_section_id: sectionId,
            relevance_score: mapping.relevance_score,
            required: mapping.required,
          });
        }
      });
    });

    const { data: insertedMappings, error: mappingError } = await supabase
      .from("trade_obc_mapping")
      .insert(tradeInserts)
      .select();

    if (mappingError) {
      console.error("Trade mappingek insertálásának hibája:", mappingError);
      return new Response(JSON.stringify({ error: "Failed to insert trade mappings", details: mappingError }), { status: 500 });
    }

    console.log(`${insertedMappings.length} trade→OBC mapping beinsertálva`);

    return new Response(
      JSON.stringify({
        success: true,
        sections_inserted: insertedSections.length,
        mappings_inserted: insertedMappings.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed függvény hibája:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error }), { status: 500 });
  }
};
