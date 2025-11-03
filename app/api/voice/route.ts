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

const limitTo100Chars = (input: string) => {
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 100) return collapsed;
  return collapsed.slice(0, 100).trim();
};

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY || !process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "Missing API keys configuration." },
      { status: 500 }
    );
  }

  try {
    // 1️⃣ Parse uploaded audio
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

    // 2️⃣ Save temp file for Groq Whisper transcription
    const tempFilePath = path.join(
      tmpdir(),
      `${randomUUID()}-${file.name || "input.webm"}`
    );
    await fsPromises.writeFile(tempFilePath, buffer);

    // 3️⃣ Transcribe using Groq Whisper Turbo
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

    // 4️⃣ Generate LLaMA AI reply
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      max_completion_tokens: 512,
      top_p: 1,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are a compassionate teacher of the Bhagavad Gita. उत्तर हिंदी में दें, अधिकतम 100 अक्षरों में, और कृष्ण की शिक्षाओं से जुड़ी व्यवहारिक सलाह दें।",
        },
        { role: "user", content: transcriptText },
      ],
    });

    const draftReply =
      chatCompletion?.choices?.[0]?.message?.content?.trim() ??
      "भगवद् गीता आपको स्थिर बुद्धि और निस्वार्थ कर्म का उपदेश देती है।";

    const normalizedReply = draftReply.replace(/\s+/g, " ").trim();
    let finalReply = limitTo100Chars(normalizedReply);

    if (/[A-Za-z]/.test(finalReply)) {
      try {
        const translationCompletion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          temperature: 0.2,
          max_completion_tokens: 256,
          top_p: 0.9,
          stream: false,
          messages: [
            {
              role: "system",
              content:
                "दी गई पंक्तियों का प्राकृतिक, सरल हिंदी में अनुवाद कीजिए। उत्तर अधिकतम 100 शब्दों में हो और केवल हिंदी पाठ लौटाएँ।",
            },
            { role: "user", content: finalReply },
          ],
        });
        const translated =
          translationCompletion?.choices?.[0]?.message?.content?.trim();
        if (translated) {
          finalReply = limitTo100Chars(translated);
        }
      } catch (translationError) {
        console.warn(
          "[voice-api] Hindi translation fallback failed",
          translationError
        );
      }
    }

    if (!finalReply) {
      finalReply = limitTo100Chars(
        "भगवद् गीता स्थिर मन और निस्वार्थ कर्म की प्रेरणा देती है।"
      );
    }

    // 5️⃣ Convert text to speech via ElevenLabs
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

    // 7️⃣ Respond with transcription + audio base64
    return NextResponse.json({
      transcript: transcriptText,
      reply: finalReply,
      audioBase64: audioBuffer.toString("base64"),
      audioMimeType: mimeType,
    });
  } catch (error) {
    console.error("[voice-api] error", error);
    return NextResponse.json(
      { error: "Voice processing failed." },
      { status: 500 }
    );
  }
}
