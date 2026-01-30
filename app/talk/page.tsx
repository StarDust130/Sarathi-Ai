"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronDown, NotebookPen } from "lucide-react";

type Status =
  | "idle"
  | "recording"
  | "processing"
  | "speaking"
  | "error"
  | "quota-exceeded"
  | "service-blocked";

type ToneValue = "warm" | "spiritual" | "coach";

type TranscriptLanguage = "english" | "hinglish" | "hindi" | "unknown";

type ToneOption = {
  value: ToneValue;
  label: string;
  gradient: string;
  icon: string;
  tagline: string;
};

const PROFILE_KEY = "sarathi-profile";
const TONE_KEY = "sarathi-active-tone";

const toneOptions: ToneOption[] = [
  {
    value: "warm",
    label: "Warm Companion",
    gradient: "from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF]",
    icon: "🌤️",
    tagline: "Soft encouragement with grounded, friendly energy.",
  },
  {
    value: "spiritual",
    label: "Soulful Guide",
    gradient: "from-[#D6F2FF] via-[#E8FFEF] to-[#FFF4E2]",
    icon: "🪷",
    tagline: "Meditative calm with gentle Gita wisdom woven in.",
  },
  {
    value: "coach",
    label: "Gentle Coach",
    gradient: "from-[#FFE9C3] via-[#EAF0FF] to-[#FFE2F4]",
    icon: "⚡",
    tagline: "Clear, focused nudges that still feel caring and light.",
  },
];

const personaLabels: Record<ToneValue, string> = {
  warm: "warm companion",
  spiritual: "soulful guide",
  coach: "gentle coach",
};

type ConversationTurn = {
  id: string;
  user: string;
  assistant: string;
  timestamp: number;
  tone: ToneValue;
  language: TranscriptLanguage;
};

const HISTORY_KEY = "sarathi-talk-history";
const MAX_HISTORY_TURNS = 4;

function getToneGlow(tone: ToneValue) {
  switch (tone) {
    case "spiritual":
      return "radial-gradient(110% 110% at 15% 20%, rgba(209, 231, 255, 0.75), rgba(215, 255, 240, 0.16) 65%)";
    case "coach":
      return "radial-gradient(110% 110% at 80% 15%, rgba(201, 240, 255, 0.7), rgba(255, 234, 215, 0.18) 60%)";
    default:
      return "radial-gradient(125% 125% at 50% 10%, rgba(255, 224, 181, 0.72), rgba(255, 201, 219, 0.2) 62%)";
  }
}

const IconMic = () => (
  <svg
    width="50"
    height="50"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const IconStop = () => (
  <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6H18V18H6V6Z" />
  </svg>
);

const IconAlert = () => (
  <svg
    width="46"
    height="46"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function VoicePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [quotaReply, setQuotaReply] = useState(""); // Store AI reply when quota exceeded
  const [statusLabel, setStatusLabel] = useState("Tap to Speak");
  const [tone, setTone] = useState<ToneValue>("warm");
  const [profileName, setProfileName] = useState("");
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [history, setHistory] = useState<ConversationTurn[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Array<Partial<ConversationTurn>>;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((turn) => {
          if (!turn) return null;
          const user = typeof turn.user === "string" ? turn.user.trim() : "";
          const assistant =
            typeof turn.assistant === "string" ? turn.assistant.trim() : "";
          if (!user || !assistant) return null;
          const id =
            typeof turn.id === "string"
              ? turn.id
              : `rehydrate-${Math.random().toString(16).slice(2)}`;
          const timestamp =
            typeof turn.timestamp === "number" ? turn.timestamp : Date.now();
          const storedTone =
            turn.tone === "warm" ||
            turn.tone === "spiritual" ||
            turn.tone === "coach"
              ? turn.tone
              : "warm";
          const lang: TranscriptLanguage =
            turn.language === "hindi" ||
            turn.language === "hinglish" ||
            turn.language === "english"
              ? turn.language
              : "unknown";
          return {
            id,
            user,
            assistant,
            timestamp,
            tone: storedTone,
            language: lang,
          } satisfies ConversationTurn;
        })
        .filter(Boolean)
        .slice(-MAX_HISTORY_TURNS) as ConversationTurn[];
    } catch {
      return [];
    }
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const toneButtonRef = useRef<HTMLButtonElement | null>(null);
  const toneMenuRef = useRef<HTMLDivElement | null>(null);
  const recordingMimeTypeRef = useRef<string>("audio/webm");

  const activeTone =
    toneOptions.find((option) => option.value === tone) ?? toneOptions[0];
  const toneGlow = getToneGlow(activeTone.value);

  useEffect(() => {
    const labelMap: Record<Status, string> = {
      idle: "🎙️ Tap to Talk",
      recording: "🔴 Talking... Tap to Send",
      processing: "✨ Thinking...",
      speaking: "🔊 Playing...",
      error: "❌ Error!",
      "quota-exceeded": "📝 Read Below",
      "service-blocked": "📝 Read Below",
    };
    setStatusLabel(labelMap[status]);
  }, [status, activeTone.label]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedTone = window.localStorage.getItem(TONE_KEY);
      const storedProfile = window.localStorage.getItem(PROFILE_KEY);
      if (
        storedTone &&
        toneOptions.some((option) => option.value === storedTone)
      ) {
        setTone(storedTone as ToneValue);
      }

      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as {
          name?: string;
          tone?: ToneValue;
        };
        if (parsed?.name) {
          setProfileName(parsed.name);
        }
        if (
          !storedTone &&
          parsed?.tone &&
          toneOptions.some((option) => option.value === parsed.tone)
        ) {
          setTone(parsed.tone as ToneValue);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  useEffect(() => {
    if (!toneMenuOpen) return;
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        toneMenuRef.current?.contains(target) ||
        toneButtonRef.current?.contains(target)
      ) {
        return;
      }
      setToneMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToneMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [toneMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!history.length) {
        window.localStorage.removeItem(HISTORY_KEY);
      } else {
        const persistable = history.slice(-MAX_HISTORY_TURNS);
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(persistable));
      }
    } catch {
      /* ignore storage issues */
    }
  }, [history]);

  const persistTone = (value: ToneValue) => {
    setTone(value);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TONE_KEY, value);
      const storedProfile = window.localStorage.getItem(PROFILE_KEY);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as Record<string, unknown>;
        const nextProfile = {
          ...parsed,
          tone: value,
        };
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      }
    } catch {
      /* ignore storage write issues */
    }
  };

  const stopAiPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setStatus("idle");
  };

  const startRecording = async () => {
    setErrorMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("Voice capture is not available on this browser yet.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ];

      const selectedMimeType = preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      if (!selectedMimeType) {
        throw new Error("Recording format not supported on this device yet.");
      }

      recordingMimeTypeRef.current = selectedMimeType;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000,
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = stopRecordingAndProcess;
      mediaRecorderRef.current.start();
      setStatus("recording");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Please allow microphone access.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  const stopRecordingAndProcess = async () => {
    setStatus("processing");
    mediaRecorderRef.current?.stream
      ?.getTracks()
      .forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    const mimeType = recordingMimeTypeRef.current;
    const audioBlob = new Blob(audioChunksRef.current, {
      type: mimeType,
    });
    audioChunksRef.current = [];
    if (audioBlob.size < 1500) {
      setErrorMessage("I didn't hear anything. Try again.");
      setStatus("error");
      return;
    }
    const extension =
      mimeType.includes("mp4") || mimeType.includes("aac") ? "m4a" : "webm";
    const audioFile = new File([audioBlob], `recording.${extension}`, {
      type: mimeType,
    });
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("tone", activeTone.value);
    if (profileName) {
      formData.append("name", profileName);
    }
    if (history.length) {
      const recentTurns = history
        .slice(-MAX_HISTORY_TURNS)
        .map(
          ({ user, assistant, tone: priorTone, language: priorLanguage }) => ({
            user,
            assistant,
            tone: priorTone,
            language: priorLanguage,
          }),
        );
      try {
        formData.append("history", JSON.stringify(recentTurns));
      } catch {
        /* ignore serialization failure */
      }
    }

    try {
      const res = await fetch("/api/voice", { method: "POST", body: formData });
      const result = await res.json();

      // Handle voice quota exceeded - show text response instead
      if (res.status === 402 && result?.code === "VOICE_QUOTA_EXCEEDED") {
        const textReply = typeof result?.reply === "string" ? result.reply : "";
        const resolvedTranscript =
          typeof result?.transcript === "string"
            ? result.transcript.trim()
            : "";

        if (textReply) {
          setQuotaReply(textReply);
          // Still save to history even without voice
          if (resolvedTranscript && textReply) {
            const turn: ConversationTurn = {
              id: `turn-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
              user: resolvedTranscript,
              assistant: textReply,
              timestamp: Date.now(),
              tone: activeTone.value,
              language:
                result?.language === "hindi"
                  ? "hindi"
                  : result?.language === "hinglish" ||
                      result?.language === "english"
                    ? "hinglish"
                    : "unknown",
            };
            setHistory((prev) => {
              const next = [...prev, turn];
              return next.slice(-MAX_HISTORY_TURNS);
            });
          }
        }
        setStatus("quota-exceeded");
        return;
      }

      // Handle voice service blocked (401 - unusual activity detected)
      if (res.status === 401 && result?.code === "VOICE_SERVICE_BLOCKED") {
        const textReply = typeof result?.reply === "string" ? result.reply : "";
        const resolvedTranscript =
          typeof result?.transcript === "string"
            ? result.transcript.trim()
            : "";

        if (textReply) {
          setQuotaReply(textReply);
          if (resolvedTranscript && textReply) {
            const turn: ConversationTurn = {
              id: `turn-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
              user: resolvedTranscript,
              assistant: textReply,
              timestamp: Date.now(),
              tone: activeTone.value,
              language:
                result?.language === "hindi"
                  ? "hindi"
                  : result?.language === "hinglish" ||
                      result?.language === "english"
                    ? "hinglish"
                    : "unknown",
            };
            setHistory((prev) => {
              const next = [...prev, turn];
              return next.slice(-MAX_HISTORY_TURNS);
            });
          }
        }
        setStatus("service-blocked");
        return;
      }

      // Handle voice generation failed (502 - TTS service error)
      if (res.status === 502 && result?.code === "VOICE_GENERATION_FAILED") {
        const textReply = typeof result?.reply === "string" ? result.reply : "";
        const resolvedTranscript =
          typeof result?.transcript === "string"
            ? result.transcript.trim()
            : "";

        if (textReply) {
          setQuotaReply(textReply);
          if (resolvedTranscript && textReply) {
            const turn: ConversationTurn = {
              id: `turn-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
              user: resolvedTranscript,
              assistant: textReply,
              timestamp: Date.now(),
              tone: activeTone.value,
              language:
                result?.language === "hindi"
                  ? "hindi"
                  : result?.language === "hinglish" ||
                      result?.language === "english"
                    ? "hinglish"
                    : "unknown",
            };
            setHistory((prev) => {
              const next = [...prev, turn];
              return next.slice(-MAX_HISTORY_TURNS);
            });
          }
        }
        setStatus("service-blocked");
        return;
      }

      if (!res.ok) {
        const apiMessage =
          typeof result?.error === "string" ? result.error : null;
        throw new Error(apiMessage ?? "Voice reply failed.");
      }

      const audioUrl = `data:${result.audioMimeType};base64,${result.audioBase64}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onplay = () => setStatus("speaking");
      audio.onended = () => setStatus("idle");
      audio.play().catch(() => {
        audioPlayerRef.current = null;
        setErrorMessage("Playback was blocked. Tap again to listen.");
        setStatus("error");
      });

      const resolvedTranscript =
        typeof result?.transcript === "string" && result.transcript.trim()
          ? result.transcript.trim()
          : transcriptText;
      const resolvedReply =
        typeof result?.reply === "string" && result.reply.trim()
          ? result.reply.trim()
          : "";
      if (resolvedTranscript && resolvedReply) {
        const turn: ConversationTurn = {
          id: `turn-${Date.now().toString(36)}-${Math.random()
            .toString(16)
            .slice(2, 6)}`,
          user: resolvedTranscript,
          assistant: resolvedReply,
          timestamp: Date.now(),
          tone: activeTone.value,
          language:
            result?.language === "hindi"
              ? "hindi"
              : result?.language === "hinglish" ||
                  result?.language === "english"
                ? "hinglish"
                : "unknown",
        };
        setHistory((prev) => {
          const next = [...prev, turn];
          return next.slice(-MAX_HISTORY_TURNS);
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  const handleOrbClick = () => {
    if (status === "idle") startRecording();
    else if (status === "recording") mediaRecorderRef.current?.stop();
    else if (status === "speaking") stopAiPlayback();
    else if (status === "error") {
      setStatus("idle");
      setErrorMessage("");
    } else if (status === "quota-exceeded" || status === "service-blocked") {
      setStatus("idle");
      setQuotaReply("");
    }
  };

  // 🌸 Softer Sarathi color tones
  const colors: Record<Status, string> = {
    idle: "bg-linear-to-br from-[#C9E4FF] via-[#F8F4FF] to-[#FFE6CC]",
    recording: "bg-linear-to-br from-[#FB7185] via-[#F2A766] to-[#FCD58A]",
    processing: "bg-linear-to-br from-[#FFE599] via-[#FCE8D8] to-[#F3D0FF]",
    speaking: "bg-linear-to-br from-[#60F1C1] via-[#38BDF8] to-[#A855F7]",
    error: "bg-linear-to-br from-[#3F425B] via-[#272846] to-[#0F172A]",
    "quota-exceeded":
      "bg-linear-to-br from-[#FEF3C7] via-[#FDE68A] to-[#FCD34D]",
    "service-blocked":
      "bg-linear-to-br from-[#E0E7FF] via-[#C7D2FE] to-[#A5B4FC]",
  };

  const persona = personaLabels[activeTone.value] || "warm companion";
  const statusDescriptions: Record<Status, string> = {
    idle: `Tap the circle to talk 🎤`,
    recording: "Say something! Then tap again to send ✨",
    processing: "Wait a moment... 🙏",
    speaking: `Tap to stop. Listen to Sarathi! 💫`,
    error: "Oops! Tap to try again.",
    "quota-exceeded": "Read your reply below! 📖",
    "service-blocked": "Read your reply below! 📖",
  };

  const orbScaleMap: Record<Status, number[] | number> = {
    idle: [1, 1.05, 1],
    recording: [1, 1.12, 1],
    processing: 1,
    speaking: [1, 1.08, 1],
    error: 1,
    "quota-exceeded": [1, 1.03, 1],
    "service-blocked": [1, 1.02, 1],
  };

  const orbScaleTransitions: Record<Status, Transition> = {
    idle: {
      duration: 1.6,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
    recording: {
      duration: 1.2,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
    processing: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
    speaking: {
      duration: 1.4,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
    error: {
      duration: 0.8,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
    "quota-exceeded": {
      duration: 2,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
    "service-blocked": {
      duration: 2.5,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  };

  // Icon for quota exceeded - a friendly sparkle
  const IconSparkle = () => (
    <svg
      width="50"
      height="50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
    </svg>
  );

  // Icon for service blocked - a book/text icon
  const IconText = () => (
    <svg
      width="50"
      height="50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
  );

  const orbIcon =
    status === "recording" || status === "speaking" ? (
      <IconStop />
    ) : status === "error" ? (
      <IconAlert />
    ) : status === "quota-exceeded" ? (
      <IconSparkle />
    ) : status === "service-blocked" ? (
      <IconText />
    ) : (
      <IconMic />
    );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#FFF9F2] font-sans text-black">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 left-[12%] h-112 w-96 rounded-[6rem] border-4 border-black/70 bg-linear-to-br from-[#D9EDFF] via-[#F3E4FF] to-[#FFE6D1] shadow-[20px_20px_0_#00000025]"
          animate={{ rotate: [0, 4, -3, 0], y: [0, -20, 10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-56 -right-24 h-136 w-120 rounded-[6rem] border-4 border-black/70 bg-linear-to-tr from-[#B2F5EA] via-[#C7F0FF] to-[#EAD8FF] shadow-[22px_22px_0_#00000022]"
          animate={{ rotate: [0, -6, 4, 0], y: [0, -26, 12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-[#fef3c7]/45 via-[#fde2ff]/55 to-[#dbeafe]/55 blur-[220px]"
          animate={{ scale: [0.94, 1.08, 0.98], opacity: [0.4, 0.72, 0.5] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute left-1/2 top-[22%] hidden h-2.5 w-72 -translate-x-1/2 rounded-full bg-white/70 shadow-[0_0_40px_rgba(255,255,255,0.6)] md:block"
          animate={{ opacity: [0.35, 0.85, 0.35], scaleX: [0.7, 1.08, 0.9] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      {/* Header */}
      <header className="w-full border-b-4 border-black bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:py-4">
          {/* Back Button */}
          <motion.div whileHover={{ scale: 1.05 }} className="z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-[#FFE5A5] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,0.25)] sm:px-4 sm:py-1.5 sm:text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </motion.div>

          {/* Talk to Sarathi (text only, center aligned) */}
          <motion.div
            className="flex justify-center flex-1"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              href="/talk"
              className="flex items-center justify-center rounded-full border-2 border-black bg-linear-to-r from-[#F4E8FF] via-[#E4F4FF] to-[#FFEED8] px-4 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-6 sm:py-2 sm:text-sm"
            >
              Talk to Sarathi
            </Link>
          </motion.div>

          {/* Journal */}
          <motion.div
            className="flex justify-center sm:justify-end"
            whileHover={{ scale: 1.05, rotate: 1 }}
            whileTap={{ scale: 0.94 }}
          >
            <Link
              href="/journal"
              className="flex items-center justify-center gap-2 rounded-full border-2 border-black bg-linear-to-r from-[#CDEBFF] via-[#DFFFE9] to-[#FFE5FB] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-5 sm:py-2 sm:text-xs"
            >
              <NotebookPen className="h-4 w-4" />
              <span className="hidden sm:inline">Journal</span>
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center space-y-8 p-6 text-center">
        <motion.div
          className="absolute inset-x-0 top-24 mx-auto h-88 w-88 rounded-full bg-linear-to-br from-[#FFFBF5]/70 via-[#FFF5E4]/60 to-[#FFE3F4]/40 blur-3xl"
          animate={{ scale: [0.9, 1.05, 0.95], opacity: [0.4, 0.55, 0.45] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: "mirror" }}
        />

        <div className="relative z-30 flex flex-col items-center gap-2">
          <motion.button
            ref={toneButtonRef}
            type="button"
            whileHover={{ scale: 1.05, rotate: 0.4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setToneMenuOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={toneMenuOpen}
            aria-label="Select Sarathi tone"
            className={`group relative inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-linear-to-r ${activeTone.gradient} px-3 py-1 text-left text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-900 shadow-[6px_6px_0_rgba(15,23,42,0.14)] focus:outline-none sm:px-3.5 sm:py-1.5 sm:text-[0.72rem]`}
          >
            <motion.span
              key={`voice-tone-glow-${activeTone.value}`}
              className="pointer-events-none absolute inset-0 -z-10 rounded-full"
              initial={{ opacity: 0.3, scale: 0.9 }}
              animate={{ opacity: 0.55, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ background: toneGlow }}
            />
            <span
              aria-hidden="true"
              className="text-base leading-none sm:text-lg"
            >
              {activeTone.icon}
            </span>
            <span className="truncate">{activeTone.label}</span>
            <motion.span
              initial={false}
              animate={{ rotate: toneMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-900/15 bg-white/80 text-slate-700 sm:h-6 sm:w-6"
            >
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {toneMenuOpen && (
              <motion.div
                ref={toneMenuRef}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                role="listbox"
                aria-label="Voice tone selector"
                className="absolute top-[calc(100%+0.6rem)] z-40 w-56 max-w-[calc(100vw-3rem)] origin-top rounded-[1.3rem] border-[3px] border-slate-900 bg-white/95 p-1.5 text-left shadow-[10px_10px_0_rgba(15,23,42,0.16)] backdrop-blur-sm sm:w-64"
              >
                {toneOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      persistTone(option.value);
                      setToneMenuOpen(false);
                    }}
                    role="option"
                    aria-selected={tone === option.value}
                    className={`group flex w-full items-center rounded-2xl border border-transparent px-3 py-1.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/80 sm:text-[0.74rem] ${
                      tone === option.value
                        ? "border-slate-900/20 bg-slate-50/90"
                        : "hover:border-slate-900/20 hover:bg-slate-50/60"
                    }`}
                  >
                    <span className="truncate text-slate-800">
                      {option.label}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-[0.72rem]">
            {activeTone.tagline}
          </span>
        </div>
        <motion.div
          onClick={handleOrbClick}
          animate={{ scale: orbScaleMap[status] }}
          transition={orbScaleTransitions[status]}
          className={`relative flex h-64 w-64 cursor-pointer items-center justify-center rounded-full border-4 border-black shadow-[10px_10px_0_#000] ${colors[status]}`}
        >
          <motion.div
            key={status === "processing" ? "processing-halo" : "resting-halo"}
            className="pointer-events-none absolute -inset-6 rounded-full border-2 border-white/40"
            animate={
              status === "processing"
                ? { rotate: 360, opacity: [0.4, 0.75, 0.4] }
                : { rotate: 0, opacity: 0.5 }
            }
            transition={
              status === "processing"
                ? { duration: 1.1, repeat: Infinity, ease: "linear" }
                : { duration: 0.35, ease: "easeOut" }
            }
          />
          {/* --- FIX 1: ICON CONTAINER --- */}
          {/* This div now counter-rotates the icon when the status is "processing" */}
          <motion.div
            key={status} // Add key to force re-animation on status change
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: status === "processing" ? [0, -360] : 0, // Counter-rotation
            }}
            transition={
              status === "processing"
                ? { duration: 1.1, repeat: Infinity, ease: "linear" } // Sync with parent
                : { duration: 0.3, ease: "easeInOut" }
            }
            className="z-10" // Ensure icon is on top
          >
            {orbIcon}
          </motion.div>

          {/* Glow pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white/20 blur-2xl z-0"
            animate={
              status === "recording" || status === "speaking"
                ? { scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }
                : { opacity: 0 }
            }
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* --- FIX 2: NEW ANIMATED WAVES --- */}
          {(status === "recording" || status === "speaking") && (
            <>
              {/* Wave 1 */}
              <motion.div
                className={`absolute inset-0 rounded-full border-4 ${
                  status === "recording"
                    ? "border-rose-400/80"
                    : "border-emerald-400/80"
                } z-0`}
                animate={{
                  scale: [1, 1.5, 1.8],
                  opacity: [0.7, 0.3, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              {/* Wave 2 (staggered) */}
              <motion.div
                className={`absolute inset-0 rounded-full border-2 ${
                  status === "recording"
                    ? "border-rose-300/80"
                    : "border-emerald-300/80"
                } z-0`}
                animate={{
                  scale: [1, 1.4, 1.7],
                  opacity: [0.6, 0.2, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.7,
                }}
              />
            </>
          )}
        </motion.div>

        {/* Action Hint Badge - shows what tapping will do */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`hint-${status}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            {status === "idle" && (
              <motion.div
                className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                👆 Tap here to talk
              </motion.div>
            )}
            {status === "recording" && (
              <motion.div
                className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                🎤 Tap to send
              </motion.div>
            )}
            {status === "processing" && (
              <motion.div
                className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ⏳ Wait...
              </motion.div>
            )}
            {status === "speaking" && (
              <motion.div
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                🔊 Tap to stop
              </motion.div>
            )}
            {status === "error" && (
              <motion.div className="rounded-full bg-slate-700 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                🔄 Try again
              </motion.div>
            )}
            {(status === "quota-exceeded" || status === "service-blocked") && (
              <motion.div
                className="rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📖 Read below
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.h2
            key={statusLabel}
            className="text-2xl font-bold"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            {statusLabel}
          </motion.h2>
        </AnimatePresence>

        <motion.div
          key={status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-20 max-w-md rounded-3xl border-4 border-black bg-white/80 px-6 py-4 text-sm font-semibold text-[#5a4211] shadow-[10px_10px_0_#0000002c] backdrop-blur-sm"
        >
          {status === "speaking" && (
            <motion.div
              key="speaking-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="mb-2 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-[#2563eb]"
            >
              <motion.span
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatType: "mirror",
                }}
              >
                ✨
              </motion.span>
              <span className="bg-linear-to-r from-[#38BDF8] via-[#A855F7] to-[#E879F9] bg-clip-text text-transparent">
                Resonance
              </span>
              <motion.span
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatType: "mirror",
                  delay: 0.3,
                }}
              >
                ✨
              </motion.span>
            </motion.div>
          )}
          <span>{statusDescriptions[status]}</span>
        </motion.div>

        {status === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 w-full max-w-md rounded-lg border-4 border-black bg-red-500 p-3 font-semibold text-white shadow-[6px_6px_0_#000]"
          >
            {errorMessage}
          </motion.div>
        )}

        {/* Beautiful Voice Quota Exceeded Card */}
        {status === "quota-exceeded" && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-6 w-full max-w-md"
          >
            {/* Main message card */}
            <div className="relative overflow-hidden rounded-3xl border-4 border-amber-600/30 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 p-6 shadow-[8px_8px_0_rgba(217,119,6,0.15)]">
              {/* Decorative sparkles */}
              <motion.div
                className="absolute -right-2 -top-2 text-2xl"
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <motion.div
                className="absolute -left-1 bottom-4 text-lg"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              >
                🪷
              </motion.div>

              {/* Header */}
              <div className="mb-4 flex items-center justify-center gap-2">
                <span className="text-2xl">😔</span>
                <h3 className="bg-linear-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-lg font-black uppercase tracking-wide text-transparent">
                  API Limit Reached
                </h3>
                <span className="text-2xl">💫</span>
              </div>

              {/* Sweet message */}
              <p className="mb-4 text-center text-sm font-medium text-amber-800/90">
                Sorry! The voice API limit has been reached for now 🙏
                <br />
                But don&apos;t worry — here&apos;s your reply in text! 💝
              </p>

              {/* AI Reply Box */}
              {quotaReply && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="relative rounded-2xl border-2 border-amber-200 bg-white/80 p-4 shadow-inner"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-600/80">
                    <span>🙏</span>
                    <span>Sarathi says</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {quotaReply}
                  </p>
                </motion.div>
              )}

              {/* Tap to continue hint */}
              <motion.p
                className="mt-4 text-center text-xs font-semibold text-amber-600/70"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Tap the orb to continue 🌸
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Beautiful Service Blocked Card (401 - VPN/unusual activity) */}
        {status === "service-blocked" && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-6 w-full max-w-md"
          >
            {/* Main message card */}
            <div className="relative overflow-hidden rounded-3xl border-4 border-indigo-400/40 bg-linear-to-br from-indigo-50 via-purple-50 to-blue-50 p-6 shadow-[8px_8px_0_rgba(99,102,241,0.15)]">
              {/* Decorative elements */}
              <motion.div
                className="absolute -right-2 -top-2 text-2xl"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🔮
              </motion.div>
              <motion.div
                className="absolute -left-1 bottom-4 text-lg"
                animate={{ y: [0, -3, 0], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📖
              </motion.div>

              {/* Header */}
              <div className="mb-4 flex items-center justify-center gap-2">
                <span className="text-2xl">😔</span>
                <h3 className="bg-linear-to-r from-indigo-600 via-purple-500 to-blue-600 bg-clip-text text-lg font-black uppercase tracking-wide text-transparent">
                  API Limit Reached
                </h3>
                <span className="text-2xl">✨</span>
              </div>

              {/* Sweet message */}
              <p className="mb-4 text-center text-sm font-medium text-indigo-800/90">
                Sorry! The voice API limit has been reached 🙏
                <br />
                <span className="text-xs text-indigo-600/70">
                  But here&apos;s your reply in text! 💝
                </span>
              </p>

              {/* AI Reply Box */}
              {quotaReply && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="relative rounded-2xl border-2 border-indigo-200 bg-white/80 p-4 shadow-inner"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600/80">
                    <span>🙏</span>
                    <span>Sarathi&apos;s written reply</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {quotaReply}
                  </p>
                </motion.div>
              )}

              {/* Tap to continue hint */}
              <motion.p
                className="mt-4 text-center text-xs font-semibold text-indigo-600/70"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Tap the orb to continue 🪷
              </motion.p>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="w-full py-4 text-center text-sm text-gray-600">
        © 2026 Sarathi AI — Inspired by the Bhagavad Gita
      </footer>
    </div>
  );
}
