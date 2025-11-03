"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, NotebookPen } from "lucide-react";

type Status = "idle" | "recording" | "processing" | "speaking" | "error";

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

const IconBack = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function VoicePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusLabel, setStatusLabel] = useState("Tap to Speak");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const labelMap: Record<Status, string> = {
      idle: "Tap to Speak",
      recording: "Listening... (Tap to stop)",
      processing: "Thinking...",
      speaking: "Speaking... (Tap to stop)",
      error: "Error",
    };
    setStatusLabel(labelMap[status]);
  }, [status]);

  const stopAiPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setStatus("idle");
  };

  const handleBack = () => {
    if (status === "speaking") stopAiPlayback();
    if (status === "recording") mediaRecorderRef.current?.stop();
    router.back();
  };

  const startRecording = async () => {
    setErrorMessage("");
    setStatus("recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = stopRecordingAndProcess;
      mediaRecorderRef.current.start();
    } catch {
      setErrorMessage("Please allow microphone access.");
      setStatus("error");
    }
  };

  const stopRecordingAndProcess = async () => {
    setStatus("processing");
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    if (audioBlob.size < 1500) {
      setErrorMessage("I didn't hear anything. Try again.");
      setStatus("error");
      return;
    }
    const audioFile = new File([audioBlob], "recording.webm");
    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const res = await fetch("/api/voice", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const result = await res.json();

      const audioUrl = `data:${result.audioMimeType};base64,${result.audioBase64}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onplay = () => setStatus("speaking");
      audio.onended = () => setStatus("idle");
      audio.play();
    } catch {
      setErrorMessage("Something went wrong. Try again.");
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
    }
  };

  // 🌸 Softer Sarathi color tones
  const colors = {
    idle: "bg-gradient-to-br from-[#C9E4FF] via-[#F8F4FF] to-[#FFE6CC]",
    recording: "bg-gradient-to-br from-[#FB7185] via-[#F2A766] to-[#FCD58A]",
    processing: "bg-gradient-to-br from-[#FFE599] via-[#FCE8D8] to-[#F3D0FF]",
    speaking: "bg-gradient-to-br from-[#60F1C1] via-[#38BDF8] to-[#A855F7]",
    error: "bg-gradient-to-br from-[#3F425B] via-[#272846] to-[#0F172A]",
  };

  const statusDescriptions: Record<Status, string> = {
    idle: "Tap the lotus orb to begin your guided exchange.",
    recording: "Share your truth—Sarathi is listening with grace.",
    processing: "Wisdom is distilling in the ether. Stay centered.",
    speaking: "Let Sarathi’s insight flow back like a moonlit tide.",
    error: "The link trembled—reset and invoke the voice again.",
  };

  const orbScaleMap: Record<Status, number[] | number> = {
    idle: [1, 1.05, 1],
    recording: [1, 1.12, 1],
    processing: 1,
    speaking: [1, 1.08, 1],
    error: 1,
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
  };

  const orbVariants = {
    idle: { scale: [1, 1.05, 1], rotate: 0 },
    recording: { scale: [1, 1.12, 1], rotate: 0 },
    processing: { scale: 1, rotate: [0, 360] },
    speaking: { scale: [1, 1.08, 1], rotate: 0 },
    error: { scale: [1, 1, 1], rotate: 0 },
  };

  const orbIcon =
    status === "recording" || status === "speaking" ? (
      <IconStop />
    ) : status === "error" ? (
      <IconAlert />
    ) : (
      <IconMic />
    );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#FFF9F2] font-sans text-black">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 left-[12%] h-[28rem] w-[24rem] rounded-[6rem] border-4 border-black/70 bg-gradient-to-br from-[#D9EDFF] via-[#F3E4FF] to-[#FFE6D1] shadow-[20px_20px_0_#00000025]"
          animate={{ rotate: [0, 4, -3, 0], y: [0, -20, 10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-14rem] right-[-6rem] h-[34rem] w-[30rem] rounded-[6rem] border-4 border-black/70 bg-gradient-to-tr from-[#B2F5EA] via-[#C7F0FF] to-[#EAD8FF] shadow-[22px_22px_0_#00000022]"
          animate={{ rotate: [0, -6, 4, 0], y: [0, -26, 12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#fef3c7]/45 via-[#fde2ff]/55 to-[#dbeafe]/55 blur-[220px]"
          animate={{ scale: [0.94, 1.08, 0.98], opacity: [0.4, 0.72, 0.5] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute left-1/2 top-[22%] hidden h-[10px] w-[18rem] -translate-x-1/2 rounded-full bg-white/70 shadow-[0_0_40px_rgba(255,255,255,0.6)] md:block"
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
              className="flex items-center justify-center rounded-full border-2 border-black bg-gradient-to-r from-[#F4E8FF] via-[#E4F4FF] to-[#FFEED8] px-4 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-6 sm:py-2 sm:text-sm"
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
              className="flex items-center justify-center gap-2 rounded-full border-2 border-black bg-gradient-to-r from-[#CDEBFF] via-[#DFFFE9] to-[#FFE5FB] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-5 sm:py-2 sm:text-xs"
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
          className="absolute inset-x-0 top-24 mx-auto h-[22rem] w-[22rem] rounded-full bg-gradient-to-br from-[#FFFBF5]/70 via-[#FFF5E4]/60 to-[#FFE3F4]/40 blur-3xl"
          animate={{ scale: [0.9, 1.05, 0.95], opacity: [0.4, 0.55, 0.45] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: "mirror" }}
        />
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
              <span className="bg-gradient-to-r from-[#38BDF8] via-[#A855F7] to-[#E879F9] bg-clip-text text-transparent">
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
      </main>

      <footer className="w-full py-4 text-center text-sm text-gray-600">
        © 2025 Sarathi AI — Inspired by the Bhagavad Gita
      </footer>
    </div>
  );
}
