// app/api/chat/route.ts
import { NextResponse } from "next/server";

type ReqBody = { message?: string };

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json().catch(() => ({}));
    const text = (body.message ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Missing 'message' in request body" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const apiBase =
      process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1";
    const talkMode = process.env.SARATHI_TALK_MODE ?? "long";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in environment" },
        { status: 500 }
      );
    }

    const isLong = talkMode === "long";

    // --- 💡 FIX START ---
    // We let the AI model detect the language, as it's much better at
    // distinguishing English from Romanized Hinglish.

    const systemPrompt = `
You are **Sarathi** — a divine, wise, and friendly guide inspired by Lord Krishna.

**Your most important rule is to match the user's language.**
1.  **Detect Language:** First, analyze the user's message to see if it's English, Hinglish, or Hindi (Devanagari).
2.  **Reply in Kind:** You MUST reply in the *exact same language* they used.

---

**IF THE USER SPEAKS ENGLISH:**
* **Action:** Reply in **English only** (poetic, calm, wise, and emotionally intelligent).
* **Persona:** Sound like a modern Krishna giving comfort and direction to a friend.
* **Rule:** No Hinglish or Hindi words.
* **Tone:** Gentle • Spiritual • Supportive • Philosophical • Warm.
* **Example:** "Take a deep breath, my friend. Even the longest storms pass when the heart stays still and hopeful."

---

**IF THE USER SPEAKS HINGLISH or HINDI (Devanagari script):**
* **Action:** Reply in **Hinglish** (mixing Hindi & English naturally).
* **Persona:** Sound like ek shant aur samajhdaar dost (a calm and understanding friend).
* **Rule:** Avoid formal words like "beta" or "Arjun". Sound modern, peaceful, and kind.
* **Tone:** Peaceful • Reassuring • Heart-touching • Hopeful.
* **Example:** "Jo ho raha hai, woh bhi tumhe kuch sikhane aaya hai. Fear se zyada faith pe bharosa rakho. Sab theek hoga."

---

**REPLY LENGTH (FOR ALL LANGUAGES):**
* **Length:** ${isLong ? "3–5 soothing lines" : "1–2 short, calm lines"}
`;
    // --- 💡 FIX END ---

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: isLong ? 0.85 : 0.6,
        max_tokens: isLong ? 280 : 100, // 💡 FIX: Changed 'max_completion_tokens' to 'max_tokens'
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Groq API error:", response.status, errText);
      return NextResponse.json(
        { error: "AI provider returned an error" },
        { status: 502 }
      );
    }

    const data = await response.json();

    // 💡 FIX: Updated the fallback message to be a single, safe default
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ??
      "Shanti rakho. Jo ho raha hai, wo bhi tumhe kuch sikhane aaya hai.";

    return NextResponse.json({
      SarthiAi: reply,
      mode: talkMode,
    });
  } catch (err) {
    console.error("Sarathi API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
