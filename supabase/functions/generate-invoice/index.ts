import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[GENERATE-INVOICE] ${step}`, details ? JSON.stringify(details) : '');
};

// Canadian provincial tax rates
const TAX_RATES: Record<string, { rate: number; name: string }> = {
  'ontario': { rate: 0.13, name: 'HST' },
  'quebec': { rate: 0.14975, name: 'GST+QST' },
  'british columbia': { rate: 0.12, name: 'GST+PST' },
  'alberta': { rate: 0.05, name: 'GST' },
  'manitoba': { rate: 0.12, name: 'GST+PST' },
  'saskatchewan': { rate: 0.11, name: 'GST+PST' },
  'nova scotia': { rate: 0.15, name: 'HST' },
  'new brunswick': { rate: 0.15, name: 'HST' },
  'newfoundland': { rate: 0.15, name: 'HST' },
  'prince edward': { rate: 0.15, name: 'HST' },
  'default': { rate: 0.13, name: 'HST' },
};

function getTaxRate(address: string): { rate: number; name: string; province: string } {
  const addressLower = address.toLowerCase();
  for (const [province, tax] of Object.entries(TAX_RATES)) {
    if (province !== 'default' && addressLower.includes(province)) {
      return { ...tax, province: province.charAt(0).toUpperCase() + province.slice(1) };
    }
  }
  // Check for city names
  if (addressLower.includes('toronto')) return { ...TAX_RATES['ontario'], province: 'Ontario' };
  if (addressLower.includes('vancouver')) return { ...TAX_RATES['british columbia'], province: 'British Columbia' };
  if (addressLower.includes('montreal')) return { ...TAX_RATES['quebec'], province: 'Quebec' };
  if (addressLower.includes('calgary') || addressLower.includes('edmonton')) return { ...TAX_RATES['alberta'], province: 'Alberta' };
  
  return { ...TAX_RATES['default'], province: 'Ontario' };
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface InvoiceRequest {
  projectId: string;
  invoiceNumber?: string;
  dueDate?: string;
  notes?: string;
  discountPercent?: number;
  customLineItems?: InvoiceLineItem[];
}

// Helper: Generate trade-specific material breakdown
function getTradeSpecificBreakdown(trade: string, materialCost: number, gfa: number): InvoiceLineItem[] {
  const tradeLower = trade.toLowerCase();
  const items: InvoiceLineItem[] = [];
  
  if (tradeLower.includes('flooring') || tradeLower.includes('floor')) {
    // Flooring breakdown: primary flooring (70%), underlayment (15%), transition strips (10%), adhesive (5%)
    const primaryCost = materialCost * 0.70;
    const underlaymentCost = materialCost * 0.15;
    const transitionCost = materialCost * 0.10;
    const adhesiveCost = materialCost * 0.05;
    
    const sqftCoverage = gfa || 1000;
    const wasteMultiplier = 1.10; // 10% waste
    const grossSqft = Math.ceil(sqftCoverage * wasteMultiplier);
    
    items.push({
      description: 'Flooring Material (Engineered Hardwood / LVP)',
      quantity: grossSqft,
      unit: 'sq ft',
      unitPrice: primaryCost / grossSqft,
      total: primaryCost,
    });
    items.push({
      description: 'Underlayment / Moisture Barrier',
      quantity: grossSqft,
      unit: 'sq ft',
      unitPrice: underlaymentCost / grossSqft,
      total: underlaymentCost,
    });
    items.push({
      description: 'Transition Strips & Moldings',
      quantity: Math.ceil(sqftCoverage / 200), // ~1 per 200 sqft zone
      unit: 'pcs',
      unitPrice: transitionCost / Math.ceil(sqftCoverage / 200),
      total: transitionCost,
    });
    items.push({
      description: 'Adhesive / Fasteners',
      quantity: 1,
      unit: 'lot',
      unitPrice: adhesiveCost,
      total: adhesiveCost,
    });
  } else if (tradeLower.includes('paint')) {
    // Painting breakdown
    const paintCost = materialCost * 0.65;
    const primerCost = materialCost * 0.20;
    const suppliesCost = materialCost * 0.15;
    
    const gallons = Math.ceil((gfa || 1000) / 350); // ~350 sqft per gallon
    
    items.push({
      description: 'Premium Interior Paint (2 coats)',
      quantity: gallons * 2,
      unit: 'gallons',
      unitPrice: paintCost / (gallons * 2),
      total: paintCost,
    });
    items.push({
      description: 'Primer & Sealer',
      quantity: gallons,
      unit: 'gallons',
      unitPrice: primerCost / gallons,
      total: primerCost,
    });
    items.push({
      description: 'Tape, Drop Cloths & Supplies',
      quantity: 1,
      unit: 'kit',
      unitPrice: suppliesCost,
      total: suppliesCost,
    });
  } else if (tradeLower.includes('drywall')) {
    // Drywall breakdown
    const sheetsCost = materialCost * 0.55;
    const mudTapeCost = materialCost * 0.25;
    const fastenersCost = materialCost * 0.10;
    const cornerBeadCost = materialCost * 0.10;
    
    const sheets = Math.ceil((gfa || 1000) / 32); // 4x8 sheet = 32 sqft
    
    items.push({
      description: 'Drywall Sheets (4x8 Standard)',
      quantity: sheets,
      unit: 'sheets',
      unitPrice: sheetsCost / sheets,
      total: sheetsCost,
    });
    items.push({
      description: 'Joint Compound & Tape',
      quantity: Math.ceil(sheets / 8), // 1 bucket per 8 sheets
      unit: 'buckets',
      unitPrice: mudTapeCost / Math.ceil(sheets / 8),
      total: mudTapeCost,
    });
    items.push({
      description: 'Screws & Fasteners',
      quantity: Math.ceil(sheets / 50), // 1 box per 50 sheets
      unit: 'boxes',
      unitPrice: fastenersCost / Math.ceil(sheets / 50) || fastenersCost,
      total: fastenersCost,
    });
    items.push({
      description: 'Corner Bead & Accessories',
      quantity: 1,
      unit: 'lot',
      unitPrice: cornerBeadCost,
      total: cornerBeadCost,
    });
  } else {
    // Generic breakdown for other trades
    const mainMaterialCost = materialCost * 0.75;
    const suppliesCost = materialCost * 0.25;
    
    items.push({
      description: `${trade} - Primary Materials`,
      quantity: gfa || 1,
      unit: gfa ? 'sq ft' : 'lot',
      unitPrice: gfa ? mainMaterialCost / gfa : mainMaterialCost,
      total: mainMaterialCost,
    });
    items.push({
      description: `${trade} - Supplies & Accessories`,
      quantity: 1,
      unit: 'lot',
      unitPrice: suppliesCost,
      total: suppliesCost,
    });
  }
  
  return items;
}

// Helper: Generate labor breakdown
function getLaborBreakdown(trade: string, laborCost: number, gfa: number): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];
  const tradeLower = trade.toLowerCase();
  
  // Estimate hours based on trade and area
  let hoursPerSqft = 0.02; // Default: 50 sqft per hour
  let phases: { name: string; percent: number }[] = [];
  
  if (tradeLower.includes('flooring') || tradeLower.includes('floor')) {
    hoursPerSqft = 0.025; // 40 sqft per hour
    phases = [
      { name: 'Subfloor Preparation & Leveling', percent: 0.20 },
      { name: 'Flooring Installation', percent: 0.60 },
      { name: 'Trim & Transition Installation', percent: 0.15 },
      { name: 'Cleanup & Final Inspection', percent: 0.05 },
    ];
  } else if (tradeLower.includes('paint')) {
    hoursPerSqft = 0.015; // ~65 sqft per hour
    phases = [
      { name: 'Surface Preparation & Repairs', percent: 0.25 },
      { name: 'Priming', percent: 0.15 },
      { name: 'Paint Application (2 coats)', percent: 0.50 },
      { name: 'Cleanup & Touch-ups', percent: 0.10 },
    ];
  } else if (tradeLower.includes('drywall')) {
    hoursPerSqft = 0.03; // ~33 sqft per hour
    phases = [
      { name: 'Framing & Preparation', percent: 0.15 },
      { name: 'Drywall Hanging', percent: 0.35 },
      { name: 'Taping & Mudding (3 coats)', percent: 0.40 },
      { name: 'Sanding & Finishing', percent: 0.10 },
    ];
  } else {
    phases = [
      { name: `${trade} - Preparation`, percent: 0.20 },
      { name: `${trade} - Installation/Execution`, percent: 0.65 },
      { name: `${trade} - Finishing & Cleanup`, percent: 0.15 },
    ];
  }
  
  const totalHours = Math.ceil((gfa || 1000) * hoursPerSqft);
  const hourlyRate = laborCost / totalHours;
  
  for (const phase of phases) {
    const phaseHours = Math.ceil(totalHours * phase.percent);
    items.push({
      description: phase.name,
      quantity: phaseHours,
      unit: 'hours',
      unitPrice: hourlyRate,
      total: laborCost * phase.percent,
    });
  }
  
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id });

    const body: InvoiceRequest = await req.json();
    const { projectId, invoiceNumber, dueDate, notes, discountPercent, customLineItems } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project data
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      logStep("Project not found", { projectId, error: projectError?.message });
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project summary with financial data
    const { data: summary } = await supabaseClient
      .from("project_summaries")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch contractor profile - FULL DATA from bu_profiles
    const { data: buProfile } = await supabaseClient
      .from("bu_profiles")
      .select("company_name, phone, avatar_url, service_area, company_website, hst_number")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    
    logStep("Contractor profile loaded", { 
      companyName: buProfile?.company_name, 
      phone: buProfile?.phone,
      email: user.email 
    });

    // Extract verified facts for GFA, trade, and demolition
    const verifiedFacts = summary?.verified_facts as any[] || [];
    const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
    const tradeCitation = verifiedFacts.find((f: any) => f.cite_type === 'TRADE_SELECTION');
    const locationCitation = verifiedFacts.find((f: any) => f.cite_type === 'LOCATION');
    const demolitionCitation = verifiedFacts.find((f: any) => f.cite_type === 'DEMOLITION_PRICE');
    const siteConditionCitation = verifiedFacts.find((f: any) => f.cite_type === 'SITE_CONDITION');

    const gfaValue = gfaCitation?.metadata?.gfa_value || gfaCitation?.value || 0;
    const trade = tradeCitation?.answer || tradeCitation?.value || project.trade || 'General';
    const projectAddress = locationCitation?.metadata?.formatted_address || 
                          locationCitation?.answer || 
                          project.address || '';

    // Extract demolition cost from citation or manual entry
    let demolitionCost = 0;
    let demolitionNeeded = false;
    
    if (demolitionCitation) {
      demolitionCost = demolitionCitation.metadata?.demolition_cost || 
                       demolitionCitation.metadata?.total_cost ||
                       demolitionCitation.value || 0;
      demolitionNeeded = demolitionCost > 0;
      logStep("Demolition from citation", { cost: demolitionCost });
    } else if (siteConditionCitation?.metadata?.needs_demolition || 
               siteConditionCitation?.answer?.toLowerCase()?.includes('demolition')) {
      // Calculate from GFA if demolition is needed but no explicit cost
      const demolitionRate = 2.50; // $2.50/sq ft default
      demolitionCost = gfaValue * demolitionRate;
      demolitionNeeded = true;
      logStep("Demolition calculated from site condition", { cost: demolitionCost, gfa: gfaValue });
    }

    // Calculate tax based on location
    const taxInfo = getTaxRate(projectAddress);
    logStep("Tax info calculated", { province: taxInfo.province, rate: taxInfo.rate, demolition: demolitionCost });

    // Build line items
    let lineItems: InvoiceLineItem[] = [];
    
    if (customLineItems && customLineItems.length > 0) {
      lineItems = customLineItems;
    } else {
      // Priority 1: Use template_items from summary
      const templateItems = summary?.template_items as any[] || [];
      const lineItemsFromSummary = summary?.line_items as any[] || [];
      
      // Priority 2: Look for TEMPLATE_LOCK citation with detailed materials
      const templateLockCitation = verifiedFacts.find((f: any) => f.cite_type === 'TEMPLATE_LOCK');
      const templateMaterials = templateLockCitation?.metadata?.materials as any[] || [];
      
      if (templateItems.length > 0) {
        lineItems = templateItems.map((item: any) => ({
          description: item.name || item.description || 'Item',
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          unitPrice: item.unit_price || item.unitPrice || 0,
          total: (item.quantity || 1) * (item.unit_price || item.unitPrice || 0),
        }));
      } else if (lineItemsFromSummary.length > 0) {
        lineItems = lineItemsFromSummary.map((item: any) => ({
          description: item.name || item.description || 'Item',
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          unitPrice: item.unit_price || item.unitPrice || 0,
          total: (item.quantity || 1) * (item.unit_price || item.unitPrice || 0),
        }));
      } else if (templateMaterials.length > 0) {
        // Use materials from TEMPLATE_LOCK citation
        lineItems = templateMaterials.map((mat: any) => ({
          description: mat.name || mat.material_name || 'Material',
          quantity: mat.quantity || mat.grossQuantity || 1,
          unit: mat.unit || 'unit',
          unitPrice: mat.unit_price || mat.unitPrice || mat.price || 0,
          total: mat.total_cost || mat.totalCost || ((mat.quantity || 1) * (mat.unit_price || mat.unitPrice || mat.price || 0)),
        }));
        
        // Add labor as separate line item if we have labor cost
        if (summary?.labor_cost && summary.labor_cost > 0) {
          const laborHours = gfaValue ? Math.ceil(gfaValue / 100) : 20; // Estimate 100 sqft per hour
          lineItems.push({
            description: `${trade} Installation Labor`,
            quantity: laborHours,
            unit: 'hours',
            unitPrice: summary.labor_cost / laborHours,
            total: summary.labor_cost,
          });
        }
      } else {
        // Fallback: Create detailed breakdown from summary costs
        if (summary?.material_cost && summary.material_cost > 0) {
          // Break down material cost into sub-items based on trade
          const materialBreakdown = getTradeSpecificBreakdown(trade, summary.material_cost, gfaValue);
          lineItems.push(...materialBreakdown);
        }
        if (summary?.labor_cost && summary.labor_cost > 0) {
          // Break down labor cost
          const laborBreakdown = getLaborBreakdown(trade, summary.labor_cost, gfaValue);
          lineItems.push(...laborBreakdown);
        }
      }
    }

    // Add demolition as separate line item if applicable
    if (demolitionNeeded && demolitionCost > 0) {
      const demolitionSqft = gfaValue || 1000;
      lineItems.push({
        description: 'Site Demolition & Removal',
        quantity: demolitionSqft,
        unit: 'sq ft',
        unitPrice: demolitionCost / demolitionSqft,
        total: demolitionCost,
      });
      logStep("Added demolition line item", { cost: demolitionCost, sqft: demolitionSqft });
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = discountPercent ? (subtotal * discountPercent / 100) : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxInfo.rate;
    const grandTotal = taxableAmount + taxAmount;

    // Generate invoice number if not provided
    const generatedInvoiceNumber = invoiceNumber || 
      `INV-${project.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Update project summary with invoice data
    if (summary) {
      await supabaseClient
        .from("project_summaries")
        .update({
          invoice_id: generatedInvoiceNumber,
          invoice_status: "generated",
          total_cost: grandTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", summary.id);
    }

    logStep("Invoice generated", { 
      invoiceNumber: generatedInvoiceNumber, 
      subtotal, 
      tax: taxAmount, 
      total: grandTotal 
    });

    const invoiceData = {
      invoiceNumber: generatedInvoiceNumber,
      projectId,
      projectName: project.name,
      projectAddress,
      trade,
      gfa: gfaValue,
      gfaUnit: 'sq ft',
      
      contractor: {
        name: buProfile?.company_name || profile?.full_name || 'Contractor',
        phone: buProfile?.phone || '',
        email: user.email || '',
        address: buProfile?.service_area || '',
        website: buProfile?.company_website || '',
        province: taxInfo.province,
        hstNumber: buProfile?.hst_number || '',
      },
      
      client: {
        name: summary?.client_name || '',
        email: summary?.client_email || '',
        phone: summary?.client_phone || '',
        address: summary?.client_address || '',
      },
      
      lineItems,
      subtotal,
      discountPercent: discountPercent || 0,
      discountAmount,
      taxInfo: {
        province: taxInfo.province,
        name: taxInfo.name,
        rate: taxInfo.rate,
        amount: taxAmount,
      },
      grandTotal,
      
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: notes || '',
      generatedAt: new Date().toISOString(),
      status: 'generated',
    };

    return new Response(JSON.stringify(invoiceData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
