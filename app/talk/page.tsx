"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Define the possible states of the AI
type Status = "idle" | "recording" | "processing" | "speaking" | "error";

// --- 1. SVG Icons ---
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
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
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

// --- 2. Main Page Component ---
export default function VoicePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusLabel, setStatusLabel] = useState("Tap to Speak");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Effect to update the status label
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

  // --- Stop any playing AI audio
  const stopAiPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setStatus("idle");
  };

  // --- 1. Start Recording ---
  const startRecording = async () => {
    setErrorMessage(""); // Clear old errors
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

    if (mediaRecorderRef.current) {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      // --- Error Handling: Check for empty audio (silent recording) ---
      if (audioBlob.size < 1500) {
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

        audio.onplay = () => setStatus("speaking");
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
        setStatus("idle"); // Click to clear error
        setErrorMessage("");
        break;
    }
  };

  // --- 4. Determine Orb State (Style & Animation) ---
  let orbBgClass = "bg-blue-500 hover:bg-blue-600";
  let orbShadowClass = "shadow-[12px_12px_0_#000]";
  let orbAnimate = {};
  let orbIcon = <IconMic />;

  switch (status) {
    case "recording":
      orbBgClass = "bg-red-500";
      orbShadowClass = "shadow-[12px_12px_0_#a10000]"; // Darker red shadow
      orbAnimate = { scale: [1, 1.05, 1] }; // Pulse
      break;
    case "processing":
      orbBgClass = "bg-yellow-400";
      orbShadowClass = "shadow-[12px_12px_0_#a88c00]"; // Darker yellow
      orbAnimate = { rotate: [0, 360] }; // Spin
      orbIcon = null; // Hide icon while spinning
      break;
    case "speaking":
      orbBgClass = "bg-green-500";
      orbShadowClass = "shadow-[12px_12px_0_#006d00]"; // Darker green
      orbAnimate = { scale: [1, 1.05, 1] }; // Pulse
      orbIcon = <IconStop />; // Show stop icon
      break;
    case "error":
      orbBgClass = "bg-gray-700";
      orbShadowClass = "shadow-[12px_12px_0_#000]";
      orbIcon = <IconAlert />;
      break;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#FDF4E3] font-sans text-black">
      {/* --- Header --- */}
      <header className="w-full border-b-4 border-black bg-white p-4">
        <h1 className="text-center text-3xl font-bold">Gita AI Mentor</h1>
      </header>

      {/* --- Main Content --- */}
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        {/* --- Orb Button --- */}
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
          {/* Icon with animation */}
          <AnimatePresence>
            {orbIcon && (
              <motion.div
                key={status} // Change key to force re-animation
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                {orbIcon}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* --- Status Label --- */}
        <div className="h-10 w-full max-w-md pt-8">
          <AnimatePresence mode="wait">
            <motion.h2
              key={statusLabel} // Animate when text changes
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

        {/* --- Error Message Area --- */}
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
