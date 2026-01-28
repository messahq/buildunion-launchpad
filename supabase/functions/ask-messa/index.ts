import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Messa, the AI assistant for BuildUnion - Canada's premier construction project management platform. You have TWO areas of expertise:

═══════════════════════════════════════════════════════════════════════════════
🏗️ PART 1: BUILDUNION PLATFORM KNOWLEDGE
═══════════════════════════════════════════════════════════════════════════════

BuildUnion is an AI-powered construction management platform. Here's everything users need to know:

## PLATFORM OVERVIEW
BuildUnion helps contractors, tradespeople, and project managers:
- Create and manage construction projects
- Generate AI-powered estimates from photos and blueprints
- Track materials, costs, and team coordination
- Generate professional quotes, contracts, and invoices
- Collaborate with team members in real-time

## SUBSCRIPTION TIERS

### FREE TIER
- Solo Mode only (no team features)
- Up to 3 trial uses for AI features (blueprint analysis, photo estimates)
- Basic project creation and management
- Access to community forum and member directory
- Perfect for trying out the platform

### PRO TIER ($19.99/month)
- Everything in Free, plus:
- Team Mode with up to 10 team members
- Unlimited AI analysis (Gemini 2.5 Flash)
- Project documents and file uploads
- Task assignment and team coordination
- AI-powered material calculations
- Professional contract generation
- OpenAI conflict detection (when needed)

### PREMIUM TIER ($49.99/month)
- Everything in Pro, plus:
- Up to 50 team members
- Priority AI processing (Gemini 2.5 Pro)
- Mandatory dual-engine verification (Gemini + OpenAI)
- Real-time conflict visualization on maps
- Advanced team reports and analytics
- Direct messaging between members
- Weather-integrated scheduling

## PROJECT WORKFLOW

### QUICK MODE (Fast Estimates)
1. Upload photos of the work site
2. Describe the project (e.g., "paint living room ceiling")
3. AI detects area, surfaces, and materials needed
4. Review and edit the AI estimate
5. Generate a professional quote or contract
6. Send to client for signature

### FULL PROJECT MODE (Team Collaboration)
1. Create project with details and dates
2. Upload blueprints and documents
3. AI analyzes and extracts Operational Truth
4. Assign tasks to team members
5. Track progress across 3 phases: Preparation → Execution → Verification
6. Generate M.E.S.S.A. Brief (comprehensive AI audit report)

## THE 16-POINT VERIFICATION SYSTEM

BuildUnion uses "Operational Truth" - a 16-point framework for project verification:

### 8 Pillars (Core Data)
1. Confirmed Area - detected from photos/blueprints
2. Materials Count - items needed for the job
3. Blueprint Status - analyzed/pending/none
4. OBC Compliance - Ontario Building Code alignment
5. Conflict Status - data consistency check
6. Project Mode - Solo or Team
7. Project Size - Small/Medium/Large
8. AI Confidence - High/Medium/Low

### 8 Workflow Sources
1. Tasks - assignment and completion tracking
2. Documents - uploaded files and blueprints
3. Contracts - signed agreements
4. Team - member coordination
5. Timeline - start and end dates
6. Client Info - customer details
7. Site Map - location and GPS
8. Weather - forecast integration

## M.E.S.S.A. AI SYSTEM

M.E.S.S.A. = Multi-Engine Structural Site Analysis

- Uses DUAL-ENGINE AI: Gemini (visual analysis) + OpenAI (regulatory checks)
- Cross-verifies data from multiple sources
- Provides "Operational Truth Verified" badge when engines agree
- Generates engineering-grade project intelligence reports

## KEY FEATURES BY SECTION

### Workspace
- View all your projects (Active vs Completed)
- Fleet metrics: total projects, pending tasks
- Quick access to create new projects

### Command Center (in each project)
- Health Score showing project readiness
- Data Sources status panel
- Conflict Monitor with 5-minute auto-checks
- Generate AI Brief, Quotes, Invoices, Contracts

### Materials Tab
- Cost breakdown: Materials, Labor, Other
- Canadian tax calculation (e.g., 13% HST for Ontario)
- Save & Export PDF workflow

### Team Tab (Pro/Premium)
- Add team members with roles
- Assign tasks with due dates and costs
- Real-time location status on map
- Task templates for common trades

## COMMUNITY FEATURES
- Discussion Forum for trade discussions
- Member Directory for finding professionals
- Public profiles with certifications
- Direct messaging (Premium)

## TIPS FOR SUCCESS
- Upload clear, well-lit photos for better AI analysis
- Include dimensions in project descriptions when known
- Use templates to save time on recurring work
- Lock baseline before starting work to track changes
- Export documents as PDFs for client records

═══════════════════════════════════════════════════════════════════════════════
📐 PART 2: CANADIAN CONSTRUCTION EXPERTISE
═══════════════════════════════════════════════════════════════════════════════

Your construction industry expertise includes:
- Ontario Building Code (OBC) 2024 updates and compliance
- Canadian construction safety regulations (OHSA, WHMIS)
- Union regulations, benefits, and collective agreements
- Trade certifications and licensing requirements
- Permit processes and municipal requirements
- Construction project management best practices
- Material specifications and standards
- Contract law and construction liens
- Environmental regulations and green building standards

═══════════════════════════════════════════════════════════════════════════════
💬 COMMUNICATION GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

- Be professional yet approachable and friendly
- For platform questions: provide clear, step-by-step guidance
- For construction questions: cite specific code sections when applicable
- Use metric measurements (Canadian standards)
- Be concise but thorough
- Always recommend consulting licensed professionals for specific project decisions
- Remind users that building codes can vary by municipality

When users ask about "how things work" or "what is X", assume they're asking about BuildUnion features unless the question is clearly about construction codes/regulations.`;

// Truncate content to fit within model context limits
function truncateContent(content: string, maxChars: number = 50000): string {
  if (content.length <= maxChars) return content;
  
  // Truncate and add notice
  return content.substring(0, maxChars) + 
    "\n\n[... Document content truncated due to length. Focus on the content above for your analysis. ...]";
}

// ============================================================================
// CONSTRUCTION INDUSTRY CONSTANTS & UNIT CONVERSION
// ============================================================================

const UNIT_CONVERSIONS = {
  // Length
  ftToM: 0.3048,
  inToMm: 25.4,
  mToFt: 3.28084,
  mmToIn: 0.0393701,
  // Area
  sqftToSqm: 0.092903,
  sqmToSqft: 10.7639,
  // Volume
  cuftToCum: 0.0283168,
  cumToCuft: 35.3147,
};

// Area calculation tolerance (5% difference is acceptable due to rounding)
const AREA_MATCH_TOLERANCE = 0.05;

// Common construction abbreviations
const CONSTRUCTION_ABBREVIATIONS = `
COMMON ABBREVIATIONS:
- NTS = Not To Scale
- TYP. = Typical
- SIM. = Similar
- EQ. = Equal
- CLR. = Clear
- MIN. = Minimum
- MAX. = Maximum
- APPROX. = Approximate
- REQ'D = Required
- CONT. = Continuous
- O.C. = On Center
- A.F.F. = Above Finished Floor
- T.O.S. = Top of Steel/Slab
- B.O.S. = Bottom of Steel/Slab
- F.F.E. = Finished Floor Elevation
- T.O.W. = Top of Wall
- C.J. = Control Joint
- E.J. = Expansion Joint
- G.C. = General Contractor
- G.W.B. = Gypsum Wall Board
- CMU = Concrete Masonry Unit
- LVL = Laminated Veneer Lumber
- GWP = Gypsum Wall Panel
- ACT = Acoustic Ceiling Tile
- VCT = Vinyl Composition Tile
- HVAC = Heating, Ventilation, Air Conditioning
- MEP = Mechanical, Electrical, Plumbing
- AHU = Air Handling Unit
- RTU = Rooftop Unit
- VAV = Variable Air Volume
- FHC = Fire Hose Cabinet
- FEC = Fire Extinguisher Cabinet
`;

// ============================================================================
// GEMINI VISUAL ANALYSIS ENGINE - Comprehensive Construction Focus
// ============================================================================

function buildGeminiPrompt(documentContent: string, documentNames: string[], hasImages: boolean): string {
  const imageNote = hasImages 
    ? "\n\n🔴 CRITICAL: Site images have been provided. Perform DETAILED visual analysis on these images."
    : "";

  const truncatedContent = truncateContent(documentContent, 100000);

  return `You are Messa's VISUAL ANALYSIS ENGINE - a specialized AI for extracting dimensional and spatial data from construction documents, architectural drawings, and site photographs.

${CONSTRUCTION_ABBREVIATIONS}

═══════════════════════════════════════════════════════════════════════════════
📐 PRIMARY EXTRACTION CATEGORIES
═══════════════════════════════════════════════════════════════════════════════

1️⃣ LINEAR DIMENSIONS (Extract ALL you find)
   - Room dimensions (length × width)
   - Wall lengths and thicknesses
   - Door/window rough opening sizes
   - Corridor widths
   - Stair dimensions (rise, run, width, headroom)
   - Ceiling heights / clear heights
   - Structural member sizes (beams, columns, footings)
   
   FORMATS TO RECOGNIZE:
   - Imperial: 12'-6", 12'6", 12 ft 6 in, 12'-6 1/2"
   - Metric: 3800mm, 3.8m, 3800, 380cm
   - Mixed: Often on Canadian drawings
   
2️⃣ AREA CALCULATIONS (Calculate from dimensions when possible)
   - Room areas (L × W)
   - Total floor area
   - Lot coverage
   - Gross vs Net areas
   
   FORMULA: For a room showing 10'-0" × 12'-0":
   Area = 10 × 12 = 120 sq ft = 11.15 sq m
   
3️⃣ SPATIAL RELATIONSHIPS
   - Room adjacencies (which rooms connect)
   - Traffic flow patterns
   - Egress routes
   - Accessibility clearances (min 36" for doorways, 60" for wheelchair turning)
   
4️⃣ STRUCTURAL ELEMENTS
   - Foundation type and dimensions
   - Column grid (A, B, C × 1, 2, 3)
   - Beam sizes (W10×22, W12×26, etc.)
   - Joist spacing (typically 16" O.C. or 24" O.C.)
   - Load-bearing vs non-load-bearing walls
   
5️⃣ DRAWING METADATA
   - Sheet numbers (A1.1, S2.3, M1.0, E1.0)
   - Scale (1/4" = 1'-0", 1:50, 1:100)
   - North arrow orientation
   - Grid lines and coordinates
   - Revision clouds and dates
   - Detail callouts and references
   
6️⃣ FIRE & LIFE SAFETY (Critical for code compliance)
   - Fire-rated assemblies (1HR, 2HR ratings)
   - Exit locations and widths
   - Travel distances
   - Fire separation distances
   - Sprinkler coverage
   
7️⃣ SITE CONDITIONS (From photos)
   - Existing conditions
   - Material identification
   - Construction progress
   - Safety hazards visible
   - Equipment and staging areas

═══════════════════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT - REQUIRED FOR EACH DATA POINT
═══════════════════════════════════════════════════════════════════════════════

[VISUAL_DATA: {category}: {specific description}]
[VALUE: {exact value with units}]
[METRIC: {converted metric value if imperial, or vice versa}]
[CALCULATED_AREA: {if applicable, show calculation}]
[LOCATION: Sheet {X}, Grid {Y}, Detail {Z} OR Site Image {N}]
[CONFIDENCE: HIGH/MEDIUM/LOW]

EXAMPLE:
[VISUAL_DATA: Room Dimension: Master Bedroom width]
[VALUE: 12'-0"]
[METRIC: 3657.6mm / 3.66m]
[LOCATION: Sheet A2.1, Grid B-3]
[CONFIDENCE: HIGH]

[VISUAL_DATA: Room Dimension: Master Bedroom length]
[VALUE: 14'-6"]
[METRIC: 4419.6mm / 4.42m]
[LOCATION: Sheet A2.1, Grid B-3]
[CONFIDENCE: HIGH]

[VISUAL_DATA: Calculated Area: Master Bedroom]
[VALUE: 174 sq ft]
[METRIC: 16.17 sq m]
[CALCULATED_AREA: 12' × 14.5' = 174 sq ft]
[LOCATION: Sheet A2.1, Grid B-3]
[CONFIDENCE: HIGH]

═══════════════════════════════════════════════════════════════════════════════
🎯 SPECIAL EXTRACTION TASKS
═══════════════════════════════════════════════════════════════════════════════

A) ROOM SCHEDULES FROM DRAWINGS
   - Room name/number
   - Dimensions visible on plan
   - Ceiling height (from sections or notes)
   - Floor finish indicator
   
B) DOOR/WINDOW ANNOTATIONS
   - Size tags (3068 = 3'-0" × 6'-8")
   - Type indicators (D1, D2, W1, W2)
   - Swing direction
   
C) SECTION CUTS
   - Foundation depths
   - Floor-to-floor heights
   - Parapet heights
   - Roof slopes (4:12, 6:12)

PROJECT DOCUMENTS AVAILABLE: ${documentNames.join(", ")}${imageNote}

=== DOCUMENT CONTENTS START ===
${truncatedContent}
=== DOCUMENT CONTENTS END ===

Remember:
✓ ALWAYS include both imperial AND metric equivalents
✓ CALCULATE areas when you have L × W dimensions
✓ Include grid coordinates and sheet numbers for verification
✓ Mark confidence level for each data point
✓ Note any unclear or conflicting dimensions`;
}

// ============================================================================
// OPENAI TEXT & TABULAR EXTRACTION ENGINE - Comprehensive Construction Focus
// ============================================================================

function buildOpenAIPrompt(documentContent: string, documentNames: string[], hasImages: boolean, geminiFindings?: string): string {
  const imageNote = hasImages 
    ? "\n\nNOTE: Site images are available. Focus on any visible text, signage, or written annotations in these images."
    : "";

  const truncatedContent = truncateContent(documentContent, 30000);

  // If Gemini findings are provided, add cross-verification task
  const crossVerifyTask = geminiFindings ? `

═══════════════════════════════════════════════════════════════════════════════
🔄 CROSS-VERIFICATION TASK (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

The Visual Analysis Engine has identified these elements from drawings:
${geminiFindings}

YOUR TASK: For EACH visual finding above:
1. Search schedules/tables for matching room names, areas, or specifications
2. Verify calculated areas match scheduled areas (±5% tolerance for rounding)
3. Confirm material specs match between drawings and schedules
4. Note any unit conversions (imperial ↔ metric should match when converted)

AREA VERIFICATION FORMULA:
- If Gemini shows 10'-0" × 12'-0" room = 120 sq ft
- And schedule shows 120 SF or 11.15 m² → MATCH ✓
- If schedule shows 130 SF → CHECK for bay windows, closets, or measure differences

Report each verification as:
[CROSS_VERIFY: {visual element from Gemini}]
[FOUND: yes/no/partial]
[TABLE_DATA: {exact value from schedule/table}]
[UNIT_CHECK: {imperial value} = {metric equivalent} ✓/✗]
[MATCH_STATUS: MATCH/MISMATCH/WITHIN_TOLERANCE]
[SOURCE: {Schedule Name}, Row {X} or {Document}, Page {X}]
═══════════════════════════════════════════════════════════════════════════════
` : "";

  return `You are Messa's TEXT & TABULAR EXTRACTION ENGINE - specialized in extracting written specifications, schedules, and regulatory data from construction documents.

${CONSTRUCTION_ABBREVIATIONS}

═══════════════════════════════════════════════════════════════════════════════
📊 PRIMARY EXTRACTION CATEGORIES - SCHEDULES & TABLES
═══════════════════════════════════════════════════════════════════════════════

1️⃣ ROOM FINISH SCHEDULE (Critical for verification)
   Extract ALL columns:
   - Room Number/Name
   - Floor Finish (VCT, Carpet, Tile, Hardwood)
   - Base Type
   - Wall Finish (GWB, Paint code, Tile)
   - Ceiling Type (ACT, GWB, Open)
   - Ceiling Height
   - AREA (sq ft or m²) ← Key for cross-verification
   - Remarks/Notes
   
   FORMAT:
   [TABLE_DATA: Room Finish Schedule]
   [ROW: {Room Number}]
   [AREA: {value with units}]
   [CEILING_HT: {value}]
   [FLOOR: {finish type}]
   [WALL: {finish type}]
   [SOURCE: Sheet {X}, Schedule Row {N}]

2️⃣ DOOR SCHEDULE
   - Door Mark (D1, D2, D101, etc.)
   - Size (Width × Height × Thickness)
   - Material (Wood, HM, AL)
   - Fire Rating (20 min, 45 min, 90 min)
   - Hardware Set
   - Frame Type
   - Glazing requirements
   - Louver requirements
   
3️⃣ WINDOW SCHEDULE
   - Window Mark
   - Size (W × H)
   - Type (Fixed, Awning, Casement, Slider)
   - Frame Material
   - Glazing Type (Double, Triple, Low-E)
   - U-Value / SHGC (for energy code)
   
4️⃣ STRUCTURAL SCHEDULES
   - Beam Schedule
   - Column Schedule
   - Footing Schedule
   - Lintel Schedule
   - Rebar schedules

5️⃣ MEP SCHEDULES
   - Electrical Panel Schedule
   - Lighting Fixture Schedule
   - Plumbing Fixture Schedule
   - HVAC Equipment Schedule
   - Diffuser/Grille Schedule

═══════════════════════════════════════════════════════════════════════════════
📋 SPECIFICATIONS & CODE REFERENCES
═══════════════════════════════════════════════════════════════════════════════

6️⃣ BUILDING CODE REFERENCES (Ontario/Canada)
   - OBC (Ontario Building Code) sections
   - NBCC (National Building Code of Canada)
   - CSA Standards (A23.3, S16, O86)
   - ASHRAE Standards (90.1, 62.1)
   - NFPA references
   - Local municipal bylaws
   
7️⃣ MATERIAL SPECIFICATIONS
   - Concrete strength (25 MPa, 30 MPa, 4000 psi)
   - Steel grades (Grade 400R, Fy = 400 MPa)
   - Wood species and grades
   - Insulation R-values
   - Glazing specifications
   
8️⃣ GENERAL NOTES (Often contain critical requirements)
   - Structural notes
   - Architectural notes
   - Mechanical notes
   - Electrical notes
   - Site notes
   
9️⃣ PERMIT & INSPECTION REQUIREMENTS
   - Required inspections
   - Hold points
   - Special inspections
   - Testing requirements (concrete, rebar, welding)

🔟 ENERGY CODE COMPLIANCE
   - SB-12 requirements (Ontario)
   - EnerGuide ratings
   - ENERGY STAR specifications
   - Envelope requirements

═══════════════════════════════════════════════════════════════════════════════
🔢 UNIT CONVERSION VERIFICATION
═══════════════════════════════════════════════════════════════════════════════

When verifying areas/dimensions between visual data and schedules:

LENGTH:
- 1 foot = 0.3048 meters = 304.8 mm
- 1 inch = 25.4 mm
- 1 meter = 3.28084 feet

AREA:
- 1 sq ft = 0.092903 sq m
- 1 sq m = 10.7639 sq ft

EXAMPLES:
- Room showing 10' × 12' = 120 sq ft = 11.15 m²
- If schedule shows "11.1 m²" → MATCH ✓ (within tolerance)
- If schedule shows "120 SF" → EXACT MATCH ✓

TOLERANCE: Accept ±5% difference due to rounding in conversions

═══════════════════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT - REQUIRED FOR EACH DATA POINT
═══════════════════════════════════════════════════════════════════════════════

[TEXT_DATA: {category}: {description}]
[VALUE: {exact text or value}]
[IMPERIAL: {imperial equivalent if metric given}]
[METRIC: {metric equivalent if imperial given}]
[SOURCE: {Schedule Name}/{Document}, Row/Page {X}]
[CODE_REF: {if applicable, cite code section}]
[CONFIDENCE: HIGH/MEDIUM/LOW]

EXAMPLE:
[TEXT_DATA: Room Finish Schedule: Living Room Area]
[VALUE: 285 sq ft]
[METRIC: 26.48 sq m]
[SOURCE: Room Finish Schedule, Row 102]
[CONFIDENCE: HIGH]

[TEXT_DATA: Building Code: Fire Separation Requirement]
[VALUE: 1-hour fire separation required between dwelling units]
[CODE_REF: OBC 3.2.1.1]
[SOURCE: Architectural Notes, Sheet A0.1]
[CONFIDENCE: HIGH]

PROJECT DOCUMENTS AVAILABLE: ${documentNames.join(", ")}${imageNote}${crossVerifyTask}

=== DOCUMENT CONTENTS START ===
${truncatedContent}
=== DOCUMENT CONTENTS END ===

Remember:
✓ Extract COMPLETE schedules when found
✓ Always provide unit conversions for verification
✓ Cite exact schedule rows and page numbers
✓ Include code section references when found
✓ Mark confidence level for each extraction`;
}

interface AIResponse {
  content: string;
  model: string;
  success: boolean;
}

interface ProjectContext {
  projectId?: string;
  projectName?: string;
  documents?: string[];
  siteImages?: string[];
}

interface ExtractedContent {
  textContent: string;
  imageUrls: string[];
  documents: string[];
}

async function extractDocumentContent(projectId: string, siteImagePaths: string[] = []): Promise<ExtractedContent> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project documents
    const { data: documents, error: docsError } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId);

    const documentNames: string[] = [];
    let allContent = "";
    const imageUrls: string[] = [];

    // Process PDF documents
    if (!docsError && documents && documents.length > 0) {
      for (const doc of documents) {
        documentNames.push(doc.file_name);

        // Only process PDF files
        if (!doc.file_name.toLowerCase().endsWith(".pdf")) {
          allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Non-PDF file - content not extracted]\n`;
          continue;
        }

        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("project-documents")
            .download(doc.file_path);

          if (downloadError) {
            console.error(`Error downloading ${doc.file_name}:`, downloadError);
            allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Error: Could not download file]\n`;
            continue;
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const text = await extractPDFText(arrayBuffer);
          
          if (text) {
            allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n${text}\n`;
            console.log(`Extracted ${text.length} chars from ${doc.file_name}`);
          } else {
            allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Could not extract text from PDF]\n`;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          console.error(`Error processing ${doc.file_name}:`, err);
          allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Error: ${errorMsg}]\n`;
        }
      }
    }

    // Process site images - get public URLs for vision analysis
    if (siteImagePaths && siteImagePaths.length > 0) {
      console.log(`Processing ${siteImagePaths.length} site images`);
      for (let i = 0; i < siteImagePaths.length; i++) {
        const path = siteImagePaths[i];
        const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(path);
        if (urlData?.publicUrl) {
          imageUrls.push(urlData.publicUrl);
          documentNames.push(`[Site Image ${i + 1}]`);
        }
      }
      
      if (imageUrls.length > 0) {
        allContent += `\n=== SITE IMAGES ===\n${imageUrls.length} site images are attached for visual analysis.\n`;
      }
    }

    return { textContent: allContent, imageUrls, documents: documentNames };
  } catch (error) {
    console.error("Error extracting document content:", error);
    return { textContent: "", imageUrls: [], documents: [] };
  }
}

// Simple PDF text extraction
async function extractPDFText(pdfData: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(pdfData);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    
    const textContent: string[] = [];
    
    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches) {
      for (const match of textMatches) {
        const inner = match.slice(1, -1);
        const cleaned = inner.replace(/[\x00-\x1F\x7F-\xFF]/g, " ").trim();
        if (cleaned.length > 2 && !/^[\d\s.]+$/.test(cleaned)) {
          textContent.push(cleaned);
        }
      }
    }

    const tjMatches = text.match(/\[([^\]]+)\]\s*TJ/g);
    if (tjMatches) {
      for (const match of tjMatches) {
        const innerMatches = match.match(/\(([^)]+)\)/g);
        if (innerMatches) {
          for (const inner of innerMatches) {
            const cleaned = inner.slice(1, -1).replace(/[\x00-\x1F\x7F-\xFF]/g, " ").trim();
            if (cleaned.length > 2) {
              textContent.push(cleaned);
            }
          }
        }
      }
    }

    const result = textContent.join(" ").replace(/\s+/g, " ").trim();
    return result || "[PDF text could not be extracted - may be scanned/image-based]";
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return "[Error extracting PDF text]";
  }
}

interface MessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

function buildMessagesWithImages(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  imageUrls: string[]
): Array<{ role: string; content: string | MessageContent[] }> {
  const result: Array<{ role: string; content: string | MessageContent[] }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add messages, but for the last user message, include images if available
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (i === messages.length - 1 && msg.role === "user" && imageUrls.length > 0) {
      // Build multimodal content for the last user message
      const content: MessageContent[] = [
        { type: "text", text: msg.content }
      ];
      
      // Add up to 4 images to avoid token limits
      const imagesToAdd = imageUrls.slice(0, 4);
      for (const url of imagesToAdd) {
        content.push({
          type: "image_url",
          image_url: { url }
        });
      }
      
      result.push({ role: "user", content });
    } else {
      result.push(msg);
    }
  }

  return result;
}

async function callAIModel(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string | MessageContent[] }>,
): Promise<AIResponse> {
  try {
    console.log(`Calling ${model} with ${messages.length} messages`);
    
    // Use max_completion_tokens for OpenAI models, max_tokens for others
    const isOpenAI = model.startsWith("openai/");
    const tokenParam = isOpenAI 
      ? { max_completion_tokens: 4096 }
      : { max_tokens: 4096 };
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...tokenParam,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${model} error:`, response.status, errorText);
      return { content: "", model, success: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`${model} responded with ${content.length} chars`);
    return { content, model, success: true };
  } catch (error) {
    console.error(`${model} exception:`, error);
    return { content: "", model, success: false };
  }
}

// Extract data points from specialized engine outputs
interface DataPoint {
  type: "visual" | "text" | "cross-verified";
  description: string;
  value: string;
  source: string;
  confidence?: "high" | "medium" | "low";
  verificationSource?: string; // "Visual Analysis" or "Text Analysis"
}

interface CrossVerifyResult {
  visualElement: string;
  found: "yes" | "no" | "partial";
  textRef: string;
  source: string;
}

// ============================================================================
// UNIT-AWARE VALUE PARSING AND COMPARISON
// ============================================================================

interface ParsedValue {
  rawValue: string;
  numericValue: number | null;
  unit: string | null;
  imperialEquivalent: number | null;
  metricEquivalent: number | null;
  isArea: boolean;
}

function parseConstructionValue(value: string): ParsedValue {
  const result: ParsedValue = {
    rawValue: value,
    numericValue: null,
    unit: null,
    imperialEquivalent: null,
    metricEquivalent: null,
    isArea: false,
  };
  
  // Check if it's an area measurement
  const isArea = /sq\.?\s*(ft|feet|m|meters?)|m²|ft²|sf|square\s*(feet|meters?)/i.test(value);
  result.isArea = isArea;
  
  // Parse imperial feet-inches: 12'-6", 12'6", 12 ft 6 in
  const feetInchesMatch = value.match(/(\d+)['\s][-]?\s*(\d+(?:\s*\d*\/\d+)?)?["\s]?(?:in)?/);
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]);
    const inches = feetInchesMatch[2] ? parseFloat(feetInchesMatch[2]) : 0;
    result.numericValue = feet + (inches / 12);
    result.unit = "feet";
    result.imperialEquivalent = result.numericValue;
    result.metricEquivalent = result.numericValue * UNIT_CONVERSIONS.ftToM;
    return result;
  }
  
  // Parse simple feet: 12', 12 ft, 12 feet
  const feetMatch = value.match(/(\d+\.?\d*)\s*(?:'|ft|feet)/i);
  if (feetMatch) {
    result.numericValue = parseFloat(feetMatch[1]);
    result.unit = "feet";
    result.imperialEquivalent = result.numericValue;
    result.metricEquivalent = result.numericValue * UNIT_CONVERSIONS.ftToM;
    return result;
  }
  
  // Parse millimeters: 3800mm, 3800 mm
  const mmMatch = value.match(/(\d+\.?\d*)\s*mm/i);
  if (mmMatch) {
    result.numericValue = parseFloat(mmMatch[1]);
    result.unit = "mm";
    result.metricEquivalent = result.numericValue / 1000; // convert to meters
    result.imperialEquivalent = result.numericValue * UNIT_CONVERSIONS.mmToIn / 12; // convert to feet
    return result;
  }
  
  // Parse meters: 3.8m, 3.8 m, 3.8 meters
  const mMatch = value.match(/(\d+\.?\d*)\s*m(?:eters?)?(?!\s*m)/i);
  if (mMatch) {
    result.numericValue = parseFloat(mMatch[1]);
    result.unit = "meters";
    result.metricEquivalent = result.numericValue;
    result.imperialEquivalent = result.numericValue * UNIT_CONVERSIONS.mToFt;
    return result;
  }
  
  // Parse square feet: 120 sq ft, 120 SF, 120 ft²
  const sqftMatch = value.match(/(\d+\.?\d*)\s*(?:sq\.?\s*(?:ft|feet)|sf|ft²)/i);
  if (sqftMatch) {
    result.numericValue = parseFloat(sqftMatch[1]);
    result.unit = "sqft";
    result.isArea = true;
    result.imperialEquivalent = result.numericValue;
    result.metricEquivalent = result.numericValue * UNIT_CONVERSIONS.sqftToSqm;
    return result;
  }
  
  // Parse square meters: 11.15 m², 11.15 sq m
  const sqmMatch = value.match(/(\d+\.?\d*)\s*(?:m²|sq\.?\s*m(?:eters?)?)/i);
  if (sqmMatch) {
    result.numericValue = parseFloat(sqmMatch[1]);
    result.unit = "sqm";
    result.isArea = true;
    result.metricEquivalent = result.numericValue;
    result.imperialEquivalent = result.numericValue * UNIT_CONVERSIONS.sqmToSqft;
    return result;
  }
  
  // Parse generic number
  const numMatch = value.match(/(\d+\.?\d*)/);
  if (numMatch) {
    result.numericValue = parseFloat(numMatch[1]);
  }
  
  return result;
}

// Check if two values match within tolerance, considering unit conversions
function valuesMatchWithConversion(value1: string, value2: string): { match: boolean; reason: string } {
  const parsed1 = parseConstructionValue(value1);
  const parsed2 = parseConstructionValue(value2);
  
  // If no numeric values, do string comparison
  if (parsed1.numericValue === null || parsed2.numericValue === null) {
    const norm1 = value1.toLowerCase().replace(/[^\w\d]/g, '');
    const norm2 = value2.toLowerCase().replace(/[^\w\d]/g, '');
    return {
      match: norm1.includes(norm2) || norm2.includes(norm1) || norm1 === norm2,
      reason: "String comparison"
    };
  }
  
  // If both have imperial equivalents, compare in imperial
  if (parsed1.imperialEquivalent !== null && parsed2.imperialEquivalent !== null) {
    const diff = Math.abs(parsed1.imperialEquivalent - parsed2.imperialEquivalent);
    const avgValue = (parsed1.imperialEquivalent + parsed2.imperialEquivalent) / 2;
    const percentDiff = avgValue > 0 ? diff / avgValue : 0;
    
    if (percentDiff <= AREA_MATCH_TOLERANCE) {
      return {
        match: true,
        reason: `Values match within ${(percentDiff * 100).toFixed(1)}% tolerance (${parsed1.imperialEquivalent.toFixed(2)} ≈ ${parsed2.imperialEquivalent.toFixed(2)})`
      };
    }
  }
  
  // Direct numeric comparison with tolerance
  const diff = Math.abs(parsed1.numericValue - parsed2.numericValue);
  const avgValue = (parsed1.numericValue + parsed2.numericValue) / 2;
  const percentDiff = avgValue > 0 ? diff / avgValue : 0;
  
  if (percentDiff <= AREA_MATCH_TOLERANCE) {
    return {
      match: true,
      reason: `Direct values match within ${(percentDiff * 100).toFixed(1)}% tolerance`
    };
  }
  
  return {
    match: false,
    reason: `Values differ by ${(percentDiff * 100).toFixed(1)}% (${parsed1.numericValue} vs ${parsed2.numericValue})`
  };
}

function extractDataPoints(content: string, type: "visual" | "text"): DataPoint[] {
  const dataPoints: DataPoint[] = [];
  
  // Pattern for VISUAL_DATA or TEXT_DATA markers - more flexible now
  const pattern = type === "visual" 
    ? /\[VISUAL_DATA:\s*([^\]]+)\][\s\n]*\[VALUE:\s*([^\]]+)\]/gi
    : /\[TEXT_DATA:\s*([^\]]+)\][\s\n]*\[VALUE:\s*([^\]]+)\]/gi;
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Look for additional metadata near this match
    const contextEnd = Math.min(content.length, match.index + match[0].length + 300);
    const context = content.substring(match.index, contextEnd);
    
    // Extract confidence
    let confidence: "high" | "medium" | "low" = "medium";
    const confMatch = context.match(/\[CONFIDENCE:\s*(HIGH|MEDIUM|LOW)\]/i);
    if (confMatch) {
      confidence = confMatch[1].toLowerCase() as "high" | "medium" | "low";
    }
    
    // Extract source/location (more flexible patterns)
    let source = "";
    const sourceMatch = context.match(/\[(?:SOURCE|LOCATION):\s*([^\]]+)\]/i);
    if (sourceMatch) {
      source = sourceMatch[1].trim();
    }
    
    // Extract metric equivalent if provided
    const metricMatch = context.match(/\[METRIC:\s*([^\]]+)\]/i);
    const metricValue = metricMatch ? metricMatch[1].trim() : "";
    
    // Extract calculated area if provided
    const calcMatch = context.match(/\[CALCULATED_AREA:\s*([^\]]+)\]/i);
    const calculatedArea = calcMatch ? calcMatch[1].trim() : "";
    
    const valueWithExtras = calculatedArea 
      ? `${match[2].trim()} (Calculated: ${calculatedArea})`
      : match[2].trim();
    
    dataPoints.push({
      type,
      description: match[1].trim(),
      value: valueWithExtras,
      source,
      confidence,
      verificationSource: type === "visual" ? "Visual Analysis" : "Text Analysis",
    });
  }
  
  return dataPoints;
}

// Extract cross-verification results from OpenAI's response
function extractCrossVerifyResults(content: string): CrossVerifyResult[] {
  const results: CrossVerifyResult[] = [];
  
  // More flexible pattern to catch various formats
  const pattern = /\[CROSS_VERIFY:\s*([^\]]+)\][\s\n]*\[FOUND:\s*(yes|no|partial)\][\s\n]*(?:\[(?:TEXT_REF|TABLE_DATA):\s*([^\]]+)\])?/gi;
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Look for source and match status
    const contextEnd = Math.min(content.length, match.index + match[0].length + 200);
    const context = content.substring(match.index, contextEnd);
    
    const sourceMatch = context.match(/\[SOURCE:\s*([^\]]+)\]/i);
    const matchStatusMatch = context.match(/\[MATCH_STATUS:\s*([^\]]+)\]/i);
    
    results.push({
      visualElement: match[1].trim(),
      found: match[2].toLowerCase() as "yes" | "no" | "partial",
      textRef: match[3]?.trim() || "not found",
      source: sourceMatch ? sourceMatch[1].trim() : "",
    });
  }
  
  return results;
}

// Extract visual findings summary for cross-verification
function extractVisualFindings(geminiContent: string): string {
  const dataPoints = extractDataPoints(geminiContent, "visual");
  if (dataPoints.length === 0) {
    // Try to extract key topics from the response
    const lines = geminiContent.split('\n').filter(l => l.trim().length > 10);
    const keyLines = lines.slice(0, 15).map((l, i) => `${i + 1}. ${l.trim()}`);
    return keyLines.join('\n');
  }
  
  return dataPoints.map((dp, i) => 
    `${i + 1}. [${dp.description}]: ${dp.value} (Confidence: ${dp.confidence?.toUpperCase() || 'MEDIUM'}, Source: ${dp.source || 'Not specified'})`
  ).join('\n');
}

// Compare data points between Gemini (visual) and OpenAI (text) responses
// Now with smart conflict detection and Operational Truth handling
interface ComparisonResult {
  verified: boolean;
  verificationSummary: string;
  matchingPoints: Array<{ gemini: DataPoint; openai: DataPoint; match: boolean }>;
  conflicts: Array<{ topic: string; geminiValue: string; openaiValue: string; source: string; isContradiction: boolean }>;
  geminiOnlyPoints: DataPoint[];
  openaiOnlyPoints: DataPoint[];
  operationalTruths: DataPoint[]; // Data seen by one engine, accepted as truth
  crossVerified: CrossVerifyResult[];
}

function compareDataPoints(geminiContent: string, openaiContent: string): ComparisonResult {
  const geminiPoints = extractDataPoints(geminiContent, "visual");
  const openaiPoints = extractDataPoints(openaiContent, "text");
  const crossVerified = extractCrossVerifyResults(openaiContent);
  
  const matchingPoints: ComparisonResult["matchingPoints"] = [];
  const conflicts: ComparisonResult["conflicts"] = [];
  const usedGeminiIndices = new Set<number>();
  const usedOpenaiIndices = new Set<number>();
  const operationalTruths: DataPoint[] = [];
  
  console.log(`Comparing ${geminiPoints.length} visual points with ${openaiPoints.length} text points`);
  
  // Try to find matching topics between visual and text data
  for (let gi = 0; gi < geminiPoints.length; gi++) {
    const gp = geminiPoints[gi];
    for (let oi = 0; oi < openaiPoints.length; oi++) {
      if (usedOpenaiIndices.has(oi)) continue; // Already matched
      
      const op = openaiPoints[oi];
      
      // Check if they're talking about the same thing (fuzzy match on description)
      const gpDesc = gp.description.toLowerCase();
      const opDesc = op.description.toLowerCase();
      
      // Find common keywords (room names, element types)
      const gpWords = new Set(gpDesc.split(/[\s:,]+/).filter(w => w.length > 2));
      const opWords = new Set(opDesc.split(/[\s:,]+/).filter(w => w.length > 2));
      const commonWords = [...gpWords].filter(w => opWords.has(w));
      
      // Match if: 2+ common words, or one description contains the other
      const descMatch = commonWords.length >= 2 || 
                       gpDesc.includes(opDesc) || 
                       opDesc.includes(gpDesc) ||
                       // Special case: room names like "bedroom", "kitchen", etc.
                       ['bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'garage', 'office', 'basement', 'attic']
                         .some(room => gpDesc.includes(room) && opDesc.includes(room));
      
      if (descMatch) {
        usedGeminiIndices.add(gi);
        usedOpenaiIndices.add(oi);
        
        // Use unit-aware comparison for values
        const valueComparison = valuesMatchWithConversion(gp.value, op.value);
        
        matchingPoints.push({ 
          gemini: gp, 
          openai: op, 
          match: valueComparison.match 
        });
        
        if (!valueComparison.match) {
          // Check if this is a TRUE contradiction using unit-aware comparison
          const parsed1 = parseConstructionValue(gp.value);
          const parsed2 = parseConstructionValue(op.value);
          
          // It's only a TRUE contradiction if:
          // 1. Both have numeric values
          // 2. They represent the same type of measurement (both area, both length, etc.)
          // 3. The difference exceeds tolerance EVEN after unit conversion
          let isContradiction = false;
          
          if (parsed1.numericValue !== null && parsed2.numericValue !== null) {
            // Check if both are area or both are length
            const sameType = parsed1.isArea === parsed2.isArea;
            
            if (sameType && parsed1.imperialEquivalent !== null && parsed2.imperialEquivalent !== null) {
              const diff = Math.abs(parsed1.imperialEquivalent - parsed2.imperialEquivalent);
              const avgValue = (parsed1.imperialEquivalent + parsed2.imperialEquivalent) / 2;
              const percentDiff = avgValue > 0 ? diff / avgValue : 0;
              
              // >10% difference after unit conversion = TRUE contradiction
              isContradiction = percentDiff > 0.1;
            }
          }
          
          conflicts.push({
            topic: gp.description,
            geminiValue: gp.value,
            openaiValue: op.value,
            source: gp.source || op.source,
            isContradiction,
          });
          
          console.log(`Conflict: ${gp.description} - Gemini: ${gp.value}, OpenAI: ${op.value}, True conflict: ${isContradiction}`);
        } else {
          console.log(`Match: ${gp.description} - ${valueComparison.reason}`);
        }
        
        break; // Found a match for this Gemini point, move to next
      }
    }
  }
  
  // Collect unmatched points as potential Operational Truths
  const geminiOnlyPoints = geminiPoints.filter((_, i) => !usedGeminiIndices.has(i));
  const openaiOnlyPoints = openaiPoints.filter((_, i) => !usedOpenaiIndices.has(i));
  
  // Points from one engine with high confidence become Operational Truths
  for (const gp of geminiOnlyPoints) {
    if (gp.confidence === "high" || gp.confidence === "medium") {
      operationalTruths.push({
        ...gp,
        verificationSource: "Verified by Visual Analysis",
      });
    }
  }
  for (const op of openaiOnlyPoints) {
    if (op.confidence === "high" || op.confidence === "medium") {
      operationalTruths.push({
        ...op,
        verificationSource: "Verified by Text Analysis",
      });
    }
  }
  
  // Check cross-verification results
  for (const cv of crossVerified) {
    if (cv.found === "yes") {
      // Visual element confirmed by text - high confidence
      operationalTruths.push({
        type: "cross-verified",
        description: cv.visualElement,
        value: cv.textRef,
        source: cv.source,
        confidence: "high",
        verificationSource: "Cross-Verified (Visual + Text)",
      });
    }
  }
  
  // Verified if: no TRUE contradictions exist
  // TRUE contradictions = conflicts where isContradiction is true
  const trueContradictions = conflicts.filter(c => c.isContradiction);
  const verified = trueContradictions.length === 0;
  
  // Build verification summary
  let verificationSummary = "";
  if (trueContradictions.length > 0) {
    verificationSummary = `⚠️ ${trueContradictions.length} conflicting data point(s) detected`;
  } else if (matchingPoints.filter(m => m.match).length > 0) {
    verificationSummary = `✓ Dual-Engine Verified (${matchingPoints.filter(m => m.match).length} matching points)`;
  } else if (operationalTruths.length > 0) {
    verificationSummary = `ℹ️ ${operationalTruths.length} data point(s) accepted as Operational Truth`;
  } else {
    verificationSummary = "Analysis complete - no structured data points extracted";
  }
  
  return {
    verified,
    verificationSummary,
    matchingPoints,
    conflicts,
    geminiOnlyPoints,
    openaiOnlyPoints,
    operationalTruths,
    crossVerified,
  };
}

function extractSources(content: string): Array<{ document: string; page?: number }> {
  const sources: Array<{ document: string; page?: number }> = [];
  // Match both old format and new specialized format
  const sourcePattern = /\[(?:Source|SOURCE):\s*([^,\]]+)(?:,?\s*Page\s*(\d+))?\]/gi;
  let match;
  
  while ((match = sourcePattern.exec(content)) !== null) {
    sources.push({
      document: match[1].trim(),
      page: match[2] ? parseInt(match[2], 10) : undefined,
    });
  }
  
  return sources;
}

// ============================================
// MODEL SELECTION - COST OPTIMIZED
// ============================================

const ASK_MESSA_MODELS = {
  // Visual analysis models (ordered by cost: low → high)
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GEMINI_PRO: "google/gemini-2.5-pro",
  
  // Text/validation models
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",
  GPT5: "openai/gpt-5",
  GPT5_MINI: "openai/gpt-5-mini",
};

interface MessaModelConfig {
  geminiModel: string;
  openaiModel: string;
  maxTokens: number;
  runDualEngine: boolean;
}

function selectMessaModels(
  tier: "free" | "pro" | "premium",
  hasComplexDocuments: boolean,
  hasConflicts?: boolean
): MessaModelConfig {
  // Premium: Full power, always dual engine
  if (tier === "premium") {
    return {
      geminiModel: ASK_MESSA_MODELS.GEMINI_PRO,
      openaiModel: ASK_MESSA_MODELS.GPT5,
      maxTokens: 4096,
      runDualEngine: true,
    };
  }
  
  // Pro: Flash models, dual engine only on conflicts or complex docs
  if (tier === "pro") {
    return {
      geminiModel: ASK_MESSA_MODELS.GEMINI_FLASH,
      openaiModel: ASK_MESSA_MODELS.GEMINI_3_FLASH, // Use Gemini for cost savings
      maxTokens: 2048,
      runDualEngine: hasComplexDocuments || hasConflicts === true,
    };
  }
  
  // Free: Flash-Lite only, single engine
  return {
    geminiModel: ASK_MESSA_MODELS.GEMINI_FLASH_LITE,
    openaiModel: ASK_MESSA_MODELS.GEMINI_FLASH_LITE,
    maxTokens: 1024,
    runDualEngine: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Support both old format (messages + projectContext) and new format (projectId + question)
    let messages = requestBody.messages;
    const requestedDualEngine = requestBody.dualEngine ?? true;
    const tier = requestBody.tier || "free"; // Accept tier from frontend
    
    // Handle new simplified format: { projectId, question, analysisType }
    let projectContext = requestBody.projectContext;
    if (requestBody.projectId && requestBody.question) {
      // Convert new format to old format
      messages = [{ role: "user", content: requestBody.question }];
      projectContext = { projectId: requestBody.projectId };
      console.log(`Converted simple request: ${requestBody.analysisType || "general"}`);
    }
    
    // Ensure messages is always an array
    if (!messages || !Array.isArray(messages)) {
      messages = [{ role: "user", content: "Analyze this project" }];
      console.log("No messages provided, using default");
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = SYSTEM_PROMPT;
    let documentNames: string[] = [];
    let imageUrls: string[] = [];

    // Extract document content and site images if projectId is provided
    if (projectContext?.projectId) {
      console.log("Extracting documents for project:", projectContext.projectId);
      console.log("Site images provided:", projectContext.siteImages?.length || 0);
      
      const extracted = await extractDocumentContent(
        projectContext.projectId,
        projectContext.siteImages || []
      );
      
      documentNames = extracted.documents;
      imageUrls = extracted.imageUrls;
      
      if (extracted.textContent && extracted.textContent.length > 100) {
        // Store raw content for building model-specific prompts
        systemPrompt = extracted.textContent;
        console.log(`Extracted ${extracted.textContent.length} chars, ${imageUrls.length} images`);
      } else if (imageUrls.length > 0) {
        systemPrompt = "[No text documents uploaded]";
        console.log("Using image-only analysis mode");
      } else {
        console.log("No substantial document content found, using standard prompt");
      }
    }

    // Determine if we have complex documents (PDFs, blueprints)
    const hasComplexDocuments = documentNames.some(d => 
      d.toLowerCase().endsWith('.pdf') || 
      d.toLowerCase().includes('blueprint') ||
      d.toLowerCase().includes('drawing')
    );

    // Select models based on tier
    const modelConfig = selectMessaModels(tier as "free" | "pro" | "premium", hasComplexDocuments);
    
    // Override dual engine if frontend specifically disabled it
    const dualEngine = requestedDualEngine && modelConfig.runDualEngine;
    
    // === STRUCTURED LOGGING FOR MONITORING ===
    const logEntry = {
      event: dualEngine ? "dual_engine_call" : "single_engine_call",
      tier: tier,
      timestamp: new Date().toISOString(),
      models: {
        gemini: modelConfig.geminiModel,
        openai: dualEngine ? modelConfig.openaiModel : null,
      },
      context: {
        hasDocuments: hasComplexDocuments,
        documentCount: documentNames.length,
        imageCount: imageUrls.length,
      },
    };
    console.log(`[AI_CALL] ${JSON.stringify(logEntry)}`);

    // Build SPECIALIZED prompts for each engine
    const hasDocContent = projectContext?.projectId && systemPrompt !== SYSTEM_PROMPT;
    const geminiPrompt = hasDocContent 
      ? buildGeminiPrompt(systemPrompt, documentNames, imageUrls.length > 0)
      : SYSTEM_PROMPT;
    const openaiPrompt = hasDocContent
      ? buildOpenAIPrompt(systemPrompt, documentNames, imageUrls.length > 0)
      : SYSTEM_PROMPT;

    if (dualEngine) {
      // PHASE 1: Run Gemini first for visual analysis
      const geminiMessages = buildMessagesWithImages(messages, geminiPrompt, imageUrls);
      
      console.log(`Phase 1: ${modelConfig.geminiModel} visual analysis... (${geminiPrompt.length} chars prompt)`);
      const geminiResponse = await callAIModel(LOVABLE_API_KEY, modelConfig.geminiModel, geminiMessages);
      
      // PHASE 2: Run second engine with Gemini's findings for cross-verification
      let openaiPromptWithContext = openaiPrompt;
      if (geminiResponse.success && hasDocContent) {
        const geminiFindings = extractVisualFindings(geminiResponse.content);
        openaiPromptWithContext = buildOpenAIPrompt(systemPrompt, documentNames, imageUrls.length > 0, geminiFindings);
        console.log(`Phase 2: ${modelConfig.openaiModel} cross-verification with ${geminiFindings.split('\n').length} visual findings`);
      } else {
        console.log(`Phase 2: ${modelConfig.openaiModel} analysis (no visual findings to cross-verify)`);
      }
      
      const openaiMessages = buildMessagesWithImages(messages, openaiPromptWithContext, imageUrls);
      const openaiResponse = await callAIModel(LOVABLE_API_KEY, modelConfig.openaiModel, openaiMessages);

      console.log(`Gemini success: ${geminiResponse.success}, OpenAI success: ${openaiResponse.success}`);

      const bothSucceeded = geminiResponse.success && openaiResponse.success;
      
      // Use the smart data-point comparison for dual-engine verification
      const comparison = bothSucceeded 
        ? compareDataPoints(geminiResponse.content, openaiResponse.content)
        : null;
      
      const verified = comparison?.verified ?? false;
      const trueConflicts = comparison?.conflicts?.filter(c => c.isContradiction) || [];
      const hasTrueConflicts = trueConflicts.length > 0;
      const hasOperationalTruths = (comparison?.operationalTruths?.length || 0) > 0;
      
      // Build synthesized response with smarter logic
      let primaryContent = "";
      if (bothSucceeded) {
        if (hasTrueConflicts) {
          // TRUE conflict detected - contradictory facts
          primaryContent = `⚠️ **CONFLICT DETECTED**

The dual-engine analysis found **contradictory data** between visual and text sources. Manual verification is required.

**Contradicting Data Points:**
${trueConflicts.map(c => `• **${c.topic}**
  - Visual Analysis (Gemini): ${c.geminiValue}
  - Text Analysis (OpenAI): ${c.openaiValue}
  - Source: ${c.source}`).join('\n\n')}

---

**For Reference - Visual Analysis:**
${geminiResponse.content.substring(0, 1500)}${geminiResponse.content.length > 1500 ? '...' : ''}

**For Reference - Text Analysis:**
${openaiResponse.content.substring(0, 1500)}${openaiResponse.content.length > 1500 ? '...' : ''}`;
        } else {
          // No true conflicts - synthesize the response
          let synthesis = geminiResponse.content;
          
          // Add Operational Truth markers for single-source validated data
          if (hasOperationalTruths && comparison) {
            const truthsSection = comparison.operationalTruths.map(t => 
              `• **${t.description}**: ${t.value} _(${t.verificationSource})_`
            ).join('\n');
            
            synthesis += `\n\n---\n**📋 Additional Verified Data Points:**\n${truthsSection}`;
          }
          
          // Add cross-verification summary if available
          if (comparison && comparison.crossVerified && comparison.crossVerified.length > 0) {
            const crossSection = comparison.crossVerified
              .filter(cv => cv.found === "yes")
              .map(cv => `• **${cv.visualElement}**: Confirmed - "${cv.textRef}" (${cv.source})`)
              .join('\n');
            
            if (crossSection) {
              synthesis += `\n\n**✅ Cross-Verified Data:**\n${crossSection}`;
            }
          }
          
          // Note any non-critical discrepancies (where engines saw different things but not contradictory)
          const softConflicts = comparison?.conflicts?.filter(c => !c.isContradiction) || [];
          if (softConflicts.length > 0) {
            const softSection = softConflicts.map(c => 
              `• **${c.topic}**: Visual shows "${c.geminiValue}", Text mentions "${c.openaiValue}"`
            ).join('\n');
            synthesis += `\n\n**ℹ️ Additional Context (different perspectives, not conflicts):**\n${softSection}`;
          }
          
          primaryContent = synthesis;
        }
      } else {
        // Single engine response - mark as operational truth from that engine
        const singleContent = geminiResponse.success ? geminiResponse.content : openaiResponse.content;
        const engineName = geminiResponse.success ? "Visual Analysis" : "Text Analysis";
        primaryContent = `${singleContent}\n\n---\n_Data verified by ${engineName} only. Cross-verification pending._`;
      }
      
      const sources = extractSources(primaryContent);

      // Improved verification status logic
      const verificationStatus = bothSucceeded
        ? hasTrueConflicts
          ? "conflict"
          : verified
            ? "verified"
            : hasOperationalTruths
              ? "operational-truth"
              : "not-verified"
        : geminiResponse.success
          ? "gemini-only"
          : openaiResponse.success
            ? "openai-only"
            : "error";

      console.log(`Verification: ${verificationStatus}, True conflicts: ${trueConflicts.length}, Operational truths: ${comparison?.operationalTruths?.length || 0}`);

      return new Response(
        JSON.stringify({
          content: primaryContent,
          verification: {
            status: verificationStatus,
            engines: {
              gemini: geminiResponse.success,
              openai: openaiResponse.success,
            },
            verified,
            summary: comparison?.verificationSummary || "",
          },
          engineResponses: {
            gemini: geminiResponse.success ? geminiResponse.content : null,
            openai: openaiResponse.success ? openaiResponse.content : null,
          },
          comparison: comparison ? {
            matchingPoints: comparison.matchingPoints,
            conflicts: comparison.conflicts,
            geminiOnlyPoints: comparison.geminiOnlyPoints,
            openaiOnlyPoints: comparison.openaiOnlyPoints,
            operationalTruths: comparison.operationalTruths,
            crossVerified: comparison.crossVerified,
          } : null,
          sources,
          documentsAnalyzed: documentNames,
          imagesAnalyzed: imageUrls.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single engine mode (streaming) - text only, using tier-selected model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelConfig.geminiModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: modelConfig.maxTokens,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Ask Messa error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
