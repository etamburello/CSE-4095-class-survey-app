// Supabase Edge Function: generate survey questions via OpenAI.
// Set secret: supabase secrets set OPENAI_API_KEY=...

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) {
      return json(
        {
          error:
            "OPENAI_API_KEY is not configured. Set it with: supabase secrets set OPENAI_API_KEY=...",
        },
        503,
      )
    }

    const body = await req.json()
    const title = String(body.title ?? "")
    const description = String(body.description ?? "")
    const topic = String(body.topic ?? title)
    const count = Math.min(10, Math.max(1, Number(body.count) || 3))

    const prompt = `Generate ${count} classroom survey questions about "${topic}".
Survey title: ${title}
Description: ${description}
Return ONLY JSON: {"questions":[{"question_text":"...","question_type":"multiple_choice|true_false|short_answer|checkbox|rating_scale|numeric","choices":["..."],"rating_max":5,"min_value":0,"max_value":100}]}
Prefer a mix of types. For multiple_choice/checkbox include 3-4 choices. For true_false omit choices. For rating_scale set rating_max 5. For numeric set min/max.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write concise classroom pulse-check survey questions for instructors.",
          },
          { role: "user", content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return json(
        { error: `OpenAI request failed (${response.status}). ${detail.slice(0, 200)}` },
        502,
      )
    }

    const completion = await response.json()
    const content = completion.choices?.[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(content)
    return json({ questions: parsed.questions ?? [] })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Generation failed." },
      500,
    )
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
