"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mic, SendHorizonal, ChevronDown, ChevronLeft } from "lucide-react";

type ChatMessage = { role: "ai" | "user"; text: string };
type FloatingFlower = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
};
type ApiChatResponse = { SarthiAi?: unknown; error?: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "🌸 Namaste! I am your Sarathi — your companion on the path of calm and clarity.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Always scroll on new message
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isTyping, scrollToBottom]);

  // Detect when user scrolls up
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      setShowScrollToBottom(distance > 200);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.ok) {
        const { error: apiError } = (await resp
          .json()
          .catch(() => ({}))) as ApiChatResponse;
        throw new Error(apiError || "Failed to reach Sarathi.");
      }

      const data = (await resp.json()) as ApiChatResponse;
      const reply =
        typeof data?.SarthiAi === "string"
          ? data.SarthiAi
          : String(data?.SarthiAi || "No reply from AI.");
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I encountered a hiccup processing that. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="relative flex flex-col h-dvh bg-[#E3EEFF] text-slate-900 selection:bg-[#FFE5A5]/70 selection:text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-20 h-72 w-72 rounded-[4rem] border-[3px] border-slate-900/40 bg-gradient-to-br from-[#FBC2EB]/70 via-[#A6C1EE]/65 to-[#8FD3F4]/60 shadow-[14px_14px_0_rgba(15,23,42,0.2)] animate-[glideSlow_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-6rem] right-[-4rem] h-80 w-80 rounded-[5rem] border-[3px] border-slate-900/40 bg-gradient-to-br from-[#FFC3A0]/75 via-[#FFAFBD]/65 to-[#FBD786]/70 shadow-[14px_14px_0_rgba(15,23,42,0.22)] animate-[glideFast_12s_ease-in-out_infinite]" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#FDF2FF]/55 via-[#DDEBFF]/65 to-[#FFF9E6]/55 blur-[120px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
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

    {/* Chat with Sarathi */}
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        href="/talk"
        className="flex items-center justify-center rounded-full border-2 border-black bg-gradient-to-r from-[#F4E8FF] via-[#E4F4FF] to-[#FFEED8] px-4 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-6 sm:py-2 sm:text-sm"
      >
        Chat with Sarathi
      </Link>
    </motion.div>

    {/* Talk to Sarathi */}
    <motion.div
      whileHover={{ scale: 1.05, rotate: 1 }}
      whileTap={{ scale: 0.94 }}
    >
      <Link
        href="/talk"
        className="flex items-center justify-center gap-2 rounded-full border-2 border-black bg-gradient-to-r from-[#CDEBFF] via-[#DFFFE9] to-[#FFE5FB] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-5 sm:py-2 sm:text-xs"
      >
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline">Talk to Sarathi</span>
      </Link>
    </motion.div>
  </div>
</header>

      {/* Chat */}
      <section
        ref={chatContainerRef}
        className="chat-scrollbar z-10 flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-10"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5 rounded-[2.4rem] border-[3px] border-slate-900/35 bg-white/85 px-5 py-6 shadow-[16px_16px_0_rgba(15,23,42,0.18)] backdrop-blur-md sm:space-y-6">
          {messages.map((m, i) => {
            const isAI = m.role === "ai";
            const containsCode = /```/.test(m.text);
            return (
              <motion.div
                key={`${m.role}-${i}`}
                initial={isAI ? { opacity: 0, x: -20 } : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`flex ${isAI ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[74%] rounded-[1.8rem] border-[3px] px-5 py-3 text-sm font-medium leading-relaxed shadow-[10px_10px_0_rgba(15,23,42,0.12)] sm:px-7 sm:py-4 sm:text-base ${
                    isAI
                      ? containsCode
                        ? "border-slate-900/80 bg-[#1F1D3A] font-mono whitespace-pre-wrap text-white shadow-none"
                        : "border-slate-900/45 bg-gradient-to-br from-[#F6F9FF]/95 via-white/95 to-[#E8F1FF]/95 text-slate-800"
                      : "border-slate-900/60 bg-gradient-to-br from-[#FFD07F] via-[#FFB4BC] to-[#FDE3FF] text-slate-900"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            );
          })}

          {isTyping && (
            <div className="inline-flex items-center gap-2 self-start rounded-full border-[3px] border-slate-900/45 bg-white/85 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-slate-700 shadow-[8px_8px_0_rgba(15,23,42,0.16)] sm:text-xs">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#FFB4BC]" />
                <span
                  className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#FFD07F]"
                  style={{ animationDelay: "0.12s" }}
                />
                <span
                  className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#C9F0FF]"
                  style={{ animationDelay: "0.24s" }}
                />
              </span>
              Sarathi is typing...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 self-start rounded-2xl border-[3px] border-rose-400/80 bg-rose-50/90 px-4 py-2 text-xs font-semibold text-rose-600 shadow-[10px_10px_0_rgba(15,23,42,0.14)] sm:text-sm">
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Scroll-to-bottom */}
      {showScrollToBottom && (
        <motion.button
          onClick={() => scrollToBottom()}
          className="fixed bottom-24 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border-[3px] border-slate-900 bg-gradient-to-r from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900 shadow-[10px_10px_0_rgba(15,23,42,0.18)] sm:bottom-26 sm:right-12 sm:left-auto sm:translate-x-0"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.93 }}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="hidden md:block">Latest</span>
        </motion.button>
      )}

      {/* Input */}
      <footer className="sticky bottom-0 z-40 flex justify-center bg-[#E3EEFF]/90 px-4 pb-5 pt-4 backdrop-blur-md sm:px-8">
        <motion.div className="w-full max-w-3xl rounded-3xl border-[3px] border-slate-900 bg-gradient-to-r from-white/92 via-[#F6F9FF]/92 to-white/92 px-4 py-3 shadow-[14px_14px_0_rgba(15,23,42,0.2)] transition">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Share your thought..."
              className="h-11 rounded-full bg-transparent px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none sm:h-14 sm:text-base"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-slate-900 bg-gradient-to-br from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF] shadow-[8px_8px_0_rgba(15,23,42,0.16)] disabled:opacity-60 sm:h-12 sm:w-12"
            >
              <SendHorizonal className="h-5 w-5 text-slate-900" />
            </button>
          </div>
        </motion.div>
      </footer>

      <style jsx>{`
        :global(html),
        :global(body) {
          height: 100%;
          overflow: hidden;
          background: linear-gradient(
            180deg,
            #e3eeff 0%,
            #f6f0ff 48%,
            #fff6f3 100%
          );
        }
        .chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ffcd7c 0%, #ff9bb8 100%);
          border-radius: 10px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ffc167 0%, #ff87ac 100%);
        }
        @keyframes glideSlow {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(4deg);
          }
          50% {
            transform: translate3d(0, -14px, 0) rotate(1deg);
          }
        }
        @keyframes glideFast {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(-5deg);
          }
          50% {
            transform: translate3d(0, -20px, 0) rotate(-1deg);
          }
        }
      `}</style>
    </main>
  );
}
