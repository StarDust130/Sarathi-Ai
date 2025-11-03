"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SendHorizonal, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  role: "ai" | "user";
  text: string;
};

export default function ChatPage() {
  const router = useRouter();
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
        { role: "ai", text: "I encountered a hiccup processing that. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-[#fff9e6] via-[#ffebb0] to-[#ffd580] text-[#3a2e0f]">
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative w-full py-5 bg-[#ffcc66]/90 backdrop-blur-md border-b-4 border-[#3a2e0f] shadow-[6px_6px_0px_#3a2e0f] flex items-center justify-center"
      >
        <button
          onClick={() => router.push("/")}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#3a2e0f] font-bold bg-[#ffeb99] border-2 border-[#3a2e0f] rounded-xl px-3 py-1 shadow-[3px_3px_0px_#3a2e0f] hover:scale-105 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold">🪷 Sarathi AI Chat</h1>
          <p className="text-sm italic text-[#4b3b15]">“Guiding thoughts, calming minds.”</p>
        </div>
      </motion.header>

      <div className="flex flex-1 w-full justify-center px-4 pb-6">
        <div className="flex w-full max-w-2xl flex-1 flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 px-1 py-6">
            {messages.map((m, i) => (
              <motion.div
                key={`${m.role}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-3xl border-2 ${
                    m.role === "user"
                      ? "bg-[#ffcc66] border-[#3a2e0f] text-[#3a2e0f] shadow-[3px_3px_0px_#3a2e0f]"
                      : "bg-[#a5d6a7] border-[#1b3d0f] text-[#1b3d0f] shadow-[3px_3px_0px_#1b3d0f]"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="italic text-[#2e3b10] pl-2">
                Sarathi is typing<span className="animate-pulse">...</span>
              </motion.div>
            )}

            {error && <p className="text-sm text-red-700 italic pl-2">{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your thoughts..."
              className="flex-1 px-5 py-3 rounded-2xl border-4 border-[#3a2e0f] bg-[#fffaf0] text-[#3a2e0f] shadow-[4px_4px_0px_#3a2e0f] focus:outline-none disabled:opacity-60"
              disabled={isTyping}
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={isTyping}
              className="bg-[#ffcc66] border-4 border-[#3a2e0f] rounded-2xl p-3 shadow-[4px_4px_0px_#3a2e0f] disabled:opacity-60"
            >
              <SendHorizonal className="w-5 h-5 text-[#3a2e0f]" />
            </motion.button>
          </div>
        </div>
      </div>
    </main>
  );
}







