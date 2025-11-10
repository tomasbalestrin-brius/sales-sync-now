import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, leadName, leadPhone, leadEmail, tableName } = await req.json();

    // Get webhook URL from environment variable
    const WEBHOOK_URL = Deno.env.get("EXTERNAL_WEBHOOK_URL");
    
    if (!WEBHOOK_URL) {
      throw new Error("EXTERNAL_WEBHOOK_URL not configured");
    }

    // Prepare webhook payload
    const webhookPayload = {
      lead_id: leadId,
      lead_name: leadName,
      lead_phone: leadPhone,
      lead_email: leadEmail,
      table_name: tableName,
      timestamp: new Date().toISOString(),
    };

    console.log("Sending webhook to:", WEBHOOK_URL);
    console.log("Payload:", webhookPayload);

    // Send webhook to external system
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add authentication header if needed
        // "Authorization": `Bearer ${Deno.env.get("EXTERNAL_WEBHOOK_TOKEN")}`,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Webhook response:", result);

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in schedule-lead-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
