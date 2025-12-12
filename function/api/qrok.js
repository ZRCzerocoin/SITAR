// functions/api/qrok.js
export async function onRequest(context) {
  const { request, env } = context;
  // Only allow POST from the site
  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }
  let data;
  try {
    data = await request.json();
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }
  const question = (data && data.question) ? String(data.question) : "";
  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question" }), { status: 400, headers: {"Content-Type":"application/json"} });
  }

  // AI API key from Cloudflare Pages secret — you said precisely "AI_API"
  const API_KEY = env.AI_API;

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured: missing AI_API secret" }), { status: 500, headers: {"Content-Type":"application/json"} });
  }

  try {
    // Using xAI / Grok chat endpoint shape as an example (docs: https://docs.x.ai/docs/tutorial).
    // If you use a different provider, update URL and body accordingly.
    const payload = {
      model: "grok-4",
      messages: [
        { role: "system", content: "You are a concise assistant. Answer briefly and clearly." },
        { role: "user", content: question }
      ],
      stream: false
    };

    const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      // increase timeout if necessary via fetch options in Cloudflare if supported
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI provider error", details: t }), { status: 502, headers: {"Content-Type":"application/json"} });
    }

    const aiJson = await aiRes.json();

    // The xAI response shape often contains { choices: [{ message: { content: "..." } }] } or similar.
    // We try several common spots.
    let answerText = "";

    // Try common shapes robustly:
    if (aiJson.choices && aiJson.choices[0] && aiJson.choices[0].message && aiJson.choices[0].message.content) {
      answerText = aiJson.choices[0].message.content;
    } else if (aiJson.output && typeof aiJson.output === "string") {
      answerText = aiJson.output;
    } else if (aiJson.data && aiJson.data[0] && aiJson.data[0].text) {
      answerText = aiJson.data[0].text;
    } else {
      // fallback: stringify trimmed
      answerText = JSON.stringify(aiJson).slice(0, 2000);
    }

    // sanitize a little (strip leading/trailing whitespace)
    answerText = (answerText || "").toString().trim();

    return new Response(JSON.stringify({ answer: answerText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: err.message }), { status: 500, headers: {"Content-Type":"application/json"} });
  }
}
