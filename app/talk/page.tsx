"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. Types ---
type Status = "idle" | "recording" | "processing" | "speaking" | "error";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// --- 2. SVG Icons (Made smaller for the input bar) ---
const IconMic = () => (
  <svg
    width="32"
    height="32"
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
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 6H18V18H6V6Z" />
  </svg>
);

const IconAlert = () => (
  <svg
    width="32"
    height="32"
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

const IconScrollDown = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

// --- 3. Main Page Component ---
export default function VoicePage() {
  // --- Voice & Status State ---
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusLabel, setStatusLabel] = useState("Tap orb to speak");

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);

  // --- Refs ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // --- Effect: Update Status Label ---
  useEffect(() => {
    switch (status) {
      case "idle":
        setStatusLabel("Tap orb to speak or type message");
        break;
      case "recording":
        setStatusLabel("Listening... (Tap orb to stop)");
        break;
      case "processing":
        setStatusLabel("Thinking...");
        break;
      case "speaking":
        setStatusLabel("Speaking... (Tap orb to stop)");
        break;
      case "error":
        setStatusLabel("Error");
        break;
    }
  }, [status]);

  // --- Effect: Auto-scroll chat ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // --- Handle User Scrolling ---
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      // Show button if scrolled up more than 300px from the bottom
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
    }
  };

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  // --- Stop any playing AI audio ---
  const stopAiPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setStatus("idle");
  };

  // --- 1. Start Recording ---
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

        // --- NEW: Add chat messages ---
        // **ASSUMPTION**: Your API returns these text fields
        const userTranscript = result.userTranscript || "[Your voice message]";
        const aiResponse = result.aiResponse || "[AI audio response]";

        setMessages((prev) => [
          ...prev,
          { role: "user", content: userTranscript },
          { role: "assistant", content: aiResponse },
        ]);
        // --- End New ---

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
          if (status === "speaking") setStatus("idle");
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
        mediaRecorderRef.current?.stop();
        break;
      case "processing":
        // Do nothing
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

  // --- 4. NEW: Handle Text Submit ---
  const handleTextSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || status !== "idle") return;

    const userMessage: ChatMessage = { role: "user", content: inputText };
    setMessages((prev) => [...prev, userMessage]);
    const currentText = inputText;
    setInputText("");
    setStatus("processing");

    try {
      // **ASSUMPTION**: This assumes your '/api/voice' endpoint can also
      // handle a JSON request with a 'text' property.
      // You may need a new endpoint (e.g., '/api/chat') for this.
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText }),
      });

      if (!response.ok)
        throw new Error(`API failed with status ${response.status}`);

      const result = await response.json();

      // Add AI text response to chat
      // **ASSUMPTION**: Your API returns this text field
      const aiResponse =
        result.aiResponse ||
        "[AI is speaking... (API must return 'aiResponse')]";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);

      // Play the audio response
      if (result.audioBase64) {
        const audioUrl = `data:${result.audioMimeType};base64,${result.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        audio.onplay = () => setStatus("speaking");
        audio.onended = () => setStatus("idle");
        audio.onpause = () => {
          if (status === "speaking") setStatus("idle");
        };
        audio.onerror = () => {
          setErrorMessage("Failed to play AI audio.");
          setStatus("error");
        };

        audio.play();
      } else {
        setStatus("idle"); // No audio, just go back to idle
      }
    } catch (err) {
      console.error("Error processing text:", err);
      setErrorMessage("An error occurred. Please try again.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that text." },
      ]);
      setStatus("error");
    }
  };

  // --- 5. Determine Orb State (Style & Animation) ---
  let orbBgClass = "bg-blue-500 hover:bg-blue-600";
  let orbShadowClass = "shadow-[8px_8px_0_#000]"; // Smaller shadow
  let orbAnimate = {};
  let orbIcon = <IconMic />;

  switch (status) {
    case "recording":
      orbBgClass = "bg-red-500";
      orbShadowClass = "shadow-[8px_8px_0_#a10000]";
      orbAnimate = { scale: [1, 1.05, 1] };
      break;
    case "processing":
      orbBgClass = "bg-yellow-400";
      orbShadowClass = "shadow-[8px_8px_0_#a88c00]";
      orbAnimate = { rotate: [0, 360] };
      orbIcon = null;
      break;
    case "speaking":
      orbBgClass = "bg-green-500";
      orbShadowClass = "shadow-[8px_8px_0_#006d00]";
      orbAnimate = { scale: [1, 1.05, 1] };
      orbIcon = <IconStop />;
      break;
    case "error":
      orbBgClass = "bg-gray-700";
      orbShadowClass = "shadow-[8px_8px_0_#000]";
      orbIcon = <IconAlert />;
      break;
  }

  // --- 6. JSX (New Layout) ---
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#FDF4E3] font-sans text-black">
      {/* --- Header --- */}
      <header className="w-full flex-shrink-0 border-b-4 border-black bg-white p-4">
        <h1 className="text-center text-3xl font-bold">Gita AI Mentor</h1>
      </header>

      {/* --- Chat Area (Scrollable) --- */}
      <main
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 space-y-4 overflow-y-auto p-6 min-h-0"
      >
        {/* ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
          THE FIX IS HERE: I added 'min-h-0' to this className.
          This tells flexbox to allow this element to shrink
          and contain its own scrollbar.
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        */}

        {/* Initial welcome message */}
        {messages.length === 0 && (
          <div className="text-center text-lg text-gray-500">
            Start the conversation by typing or tapping the orb to speak.
          </div>
        )}

        {/* Map messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs rounded-lg border-2 border-black p-3 shadow-[4px_4px_0_#000] md:max-w-md lg:max-w-lg ${
                msg.role === "user" ? "bg-blue-200" : "bg-white"
              }`}
            >
              <p className="text-lg">{msg.content}</p>
            </div>
          </div>
        ))}
      </main>

      {/* --- Scroll to Bottom Button --- */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            onClick={scrollToBottom}
            className="absolute bottom-32 right-8 z-10 rounded-full border-2 border-black bg-white p-3 shadow-[4px_4px_0_#000] hover:bg-gray-100"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            title="Scroll to bottom"
          >
            <IconScrollDown />
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- Input Footer (Fixed) --- */}
      <footer className="w-full flex-shrink-0 border-t-4 border-black bg-white p-4">
        {/* --- Status/Error Area --- */}
        <div className="mb-2 h-6 w-full text-center">
          <AnimatePresence mode="wait">
            {status === "error" && errorMessage ? (
              <motion.div
                key="error"
                className="font-bold text-red-600"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {errorMessage}
              </motion.div>
            ) : (
              <motion.h2
                key={statusLabel}
                className="text-md font-bold text-gray-600"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {statusLabel}
              </motion.h2>
            )}
          </AnimatePresence>
        </div>

        {/* --- Input Bar --- */}
        <form onSubmit={handleTextSubmit} className="flex items-center gap-4">
          {/* --- Text Input --- */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              status === "idle" ? "Type your message..." : "Waiting for AI..."
            }
            disabled={status !== "idle"}
            className="flex-1 rounded-lg border-4 border-black p-4 text-lg shadow-[4px_4px_0_#000] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-200"
          />

          {/* --- Voice Orb Button (Smaller) --- */}
          <motion.button
            type="button" // Important: Don't submit the form
            onClick={handleOrbClick}
            disabled={status === "processing"}
            className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-4 border-black text-white transition-all duration-200 ${orbBgClass} ${orbShadowClass} ${
              status === "processing" ? "cursor-wait" : "cursor-pointer"
            } ${
              status !== "idle" &&
              status !== "recording" &&
              status !== "speaking" &&
              status !== "error"
                ? "opacity-50 cursor-not-allowed"
                : ""
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
        </form>
      </footer>
    </div>
  );
}
