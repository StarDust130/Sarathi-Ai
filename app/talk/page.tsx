"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
    idle: "bg-gradient-to-br from-pink-300 via-amber-300 to-rose-300",
    recording: "bg-gradient-to-br from-rose-500 to-red-400",
    processing: "bg-gradient-to-br from-yellow-400 to-amber-500",
    speaking: "bg-gradient-to-br from-green-400 to-emerald-500",
    error: "bg-gradient-to-br from-gray-600 to-gray-800",
  };

  const orbVariants = {
    idle: { scale: [1, 1.05, 1] },
    recording: { scale: [1, 1.12, 1] },
    processing: { rotate: [0, 360] },
    speaking: { scale: [1, 1.08, 1] },
    error: { scale: [1, 1, 1] },
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
    <div className="flex min-h-screen flex-col items-center justify-between bg-[#FFF9F2] text-black font-sans">
      {/* Header */}
      <header className="w-full border-b-4 border-black bg-white p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <motion.button
            onClick={handleBack}
            className="flex items-center gap-2 rounded-full border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white shadow-[4px_4px_0_#000]"
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <IconBack />
            Back
          </motion.button>

          <motion.h1
            className="text-center text-3xl font-extrabold tracking-tight text-[#A44A1D]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            🪷 Sarathi Voice
          </motion.h1>
          <div className="w-[90px]" />
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center space-y-6 p-6 text-center">
        <motion.div
          onClick={handleOrbClick}
          animate={orbVariants[status] ?? orbVariants.idle}
          transition={
            status === "processing"
              ? { duration: 1.1, repeat: Infinity, ease: "linear" }
              : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          }
          className={`relative flex h-64 w-64 cursor-pointer items-center justify-center rounded-full border-4 border-black shadow-[10px_10px_0_#000] ${colors[status]}`}
        >
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
