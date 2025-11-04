"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Mic,
  SendHorizonal,
  ChevronDown,
  ChevronLeft,
  Sparkles,
  ArrowUpRight,
  PlusCircle,
} from "lucide-react";

type MessageAction = { label: string; href: string };

type Stage = "loading" | "name" | "quiz" | "problem" | "chat";

type QuizAnswer = { id: string; question: string; answer: string };

type TaskPayload = {
  text: string;
  karma?: number;
  category?: string;
  note?: string;
  done?: boolean;
};

type StoredTask = {
  id: string;
  text: string;
  done: boolean;
  karma?: number;
  category?: string;
  note?: string;
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

type ChatMessageVariant = "default" | "tasks";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
  actions?: MessageAction[];
  variant?: ChatMessageVariant;
  tasks?: TaskPayload[];
};

type ApiChatResponse = {
  SarthiAi?: string;
  tasks?: TaskPayload[];
  error?: string;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  helper?: string;
  allowText?: boolean;
};

type ToneOption = {
  value: string;
  label: string;
  gradient: string;
  icon: string;
};

const PROFILE_KEY = "sarathi-profile";
const MESSAGES_KEY = "sarathi-chat-messages";
const TASKS_KEY = "sarathi-journal-tasks";

const toneOptions: ToneOption[] = [
  {
    value: "warm",
    label: "Warm Companion",
    gradient: "from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF]",
    icon: "🌤️",
  },
  {
    value: "spiritual",
    label: "Soulful Guide",
    gradient: "from-[#D6F2FF] via-[#E8FFEF] to-[#FFF4E2]",
    icon: "🪷",
  },
  {
    value: "coach",
    label: "Gentle Coach",
    gradient: "from-[#FFE9C3] via-[#EAF0FF] to-[#FFE2F4]",
    icon: "⚡",
  },
];

const quizQuestions: QuizQuestion[] = [
  {
    id: "energy",
    prompt: "How does your energy feel in this moment?",
    helper: "Choose what resonates or add your own words",
    options: ["Tender", "Steady", "Scattered", "Bright"],
    allowText: true,
  },
  {
    id: "focus",
    prompt: "Which area of life is asking for the most love today?",
    options: ["Body", "Heart", "Mind", "Work"],
    allowText: true,
  },
  {
    id: "support",
    prompt: "What kind of support would feel nourishing right now?",
    options: ["Clarity", "Encouragement", "Grounding", "Surprise me"],
    allowText: true,
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [tonePulse, setTonePulse] = useState(false);
  const [messagesHydrated, setMessagesHydrated] = useState(false);

  const [stage, setStage] = useState<Stage>("loading");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelection, setQuizSelection] = useState("");
  const [quizFreeform, setQuizFreeform] = useState("");
  const [quizError, setQuizError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const toneMenuRef = useRef<HTMLDivElement | null>(null);
  const toneButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedProfile = window.localStorage.getItem(PROFILE_KEY);
    const storedTone = window.localStorage.getItem("sarathi-active-tone");
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
    } else if (storedTone) {
      nextProfile = {
        ...nextProfile,
        tone: storedTone,
      };
    }

    setProfile(nextProfile);

    const storedMessages = window.sessionStorage.getItem(MESSAGES_KEY);
    if (storedMessages) {
      const hydrated = sanitizeStoredMessages(storedMessages);
      if (hydrated.length > 0) {
        setMessages(hydrated);
      }
    }

    const nextStage = resolveStageFromProfile(nextProfile);
    if (nextStage === "quiz") {
      setQuizIndex(countCompletedQuizAnswers(nextProfile.quizAnswers));
    }
    setStage(nextStage);

    setProfileLoaded(true);
    setMessagesHydrated(true);
  }, []);

  useEffect(() => {
    if (!profileLoaded) return;

    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const initialText = getInitialMessageForStage(stage, profile);
      return initialText ? [{ role: "ai", text: initialText }] : [];
    });
  }, [profile, profileLoaded, stage]);

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
    const prompt = `Thanks for pausing with me${
      profile?.name ? `, ${profile.name}` : ""
    }. What's feeling heaviest for you right now?`;
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

  useEffect(() => {
    if (!messagesHydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn("Failed to persist chat history", error);
    }
  }, [messages, messagesHydrated]);

  useEffect(() => {
    if (!toneMenuOpen) return;

    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        toneMenuRef.current?.contains(target) ||
        toneButtonRef.current?.contains(target)
      ) {
        return;
      }
      setToneMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setToneMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [toneMenuOpen]);

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
        setError("Please share a name so I know what to call you.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", text },
        {
          role: "ai",
          text: `Great to meet you, ${cleanName}. Let's do a quick check-in together.`,
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

  const handleNewChat = useCallback(() => {
    const baseProfile = profile ?? createProfile();
    const nextStage = resolveStageFromProfile(baseProfile);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(MESSAGES_KEY);
    }

    setIsTyping(false);
    setError(null);
    setShowScrollToBottom(false);

    if (nextStage === "quiz") {
      setQuizIndex(countCompletedQuizAnswers(baseProfile.quizAnswers));
      setQuizSelection("");
      setQuizFreeform("");
      setQuizError(null);
    }

    setStage(nextStage);

    const initialText = getInitialMessageForStage(nextStage, baseProfile);
    setMessages(initialText ? [{ role: "ai", text: initialText }] : []);

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [profile, scrollToBottom]);

  const handleRequestTasks = async () => {
    if (isTyping || stage !== "chat") return;
    const requestText =
      "Could you design a few gentle daily tasks for me today?";
    setMessages((prev) => [...prev, { role: "user", text: requestText }]);
    await processMessage(requestText, { requestTasks: true });
  };

  const syncInputHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const maxHeight = 144;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

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

        const chatTasks = normalizeTaskPayloads(
          Array.isArray(data?.tasks) ? (data.tasks as TaskPayload[]) : undefined
        );

        let actions: MessageAction[] | undefined;
        if (chatTasks.length > 0) {
          saveTasksToJournal(Array.isArray(data?.tasks) ? data.tasks : []);
          actions = [
            {
              label: "View Journal",
              href: "/journal",
            },
          ];
        }

        const rawReply =
          typeof data?.SarthiAi === "string"
            ? data.SarthiAi
            : String(data?.SarthiAi || "No reply from AI.");

        const reply =
          chatTasks.length > 0
            ? `${rawReply}\n\nI've saved these gentle tasks in your journal. Tap "View Journal" whenever you're ready.`
            : rawReply;

        const nextMessage: ChatMessage = {
          role: "ai",
          text: reply,
          actions,
          variant: chatTasks.length > 0 ? "tasks" : "default",
          tasks: chatTasks.length > 0 ? chatTasks : undefined,
        };

        setMessages((prev) => [...prev, nextMessage]);
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
  const activeTone =
    toneOptions.find((option) => option.value === toneValue) ?? toneOptions[0];
  const displayName = profile?.name?.trim() ? profile.name : "Dear Friend";
  const toneGlow = getToneGlow(toneValue);
  const currentQuiz = stage === "quiz" ? quizQuestions[quizIndex] : null;
  const inputPlaceholder =
    stage === "name"
      ? "What name should I call you?"
      : stage === "problem"
      ? "What feels most important to talk about today?"
      : "Tell me what's on your mind...";

  useEffect(() => {
    if (!profileLoaded) return;
    setTonePulse(true);
    const timeout = window.setTimeout(() => setTonePulse(false), 480);
    return () => window.clearTimeout(timeout);
  }, [toneValue, profileLoaded]);

  useEffect(() => {
    syncInputHeight();
  }, [input, stage, syncInputHeight]);

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
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div whileHover={{ scale: 1.05 }} className="z-10">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-[#FFE5A5] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,0.25)] sm:px-4 sm:py-1.5 sm:text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </motion.div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.05, rotate: 0.6 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleNewChat}
              aria-label="Start a new chat"
              className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-white px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.15em] text-slate-900 shadow-[3px_3px_0px_rgba(15,23,42,0.22)] transition hover:bg-[#F7F9FF] sm:px-4 sm:py-1.5 sm:text-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">New Chat</span>
          
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-[0.7rem]">
              Sarathi walks with
            </span>
            <motion.span
              key={displayName}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-1 inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-linear-to-r from-[#FFF0C8] via-[#F6E9FF] to-[#FFE1EC] px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-slate-900 shadow-[6px_6px_0_rgba(15,23,42,0.18)] sm:px-7 sm:py-2 sm:text-base sm:tracking-[0.42em]"
            >
              {displayName}
            </motion.span>
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
        <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5 rounded-[2.1rem] border border-slate-200 bg-white/80 px-4 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md sm:space-y-6 sm:px-6 sm:py-6">
          {messages.map((m, i) => {
            const isAI = m.role === "ai";
            const containsCode = /```/.test(m.text);
            const variant =
              m.variant ?? (m.actions?.length ? "tasks" : "default");
            const hasTasks =
              variant === "tasks" &&
              isAI &&
              Array.isArray(m.tasks) &&
              m.tasks.length > 0;
            const content = containsCode
              ? renderCodeBlock(m.text)
              : renderMessageSegments(
                  m.text,
                  isAI,
                  !hasTasks && variant === "tasks"
                );
            const bubbleClasses = isAI
              ? containsCode
                ? "border-slate-900/80 bg-[#1F1D3A] font-mono whitespace-pre-wrap text-white shadow-none"
                : variant === "tasks"
                ? "border-slate-200 bg-white/95 text-slate-800"
                : "border-slate-200 bg-white/90 text-slate-800"
              : "border-[#FFC6D9]/60 bg-linear-to-br from-[#FFD9A8] via-[#FFBDD2] to-[#FDEBFF] text-slate-900";
            return (
              <motion.div
                layout
                key={`${m.role}-${i}`}
                initial={isAI ? { opacity: 0, x: -20 } : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                className={`flex ${isAI ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl border-2 px-4 py-3 text-[0.92rem] font-medium leading-relaxed shadow-[6px_6px_0_rgba(15,23,42,0.08)] sm:max-w-[70%] sm:px-6 sm:py-4 sm:text-[0.95rem] ${bubbleClasses}`}
                >
                  {hasTasks ? (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <Sparkles className="h-3.5 w-3.5 text-[#4F59CE]" />
                        Gentle tasks for today
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2 py-0.5 text-[0.58rem] font-semibold text-slate-500">
                        Saved to journal
                      </span>
                    </div>
                  ) : null}
                  <div className="space-y-2 text-slate-700">{content}</div>
                  {hasTasks ? (
                    <div className="mt-3 space-y-2.5">
                      {m.tasks?.map((task, taskIndex) => (
                        <motion.div
                          key={`${m.role}-${i}-task-${taskIndex}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.22,
                            delay: taskIndex * 0.05,
                          }}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 shadow-[3px_3px_0_rgba(15,23,42,0.06)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="text-[0.95rem] font-semibold text-slate-900">
                              {task.text}
                            </span>
                            {typeof task.karma === "number" ? (
                              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[#4654C8]">
                                +{task.karma} Karma
                              </span>
                            ) : null}
                          </div>
                          {task.note ? (
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                              {task.note}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#505CCC]">
                            {task.category ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5">
                                <Sparkles className="h-3 w-3 text-[#4F59CE]" />
                                {formatTaskCategory(task.category)}
                              </span>
                            ) : null}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : null}
                  {Array.isArray(m.actions) && m.actions.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.actions.map((action, actionIndex) => (
                        <Link
                          key={`${m.role}-${i}-action-${actionIndex}`}
                          href={action.href}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_16px_rgba(52,63,132,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9D6FF] sm:text-[0.7rem]"
                        >
                          <span>{action.label}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ))}
                    </div>
                  ) : null}
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
          className="fixed bottom-40 right-5 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border-[3px] border-slate-900 bg-linear-to-r from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900 shadow-[10px_10px_0_rgba(15,23,42,0.18)] sm:bottom-26 sm:right-12 sm:left-auto sm:translate-x-0"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.93 }}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="hidden md:block">Scroll Down</span>
        </motion.button>
      )}

      <footer className="sticky bottom-0 z-40 flex justify-center bg-[#E3EEFF]/90 px-3 pb-4 pt-3 backdrop-blur-md sm:px-8 sm:pb-5 sm:pt-4">
        <motion.div
          className="w-full max-w-3xl rounded-3xl border-2 border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition sm:px-4 sm:py-3"
          animate={{ scale: inputFocused ? 1.01 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div
            className={`mb-2 flex w-full items-center gap-2 sm:gap-3 ${
              stage === "chat" ? "justify-between" : "justify-start"
            }`}
          >
            <div className="relative flex min-w-0 items-center">
              <motion.button
                ref={toneButtonRef}
                type="button"
                whileHover={{ scale: 1.03, rotate: 0.4 }}
                whileTap={{ scale: 0.95 }}
                animate={tonePulse ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                transition={{
                  duration: tonePulse ? 0.45 : 0.2,
                  ease: "easeOut",
                }}
                onClick={() => setToneMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={toneMenuOpen}
                className={`group relative inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-linear-to-r ${activeTone.gradient} px-3 py-1 text-left text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-900 shadow-[6px_6px_0_rgba(15,23,42,0.14)] focus:outline-none sm:px-3.5 sm:py-1.5 sm:text-[0.68rem]`}
              >
                <motion.span
                  key={`tone-glow-${toneValue}`}
                  className="pointer-events-none absolute inset-0 -z-10"
                  initial={{ opacity: 0.3, scale: 0.9 }}
                  animate={{ opacity: tonePulse ? 0.7 : 0.45, scale: 1 }}
                  transition={{
                    duration: tonePulse ? 0.5 : 0.6,
                    ease: "easeOut",
                  }}
                  style={{ background: toneGlow }}
                />
                <span
                  aria-hidden="true"
                  className="text-base leading-none sm:text-lg"
                >
                  {activeTone.icon}
                </span>
                <span className="truncate">{activeTone.label}</span>
                <motion.span
                  initial={false}
                  animate={{ rotate: toneMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-900/15 bg-white/80 text-slate-700 sm:h-6 sm:w-6"
                >
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </motion.span>
              </motion.button>

              <AnimatePresence>
                {toneMenuOpen && (
                  <motion.div
                    ref={toneMenuRef}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    role="listbox"
                    aria-label="Tone selector"
                    className="absolute bottom-[calc(100%+0.6rem)] left-0 z-50 w-56 max-w-[calc(100vw-2rem)] origin-bottom rounded-[1.3rem] border-[3px] border-slate-900 bg-white/95 p-1.5 shadow-[10px_10px_0_rgba(15,23,42,0.16)] backdrop-blur-sm sm:w-64"
                  >
                    {toneOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setToneMenuOpen(false);
                          commitProfile((prev) => ({
                            ...prev,
                            tone: option.value,
                            lastUpdated: new Date().toISOString(),
                          }));
                        }}
                        role="option"
                        aria-selected={toneValue === option.value}
                        className={`group flex w-full items-center rounded-2xl border border-transparent px-3 py-1.5 text-left text-[0.68rem] font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/80 sm:text-[0.72rem] ${
                          option.value === toneValue
                            ? "border-slate-900/20 bg-slate-50/90"
                            : "hover:border-slate-900/20 hover:bg-slate-50/60"
                        }`}
                      >
                        <span className="truncate text-slate-800">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {stage === "chat" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleRequestTasks}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-linear-to-r from-[#C9F0FF] via-[#E4E8FF] to-[#FFE5F3] px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.2em] text-slate-900 shadow-[6px_6px_0_rgba(15,23,42,0.15)] sm:px-3.5 sm:py-1.5 sm:text-[0.66rem]"
                disabled={isTyping}
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Tasks
              </motion.button>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2 sm:gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={inputPlaceholder}
              rows={1}
              className="max-h-52 min-h-11 w-full resize-none rounded-2xl border border-transparent bg-transparent px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:shadow-[0_0_0_2px_rgba(15,23,42,0.12)] sm:min-h-14 sm:px-4 sm:py-2.5 sm:text-base"
              disabled={isTyping || stage === "quiz"}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || stage === "quiz"}
              className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-slate-900 bg-linear-to-br from-[#FFE5A5] via-[#FFC1DB] to-[#C9F0FF] shadow-[8px_8px_0_rgba(15,23,42,0.16)] disabled:opacity-60 sm:h-12 sm:w-12"
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

  function commitProfile(
    updater: (prev: UserProfile) => UserProfile
  ): UserProfile {
    let nextProfile = createProfile();
    setProfile((prev) => {
      const base = prev ?? createProfile();
      nextProfile = updater(base);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
        window.localStorage.setItem(
          "sarathi-active-tone",
          nextProfile.tone ?? "warm"
        );
      }
      return nextProfile;
    });
    return nextProfile;
  }
}

type MessageSegment =
  | { type: "paragraph"; lines: string[] }
  | { type: "ordered-list"; lines: string[] }
  | { type: "unordered-list"; lines: string[] };

function resolveStageFromProfile(profile: UserProfile | null): Stage {
  if (!profile || !profile.name?.trim()) {
    return "name";
  }

  const completedAnswers = countCompletedQuizAnswers(profile.quizAnswers);

  if (completedAnswers < quizQuestions.length) {
    return "quiz";
  }

  if (!profile.problemSummary?.trim()) {
    return "problem";
  }

  return "chat";
}

function countCompletedQuizAnswers(answers?: QuizAnswer[]): number {
  if (!Array.isArray(answers)) return 0;
  return answers.filter((entry) => entry && entry.answer?.trim()).length;
}

function getInitialMessageForStage(
  stage: Stage,
  profile: UserProfile | null
): string | null {
  const name = profile?.name?.trim();
  switch (stage) {
    case "name":
      return "Hi friend, what name would you like me to use for you?";
    case "quiz":
      return name
        ? `Welcome back, ${name}. Let's do a quick check-in so I can understand how you're feeling today.`
        : "Welcome back. Let's do a quick check-in so I can understand how you're feeling today.";
    case "problem":
      return name
        ? `Thanks for trusting me, ${name}. What's the one thing weighing on you that we should talk about first?`
        : "Thanks for trusting me. What's the one thing weighing on you that we should talk about first?";
    case "chat":
      return name
        ? `I'm here, ${name}. What would you like to explore together right now?`
        : "I'm here. What would you like to explore together right now?";
    default:
      return null;
  }
}

function sanitizeStoredMessages(raw: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Partial<ChatMessage> & {
          actions?: Array<Partial<MessageAction>>;
        };

        const role =
          candidate.role === "ai" || candidate.role === "user"
            ? candidate.role
            : null;
        const text = typeof candidate.text === "string" ? candidate.text : null;
        if (!role || !text) return null;

        const actions = Array.isArray(candidate.actions)
          ? candidate.actions
              .map((action) => {
                if (!action || typeof action !== "object") return null;
                const label =
                  typeof action.label === "string"
                    ? action.label.slice(0, 48)
                    : null;
                const href =
                  typeof action.href === "string" ? action.href : null;
                if (!label || !href) return null;
                return { label, href } as MessageAction;
              })
              .filter(Boolean)
          : undefined;

        const tasks = normalizeTaskPayloads(
          Array.isArray(candidate.tasks)
            ? (candidate.tasks as TaskPayload[])
            : undefined
        );

        const variant =
          candidate.variant === "tasks" || tasks.length > 0
            ? "tasks"
            : undefined;

        return {
          role,
          text,
          actions: actions && actions.length > 0 ? actions : undefined,
          variant,
          tasks: tasks.length > 0 ? tasks : undefined,
        } as ChatMessage;
      })
      .filter((message): message is ChatMessage => Boolean(message));
  } catch {
    return [];
  }
}

function getToneGlow(tone: string) {
  switch (tone) {
    case "spiritual":
      return "radial-gradient(120% 120% at 20% 20%, rgba(209, 231, 255, 0.8), rgba(215, 255, 240, 0.15) 65%)";
    case "coach":
      return "radial-gradient(120% 120% at 80% 20%, rgba(201, 240, 255, 0.75), rgba(255, 234, 215, 0.18) 60%)";
    default:
      return "radial-gradient(130% 130% at 50% 10%, rgba(255, 224, 181, 0.75), rgba(255, 201, 219, 0.18) 62%)";
  }
}

function renderCodeBlock(text: string) {
  return (
    <pre className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
      {text}
    </pre>
  );
}

function renderMessageSegments(
  text: string,
  isAI: boolean,
  highlightTasks = false
) {
  const cleanText = text.trim();
  if (!cleanText) {
    return <span>{text}</span>;
  }

  const segments = parseMessageSegments(cleanText);
  if (segments.length === 0) {
    return <span>{cleanText}</span>;
  }

  return segments.map((segment: MessageSegment, index: number) => {
    if (segment.type === "paragraph") {
      return (
        <p
          key={`paragraph-${index}`}
          className="mb-1.5 last:mb-0 leading-relaxed"
        >
          {segment.lines.map((line: string, lineIndex: number) => (
            <span key={`line-${index}-${lineIndex}`}>
              {line}
              {lineIndex < segment.lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
    }

    if (segment.type === "ordered-list") {
      return (
        <ol key={`ordered-${index}`} className="space-y-1.5 pt-0.5">
          {segment.lines.map((line: string, itemIndex: number) => (
            <motion.li
              key={`ordered-${index}-${itemIndex}`}
              className={`relative flex items-start gap-2.5 rounded-xl border px-3.5 py-2 text-left shadow-[3px_3px_0_rgba(15,23,42,0.05)] transition-colors ${
                highlightTasks
                  ? "border-[#4F59CE]/30 bg-linear-to-br from-[#F3F5FF]/95 via-[#F9FBFF]/95 to-white text-[#202B5A]"
                  : "border-slate-900/8 bg-white/90 text-slate-700"
              }`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: itemIndex * 0.04 }}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-linear-to-br from-[#F9F0FF] via-[#E8F2FF] to-[#FFECD8] text-[0.7rem] font-semibold text-slate-600 ${
                  highlightTasks
                    ? "border-[#4A54C4]/35 bg-linear-to-br from-[#E6EAFF] via-[#F3F5FF] to-[#FFEBD6] text-[#2E3990]"
                    : isAI
                    ? "shadow-[0_2px_0_rgba(15,23,42,0.08)]"
                    : ""
                }`}
              >
                {itemIndex + 1}
              </span>
              <span
                className={`leading-relaxed text-[0.95rem] ${
                  highlightTasks ? "font-medium" : ""
                }`}
              >
                {line}
              </span>
            </motion.li>
          ))}
        </ol>
      );
    }

    return (
      <ul key={`unordered-${index}`} className="space-y-1.5 pt-0.5">
        {segment.lines.map((line: string, itemIndex: number) => (
          <motion.li
            key={`unordered-${index}-${itemIndex}`}
            className={`relative flex items-start gap-2.5 rounded-xl border px-3.5 py-2 text-left shadow-[3px_3px_0_rgba(15,23,42,0.05)] transition-colors ${
              highlightTasks
                ? "border-[#4F59CE]/30 bg-linear-to-br from-[#F3F5FF]/95 via-[#F9FBFF]/95 to-white text-[#202B5A]"
                : "border-slate-900/8 bg-white/90 text-slate-700"
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: itemIndex * 0.05 }}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-medium ${
                highlightTasks
                  ? "bg-linear-to-br from-[#E7EAFF] via-[#F3F5FF] to-[#FFEAD9] text-[#2E3990]"
                  : "bg-linear-to-br from-[#FFE3F7] via-[#EEF5FF] to-[#FFEED9] text-slate-600"
              }`}
            >
              ✶
            </span>
            <span
              className={`leading-relaxed text-[0.95rem] ${
                highlightTasks ? "font-medium" : ""
              }`}
            >
              {line}
            </span>
          </motion.li>
        ))}
      </ul>
    );
  });
}

function parseMessageSegments(text: string): MessageSegment[] {
  const normalised = text.replace(/\r\n/g, "\n");
  const lines = normalised.split("\n");
  const segments: MessageSegment[] = [];

  let current: MessageSegment | null = null;

  const flush = () => {
    if (!current) return;
    if (current.lines.length === 0) {
      current = null;
      return;
    }
    segments.push(current);
    current = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      return;
    }

    const orderedMatch = trimmed.match(/^(\d+)[\.)]\s+(.*)$/);
    if (orderedMatch) {
      if (!current || current.type !== "ordered-list") {
        flush();
        current = { type: "ordered-list", lines: [] };
      }
      current.lines.push(orderedMatch[2].trim());
      return;
    }

    const unorderedMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    if (unorderedMatch) {
      if (!current || current.type !== "unordered-list") {
        flush();
        current = { type: "unordered-list", lines: [] };
      }
      current.lines.push(unorderedMatch[1].trim());
      return;
    }

    if (!current || current.type !== "paragraph") {
      flush();
      current = { type: "paragraph", lines: [] };
    }
    current.lines.push(trimmed);
  });

  flush();
  return segments;
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

function normalizeTaskPayloads(tasks?: TaskPayload[]): TaskPayload[] {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task) => {
      if (!task || typeof task.text !== "string") return null;
      const text = task.text.trim().slice(0, 120);
      if (!text) return null;
      const category =
        typeof task.category === "string" && task.category.trim()
          ? task.category.trim().slice(0, 32)
          : undefined;
      const note =
        typeof task.note === "string" && task.note.trim()
          ? task.note.trim().slice(0, 120)
          : undefined;
      const karma =
        typeof task.karma === "number"
          ? Math.max(1, Math.round(task.karma))
          : 10;

      return {
        text,
        karma,
        category,
        note,
        done: Boolean(task.done),
      } as TaskPayload;
    })
    .filter((task): task is TaskPayload => Boolean(task))
    .slice(0, 3);
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
  const normalized = normalizeTaskPayloads(tasks);
  if (normalized.length === 0) return;

  const existing = loadStoredTasks();
  const timestamp = Date.now();
  const prepared: StoredTask[] = normalized.map((task, index) => ({
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

function formatTaskCategory(value?: string) {
  if (!value) return "";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(
      (fragment) =>
        fragment.charAt(0).toUpperCase() + fragment.slice(1).toLowerCase()
    )
    .join(" ");
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
    <div className="self-start w-full max-w-full rounded-[1.6rem] border-2 border-slate-200 bg-white/95 px-5 py-5 text-sm font-medium leading-relaxed text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:max-w-[70%] sm:px-7 sm:py-6 sm:text-base">
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
