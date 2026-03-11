import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const errors = [];

    const required = ["business_id","stock_level","warehouse_id","orders_per_hour","revenue_progress","delivery_time_min","cancel_rate_pct"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (body.stock_level !== undefined) {
      if (body.stock_level < 0)   errors.push("stock_level cannot be negative");
      if (body.stock_level > 100) errors.push("stock_level cannot exceed 100");
    }

    if (body.orders_per_hour !== undefined && body.orders_per_hour < 0) {
      errors.push("orders_per_hour cannot be negative");
    }

    if (body.revenue_progress !== undefined && (body.revenue_progress < 0 || body.revenue_progress > 100)) {
      errors.push("revenue_progress must be between 0 and 100");
    }

    if (body.delivery_time_min !== undefined) {
      if (body.delivery_time_min < 0)   errors.push("delivery_time_min cannot be negative");
      if (body.delivery_time_min > 300) errors.push("delivery_time_min too large — send minutes not seconds");
    }

    if (body.cancel_rate_pct !== undefined && (body.cancel_rate_pct < 0 || body.cancel_rate_pct > 100)) {
      errors.push("cancel_rate_pct must be between 0 and 100");
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: "Validation failed", details: errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("business_metrics")
      .insert({
        business_id:       body.business_id,
        stock_level:       Number(body.stock_level),
        warehouse_id:      body.warehouse_id,
        orders_per_hour:   Number(body.orders_per_hour),
        revenue_progress:  Number(body.revenue_progress),
        delivery_time_min: Number(body.delivery_time_min),
        cancel_rate_pct:   Number(body.cancel_rate_pct),
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
