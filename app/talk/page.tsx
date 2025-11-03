"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Define the possible states of the AI
type Status = "idle" | "recording" | "processing" | "speaking" | "error";

// --- 1. SVG Icons (Matching the style of your image) ---
const IconArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

const IconUser = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconMic = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
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

// --- 2. Animated Colorful Bubbles Component (for inside the glass orb) ---
// This creates the "cool animation" of moving, swirling colors
const AnimatedBubbles = () => (
  <div className="absolute inset-0 overflow-hidden rounded-full">
    <motion.div
      className="absolute h-40 w-40 rounded-full bg-pink-400 opacity-60 filter blur-3xl"
      animate={{
        x: ["-20%", "70%", "-20%"],
        y: ["-20%", "50%", "-20%"],
        scale: [0.8, 1.5, 0.8],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
    />
    <motion.div
      className="absolute h-48 w-48 rounded-full bg-blue-400 opacity-60 filter blur-3xl"
      animate={{
        x: ["80%", "-30%", "80%"],
        y: ["-30%", "60%", "-30%"],
        scale: [1, 0.7, 1],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
    />
    <motion.div
      className="absolute h-32 w-32 rounded-full bg-purple-400 opacity-60 filter blur-3xl"
      animate={{
        x: ["30%", "-60%", "30%"],
        y: ["60%", "-20%", "60%"],
        scale: [0.9, 1.2, 0.9],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
    />
  </div>
);

// --- 3. Main Page Component ---
export default function VoicePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [displayedText, setDisplayedText] = useState(""); // For "Listening...", "Thinking...", etc.

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Effect to update displayed text based on status
  useEffect(() => {
    switch (status) {
      case "idle":
        setDisplayedText(""); // No text when idle, as per image
        break;
      case "recording":
        setDisplayedText("Listening...");
        break;
      case "processing":
        setDisplayedText("Thinking...");
        break;
      case "speaking":
        setDisplayedText("Speaking...");
        break;
      case "error":
        setDisplayedText("Error occurred.");
        break;
    }
  }, [status]);

  // --- Stop any playing AI audio ---
  const stopAiPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    // Only reset to idle if currently speaking
    if (status === "speaking") {
      setStatus("idle");
    }
  };

  // --- 1. Start Recording ---
  const startRecording = async () => {
    setErrorMessage(""); // Clear old errors
    setDisplayedText("Listening..."); // Show immediately
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
      setErrorMessage(
        "Microphone access denied. Please allow microphone permissions."
      );
      setStatus("error");
    }
  };

  // --- 2. Stop Recording & Call API ---
  const stopRecordingAndProcess = async () => {
    setStatus("processing");
    setDisplayedText("Thinking...");

    if (mediaRecorderRef.current) {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      // --- Error Handling: Check for empty audio (silent recording) ---
      if (audioBlob.size < 1500) {
        // Increased threshold slightly for robustness
        setErrorMessage("I didn't hear anything. Please try speaking again.");
        setStatus("error");
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
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

        // --- Error Handling: Check for API response ---
        if (!result.audioBase64) {
          setErrorMessage("The AI didn't provide an audio response.");
          setStatus("error");
          return;
        }

        // --- Create and play the audio response ---
        const audioUrl = `data:${result.audioMimeType};base64,${result.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        audio.onplay = () => {
          setStatus("speaking");
          setDisplayedText("Speaking...");
        };
        audio.onended = () => setStatus("idle");
        audio.onpause = () => {
          if (status === "speaking") {
            setStatus("idle"); // Reset to idle if AI was speaking and paused
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
        // Clean up media streams
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
        }
      }
    }
  };

  // --- 3. Main Orb Click Handler ---
  const handleOrbClick = () => {
    switch (status) {
      case "idle":
        startRecording();
        break;
      case "recording":
        mediaRecorderRef.current?.stop(); // Triggers 'onstop' handler
        break;
      case "processing":
        // Do nothing while processing
        break;
      case "speaking":
        stopAiPlayback(); // This is your "Stop AI" button
        break;
      case "error":
        setStatus("idle"); // Click to clear error and retry
        setErrorMessage("");
        setDisplayedText("");
        break;
    }
  };

  const isOrbDisabled = status === "processing";

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gradient-to-br from-[#E2F0F9] via-[#F8EFE9] to-[#F1F0E8] font-sans text-gray-800">
      {/* --- Top Bar (Matching Image) --- */}
      <header className="flex w-full max-w-lg items-center justify-between p-4 pt-6 md:max-w-xl">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white/80">
          <IconArrowLeft />
        </button>
        <h1 className="text-lg font-medium text-gray-700">Voice Analysis</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white/80">
          <IconUser />
        </button>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24 md:max-w-2xl">
        {/* "Listening..." / "Thinking..." text */}
        <div className="h-8">
          {" "}
          {/* Reserve space to prevent layout shift */}
          <AnimatePresence mode="wait">
            {displayedText && (
              <motion.span
                key={displayedText}
                className="text-lg text-gray-600"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {displayedText}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* --- Central Glass Orb --- */}
        <div className="relative my-10 flex h-64 w-64 items-center justify-center rounded-full bg-white/30 p-1 shadow-lg backdrop-blur-xl md:h-72 md:w-72">
          {/* Animated Bubbles (only visible when active, as per image) */}
          <AnimatePresence>
            {(status === "recording" ||
              status === "processing" ||
              status === "speaking") && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatedBubbles />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Inner ring/border of the glass orb */}
          <div className="absolute inset-4 rounded-full border border-white/50" />
        </div>

        {/* --- Error Message Display --- */}
        <div className="h-16 w-full max-w-sm text-center">
          {" "}
          {/* Reserve space */}
          <AnimatePresence>
            {status === "error" && errorMessage && (
              <motion.p
                className="rounded-lg bg-red-100 p-3 text-sm text-red-700 shadow-md"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {errorMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* --- Bottom Mic Button & "00" (Matching Image) --- */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 w-full p-4 pb-8">
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center md:max-w-lg">
          {/* "00" button on the left */}
          <button className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-lg font-medium text-gray-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white/80">
            00
          </button>

          {/* Main Microphone Button */}
          <motion.button
            onClick={handleOrbClick}
            disabled={isOrbDisabled}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-pink-500 text-white shadow-xl transition-all duration-200 ${
              isOrbDisabled
                ? "cursor-not-allowed opacity-70"
                : "cursor-pointer hover:scale-105 active:scale-95"
            }`}
            animate={
              status === "recording" || status === "speaking"
                ? {
                    scale: [1, 1.05, 1],
                    transition: {
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : {}
            }
          >
            {/* The outer pulsating ring when recording/speaking */}
            <AnimatePresence>
              {(status === "recording" || status === "speaking") && (
                <motion.div
                  className="absolute inset-0 rounded-full ring-4 ring-pink-500/50"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}
            </AnimatePresence>
            <IconMic />
          </motion.button>
          {/* Right side is empty, as in the screenshot */}
        </div>
      </footer>
    </div>
  );
}
