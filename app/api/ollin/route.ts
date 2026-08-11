export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "no_key", message: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 501 }
    );
  }
  let body: { system?: string; messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Invalid JSON." }, { status: 400 });
  }
  const messages = (body.messages || []).slice(-12);
  if (!messages.length) {
    return Response.json({ error: "bad_request", message: "No messages." }, { status: 400 });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: body.system || "",
        messages,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return Response.json(
        { error: "api_error", message: data?.error?.message || "Anthropic API error." },
        { status: r.status }
      );
    }
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();
    return Response.json({ text });
  } catch (e) {
    return Response.json(
      { error: "network", message: e instanceof Error ? e.message : "Network error." },
      { status: 502 }
    );
  }
}
