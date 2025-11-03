"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Status = "idle" | "recording" | "processing" | "speaking" | "error";

const IconMic = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
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
  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6H18V18H6V6Z" />
  </svg>
);

const IconAlert = () => (
  <svg
    width="48"
    height="48"
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
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    switch (status) {
      case "idle":
        setStatusLabel("Tap to Speak");
        break;
      case "recording":
        setStatusLabel("Listening... (Tap to stop)");
        break;
      case "processing":
        setStatusLabel("Thinking...");
        break;
      case "speaking":
        setStatusLabel("Speaking... (Tap to stop)");
        break;
      case "error":
        setStatusLabel("Error");
        break;
    }
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

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstart = () => {
        setStatus("recording");
      };

      mediaRecorderRef.current.onstop = stopRecordingAndProcess;
      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Microphone error:", err);
      setErrorMessage("Microphone access denied. Please allow microphone permissions.");
      setStatus("error");
    }
  };

  const stopRecordingAndProcess = async () => {
    setStatus("processing");

    if (mediaRecorderRef.current) {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      if (audioBlob.size < 1500) {
        setErrorMessage("I didn't hear anything. Please try speaking again.");
        setStatus("error");
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const audioFile = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioFile);

      try {
        const response = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API failed with status ${response.status}`);
        }

        const result = await response.json();

        if (!result.audioBase64) {
          setErrorMessage("The AI didn't provide an audio response.");
          setStatus("error");
          return;
        }

        const audioUrl = `data:${result.audioMimeType};base64,${result.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        audio.onplay = () => setStatus("speaking");
        audio.onended = () => setStatus("idle");
        audio.onpause = () => {
          if (status === "speaking") {
            setStatus("idle");
          }
        };
        audio.onerror = () => {
          setErrorMessage("Failed to play AI audio.");
          setStatus("error");
        };

        audio.play();
      } catch (err) {
        console.error("Error processing audio:", err);
        setErrorMessage("An error occurred. Please try again.");
        setStatus("error");
      } finally {
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
      }
    }
  };

  const handleOrbClick = () => {
    switch (status) {
      case "idle":
        startRecording();
        break;
      case "recording":
        mediaRecorderRef.current?.stop();
        break;
      case "processing":
        break;
      case "speaking":
        stopAiPlayback();
        break;
      case "error":
        setStatus("idle");
        setErrorMessage("");
        break;
    }
  };

  let orbBgClass = "bg-blue-500 hover:bg-blue-600";
  let orbShadowClass = "shadow-[12px_12px_0_#000]";
  let orbAnimate = {};
  let orbIcon = <IconMic />;

  switch (status) {
    case "recording":
      orbBgClass = "bg-red-500";
      orbShadowClass = "shadow-[12px_12px_0_#a10000]";
      orbAnimate = { scale: [1, 1.05, 1] };
      break;
    case "processing":
      orbBgClass = "bg-yellow-400";
      orbShadowClass = "shadow-[12px_12px_0_#a88c00]";
      orbAnimate = { rotate: [0, 360] };
      orbIcon = null;
      break;
    case "speaking":
      orbBgClass = "bg-green-500";
      orbShadowClass = "shadow-[12px_12px_0_#006d00]";
      orbAnimate = { scale: [1, 1.05, 1] };
      orbIcon = <IconStop />;
      break;
    case "error":
      orbBgClass = "bg-gray-700";
      orbShadowClass = "shadow-[12px_12px_0_#000]";
      orbIcon = <IconAlert />;
      break;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#FDF4E3] font-sans text-black">
      <header className="w-full border-b-4 border-black bg-white p-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <motion.button
            onClick={handleBack}
            className="flex items-center gap-2 rounded-full border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white shadow-[6px_6px_0_#000]"
            initial={{ x: -30, opacity: 0, rotate: -10 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            whileHover={{ scale: 1.05, rotate: -2, y: -2 }}
            whileTap={{ scale: 0.95, rotate: 2, y: 0 }}
          >
            <IconBack />
            Back
          </motion.button>
          <motion.h1
            className="text-center text-3xl font-bold"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          >
            🪷 Sarathi AI Voice
          </motion.h1>
          <div className="w-[110px]" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <motion.button
          onClick={handleOrbClick}
          disabled={status === "processing"}
          className={`relative flex h-64 w-64 items-center justify-center rounded-full border-4 border-black text-white transition-all duration-200 ${orbBgClass} ${orbShadowClass} ${
            status === "processing" ? "cursor-wait" : "cursor-pointer"
          }`}
          animate={orbAnimate}
          transition={
            status === "recording" || status === "speaking"
              ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
              : status === "processing"
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : {}
          }
        >
          <AnimatePresence>
            {orbIcon && (
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                {orbIcon}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="h-10 w-full max-w-md pt-8">
          <AnimatePresence mode="wait">
            <motion.h2
              key={statusLabel}
              className="text-2xl font-bold"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {statusLabel}
            </motion.h2>
          </AnimatePresence>
        </div>

        <div className="h-16 w-full max-w-md pt-4">
          <AnimatePresence>
            {status === "error" && errorMessage && (
              <motion.div
                className="mt-4 w-full rounded-lg border-4 border-black bg-red-500 p-3 font-bold text-white shadow-[8px_8px_0_#000]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
