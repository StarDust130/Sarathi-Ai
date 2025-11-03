"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [flowers, setFlowers] = useState<
    { id: number; left: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    const arr = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 20 + Math.random() * 25,
      delay: Math.random() * 5,
      duration: 12 + Math.random() * 8,
    }));
    setFlowers(arr);
  }, []);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-[#fdf6e3] via-[#fce5b0] to-[#ffe6cc] text-[#3a2e0f] px-4">
      
      {/* 🌼 Falling Flowers Animation */}
      {flowers.map((f) => (
        <motion.div
          key={f.id}
          className="absolute select-none"
          style={{
            left: `${f.left}%`,
            fontSize: `${f.size}px`,
            top: `${Math.random() * -100}px`,
          }}
          initial={{ y: "-10vh", opacity: 0 }}
          animate={{
            y: "100vh",
            opacity: [0.8, 0.9, 0.8],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            repeatType: "loop",
          }}
        >
          🌸
        </motion.div>
      ))}

      {/* ✨ Glowing Aura Background */}
      <motion.div
        className="absolute w-[900px] h-[900px] bg-gradient-to-tr from-[#fdd835]/30 via-[#ffb74d]/40 to-[#ffc8dd]/30 rounded-full blur-[160px] -z-10"
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* 🪷 Title Section (Lotus on the Left) */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
        className="mt-20 text-4xl sm:text-6xl font-extrabold text-center drop-shadow-[6px_6px_0px_rgba(58,46,15,0.2)] mb-4 flex items-center justify-center gap-3"
      >
        🪷 <span className="text-[#b45309]">Sarathi AI — Your Inner Charioteer</span>
      </motion.h1>

      {/* 💫 Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="text-center text-lg sm:text-xl max-w-xl text-[#4a3b18] mb-8"
      >
        Chat or speak with your AI Sarathi to break your inner loop and find calm. 🌿
      </motion.p>

      {/* 🕉️ Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.a
          whileHover={{ y: -4 }}
          href="/chat"
          className="bg-[#ffb74d] text-[#3a2e0f] px-8 py-3 text-lg font-bold rounded-2xl border-4 border-[#3a2e0f] shadow-[6px_6px_0px_#3a2e0f]"
        >
          💬 Start Chat
        </motion.a>

        <motion.a
          whileHover={{ y: -4 }}
          href="/voice"
          className="bg-[#81c784] text-[#1b3d0f] px-8 py-3 text-lg font-bold rounded-2xl border-4 border-[#1b3d0f] shadow-[6px_6px_0px_#1b3d0f]"
        >
          🎙️ Start Voice
        </motion.a>
      </div>

      {/* 🖼️ Images Section */}
      <div className="flex flex-col items-center justify-center gap-10 mt-12 w-full">
        <motion.img
          src="/1.jpg"
          alt="Krishna 1"
          className="w-[320px] h-[180px] sm:w-[420px] sm:h-[230px] md:w-[520px] md:h-[280px] rounded-2xl border-4 border-[#3a2e0f] shadow-[6px_6px_0px_#3a2e0f] object-cover bg-[#fff8e7]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        />

        <motion.img
          src="/2.jpg"
          alt="Krishna 2"
          className="w-[320px] h-[180px] sm:w-[420px] sm:h-[230px] md:w-[520px] md:h-[280px] rounded-2xl border-4 border-[#3a2e0f] shadow-[6px_6px_0px_#3a2e0f] object-cover bg-[#fff8e7]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        />

        <motion.img
          src="/3.jpg"
          alt="Krishna 3"
          className="w-[320px] h-[180px] sm:w-[420px] sm:h-[230px] md:w-[520px] md:h-[280px] rounded-2xl border-4 border-[#3a2e0f] shadow-[6px_6px_0px_#3a2e0f] object-cover bg-[#fff8e7]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        />
      </div>

      {/* 📜 Shloka */}
      <div className="mt-12 mb-20">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1.5 }}
          className="text-center italic text-[#5a4211] max-w-2xl mx-auto"
        >
          “कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।”  
          <br />
          <span className="text-sm text-[#7c5c1c]">
            (You have the right to perform your duties, but not to the fruits thereof.)
          </span>
        </motion.p>
      </div>
    </main>
  );
}
















