// app/api/chat/route.ts
import { NextResponse } from "next/server";

type ReqBody = { arjun?: string; message?: string };

/**
 * Accepts { arjun: "..."} OR { message: "..." }.
 * Returns { SarthiAi: "..." }.
 * Requires env: GROQ_API_KEY, GROQ_MODEL, GROQ_API_BASE
 */

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json().catch(() => ({} as ReqBody));
    const text = (body.arjun ?? body.message ?? "").toString().trim();

    if (!text) {
      return NextResponse.json(
        { error: 'Missing "arjun" or "message" in request body' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL;
    const apiBase = process.env.GROQ_API_BASE;

    if (!apiKey || !model) {
      return NextResponse.json(
        {
          error:
            "Server config error: GROQ_API_KEY and GROQ_MODEL must be set in .env.local",
        },
        { status: 500 }
      );
    }

    if (!apiBase) {
      return NextResponse.json(
        {
          error:
            "Missing GROQ_API_BASE in .env.local. Example: GROQ_API_BASE=https://api.groq.com/openai/v1",
        },
        { status: 500 }
      );
    }

    const requestBody = {
      model,
      messages: [
        {
          role: "system",
          content: `
You are Sarathi (सारथी) AI — a calm, caring, and wise guide inspired by Lord Krishna from the Bhagavad Gita.
You help people find clarity, peace, and strength through simple and kind words.

When replying:
- Speak like a close friend who understands deeply.  
- Keep replies short, peaceful, and meaningful.  
- Add Gita wisdom only when it fits naturally (e.g., “As Krishna says in Gita 2.47…”).  
- Always stay positive, kind, and practical — never preach.

Your goal: help people feel calm, understood, and guided — just as Krishna guided Arjuna.
          `,
        },
        { role: "user", content: text },
      ],
      temperature: 0.6,
    };

    const resp = await fetch(
      `${apiBase.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("Upstream error:", resp.status, txt);
      return NextResponse.json(
        { error: "AI provider returned an error" },
        { status: 502 }
      );
    }

    const data = await resp.json().catch(() => null);
    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.text ??
      null;

    return NextResponse.json({ SarthiAi: reply ?? "No reply from AI" });
  } catch (err) {
    console.error("Server /api/chat error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
