import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

class ResendClient {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async send(options: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }
    
    return response.json();
  }
}

const resend = new ResendClient(RESEND_API_KEY || "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractEmailRequest {
  clientEmail: string;
  clientName: string;
  contractorName: string;
  projectName: string;
  contractUrl: string;
  totalAmount?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientEmail, 
      clientName, 
      contractorName, 
      projectName, 
      contractUrl,
      totalAmount 
    }: ContractEmailRequest = await req.json();

    // Validate required fields
    if (!clientEmail || !clientName || !contractUrl) {
      throw new Error("Missing required fields: clientEmail, clientName, contractUrl");
    }

    const formattedAmount = totalAmount 
      ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(totalAmount)
      : null;

    const emailResponse = await resend.send({
      from: "BuildUnion <admin@buildunion.ca>",
      to: [clientEmail],
      subject: `Contract Ready for Review: ${projectName || 'Your Project'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #d97706; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .amount { font-size: 28px; font-weight: bold; color: #059669; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BuildUnion</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${clientName}</strong>,</p>
              
              <p>${contractorName || 'Your contractor'} has prepared a contract for your review${projectName ? ` for <strong>${projectName}</strong>` : ''}.</p>
              
              ${formattedAmount ? `<p class="amount">${formattedAmount}</p>` : ''}
              
              <p>Please review the contract details and sign electronically when ready:</p>
              
              <p style="text-align: center;">
                <a href="${contractUrl}" class="button">View & Sign Contract</a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">
                This link is secure and unique to you. You can view the contract details, ask questions, and sign electronically when ready.
              </p>
            </div>
            <div class="footer">
              <p>This email was sent by BuildUnion on behalf of ${contractorName || 'your contractor'}.</p>
              <p>© ${new Date().getFullYear()} BuildUnion. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Contract email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contract-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
