// app/api/chat/route.ts
import { NextResponse } from "next/server";

type QuizAnswer = { id: string; question: string; answer: string };
type TaskPayload = {
  text: string;
  karma?: number;
  category?: string;
  note?: string;
  done?: boolean;
};

type ReqBody = {
  message?: string;
  name?: string;
  tone?: string;
  quizAnswers?: QuizAnswer[];
  problemSummary?: string;
  tasks?: TaskPayload[];
  requestTasks?: boolean;
};

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

    const safeName = (body.name ?? "")
      .replace(/[^\p{L}\p{N}\s'\-]/gu, "")
      .slice(0, 48);
    const toneKey = (body.tone ?? "warm").toLowerCase();
    const toneGuide = getToneDirections(toneKey);
    const quizSummary = Array.isArray(body.quizAnswers)
      ? body.quizAnswers
          .slice(0, 6)
          .map((item) => `${item.question}: ${item.answer}`)
          .join(" | ")
      : "";
    const problemSummary = (body.problemSummary ?? "").slice(0, 480);
    const taskSnapshot = Array.isArray(body.tasks)
      ? body.tasks
          .slice(0, 5)
          .map((task) => `• ${task.text}${task.done ? " (done)" : ""}`)
          .join("\n")
      : "";
    const requestTasks = Boolean(body.requestTasks);

    const systemPrompt = `
You are **Sarathi** — a divine, wise, and friendly guide inspired by Lord Krishna.

  **Most important rule: match the user's language.**
  1) Detect if they use English, Hinglish (Hindi + English in Latin script), or Hindi (Devanagari).
  2) Reply in the same language.
  3) If English: use clear, simple English (no Hindi words). If Hindi: respond in simple Hindi. If Hinglish: respond in easy Hinglish. Avoid cringe slang like "arre yaar".

---

**Identity & Relationship Guidance:**
${
  safeName
    ? `- The seeker's name is ${safeName}. Use their name naturally and respectfully when it deepens warmth.
`
    : "- The seeker has not yet shared a name. Offer gentle companionship regardless.\n"
}
- You speak with steadiness, empathy, and modern kindness rooted in timeless wisdom.
  - Stay grounded, practical, and actionable while staying simple and human.

**Tone Preference:**
${toneGuide}

**Emotional Snapshot:**
${
  quizSummary ||
  "No screening responses yet — gently invite reflections when appropriate."
}

**Core Concern:**
${
  problemSummary ||
  "They have not described their concern yet; invite them to share when they are ready."
}

**Active Daily Tasks (local to the user):**
${
  taskSnapshot ||
  "No tracked tasks yet. Suggest gentle micro-actions when helpful."
}

---

**Response Style:**
- Use short sentences (under ~16 words) and the simplest words possible.
- Keep it to ${isLong ? "3–5 lines" : "1–2 lines"} that are calm and warm.
- Prefer compact numbered or bulleted lines over dense paragraphs.
- Mirror the tone (warm/spiritual/coach) through attitude, not fancy vocabulary.
- No cringe slang; no archaic or overly poetic phrasing.

**Off-Topic Filter:**
- If the seeker sends playful, random, or irrelevant chatter (not a real concern or request for support), politely steer them back.
- Respond with the template below, translating it into their language when needed, and do not add extra commentary:
  * English template: "Please ask your question—I am here to help. If you want fun I think you are happy 🙂"
  * Hinglish/Hindi template: "Apna sachcha sawaal batao, main madad ke liye yahan hoon. Agar bas masti karni hai toh mujhe lagta hai tum khush ho 🙂"

---

**IF THE USER SPEAKS ENGLISH:**
* Action: Reply in simple, clear English only.
* Persona: Modern Krishna giving comfort to a friend.
* Rule: No Hinglish or Hindi words; avoid fancy phrases.
* Tone: Gentle • Supportive • Warm • Calm.

**IF THE USER SPEAKS HINGLISH or HINDI (Devanagari script):**
* Action: Reply in the same language they used (Hinglish stays Hinglish; Hindi stays Hindi).
* Persona: Ek shant, samajhdaar dost.
* Rule: Avoid formal words like "beta" or "Arjun". No "arre yaar". Keep it modern and simple.
* Tone: Peaceful • Reassuring • Hopeful.

**REPLY LENGTH:**
* Length: ${isLong ? "3–5 calm lines" : "1–2 calm lines"}

${
  requestTasks
    ? getTaskPromptAddendum({ safeName, problemSummary, quizSummary })
    : ""
}
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
    const rawContent =
      data?.choices?.[0]?.message?.content?.trim() ??
      "Shanti rakho. Jo ho raha hai, wo bhi tumhe kuch sikhane aaya hai.";

    if (requestTasks) {
      const parsed = coerceTaskPayload(rawContent);
      return NextResponse.json({
        SarthiAi: parsed.reply,
        mode: talkMode,
        tasks: parsed.tasks,
        raw: rawContent,
      });
    }

    return NextResponse.json({
      SarthiAi: rawContent,
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

function getToneDirections(tone: string) {
  const guides: Record<string, string> = {
    warm: "- Sound like a caring, grounded best friend offering solace and validation.\n- Blend practical suggestions with gentle reassurance.",
    spiritual:
      "- Echo the wisdom of a serene spiritual guide, referencing metaphors from nature and the Gita without sounding formal.\n- Keep the energy meditative yet accessible.",
    coach:
      "- Speak like a calm mindset coach who balances empathy with simple, focused action steps.\n- Encourage steady progress with warm accountability.",
  };
  return guides[tone] ?? guides.warm;
}

function getTaskPromptAddendum({
  safeName,
  problemSummary,
  quizSummary,
}: {
  safeName: string;
  problemSummary: string;
  quizSummary: string;
}) {
  const focusLine = problemSummary
    ? `- Anchor every task in this immediate focus: ${problemSummary}`
    : quizSummary
    ? `- Use their latest check-in cues: ${quizSummary}`
    : "- They haven't shared specifics yet, so choose universally grounding micro-steps.";

  const nameLine = safeName
    ? `- Weave ${safeName}'s name softly in the reply if it adds warmth.`
    : "";

  return `
**TASK GENERATION MODE (DEVELOPER INSTRUCTION):**
- The user specifically asked for gentle daily tasks. Reply with JSON enclosed in a Markdown code fence using this exact structure:

\`\`\`json
{
  "reply": "warm, empathetic short message matching their language",
  "tasks": [
    {
      "text": "short actionable task",
      "karma": 10,
      "category": "mind" | "body" | "connection" | "rest" | "expression",
      "note": "optional extra guidance"
    }
  ]
}
\`\`\`

${focusLine}
- Each task must respond directly to what they're moving through today—no generic productivity chores.
- Tailor intensity to their bandwidth; keep actions compassionate, specific, and achievable in one sitting.
- Provide 3 tasks at most. Keep each task under 80 characters and ensure categories match the allowed list.
- Use the "note" field to tie the task back to their focus or emotional state.
- The "reply" value must be 1–2 warm sentences (no bullet points or numbering) explaining how these tasks support them and noting that they're saved in the journal. ${nameLine}
- Match the user's language (English vs Hinglish/Hindi) exactly as instructed above.
- Output valid JSON only; no prose outside the code fence.
`;
}

function coerceTaskPayload(content: string) {
  const jsonMatch = content.match(/```json([\s\S]*?)```/i);
  const fallbackReply =
    content.replace(/```json[\s\S]*?```/gi, "").trim() ||
    "Shanti rakho. Jo ho raha hai, wo bhi tumhe kuch sikhane aaya hai.";

  if (!jsonMatch) {
    return { reply: fallbackReply, tasks: [] as TaskPayload[] };
  }

  const rawJson = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(rawJson);
    const reply =
      typeof parsed?.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : fallbackReply;
    const tasks = Array.isArray(parsed?.tasks)
      ? parsed.tasks
          .map((task: TaskPayload) => ({
            text: typeof task?.text === "string" ? task.text.trim() : "",
            karma:
              typeof task?.karma === "number"
                ? Math.max(0, Math.round(task.karma))
                : undefined,
            category:
              typeof task?.category === "string"
                ? task.category.slice(0, 32)
                : undefined,
            note:
              typeof task?.note === "string"
                ? task.note.slice(0, 120)
                : undefined,
          }))
          .filter((task) => task.text)
          .slice(0, 3)
      : [];
    return { reply, tasks };
  } catch (error) {
    console.error("Failed to parse AI task payload", error);
    return { reply: fallbackReply, tasks: [] as TaskPayload[] };
  }
}
