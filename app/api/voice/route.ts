import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { tmpdir } from "os";
import path from "path";
import { Readable } from "stream";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

// Convert ElevenLabs stream to Buffer
async function elevenLabsResultToBuffer(result: unknown): Promise<Buffer> {
  if (!result) throw new Error("Empty ElevenLabs response");
  if (Buffer.isBuffer(result)) return result;

  if (result instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of result) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (typeof (result as any)[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of result as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (typeof (result as any).arrayBuffer === "function") {
    return Buffer.from(await (result as any).arrayBuffer());
  }

  if (typeof (result as any).getReader === "function") {
    const reader = (result as any).getReader();
    const parts: Buffer[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const chunk =
          value instanceof Uint8Array ? value : new Uint8Array(value);
        parts.push(Buffer.from(chunk));
      }
    }
    return Buffer.concat(parts);
  }

  throw new Error("Unsupported ElevenLabs response type.");
}

const tidyReply = (input: string) => input.replace(/\s+/g, " ").trim();
const clampReply = (input: string, max?: number) => {
  const text = tidyReply(input);
  if (!max) return text;
  return text.length <= max ? text : text.slice(0, max).trim();
};
const getTalkMode = () =>
  (process.env.SARATHI_TALK_MODE ?? "long").toString().trim().toLowerCase();

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY || !process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "Missing API keys configuration." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFilePath = path.join(
      tmpdir(),
      `${randomUUID()}-${file.name || "input.webm"}`
    );
    await fsPromises.writeFile(tempFilePath, buffer);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let transcriptText: string | undefined;
    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-large-v3-turbo",
        temperature: 0,
        response_format: "verbose_json",
      });
      transcriptText = transcription?.text?.trim();
    } finally {
      await fsPromises.unlink(tempFilePath).catch(() => {});
    }

    if (!transcriptText) {
      return NextResponse.json(
        { error: "Unable to transcribe audio." },
        { status: 422 }
      );
    }

    // ⚙️ Mode toggle (you can switch in .env)
    const talkMode = getTalkMode();
    const isLongMode = talkMode !== "short";
    const maxChars = isLongMode ? undefined : 100;
    const lengthHint = isLongMode
      ? "Long mode is ON. Reply in 2-3 flowing sentences (around 220-320 characters) that feel friendly and quick to listen to."
      : "Short mode is ON. Reply in a single soulful line under 100 characters.";

    // 🎯 Fast + natural Krishna style (Hinglish)
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: isLongMode ? 0.58 : 0.42,
      max_completion_tokens: isLongMode ? 220 : 80,
      top_p: 0.88,
      messages: [
        {
          role: "system",
          content: `
You are Sarathi AI — Krishna speaking to a dear friend in easy Hinglish.
Start with gentle reassurance (“Koi baat nahi, main yahin hoon.”).
Share practical, uplifting guidance and invite them to keep opening up.
Weave in a light Bhagavad Gita hint when it truly helps (“Gita 2.47 yaad dilati hai…”).
Keep the vibe hopeful, grounded, and non-preachy.
If the friend sounds cheerful, celebrate that mood and suggest what else you both can explore.
${lengthHint}
          `,
        },
        { role: "user", content: transcriptText },
      ],
    });

    const rawReply =
      chatCompletion?.choices?.[0]?.message?.content ??
      "Geeta kehti hai, apna kartavya karo bina fal ki chinta ke.";
    let finalReply = clampReply(rawReply, maxChars);

    if (isLongMode && finalReply.length < 200) {
      try {
        const expansion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          temperature: 0.55,
          max_completion_tokens: 220,
          top_p: 0.9,
          messages: [
            {
              role: "system",
              content: `
You are refining your own Sarathi reply. Expand it to ~220-320 characters, keep the same warmth, Hinglish tone, and guidance. Stay quick, friendly, and conversational.
            `,
            },
            {
              role: "user",
              content: `Original reply: "${finalReply}"\nListener said: "${transcriptText}"`,
            },
          ],
        });
        const expanded = expansion?.choices?.[0]?.message?.content;
        if (expanded) finalReply = clampReply(expanded, 360);
      } catch {
        // keep original if expansion fails
      }
    }

    if (!isLongMode && /^[A-Za-z\s.,!?'"-]+$/.test(finalReply)) {
      try {
        const translation = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          max_completion_tokens: 100,
          messages: [
            {
              role: "system",
              content:
                "Convert this English text to warm, emotional Hinglish (mix of Hindi + English, friendly tone, short and natural). Return only text.",
            },
            { role: "user", content: finalReply },
          ],
        });
        const translated = translation?.choices?.[0]?.message?.content?.trim();
        if (translated) finalReply = clampReply(translated, maxChars);
      } catch {
        /* ignore */
      }
    }

    finalReply = clampReply(finalReply, isLongMode ? 360 : 100);

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY!,
    });

    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "PLFXYRTU74HpuNdj6oDl";
    const outputFormat =
      process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_128";
    const mimeType = outputFormat.includes("mp3") ? "audio/mpeg" : "audio/wav";

    const ttsResult = await elevenlabs.textToSpeech.convert(voiceId, {
      text: finalReply,
      modelId: "eleven_multilingual_v2",
      outputFormat,
    });
    const audioBuffer = await elevenLabsResultToBuffer(ttsResult);

    return NextResponse.json({
      transcript: transcriptText,
      reply: finalReply,
      audioBase64: audioBuffer.toString("base64"),
      audioMimeType: mimeType,
      mode: talkMode,
    });
  } catch (error) {
    console.error("[voice-api] error", error);
    return NextResponse.json(
      { error: "Voice processing failed." },
      { status: 500 }
    );
  }
}
