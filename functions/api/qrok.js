export async function onRequest(context) {
  const { request, env } = context;

  // Only GET allowed (Cloudflare likes this)
  if (request.method !== "GET") {
    return new Response("Only GET allowed", { status: 200 });
  }

  const url = new URL(request.url);
  const question = url.searchParams.get("question") || "";

  if (!question) {
    return new Response(
      JSON.stringify({ error: "Missing question" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const API_KEY = env.AI_API;

  try {
    const payload = {
      model: "grok-4",
      messages: [
        { role: "system", content: "You are a concise assistant." },
        { role: "user", content: question }
      ]
    };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    const answer =
      json?.choices?.[0]?.message?.content ||
      json?.output ||
      json?.data?.[0]?.text ||
      "No answer";

    return new Response(
      JSON.stringify({ answer }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
