"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SendHorizonal } from "lucide-react";

type ChatMessage = { role: "ai" | "user"; text: string };
type FloatingFlower = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
};

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
        const { error: apiError } = await resp.json().catch(() => ({}));
        throw new Error(apiError || "Failed to reach Sarathi.");
      }

      const data = await resp.json();
      const reply = (data?.SarthiAi ?? "No reply from AI.").toString();
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
        {flowers.map((flower) => (
          <motion.div
            key={flower.id}
            className="absolute select-none z-0"
            style={{
              left: `${flower.left}%`,
              top: `${flower.top}px`,
              fontSize: `${flower.size}px`,
            }}
            initial={{ y: "-10vh", opacity: 0 }}
            animate={{
              y: "110vh",
              opacity: [0.7, 0.9, 0.7],
              rotate: [0, 12, -12, 0],
            }}
            transition={{
              duration: flower.duration,
              delay: flower.delay,
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            🌸
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between mx-auto w-full max-w-5xl mt-3 rounded-[1.4rem] border-[3px] border-slate-900/70 bg-white/80 px-4 py-3 shadow-lg backdrop-blur-xl sm:mt-5 sm:rounded-[1.8rem] sm:px-5 sm:py-4 sm:shadow-[10px_10px_0px_rgba(15,23,42,0.18)]">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="rounded-full border-[3px] border-slate-900/55 bg-[#FFEFD2]/70 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-slate-900 shadow-md sm:px-4 sm:text-sm">
            Sarathi Chat
          </span>
          <p className="max-w-md rounded-full border-[3px] border-slate-900/45 bg-[#F5F7FF]/85 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-700 sm:px-4 sm:text-xs">
            Mission: Guiding every seeker toward calm and clarity.
          </p>
        </div>
      </header>

      {/* Chat Area */}
      <section className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-10 chat-scrollbar z-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5 sm:space-y-6 bg-white/70 backdrop-blur-md p-4 rounded-3xl border-2 border-slate-900/30 shadow-md">
          {messages.map((m, i) => (
            <motion.div
              key={`${m.role}-${i}`}
              initial={
                m.role === "ai"
                  ? { opacity: 0, x: -20, scale: 0.95 }
                  : { opacity: 0, x: 20, scale: 0.95 }
              }
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[74%] rounded-[1.8rem] border-[3px] px-5 py-3 text-sm font-medium leading-relaxed shadow-[9px_9px_0px_rgba(15,23,42,0.18)] sm:px-7 sm:py-4 sm:text-base ${
                  m.role === "user"
                    ? "rounded-br-lg border-slate-900/75 bg-gradient-to-r from-[#FF9EAA] via-[#FFD481] to-[#FFF8D6] text-slate-900"
                    : "rounded-bl-lg border-slate-900/65 bg-white/95 text-slate-800 backdrop-blur"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              className="inline-flex items-center gap-2 self-start rounded-full border-[3px] border-slate-900/55 bg-white/90 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-slate-700 shadow-[6px_6px_0px_rgba(15,23,42,0.16)] sm:text-xs"
            >
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
              Sarathi is weaving a reply
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 self-start rounded-[1.4rem] border-[3px] border-rose-400/80 bg-rose-50/90 px-4 py-2 text-xs font-semibold text-rose-600 shadow-[6px_6px_0px_rgba(244,63,94,0.22)] sm:text-sm"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              {error}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Input */}
      <footer className="sticky bottom-0 z-30 flex justify-center bg-[#ECF1FF]/90 backdrop-blur-md pb-4 pt-2 px-4 sm:px-8">
        <div className="w-full max-w-3xl rounded-[1.4rem] border-[3px] border-slate-900/70 bg-white/95 px-3 py-2.5 shadow-lg sm:rounded-[1.6rem] sm:py-3 sm:shadow-[14px_14px_0px_rgba(15,23,42,0.22)]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Share your thought..."
              autoComplete="off"
              className="h-11 rounded-full bg-transparent px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none sm:h-14 sm:text-base"
              disabled={isTyping}
            />
            <motion.button
              whileHover={{ scale: 1.06, rotate: 2 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleSend}
              disabled={isTyping}
              aria-label="Send message"
              className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-slate-900/70 bg-gradient-to-br from-[#FFD481] via-[#FFB3C6] to-[#C2B5FF] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
            >
              <SendHorizonal className="h-5 w-5 text-slate-900" />
            </motion.button>
          </div>
          <p className="mt-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:tracking-[0.32em]">
            Press Enter ↵ to share your reflection
          </p>
        </div>
      </footer>

      <style jsx>{`
        :global(html),
        :global(body) {
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: #ecf1ff;
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
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
