"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mic,
  SendHorizonal,
  ChevronDown,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

type ChatMessage = { role: "ai" | "user"; text: string };
type ApiChatResponse = {
  SarthiAi?: unknown;
  error?: string;
  tasks?: TaskPayload[];
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  helper?: string;
  allowText?: boolean;
};

type QuizAnswer = { id: string; question: string; answer: string };

type ToneOption = { value: string; label: string; helper: string };

type TaskPayload = {
  text: string;
  karma?: number;
  category?: string;
  note?: string;
  done?: boolean;
};

type StoredTask = TaskPayload & {
  id: string;
  done: boolean;
  createdAt: string;
};

type UserProfile = {
  name: string;
  tone: string;
  quizAnswers: QuizAnswer[];
  problemSummary: string;
  onboardingComplete: boolean;
  lastUpdated: string;
};

type Stage = "loading" | "name" | "quiz" | "problem" | "chat";

const PROFILE_KEY = "sarathi-profile";
const TASKS_KEY = "sarathi-journal-tasks";

const toneOptions: ToneOption[] = [
  {
    value: "warm",
    label: "Warm Friend",
    helper: "Soft encouragement with gentle reassurance.",
  },
  {
    value: "spiritual",
    label: "Spiritual Guide",
    helper: "Meditative reflections inspired by timeless wisdom.",
  },
  {
    value: "coach",
    label: "Gentle Coach",
    helper: "Clear next steps with grounded motivation.",
  },
];

const quizQuestions: QuizQuestion[] = [
  {
    id: "stress",
    prompt: "How heavy does stress feel right now?",
    options: ["Light", "Manageable", "Overwhelming"],
    helper: "Choose what resonates most with today.",
  },
  {
    id: "anxiety",
    prompt: "How are anxiety or restlessness showing up?",
    options: ["Calm", "Occasional waves", "Constant hum"],
  },
  {
    id: "mood",
    prompt: "Where is your mood resting?",
    options: ["Grounded", "A little low", "Very low"],
  },
  {
    id: "focus",
    prompt: "What do you most want support with today?",
    options: [
      "Stress",
      "Anxiety",
      "Low mood",
      "Sleep",
      "Relationships",
      "Work",
      "Other",
    ],
    allowText: true,
    helper: "Pick one, and add a note if you'd like.",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const [stage, setStage] = useState<Stage>("loading");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelection, setQuizSelection] = useState("");
  const [quizFreeform, setQuizFreeform] = useState("");
  const [quizError, setQuizError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedProfile = window.localStorage.getItem(PROFILE_KEY);
    let nextProfile = createProfile();
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as UserProfile;
        nextProfile = {
          ...createProfile(),
          ...parsed,
          quizAnswers: Array.isArray(parsed?.quizAnswers)
            ? parsed.quizAnswers.slice(0, quizQuestions.length)
            : [],
        };
      } catch {
        nextProfile = createProfile();
      }
    }

    setProfile(nextProfile);
    const answered = nextProfile.quizAnswers.length;
    if (!nextProfile.name) {
      setStage("name");
    } else if (answered < quizQuestions.length) {
      setStage("quiz");
      setQuizIndex(answered);
    } else if (!nextProfile.problemSummary) {
      setStage("problem");
    } else {
      setStage("chat");
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (!profileLoaded) return;

    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const initial: ChatMessage[] = [
        {
          role: "ai",
          text: "🌸 Namaste! I am your Sarathi — your companion on the path of calm and clarity.",
        },
      ];

      if (stage === "name") {
        initial.push({
          role: "ai",
          text: "Before we wander together, what should I lovingly call you?",
        });
      } else if (stage === "quiz") {
        initial.push({
          role: "ai",
          text: "It's wonderful to see you again. Let's do a quick check-in so I can support you better.",
        });
      } else if (stage === "problem") {
        initial.push({
          role: "ai",
          text: `I'm here with you${
            profile?.name ? `, ${profile.name}` : ""
          }. Share what's resting on your heart in your own words.`,
        });
      } else {
        initial.push({
          role: "ai",
          text: profile?.name
            ? `Welcome back, ${profile.name}. Whenever you need me, I'm ready to listen.`
            : "Whenever you're ready, share what's on your heart and we'll walk together.",
        });
      }

      return initial;
    });
  }, [profile?.name, profileLoaded, stage]);

  useEffect(() => {
    if (!profileLoaded || stage !== "quiz") return;
    const current = quizQuestions[quizIndex];
    if (!current) return;
    const questionText = `Q${quizIndex + 1}. ${current.prompt}`;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "ai" && last.text === questionText) return prev;
      return [...prev, { role: "ai", text: questionText }];
    });
  }, [profileLoaded, quizIndex, stage]);

  useEffect(() => {
    if (!profileLoaded || stage !== "problem") return;
    const prompt = `Thank you for checking in${
      profile?.name ? `, ${profile.name}` : ""
    }. Tell me in your own words what you're moving through right now.`;
    setMessages((prev) => {
      if (prev.some((msg) => msg.role === "ai" && msg.text === prompt))
        return prev;
      return [...prev, { role: "ai", text: prompt }];
    });
  }, [profile?.name, profileLoaded, stage]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isTyping, stage, scrollToBottom]);

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

  useEffect(() => {
    setQuizSelection("");
    setQuizFreeform("");
    setQuizError(null);
  }, [quizIndex, stage]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    if (stage === "quiz") {
      return;
    }

    setInput("");
    setError(null);

    if (stage === "name") {
      const cleanName = sanitizeName(text);
      if (!cleanName) {
        setError("Please share a name so I can address you warmly.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", text },
        {
          role: "ai",
          text: `It's lovely to meet you, ${cleanName}. Let's do a gentle check-in together.`,
        },
      ]);

      const nextProfile = commitProfile((prev) => ({
        ...prev,
        name: cleanName,
        lastUpdated: new Date().toISOString(),
      }));

      const answered = nextProfile.quizAnswers.length;
      if (answered < quizQuestions.length) {
        setStage("quiz");
        setQuizIndex(answered);
      } else if (!nextProfile.problemSummary) {
        setStage("problem");
      } else {
        setStage("chat");
      }
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text }]);

    let contextOverrides: Partial<ApiChatRequest> | undefined;

    if (stage === "problem") {
      const nextProfile = commitProfile((prev) => ({
        ...prev,
        problemSummary: text,
        onboardingComplete: true,
        lastUpdated: new Date().toISOString(),
      }));
      setStage("chat");
      contextOverrides = {
        problemSummary: text,
        name: nextProfile.name,
        tone: nextProfile.tone,
        quizAnswers: nextProfile.quizAnswers,
      };
    }

    await processMessage(text, contextOverrides);
  };

  const handleQuizSubmit = () => {
    if (stage !== "quiz") return;
    const current = quizQuestions[quizIndex];
    if (!current) return;

    const selection = quizSelection.trim();
    const note = quizFreeform.trim();

    if (!selection && !note) {
      setQuizError("Please choose an option or share your own words.");
      return;
    }

    const combinedAnswer = note
      ? selection
        ? `${selection} — ${note}`
        : note
      : selection;

    setMessages((prev) => [...prev, { role: "user", text: combinedAnswer }]);

    const nextProfile = commitProfile((prev) => {
      const quizAnswers = [...prev.quizAnswers];
      quizAnswers[quizIndex] = {
        id: current.id,
        question: current.prompt,
        answer: combinedAnswer,
      };
      return {
        ...prev,
        quizAnswers,
        lastUpdated: new Date().toISOString(),
      };
    });

    const nextIndex = quizIndex + 1;
    if (nextIndex < quizQuestions.length) {
      setQuizIndex(nextIndex);
    } else if (!nextProfile.problemSummary) {
      setStage("problem");
    } else {
      setStage("chat");
    }
  };

  const handleRequestTasks = async () => {
    if (isTyping || stage !== "chat") return;
    const requestText =
      "Could you design a few gentle daily tasks for me today?";
    setMessages((prev) => [...prev, { role: "user", text: requestText }]);
    await processMessage(requestText, { requestTasks: true });
  };

  const processMessage = useCallback(
    async (text: string, overrides?: Partial<ApiChatRequest>) => {
      setIsTyping(true);
      try {
        const baseProfile = profile ?? createProfile();
        const payload: ApiChatRequest = {
          message: text,
          name: overrides?.name ?? baseProfile.name,
          tone: overrides?.tone ?? baseProfile.tone,
          quizAnswers: overrides?.quizAnswers ?? baseProfile.quizAnswers,
          problemSummary:
            overrides?.problemSummary ?? baseProfile.problemSummary ?? "",
          tasks: loadTasksForContext(),
          requestTasks: overrides?.requestTasks ?? false,
        };

        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const { error: apiError } = (await resp
            .json()
            .catch(() => ({}))) as ApiChatResponse;
          throw new Error(apiError || "Failed to reach Sarathi.");
        }

        const data = (await resp.json()) as ApiChatResponse;
        if (data?.error) {
          throw new Error(data.error);
        }

        if (Array.isArray(data?.tasks) && data.tasks.length > 0) {
          saveTasksToJournal(data.tasks);
        }

        const reply =
          typeof data?.SarthiAi === "string"
            ? data.SarthiAi
            : String(data?.SarthiAi || "No reply from AI.");

        setMessages((prev) => [...prev, { role: "ai", text: reply }]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred.";
        setError(message);
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
    },
    [profile]
  );

  const toneValue = profile?.tone ?? "warm";
  const currentQuiz = stage === "quiz" ? quizQuestions[quizIndex] : null;
  const inputPlaceholder =
    stage === "name"
      ? "Tell me your name so I can greet you."
      : stage === "problem"
      ? "Describe what you're moving through."
      : "Share your thought...";

  return (
    <main className="relative flex flex-col h-dvh bg-[#E3EEFF] text-slate-900 selection:bg-[#FFE5A5]/70 selection:text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-20 h-72 w-72 rounded-[4rem] border-[3px] border-slate-900/40 bg-linear-to-br from-[#FBC2EB]/70 via-[#A6C1EE]/65 to-[#8FD3F4]/60 shadow-[14px_14px_0_rgba(15,23,42,0.2)] animate-[glideSlow_16s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-[5rem] border-[3px] border-slate-900/40 bg-linear-to-br from-[#FFC3A0]/75 via-[#FFAFBD]/65 to-[#FBD786]/70 shadow-[14px_14px_0_rgba(15,23,42,0.22)] animate-[glideFast_12s_ease-in-out_infinite]" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-144 w-xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-tr from-[#FDF2FF]/55 via-[#DDEBFF]/65 to-[#FFF9E6]/55 blur-[120px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      <header className="w-full border-b-4 border-black bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:py-4">
          <motion.div whileHover={{ scale: 1.05 }} className="z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-[#FFE5A5] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,0.25)] sm:px-4 sm:py-1.5 sm:text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              href="/talk"
              className="flex items-center justify-center rounded-full border-2 border-black bg-linear-to-r from-[#F4E8FF] via-[#E4F4FF] to-[#FFEED8] px-4 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-6 sm:py-2 sm:text-sm"
            >
              Chat with Sarathi
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, rotate: 1 }}
            whileTap={{ scale: 0.94 }}
          >
            <Link
              href="/talk"
              className="flex items-center justify-center gap-2 rounded-full border-2 border-black bg-linear-to-r from-[#CDEBFF] via-[#DFFFE9] to-[#FFE5FB] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[4px_4px_0_#00000022] sm:px-5 sm:py-2 sm:text-xs"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Talk to Sarathi</span>
            </Link>
          </motion.div>
        </div>
      </header>

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
                        : "border-slate-900/45 bg-linear-to-br from-[#F6F9FF]/95 via-white/95 to-[#E8F1FF]/95 text-slate-800"
                      : "border-slate-900/60 bg-linear-to-br from-[#FFD07F] via-[#FFB4BC] to-[#FDE3FF] text-slate-900"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            );
          })}

          {currentQuiz && (
            <QuizCard
              question={currentQuiz}
              selected={quizSelection}
              freeform={quizFreeform}
              error={quizError}
              onSelect={(value) => {
                setQuizError(null);
                setQuizSelection(value);
              }}
              onFreeformChange={(value) => {
                setQuizError(null);
                setQuizFreeform(value);
              }}
              onSubmit={handleQuizSubmit}
            />
          )}

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

      {showScrollToBottom && (
        <motion.button
          onClick={() => scrollToBottom()}
          className="fixed bottom-24 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border-[3px] border-slate-900 bg-linear-to-r from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900 shadow-[10px_10px_0_rgba(15,23,42,0.18)] sm:bottom-26 sm:right-12 sm:left-auto sm:translate-x-0"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.93 }}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="hidden md:block">Latest</span>
        </motion.button>
      )}

      <footer className="sticky bottom-0 z-40 flex justify-center bg-[#E3EEFF]/90 px-4 pb-5 pt-4 backdrop-blur-md sm:px-8">
        <motion.div className="w-full max-w-3xl rounded-3xl border-[3px] border-slate-900 bg-linear-to-r from-white/92 via-[#F6F9FF]/92 to-white/92 px-4 py-3 shadow-[14px_14px_0_rgba(15,23,42,0.2)] transition">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-600 sm:text-xs">
              Tone
              <div className="relative">
                <select
                  value={toneValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    commitProfile((prev) => ({
                      ...prev,
                      tone: value,
                      lastUpdated: new Date().toISOString(),
                    }));
                  }}
                  className="appearance-none rounded-full border-[3px] border-slate-900 bg-white px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-900 shadow-[6px_6px_0_rgba(15,23,42,0.18)] focus:outline-none sm:text-xs"
                >
                  {toneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {stage === "chat" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleRequestTasks}
                className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-linear-to-r from-[#C9F0FF] via-[#E4E8FF] to-[#FFE5F3] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-900 shadow-[8px_8px_0_rgba(15,23,42,0.18)]"
                disabled={isTyping}
              >
                <Sparkles className="h-4 w-4" />
                Tasks
              </motion.button>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={inputPlaceholder}
              className="h-11 rounded-full bg-transparent px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none sm:h-14 sm:text-base"
              disabled={isTyping || stage === "quiz"}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || stage === "quiz"}
              className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-slate-900 bg-linear-to-br from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF] shadow-[8px_8px_0_rgba(15,23,42,0.16)] disabled:opacity-60 sm:h-12 sm:w-12"
            >
              <SendHorizonal className="h-5 w-5 text-slate-900" />
            </button>
          </div>

          {stage === "chat" && (
            <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-400 sm:text-[0.7rem]">
              {toneOptions.find((option) => option.value === toneValue)?.helper}
            </p>
          )}
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

  function commitProfile(
    updater: (prev: UserProfile) => UserProfile
  ): UserProfile {
    let nextProfile = createProfile();
    setProfile((prev) => {
      const base = prev ?? createProfile();
      nextProfile = updater(base);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      }
      return nextProfile;
    });
    return nextProfile;
  }
}

type ApiChatRequest = {
  message: string;
  name?: string;
  tone?: string;
  quizAnswers?: QuizAnswer[];
  problemSummary?: string;
  tasks?: TaskPayload[];
  requestTasks?: boolean;
};

function createProfile(): UserProfile {
  return {
    name: "",
    tone: "warm",
    quizAnswers: [],
    problemSummary: "",
    onboardingComplete: false,
    lastUpdated: new Date().toISOString(),
  };
}

function sanitizeName(value: string) {
  return value.replace(/[^\p{L}\p{N}\s'\-]/gu, "").trim();
}

function loadTasksForContext(): TaskPayload[] {
  const stored = loadStoredTasks();
  return stored.slice(0, 12).map((task) => ({
    text: task.text,
    karma: task.karma,
    category: task.category,
    note: task.note,
    done: task.done,
  }));
}

function loadStoredTasks(): StoredTask[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TASKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredTask[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((task) => ({
        id: String(task?.id || `task-${Math.random().toString(16).slice(2)}`),
        text: typeof task?.text === "string" ? task.text : "",
        done: Boolean(task?.done),
        karma: typeof task?.karma === "number" ? task.karma : undefined,
        category:
          typeof task?.category === "string" ? task.category : undefined,
        note: typeof task?.note === "string" ? task.note : undefined,
        createdAt:
          typeof task?.createdAt === "string"
            ? task.createdAt
            : new Date().toISOString(),
      }))
      .filter((task) => task.text.trim());
  } catch {
    return [];
  }
}

function saveTasksToJournal(tasks: TaskPayload[]) {
  if (typeof window === "undefined") return;
  const valid = tasks
    .filter((task) => typeof task?.text === "string")
    .map((task) => ({
      text: task.text.trim().slice(0, 120),
      karma:
        typeof task?.karma === "number"
          ? Math.max(1, Math.round(task.karma))
          : 10,
      category:
        typeof task?.category === "string"
          ? task.category.slice(0, 32)
          : undefined,
      note:
        typeof task?.note === "string"
          ? task.note.trim().slice(0, 120)
          : undefined,
    }))
    .slice(0, 3);

  if (valid.length === 0) return;

  const existing = loadStoredTasks();
  const timestamp = Date.now();
  const prepared: StoredTask[] = valid.map((task, index) => ({
    id: `task-${timestamp}-${index}`,
    text: task.text,
    karma: task.karma,
    category: task.category,
    note: task.note,
    done: false,
    createdAt: new Date().toISOString(),
  }));

  const merged = [
    ...prepared,
    ...existing.filter(
      (item) => !prepared.some((candidate) => candidate.text === item.text)
    ),
  ];

  window.localStorage.setItem(TASKS_KEY, JSON.stringify(merged));
}

type QuizCardProps = {
  question: QuizQuestion;
  selected: string;
  freeform: string;
  error: string | null;
  onSelect: (value: string) => void;
  onFreeformChange: (value: string) => void;
  onSubmit: () => void;
};

function QuizCard({
  question,
  selected,
  freeform,
  error,
  onSelect,
  onFreeformChange,
  onSubmit,
}: QuizCardProps) {
  return (
    <div className="self-start max-w-[78%] rounded-[1.8rem] border-[3px] border-slate-900/45 bg-linear-to-br from-[#F6F9FF]/95 via-white/95 to-[#E8F1FF]/95 px-6 py-5 text-sm font-medium leading-relaxed text-slate-800 shadow-[10px_10px_0_rgba(15,23,42,0.12)] sm:max-w-[70%] sm:px-7 sm:py-6 sm:text-base">
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-slate-900">{question.prompt}</p>
          {question.helper && (
            <p className="text-[0.7rem] uppercase tracking-[0.24em] text-slate-400">
              {question.helper}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => {
            const active = selected === option;
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                className={`rounded-full border-[3px] px-4 py-1.5 text-[0.75rem] font-bold uppercase tracking-[0.2em] shadow-[6px_6px_0_rgba(15,23,42,0.16)] transition sm:text-xs ${
                  active
                    ? "border-slate-900 bg-[#FFE5A5] text-slate-900"
                    : "border-slate-300/90 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900"
                }`}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>

        {question.allowText && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Add a short note (optional)
            </label>
            <input
              value={freeform}
              onChange={(event) => onFreeformChange(event.target.value)}
              placeholder="Share a word or two..."
              className="rounded-full border-[3px] border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-[#C9F0FF]/50"
            />
          </div>
        )}

        <button
          onClick={onSubmit}
          className="mt-1 inline-flex items-center justify-center gap-2 self-start rounded-full border-[3px] border-slate-900 bg-[#FFE5A5] px-4 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.24em] text-slate-900 shadow-[6px_6px_0_rgba(15,23,42,0.18)]"
          type="button"
        >
          Continue
        </button>

        {error && (
          <p className="text-xs font-semibold text-rose-500">{error}</p>
        )}
      </div>
    </div>
  );
}
