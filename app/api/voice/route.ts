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

const VOICE_MAP: Record<ToneValue, string> = {
  warm: process.env.ELEVENLABS_WARM_VOICE_ID || "CX1mcqJxcZzy2AsgaBjn",
  spiritual:
    process.env.ELEVENLABS_SPIRITUAL_VOICE_ID ||
    process.env.ELEVENLABS_VOICE_ID ||
    "PLFXYRTU74HpuNdj6oDl",
  coach: process.env.ELEVENLABS_COACH_VOICE_ID || "ADwIQE9uvyqQvKfuWFE8",
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
          480
        );
        const assistant = clamp(
          String((turn as Record<string, unknown>).assistant ?? ""),
          480
        );
        if (!user || !assistant) return null;
        const tone = resolveTone(
          (turn as Record<string, unknown>).tone as FormDataEntryValue
        );
        const languageRaw = String(
          (turn as Record<string, unknown>).language ?? ""
        ).toLowerCase();
        const language: TranscriptLanguage =
          languageRaw === "hindi" || languageRaw === "hinglish"
            ? languageRaw
            : languageRaw === "english"
            ? "english"
            : "english";
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
    0
  );
  const englishScore = englishSignals.reduce(
    (score, signal) => (lower.includes(signal) ? score + 1 : score),
    0
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
    english: "Answer fully in English with clear, grounded sentences.",
    hinglish:
      "Reply in warm Hinglish using the Latin script, blending Hindi and English words naturally.",
    hindi:
      "Respond fully in natural, flowing Hindi using the Devanagari script. Choose vocabulary that sounds conversational and avoid awkward literal translations.",
  };

  return `
You are **Sarathi** — a ${persona} inspired by Lord Krishna.

**Language Rule:**
- ${languageGuide[language]}

**Identity:**
- You are steady, empathetic, modern, and wise.
- ${
    name
      ? `Respectfully weave ${name} into your support when it adds warmth.`
      : "Offer companionship even if you do not know their name."
  }
- Stay grounded, practical, and poetic without being flowery.

**Tone Preference:**
${toneGuide}

**Response Style:**
- Keep it ${
    isLong ? "2–3 flowing sentences" : "1 soulful sentence"
  } that is easy to listen to.
- Keep each sentence under ~18 words so the voice output feels crisp.
- Invite them to share more when it feels natural.

**Continuity:**
- Previous voice notes may appear before the newest message. Carry through the thread of emotion and practical guidance without repeating the same sentences.

**Off-Topic Filter:**
- If they ask for random fun or stray off support topics, gently redirect.
- Respond with the matching template (translate when needed):
  * English: "Please ask your question—I am here to help. If you want fun I think you are happy 🙂"
  * Hinglish/Hindi: "Apna sachcha sawaal batao, main madad ke liye yahan hoon. Agar bas masti karni hai toh mujhe lagta hai tum khush ho 🙂"
`;
}

export async function POST(request: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (!groqKey || !elevenKey) {
    return NextResponse.json(
      { error: "Voice service is missing required API keys." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Audio file not found in request." },
        { status: 400 }
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
      }
    );

    if (!transcriptionRes.ok) {
      const errText = await transcriptionRes.text().catch(() => "");
      console.error(
        "[voice-api] transcription error",
        transcriptionRes.status,
        errText
      );
      return NextResponse.json(
        { error: "Unable to transcribe audio." },
        { status: 422 }
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
        { status: 422 }
      );
    }

    const talkMode = getTalkMode();
    const isLong = talkMode !== "short";
    const initialLanguage = detectTranscriptLanguage(transcriptText);
    const historyLanguageTally = historyTurns.reduce((acc, turn) => {
      acc[turn.language] = (acc[turn.language] || 0) + 1;
      return acc;
    }, {} as Record<TranscriptLanguage, number>);
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
        errText
      );
      return NextResponse.json(
        { error: "Unable to craft a reply. Try again." },
        { status: 502 }
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

    const voiceId = VOICE_MAP[tone];
    const outputFormat =
      process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128";
    const mimeType = outputFormat.includes("mp3") ? "audio/mpeg" : "audio/wav";

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          Accept: mimeType,
        },
        body: JSON.stringify({
          text: reply,
          model_id: "eleven_multilingual_v2",
          output_format: outputFormat,
          voice_settings: {
            stability: 0.46,
            similarity_boost: 0.72,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => "");
      console.error("[voice-api] elevenlabs error", ttsRes.status, errText);
      return NextResponse.json(
        { error: "Unable to generate voice reply." },
        { status: 502 }
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);

    return NextResponse.json({
      transcript: transcriptText,
      reply,
      audioBase64,
      audioMimeType: mimeType,
      mode: talkMode,
      tone,
      language,
    });
  } catch (error) {
    console.error("[voice-api] unexpected", error);
    return NextResponse.json(
      { error: "Voice processing failed. Please try again." },
      { status: 500 }
    );
  }
}
