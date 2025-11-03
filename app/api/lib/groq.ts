// app/lib/groq.ts
import type { ChatMessage } from "@/types/chat";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL;

type GroqResult = { ok: true; reply: string; raw: any } | { ok: false; raw: any };

export async function callGroq(messages: ChatMessage[]): Promise<GroqResult> {
  if (!GROQ_KEY || !GROQ_MODEL) {
    return { ok: false, raw: { error: "Missing GROQ_API_KEY or GROQ_MODEL" } };
  }

  try {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
      }),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) return { ok: false, raw: data ?? { status: resp.status } };

    // defensive extraction
    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.text ??
      (typeof data === "string" ? data : "");

    return { ok: true, reply: String(reply ?? ""), raw: data };
  } catch (error) {
    return { ok: false, raw: error };
  }
}
