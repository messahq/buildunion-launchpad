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

    // Fetch contractor profile
    const { data: buProfile } = await supabaseClient
      .from("bu_profiles")
      .select("company_name, phone, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    // Extract verified facts for GFA and trade
    const verifiedFacts = summary?.verified_facts as any[] || [];
    const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
    const tradeCitation = verifiedFacts.find((f: any) => f.cite_type === 'TRADE_SELECTION');
    const locationCitation = verifiedFacts.find((f: any) => f.cite_type === 'LOCATION');

    const gfaValue = gfaCitation?.metadata?.gfa_value || gfaCitation?.value || 0;
    const trade = tradeCitation?.answer || tradeCitation?.value || project.trade || 'General';
    const projectAddress = locationCitation?.metadata?.formatted_address || 
                          locationCitation?.answer || 
                          project.address || '';

    // Calculate tax based on location
    const taxInfo = getTaxRate(projectAddress);
    logStep("Tax info calculated", { province: taxInfo.province, rate: taxInfo.rate });

    // Build line items
    let lineItems: InvoiceLineItem[] = [];
    
    if (customLineItems && customLineItems.length > 0) {
      lineItems = customLineItems;
    } else {
      // Generate default line items from template_items or summary
      const templateItems = summary?.template_items as any[] || [];
      const lineItemsFromSummary = summary?.line_items as any[] || [];
      
      // Use template_items if available
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
      } else {
        // Fallback: use summary costs
        if (summary?.material_cost && summary.material_cost > 0) {
          lineItems.push({
            description: `${trade} Materials`,
            quantity: gfaValue || 1,
            unit: gfaValue ? 'sq ft' : 'lot',
            unitPrice: gfaValue ? summary.material_cost / gfaValue : summary.material_cost,
            total: summary.material_cost,
          });
        }
        if (summary?.labor_cost && summary.labor_cost > 0) {
          lineItems.push({
            description: `${trade} Labor`,
            quantity: gfaValue || 1,
            unit: gfaValue ? 'sq ft' : 'lot',
            unitPrice: gfaValue ? summary.labor_cost / gfaValue : summary.labor_cost,
            total: summary.labor_cost,
          });
        }
      }
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
