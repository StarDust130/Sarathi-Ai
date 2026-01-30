import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

type ToneValue = "warm" | "spiritual" | "coach";

type TranscriptLanguage = "english" | "hinglish" | "hindi";

const DEFAULT_WHISPER_MODEL = "whisper-large-v3-turbo";
const DEFAULT_CHAT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_BASE =
  process.env.GROQ_API_BASE?.trim() || "https://api.groq.com/openai/v1";

const MAX_HISTORY_TURNS = 4;

// Microsoft Edge TTS voices (FREE - no API limits!)
// Indian voices for that divine Krishna-like feel
const EDGE_VOICE_MAP: Record<ToneValue, string> = {
  // en-IN-NeerjaNeural - Best natural Indian female voice (warm, friendly)
  warm: "en-IN-NeerjaNeural",
  // hi-IN-SwaraNeural - Hindi female voice (spiritual, divine)
  spiritual: "hi-IN-SwaraNeural",
  // en-IN-PrabhatNeural - Clear professional Indian male voice (coach)
  coach: "en-IN-PrabhatNeural",
};

// For Hindi content, use Hindi voices
const EDGE_HINDI_VOICE_MAP: Record<ToneValue, string> = {
  warm: "hi-IN-SwaraNeural",
  spiritual: "hi-IN-SwaraNeural",
  coach: "hi-IN-MadhurNeural",
};

const toneDirections: Record<ToneValue, string> = {
  warm: "- Sound like a caring, grounded best friend offering solace and validation.\n- Blend practical suggestions with gentle reassurance.",
  spiritual:
    "- Echo the wisdom of a serene spiritual guide, referencing nature or the Gita without sounding formal.\n- Keep the energy meditative yet accessible.",
  coach:
    "- Speak like a calm mindset coach balancing empathy with focused, doable steps.\n- Encourage steady progress with warm accountability.",
};

const personaLabels: Record<ToneValue, string> = {
  warm: "warm companion",
  spiritual: "soulful guide",
  coach: "gentle coach",
};

type HistoryTurn = {
  user: string;
  assistant: string;
  tone: ToneValue;
  language: TranscriptLanguage;
};

const tidy = (value: string) => value.replace(/\s+/g, " ").trim();

const clamp = (value: string, max?: number) => {
  const next = tidy(value);
  if (!max || next.length <= max) return next;
  return next.slice(0, max).trim();
};

const parseHistoryTurns = (raw: FormDataEntryValue | null): HistoryTurn[] => {
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    const turns = parsed
      .map((turn): HistoryTurn | null => {
        if (!turn || typeof turn !== "object") return null;
        const user = clamp(
          String((turn as Record<string, unknown>).user ?? ""),
          480,
        );
        const assistant = clamp(
          String((turn as Record<string, unknown>).assistant ?? ""),
          480,
        );
        if (!user || !assistant) return null;
        const tone = resolveTone(
          (turn as Record<string, unknown>).tone as FormDataEntryValue,
        );
        const languageRaw = String(
          (turn as Record<string, unknown>).language ?? "",
        ).toLowerCase();
        const language: TranscriptLanguage =
          languageRaw === "hindi"
            ? "hindi"
            : languageRaw === "hinglish"
              ? "hinglish"
              : languageRaw === "english"
                ? "english"
                : "hinglish";
        return { user, assistant, tone, language };
      })
      .filter(Boolean) as HistoryTurn[];
    if (!turns.length) return [];
    return turns.slice(-MAX_HISTORY_TURNS);
  } catch {
    return [];
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

// Microsoft Edge TTS - FREE with no API limits!
// Uses the same neural voices as Microsoft Azure but through Edge's free endpoint
async function generateEdgeTTS(
  text: string,
  voice: string,
): Promise<{ audioBuffer: ArrayBuffer; success: boolean; error?: string }> {
  try {
    // Edge TTS endpoint (free, no auth required)
    const endpoint =
      "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/token";

    // Get auth token
    const tokenRes = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Sec-MS-GEC": crypto.randomUUID().replace(/-/g, "").toUpperCase(),
        "Sec-MS-GEC-Version": "1-130.0.2849.68",
      },
    });

    if (!tokenRes.ok) {
      // Fallback: Use direct WebSocket-free approach via edge-tts proxy
      return await generateEdgeTTSFallback(text, voice);
    }

    const token = await tokenRes.text();

    // Create SSML
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
          <prosody rate="-5%" pitch="+0Hz">
            ${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </prosody>
        </voice>
      </speak>
    `.trim();

    // Synthesize speech
    const ttsRes = await fetch(
      "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: ssml,
      },
    );

    if (!ttsRes.ok) {
      return await generateEdgeTTSFallback(text, voice);
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    return { audioBuffer, success: true };
  } catch (error) {
    console.error("[edge-tts] error:", error);
    return await generateEdgeTTSFallback(text, voice);
  }
}

// Fallback using a public Edge TTS API proxy
async function generateEdgeTTSFallback(
  text: string,
  voice: string,
): Promise<{ audioBuffer: ArrayBuffer; success: boolean; error?: string }> {
  try {
    // Use a public TTS API that supports Edge voices
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodedText}`;

    const res = await fetch(ttsUrl);

    if (!res.ok) {
      // Try another free TTS service
      return await generateGoogleTTSFallback(text, voice);
    }

    const audioBuffer = await res.arrayBuffer();
    return { audioBuffer, success: true };
  } catch (error) {
    console.error("[edge-tts-fallback] error:", error);
    return await generateGoogleTTSFallback(text, voice);
  }
}

// Final fallback using Google Translate TTS (very basic but always works)
async function generateGoogleTTSFallback(
  text: string,
  voice: string,
): Promise<{ audioBuffer: ArrayBuffer; success: boolean; error?: string }> {
  try {
    // Determine language from voice
    const lang = voice.startsWith("hi-") ? "hi" : "en";
    const encodedText = encodeURIComponent(text.slice(0, 200)); // Google TTS has char limit

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;

    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      return {
        audioBuffer: new ArrayBuffer(0),
        success: false,
        error: "All TTS services failed",
      };
    }

    const audioBuffer = await res.arrayBuffer();
    return { audioBuffer, success: true };
  } catch (error) {
    console.error("[google-tts-fallback] error:", error);
    return {
      audioBuffer: new ArrayBuffer(0),
      success: false,
      error: "All TTS services failed",
    };
  }
}

const getTalkMode = (): "long" | "short" => {
  const raw = process.env.SARATHI_TALK_MODE;
  if (!raw) return "long";
  const normalized = raw.trim().toLowerCase();
  return normalized === "short" ? "short" : "long";
};

const detectTranscriptLanguage = (text: string): TranscriptLanguage => {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasNonAscii = /[^\u0000-\u007F]/.test(text);

  if (hasDevanagari || hasNonAscii) {
    return "hindi";
  }

  const lower = text.toLowerCase();
  const hindiSignals = [
    "hai",
    "nahi",
    "nahin",
    "tum",
    "kya",
    "krishna",
    "shanti",
    "achha",
    "ghar",
    "man",
    "dil",
    "mera",
    "meri",
    "mere",
    "kyun",
    "kyon",
    "kabhi",
    "batao",
    "sun",
    "bhagwan",
    "kripa",
    "sach",
    "chahiye",
    "karu",
    "karo",
    "hona",
    "zindagi",
  ];
  const englishSignals = ["the", "and", "but", "is", "are", "feel", "help"];

  const hindiScore = hindiSignals.reduce(
    (score, signal) => (lower.includes(signal) ? score + 1 : score),
    0,
  );
  const englishScore = englishSignals.reduce(
    (score, signal) => (lower.includes(signal) ? score + 1 : score),
    0,
  );

  if (hindiScore > englishScore) {
    return "hinglish";
  }

  return "english";
};

function resolveTone(rawTone: FormDataEntryValue | null): ToneValue {
  if (typeof rawTone === "string") {
    const lowered = rawTone.toLowerCase() as ToneValue;
    if (lowered === "spiritual" || lowered === "coach" || lowered === "warm") {
      return lowered;
    }
  }
  return "warm";
}

function buildSystemPrompt({
  tone,
  name,
  talkMode,
  language,
}: {
  tone: ToneValue;
  name?: string;
  talkMode: string;
  language: TranscriptLanguage;
}) {
  const persona = personaLabels[tone];
  const toneGuide = toneDirections[tone];
  const isLong = talkMode !== "short";
  const languageGuide: Record<TranscriptLanguage, string> = {
    english:
      "User spoke English → reply in clear, simple English only. No Hindi words. Keep words easy.",
    hinglish:
      "User spoke Hinglish → reply in easy Hinglish (Latin script). Keep it modern, avoid old slang.",
    hindi:
      "User spoke Hindi → reply in simple Hindi (Devanagari). Use everyday words, avoid old-timey phrases.",
  };

  return `
You are **Sarathi** — a ${persona} inspired by Lord Krishna.

**Language Rule:**
- ${languageGuide[language]}
 - Match their language every time. If they switch, you switch.

**Identity:**
- You are steady, empathetic, modern, and wise.
- ${
    name
      ? `Respectfully weave ${name} into your support when it adds warmth.`
      : "Offer companionship even if you do not know their name."
  }
- Stay grounded, practical, and poetic without being flowery.
 - No cringe slang (e.g., “arre yaar”).

**Tone Preference:**
${toneGuide}

**Response Style:**
- Keep it ${
    isLong ? "2–3 short, calm sentences" : "1 short, calm sentence"
  } that is easy to hear.
- Keep each sentence under ~16 words; use simple, everyday words.
- Sound friendly and human, not formal. Invite them to share more gently.
- Let the chosen tone (warm/spiritual/coach) guide the attitude, not the vocabulary complexity.

**Continuity:**
- Previous voice notes may appear before the newest message. Carry through the thread of emotion and practical guidance without repeating the same sentences.

**Off-Topic Filter:**
- If they ask for random fun or stray off support topics, gently redirect.
- Respond with the matching template (translate when needed):
  * English: "Please ask your real question. I am here to help you. If you just want fun, I think you are already happy 🙂"
  * Hinglish/Hindi: "Apna sachcha sawaal batao, main madad ke liye yahan hoon. Agar bas masti karni hai toh mujhe lagta hai tum khush ho 🙂"
`;
}

export async function POST(request: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      { error: "Voice service is missing required API keys." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Audio file not found in request." },
        { status: 400 },
      );
    }

    const tone = resolveTone(formData.get("tone"));
    const seekerName = tidy(String(formData.get("name") || "")).slice(0, 48);
    const historyTurns = parseHistoryTurns(formData.get("history"));

    const audioForm = new FormData();
    audioForm.append("file", file, file.name || "audio.webm");
    audioForm.append("model", DEFAULT_WHISPER_MODEL);
    audioForm.append("temperature", "0");
    audioForm.append("response_format", "json");

    const transcriptionRes = await fetch(
      `${GROQ_API_BASE}/audio/transcriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: audioForm,
      },
    );

    if (!transcriptionRes.ok) {
      const errText = await transcriptionRes.text().catch(() => "");
      console.error(
        "[voice-api] transcription error",
        transcriptionRes.status,
        errText,
      );
      return NextResponse.json(
        { error: "Unable to transcribe audio." },
        { status: 422 },
      );
    }

    const transcriptionJson = (await transcriptionRes.json()) as {
      text?: string;
      segments?: Array<{ text?: string }>;
    };
    const rawTranscript =
      transcriptionJson.text ||
      transcriptionJson.segments
        ?.map((segment) => segment.text || "")
        .join(" ") ||
      "";
    const transcriptText = tidy(rawTranscript).slice(0, 1600);

    if (!transcriptText) {
      return NextResponse.json(
        { error: "I could not hear any words—try again." },
        { status: 422 },
      );
    }

    const talkMode = getTalkMode();
    const isLong = talkMode !== "short";
    const initialLanguage = detectTranscriptLanguage(transcriptText);
    const historyLanguageTally = historyTurns.reduce(
      (acc, turn) => {
        acc[turn.language] = (acc[turn.language] || 0) + 1;
        return acc;
      },
      {} as Record<TranscriptLanguage, number>,
    );
    let language = initialLanguage;
    const hindiWeight = historyLanguageTally.hindi ?? 0;
    const hinglishWeight = historyLanguageTally.hinglish ?? 0;
    if (language !== "hindi" && hindiWeight >= 2) {
      language = "hindi";
    } else if (language === "english" && hinglishWeight >= 2) {
      language = "hinglish";
    }

    const systemPrompt = buildSystemPrompt({
      tone,
      name: seekerName,
      talkMode,
      language,
    });

    const historyMessages = historyTurns.flatMap((turn) => {
      const sequence: Array<{ role: "user" | "assistant"; content: string }> =
        [];
      if (turn.user) {
        sequence.push({ role: "user", content: clamp(turn.user, 520) });
      }
      if (turn.assistant) {
        sequence.push({
          role: "assistant",
          content: clamp(turn.assistant, 520),
        });
      }
      return sequence;
    });

    const completionRes = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_CHAT_MODEL,
        temperature: isLong ? 0.55 : 0.4,
        top_p: 0.9,
        max_tokens: isLong ? 260 : 120,
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMessages,
          { role: "user", content: transcriptText },
        ],
      }),
    });

    if (!completionRes.ok) {
      const errText = await completionRes.text().catch(() => "");
      console.error(
        "[voice-api] completion error",
        completionRes.status,
        errText,
      );
      return NextResponse.json(
        { error: "Unable to craft a reply. Try again." },
        { status: 502 },
      );
    }

    const completionJson = (await completionRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawReply = completionJson.choices?.[0]?.message?.content;
    const replyFallback =
      "Shanti rakho. Jo ho raha hai, wo bhi tumhe kuch sikhane aaya hai.";
    const reply = rawReply
      ? clamp(rawReply, isLong ? 420 : 160)
      : replyFallback;

    // Use Edge TTS with Indian voices (FREE - no API limits!)
    const preferHindiVoice = language === "hindi";
    const edgeVoice = preferHindiVoice
      ? EDGE_HINDI_VOICE_MAP[tone]
      : EDGE_VOICE_MAP[tone];

    console.log(
      `[voice-api] Using Edge TTS voice: ${edgeVoice} for language: ${language}`,
    );

    const ttsResult = await generateEdgeTTS(reply, edgeVoice);

    if (!ttsResult.success || ttsResult.audioBuffer.byteLength === 0) {
      console.error("[voice-api] Edge TTS failed:", ttsResult.error);
      // Return text response if TTS fails
      return NextResponse.json(
        {
          error: "Voice generation failed",
          code: "VOICE_GENERATION_FAILED",
          reply,
          transcript: transcriptText,
          language,
          tone,
        },
        { status: 502 },
      );
    }

    const audioBase64 = arrayBufferToBase64(ttsResult.audioBuffer);

    return NextResponse.json({
      transcript: transcriptText,
      reply,
      audioBase64,
      audioMimeType: "audio/mpeg",
      mode: talkMode,
      tone,
      language,
    });
  } catch (error) {
    console.error("[voice-api] unexpected", error);
    return NextResponse.json(
      { error: "Voice processing failed. Please try again." },
      { status: 500 },
    );
  }
}
