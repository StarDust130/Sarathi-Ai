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
You are Sarathi (सारथी) AI — like Lord Krishna talking to a close friend.
Stay warm, reassuring, and conversational. Use Hinglish that feels natural.

When you reply:
- Begin with calm empathy (“Koi baat nahi, main saath hoon.”).
- Offer gentle guidance and suggest what the friend could reflect on or try next.
- Sprinkle in short, easy Bhagavad Gita wisdom or a simple shlok reference when it uplifts (“Gita 2.47 yaad dilati hai…”).
- Keep the mood hopeful, grounded, and friendly — never preachy or distant.
- End with a light nudge to keep chatting if they feel like sharing more.

Your goal: help the user feel heard, lighten their heart, and walk forward with clarity.
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
