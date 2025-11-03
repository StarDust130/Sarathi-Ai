"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SendHorizonal, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([
    { role: "ai", text: "🌸 Namaste! I am your Sarathi — your companion on the path of calm and clarity." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    // Simulated AI reply
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "🌿 Reflect on that… everything begins with a peaceful mind." },
      ]);
    }, 1200);
  };

  return (
    <main className="relative flex flex-col items-center justify-between min-h-screen bg-gradient-to-br from-[#fff9e6] via-[#ffebb0] to-[#ffd580] text-[#3a2e0f]">
      
      {/* Header */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative w-full py-5 bg-[#ffcc66]/90 backdrop-blur-md border-b-4 border-[#3a2e0f] shadow-[6px_6px_0px_#3a2e0f] flex items-center justify-center"
      >
        {/* ✅ Back Button (Top Left Corner, fixed alignment) */}
        <button
          onClick={() => router.push("/")}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#3a2e0f] font-bold bg-[#ffeb99] border-2 border-[#3a2e0f] rounded-xl px-3 py-1 shadow-[3px_3px_0px_#3a2e0f] hover:scale-105 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* ✅ Centered Title */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold">🪷 Sarathi AI Chat</h1>
          <p className="text-sm italic text-[#4b3b15]">“Guiding thoughts, calming minds.”</p>
        </div>
      </motion.header>

      {/* Chat Messages */}
      <div className="flex-1 w-full max-w-2xl overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((m, i) => (
          <motion.div
            key={i}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="italic text-[#2e3b10] pl-2"
          >
            Sarathi is typing<span className="animate-pulse">...</span>
          </motion.div>
        )}
      </div>

      {/* Input Section */}
      <div className="w-full max-w-2xl flex items-center gap-3 px-4 pb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)} // ✅ typing works
          onKeyDown={(e) => e.key === "Enter" && handleSend()} // ✅ enter works
          placeholder="Type your thoughts..."
          className="flex-1 px-5 py-3 rounded-2xl border-4 border-[#3a2e0f] bg-[#fffaf0] text-[#3a2e0f] shadow-[4px_4px_0px_#3a2e0f] focus:outline-none"
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend} // ✅ send button works
          className="bg-[#ffcc66] border-4 border-[#3a2e0f] rounded-2xl p-3 shadow-[4px_4px_0px_#3a2e0f]"
        >
          <SendHorizonal className="w-5 h-5 text-[#3a2e0f]" />
        </motion.button>
      </div>
    </main>
  );
}








