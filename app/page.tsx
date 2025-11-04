"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

type Flower = {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  top: number;
};

type AuroraStrip = {
  id: number;
  className: string;
  motion: {
    x: number[];
    y: number[];
    rotate: number[];
  };
  duration: number;
  delay: number;
};

type FloatingGlyph = {
  id: number;
  symbol: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: string;
  color: string;
  delay: number;
  duration: number;
};

type HighlightPillar = {
  id: number;
  icon: string;
  title: string;
  description: string;
  accent: string;
};

const remoteGallery = [
  "https://i.pinimg.com/1200x/7b/87/0e/7b870ec101537650c42c5b169f9ee186.jpg",
  "https://i.pinimg.com/736x/a3/cb/2e/a3cb2eb5454b12943eaf71f87fb88300.jpg",
  "https://i.pinimg.com/1200x/c9/94/07/c99407ad3ee6e24caa43dcb92936a463.jpg",
];

const localGallery = ["/1.jpg", "/2.jpg", "/3.jpg"];

const frames = [...remoteGallery, ...localGallery];

const auroraStrips: AuroraStrip[] = [
  {
    id: 1,
    className:
      "top-[-12rem] left-[-10rem] h-[30rem] w-[32rem] bg-gradient-to-br from-[#A5B4FC]/60 via-[#F0ABFC]/45 to-transparent",
    motion: {
      x: [-80, 40, -60],
      y: [-60, 120, -40],
      rotate: [8, -10, 8],
    },
    duration: 30,
    delay: 0,
  },
  {
    id: 2,
    className:
      "bottom-[-14rem] left-[18%] h-[28rem] w-[28rem] bg-gradient-to-tr from-[#FF9EAA]/55 via-[#FFD07F]/45 to-transparent",
    motion: {
      x: [-40, 80, -30],
      y: [40, -80, 50],
      rotate: [4, -6, 4],
    },
    duration: 26,
    delay: 1.2,
  },
  {
    id: 3,
    className:
      "top-[-8rem] right-[-12rem] h-[32rem] w-[36rem] bg-gradient-to-bl from-[#7DD3FC]/50 via-[#A5B4FC]/45 to-transparent",
    motion: {
      x: [120, -60, 90],
      y: [-50, 110, -30],
      rotate: [-6, 6, -6],
    },
    duration: 32,
    delay: 0.6,
  },
];

const floatingGlyphs: FloatingGlyph[] = [
  {
    id: 1,
    symbol: "ॐ",
    top: "18%",
    left: "14%",
    size: "2.6rem",
    color: "text-slate-700/60",
    delay: 0.4,
    duration: 12,
  },
  {
    id: 2,
    symbol: "✺",
    top: "68%",
    left: "12%",
    size: "2.4rem",
    color: "text-[#FF9EAA]/60",
    delay: 0.6,
    duration: 10,
  },
  {
    id: 3,
    symbol: "🪷",
    top: "26%",
    right: "16%",
    size: "2.8rem",
    color: "text-[#A5B4FC]/70",
    delay: 0.3,
    duration: 11.5,
  },
  {
    id: 4,
    symbol: "☀️",
    bottom: "20%",
    left: "66%",
    size: "2.3rem",
    color: "text-[#FFD07F]/70",
    delay: 0.8,
    duration: 12.5,
  },
];

const highlightPillars: HighlightPillar[] = [
  {
    id: 1,
    icon: "🪷",
    title: "Daily Lotus Journal",
    description:
      "Capture reflections with guided prompts synced to Sarathi's wisdom.",
    accent: "bg-gradient-to-br from-[#FFF5B8]/70 via-white/50 to-transparent",
  },
  {
    id: 2,
    icon: "🎧",
    title: "Voice Temple",
    description:
      "Slip into meditative conversations with immersive soundscapes.",
    accent: "bg-gradient-to-br from-[#A5B4FC]/60 via-white/40 to-transparent",
  },
  {
    id: 3,
    icon: "✨",
    title: "Cosmic Gallery",
    description: "Explore living art frames that mirror your journey inward.",
    accent: "bg-gradient-to-br from-[#FF9EAA]/55 via-white/40 to-transparent",
  },
];

export default function Home() {
  const [flowers, setFlowers] = useState<Flower[]>([]);

  useEffect(() => {
    setFlowers(
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: -Math.random() * 120,
        size: 20 + Math.random() * 28,
        delay: Math.random() * 5,
        duration: 12 + Math.random() * 8,
      }))
    );
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ECF1FF] text-slate-900 selection:bg-[#FFF5B8]/70 selection:text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rotate-6 rounded-[5rem] border-4 border-slate-900 bg-gradient-to-br from-[#FF9EAA] via-[#FFD07F] to-[#FFF5B8] shadow-[22px_22px_0px_rgba(15,23,42,0.34)] animate-levitate-slow" />
        <div className="absolute bottom-[-14rem] right-[-6rem] h-[30rem] w-[26rem] -rotate-3 rounded-[4rem] border-4 border-slate-900 bg-gradient-to-br from-[#A5B4FC] via-[#7DD3FC] to-[#F0ABFC] shadow-[18px_18px_0px_rgba(15,23,42,0.28)] animate-levitate-fast" />
        {auroraStrips.map((strip) => (
          <motion.div
            key={strip.id}
            className={`absolute -z-10 rounded-[5rem] ${strip.className} blur-[160px]`}
            animate={{
              x: strip.motion.x,
              y: strip.motion.y,
              rotate: strip.motion.rotate,
              opacity: [0.22, 0.55, 0.22],
            }}
            transition={{
              duration: strip.duration,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: strip.delay,
            }}
          />
        ))}
        {floatingGlyphs.map((glyph) => (
          <motion.span
            key={glyph.id}
            className={`absolute z-20 font-semibold mix-blend-overlay ${glyph.color}`}
            style={{
              top: glyph.top,
              left: glyph.left,
              right: glyph.right,
              bottom: glyph.bottom,
              fontSize: glyph.size,
            }}
            initial={{ y: 0, opacity: 0.45 }}
            animate={{
              y: ["0%", "-18%", "0%"],
              scale: [1, 1.12, 1],
              opacity: [0.35, 0.75, 0.35],
            }}
            transition={{
              duration: glyph.duration,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: glyph.delay,
            }}
          >
            {glyph.symbol}
          </motion.span>
        ))}
      </div>

      {flowers.map((flower) => (
        <motion.div
          key={flower.id}
          className="absolute z-10 select-none"
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

      <motion.div
        className="absolute left-1/2 top-1/2 z-0 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#fdd835]/35 via-[#ffb74d]/45 to-[#ffc8dd]/35 blur-[180px]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
      />

      <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center gap-16 px-4 pb-24 pt-16 sm:px-8">
        <header className="flex w-full flex-col items-center gap-8 text-center">
            <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="inline-flex items-center gap-3 rounded-full border-4 border-slate-900 bg-gradient-to-r from-[#FFF5B8] to-[#FFD07F] px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-slate-900 shadow-[12px_12px_0px_rgba(15,23,42,0.32)] sm:text-sm"
            >
            Sarathi AI
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-[0.7rem] text-white/90 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400"></span>
              </span>
              Live
            </span>
            </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="flex flex-wrap items-center justify-center gap-3 text-[2.8rem] font-black leading-[1.05] tracking-tight text-slate-900 sm:text-[3.5rem] md:text-[4rem]"
          >
            🪷 Sarathi AI — Your Inner Charioteer
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="max-w-3xl text-base font-medium text-slate-600 sm:text-lg md:text-xl"
          >
            Glide into serene dialogues guided by glowing synthwave art,
            meditative palettes, and a voice that feels timeless. Chat or speak
            with your AI Sarathi to break your inner loop and find calm.
          </motion.p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-3 rounded-full border-4 border-slate-900 bg-[#FFF5B8] px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-slate-900 shadow-[12px_12px_0px_rgba(15,23,42,0.32)] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-1 sm:text-base"
            >
              Chat with Sarathi
              <span className="text-2xl leading-none">✨</span>
            </Link>
            <Link
              href="/talk"
              className="inline-flex items-center justify-center gap-3 rounded-full border-4 border-slate-900 bg-[#A5B4FC] px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-slate-900 shadow-[12px_12px_0px_rgba(15,23,42,0.32)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-1 sm:text-base"
            >
              Enter Voice Temple
              <span className="text-2xl leading-none">🎧</span>
            </Link>
            <Link
              href="/journal"
              className="inline-flex items-center justify-center gap-3 rounded-full border-4 border-slate-900 bg-[#FDF2FF] px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-slate-900 shadow-[12px_12px_0px_rgba(15,23,42,0.32)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-2 sm:text-base"
            >
              Open Journal
              <span className="text-2xl leading-none">📝</span>
            </Link>
          </div>
        </header>

        <section className="w-full">
          <div className="relative grid gap-6 md:grid-cols-3">
            {frames.map((src, idx) => (
              <motion.article
                key={src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                className="group relative overflow-hidden rounded-[2.6rem] border-4 border-slate-900 bg-[#FDF9F0] shadow-[18px_18px_0px_rgba(15,23,42,0.32)] transition-transform duration-200 hover:-translate-y-3"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                <Image
                  src={src}
                  alt={`Krishna artwork ${idx + 1}`}
                  width={900}
                  height={1100}
                  className="h-[22rem] w-full object-cover sm:h-[26rem]"
                />
                <div className="absolute bottom-6 left-6 rounded-full border-4 border-slate-900 bg-white/90 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-slate-900 shadow-[10px_10px_0px_rgba(15,23,42,0.32)]">
                  Cosmic Frame {idx + 1}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="text-center text-[#5a4211]"
        >
          <p className="text-lg italic">
            “कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।”
          </p>
          <p className="mt-2 text-sm text-[#7c5c1c]">
            (You have the right to perform your duties, but not to the fruits
            thereof.)
          </p>
        </motion.blockquote>
      </div>

      <Link
        href="/chat"
        className="fixed bottom-4 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-3 rounded-full border-4 border-slate-900 bg-[#FFD07F] px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-slate-900 shadow-[12px_12px_0px_rgba(15,23,42,0.36)] transition-transform duration-150 hover:-translate-y-1 md:hidden"
      >
        Quick Chat
        <span className="text-lg leading-none">🚀</span>
      </Link>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: #ecf1ff;
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        @keyframes levitateSlow {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(6deg);
          }
          50% {
            transform: translate3d(0, -18px, 0) rotate(3deg);
          }
        }
        @keyframes levitateFast {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(-8deg);
          }
          50% {
            transform: translate3d(0, -26px, 0) rotate(-2deg);
          }
        }
        .animate-levitate-slow {
          animation: levitateSlow 12s ease-in-out infinite;
        }
        .animate-levitate-fast {
          animation: levitateFast 9s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
