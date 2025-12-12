export async function onRequest(context) {
  try {
    const { AI_API } = context.env;
    if (!AI_API) {
      return new Response("Missing AI_API secret", { status: 500 });
    }

    const url = new URL(context.request.url);
    const question = url.searchParams.get("q");

    if (!question) {
      return new Response("Missing ?q=", { status: 400 });
    }

    // Qroc uses GET or URL-based chat request — NOT POST.
    const apiURL =
      "https://api.qroc.ai/v1/chat/completions?model=gpt-4o-mini&input=" +
      encodeURIComponent(question);

    const response = await fetch(apiURL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AI_API}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response("Qroc error: " + text, { status: 500 });
    }

    const data = await response.json();
    const text = data.output_text || data.choices?.[0]?.message?.content || "";

    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (err) {
    return new Response("Server error: " + err.message, { status: 500 });
  }
}
