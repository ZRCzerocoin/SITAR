// functions/api/qrok.js
export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight to prevent 405
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return new Response("Only POST allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Parse JSON
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const question = data?.question || "";
  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const API_KEY = env.AI_API;
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "Missing AI_API secret" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const payload = {
      model: "grok-4",
      messages: [
        { role: "system", content: "You are a concise assistant." },
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
      body: JSON.stringify(payload)
    });

    const aiJson = await aiRes.json();

    const answer =
      aiJson?.choices?.[0]?.message?.content ||
      aiJson?.output ||
      aiJson?.data?.[0]?.text ||
      "No answer returned";

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
