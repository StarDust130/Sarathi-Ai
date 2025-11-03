"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

  // Floating petals
  const flowers = useMemo<FloatingFlower[]>(
    () =>
      Array.from({ length: 14 }).map((_, id) => ({
        id,
        left: Math.random() * 90 + 5,
        top: Math.random() * 120 - 60,
        size: Math.random() * 24 + 28,
        duration: Math.random() * 8 + 14,
        delay: Math.random() * 6,
      })),
    []
  );

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
    <main className="relative flex flex-col h-dvh bg-[#ECF1FF] text-slate-900 selection:bg-[#FFF5B8]/70 selection:text-slate-900">
      {/* Floating Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(1200px 600px at -10% -10%, rgba(255,212,129,0.22), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(255,158,170,0.18), transparent 55%), radial-gradient(700px 400px at 50% 120%, rgba(162,170,255,0.22), transparent 50%)",
          }}
        />
        {flowers.map((f) => (
          <motion.div
            key={f.id}
            className="absolute select-none z-0"
            style={{
              left: `${f.left}%`,
              top: `${f.top}px`,
              fontSize: `${f.size}px`,
            }}
            initial={{ y: "-10vh", opacity: 0 }}
            animate={{
              y: "110vh",
              opacity: [0.7, 0.9, 0.7],
              rotate: [0, 12, -12, 0],
            }}
            transition={{
              duration: f.duration,
              delay: f.delay,
              repeat: Infinity,
            }}
          >
            🌸
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 mx-auto mt-4 w-full max-w-5xl rounded-2xl border-[3px] border-slate-900/70 bg-white/85 px-4 py-3 shadow-lg backdrop-blur-xl sm:mt-6 sm:px-6 sm:py-5">
        <div className="flex w-full items-center justify-between gap-3 sm:gap-5">
          {/* Left section with Back button */}
          <motion.div whileHover={{ scale: 1.06 }}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900/70 bg-gradient-to-r from-[#FFD481] via-[#FFB3C6] to-[#C2B5FF] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-slate-900 shadow-md transition sm:px-4 sm:py-2 sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </motion.div>

          {/* Title */}
          <span className="inline-flex items-center rounded-full border-[3px] border-slate-900/55 bg-[#FFEFD2]/75 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-900 shadow-md sm:px-5 sm:text-sm">
            Sarathi Chat
          </span>

          {/* Right section with Talk button */}
          <motion.div whileHover={{ scale: 1.06 }}>
            <Link
              href="/talk"
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900/70 bg-gradient-to-r from-[#C2B5FF] via-[#FFB3C6] to-[#FFD481] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-slate-900 shadow-md transition sm:px-4 sm:py-2 sm:text-sm"
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
        className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-10 chat-scrollbar z-10"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5 sm:space-y-6 bg-white/70 backdrop-blur-md p-4 rounded-3xl border-2 border-slate-900/30 shadow-md">
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
                  className={`max-w-[74%] rounded-[1.8rem] border-[3px] px-5 py-3 text-sm font-medium leading-relaxed sm:px-7 sm:py-4 sm:text-base ${
                    isAI
                      ? containsCode
                        ? "border-slate-900/80 bg-[#1F1D3A] text-white font-mono whitespace-pre-wrap"
                        : "border-slate-900/60 bg-gradient-to-r from-white via-[#F4F2FF]/95 to-[#FFE7F5]/90 text-slate-800"
                      : "border-slate-900/75 bg-gradient-to-r from-[#FF9EAA] via-[#FFD481] to-[#FFF8D6] text-slate-900"
                  } shadow-md`}
                >
                  {m.text}
                </div>
              </motion.div>
            );
          })}

          {isTyping && (
            <div className="inline-flex items-center gap-2 self-start rounded-full border-[3px] border-slate-900/55 bg-white/90 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-slate-700 shadow-md sm:text-xs">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#FF9EAA]" />
                <span
                  className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#FFD07F]"
                  style={{ animationDelay: "0.12s" }}
                />
                <span
                  className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#A5B4FC]"
                  style={{ animationDelay: "0.24s" }}
                />
              </span>
              Sarathi is typing...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 self-start rounded-2xl border-[3px] border-rose-400/80 bg-rose-50/90 px-4 py-2 text-xs font-semibold text-rose-600 shadow-md sm:text-sm">
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
          className="
      fixed 
      bottom-24 sm:bottom-26
      z-50 
      inline-flex items-center gap-2
      rounded-full border-[3px] border-slate-900/70 
      bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900 shadow-md
      left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-12
    "
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.93 }}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="hidden md:block">Latest</span>
        </motion.button>
      )}

      {/* Input */}
      <footer className="sticky bottom-0 z-40 flex justify-center bg-[#ECF1FF]/90 backdrop-blur-md pb-4 pt-3 px-4 sm:px-8">
        <motion.div className="w-full max-w-3xl rounded-2xl border-[3px] border-slate-900/70 bg-white/90 px-3 py-2.5 shadow-md transition">
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
              className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-slate-900/70 bg-gradient-to-br from-[#FFD481] via-[#FFB3C6] to-[#C2B5FF] shadow-md disabled:opacity-60 sm:h-12 sm:w-12"
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
            #ecf1ff 0%,
            #f8f4ff 45%,
            #fff5f7 100%
          );
        }
        .chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: #ffd07f;
          border-radius: 10px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ff9eaa;
        }
      `}</style>
    </main>
  );
}
