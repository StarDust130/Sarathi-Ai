"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronDown, MessageSquareQuote } from "lucide-react";

type JournalEntry = {
  id: string;
  body: string;
  mood: string;
  highlight: string;
  createdAt: string;
};

type Task = {
  id: string;
  text: string;
  done: boolean;
};

const moodOptions = [
  { label: "Centered", emoji: "🪷" },
  { label: "Joyful", emoji: "🌞" },
  { label: "Reflective", emoji: "🪞" },
  { label: "Resolute", emoji: "⚡" },
];

const defaultTasks: Task[] = [
  { id: "task-1", text: "Note three gratitudes", done: false },
  { id: "task-2", text: "Move or stretch for 5 minutes", done: false },
  { id: "task-3", text: "Drink a glass of water", done: false },
];

const entryScopes = [
  { label: "Today", value: "today" as const },
  { label: "All days", value: "all" as const },
];

const taskScopes = [
  { label: "Active", value: "active" as const },
  { label: "All", value: "all" as const },
  { label: "Completed", value: "completed" as const },
];

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const JournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [draft, setDraft] = useState("");
  const [mood, setMood] = useState(moodOptions[0].label);
  const [highlight, setHighlight] = useState("");
  const [newTask, setNewTask] = useState("");
  const [entryScope, setEntryScope] = useState<"today" | "all">("today");
  const [taskFilter, setTaskFilter] = useState<"active" | "all" | "completed">(
    "active"
  );
  const [expandedEntryIds, setExpandedEntryIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedEntries = localStorage.getItem("sarathi-journal-entries");
    const storedTasks = localStorage.getItem("sarathi-journal-tasks");
    if (storedEntries) {
      try {
        setEntries(JSON.parse(storedEntries));
      } catch {
        setEntries([]);
      }
    }
    if (storedTasks) {
      try {
        setTasks(JSON.parse(storedTasks));
      } catch {
        setTasks(defaultTasks);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sarathi-journal-entries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sarathi-journal-tasks", JSON.stringify(tasks));
  }, [tasks]);

  const todayEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          new Date(entry.createdAt).toDateString() === new Date().toDateString()
      ),
    [entries]
  );

  const filteredEntries = useMemo(
    () => (entryScope === "today" ? todayEntries : entries),
    [entries, entryScope, todayEntries]
  );

  const activeTaskCount = useMemo(
    () => tasks.filter((task) => !task.done).length,
    [tasks]
  );
  const completedTaskCount = tasks.length - activeTaskCount;

  const filteredTasks = useMemo(() => {
    if (taskFilter === "active") {
      return tasks.filter((task) => !task.done);
    }
    if (taskFilter === "completed") {
      return tasks.filter((task) => task.done);
    }
    return tasks;
  }, [taskFilter, tasks]);

  const handleAddEntry = () => {
    if (!draft.trim() && !highlight.trim()) return;
    const now = new Date().toISOString();
    setEntries((prev) => [
      {
        id: `entry-${now}`,
        body: draft.trim(),
        mood,
        highlight: highlight.trim(),
        createdAt: now,
      },
      ...prev,
    ]);
    setDraft("");
    setHighlight("");
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: `task-${Date.now()}`, text: newTask.trim(), done: false },
    ]);
    setNewTask("");
  };

  const toggleEntryExpansion = (id: string) => {
    setExpandedEntryIds((prev) =>
      prev.includes(id)
        ? prev.filter((entryId) => entryId !== id)
        : [...prev, id]
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#E3EEFF] text-slate-900 selection:bg-[#FFE5A5]/70 selection:text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-12 top-16 h-[18rem] w-[18rem] rounded-[5rem] border-4 border-slate-900 bg-gradient-to-br from-[#FBC2EB] via-[#A6C1EE] to-[#8FD3F4] opacity-80 shadow-[18px_18px_0px_rgba(15,23,42,0.28)] animate-glide-slow" />
        <div className="absolute bottom-[-9rem] right-[-6rem] h-[22rem] w-[22rem] rounded-[6rem] border-4 border-slate-900 bg-gradient-to-br from-[#FFC3A0] via-[#FFAFBD] to-[#FBD786] shadow-[18px_18px_0px_rgba(15,23,42,0.24)] animate-glide-fast" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#FDF2FF]/60 via-[#DDEBFF]/70 to-[#FFF9E6]/65 blur-[140px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.75, 0.6] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute left-[14%] top-[20%] hidden h-[10rem] w-[10rem] -translate-x-1/2 rounded-[3rem] border-4 border-slate-900 bg-[#FDF6FF]/85 shadow-[14px_14px_0px_rgba(15,23,42,0.22)] sm:block"
          animate={{ y: [0, -16, 0], rotate: [0, 8, -4, 0] }}
          transition={{
            duration: 13,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[15%] h-[8rem] w-[8rem] rounded-full border-4 border-slate-900 bg-[#DAF4FF]/75 shadow-[12px_12px_0px_rgba(15,23,42,0.2)]"
          animate={{ y: [0, 18, 0], scale: [1, 1.06, 1] }}
          transition={{
            duration: 11,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="animate-shimmer absolute left-[55%] top-[26%] hidden h-[4px] w-[11rem] rounded-full bg-linear-to-r from-transparent via-white/80 to-transparent md:block"
          animate={{ opacity: [0.2, 0.7, 0.2], scaleX: [0.8, 1.1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-16 sm:px-6 lg:px-10">
        <header className="flex w-full items-center justify-between rounded-3xl border-4 border-slate-900 bg-[#F7FAFF]/90 px-3 py-3 shadow-[8px_8px_0px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:px-8 sm:py-4 relative">
          {/* Left - Back Button */}
          <motion.div whileHover={{ scale: 1.05 }} className="z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-[#FFE5A5] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,0.25)] sm:px-4 sm:py-1.5 sm:text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </motion.div>

          {/* Mobile title (visible on small screens) */}
          <span className="flex-1 text-center text-[0.85rem] font-extrabold uppercase tracking-[0.18em] text-slate-900 z-10 sm:hidden">
            Sarathi Journal
          </span>

          {/* Center - Decorative title for sm+ (hidden on mobile to avoid overlap) */}
          <span className="hidden sm:inline-flex absolute left-1/2 -translate-x-1/2 items-center rounded-full border-[3px] border-slate-900 bg-white/80 px-4 py-1 text-[0.8rem] font-extrabold uppercase tracking-[0.18em] text-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,0.25)]">
            Sarathi Journal
          </span>

          {/* Right - Talk Button */}
          <motion.div whileHover={{ scale: 1.05 }} className="z-10">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-gradient-to-r from-[#C9F0FF] via-[#E4E8FF] to-[#FFE5F3] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,0.22)] sm:px-4 sm:py-1.5 sm:text-xs"
            >
              <MessageSquareQuote className="h-4 w-4" />
              <span className="hidden sm:inline">Talk to Sarathi</span>
            </Link>
          </motion.div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative flex flex-col gap-6 overflow-hidden rounded-[2.6rem] border-4 border-slate-900 bg-gradient-to-br from-white/95 via-[#F6F9FF]/92 to-white/95 p-6 shadow-[20px_20px_0px_rgba(15,23,42,0.22)] backdrop-blur-[18px] sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,229,165,0.32),_transparent_62%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(161,210,255,0.28),_transparent_60%)]" />
            <div className="pointer-events-none absolute -right-24 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full border border-white/40 bg-white/25 blur-[46px]" />
            <div className="relative z-10 flex flex-col gap-6">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Compose
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Today&apos;s reflection
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-full border-3 border-slate-900 bg-white/80 p-1 shadow-[8px_8px_0px_rgba(15,23,42,0.18)]">
                  {entryScopes.map((tab) => {
                    const active = tab.value === entryScope;
                    return (
                      <motion.button
                        key={tab.value}
                        onClick={() => setEntryScope(tab.value)}
                        whileTap={{ scale: 0.95 }}
                        className={`rounded-full px-4 py-2 text-[0.65rem] font-black uppercase tracking-[0.22em] transition ${
                          active
                            ? "bg-[#FFE5A5] text-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,0.2)]"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        type="button"
                      >
                        {tab.label}
                      </motion.button>
                    );
                  })}
                </div>
              </header>

              <div className="flex flex-wrap md:flex-nowrap gap-3">
                {moodOptions.map((option) => {
                  const active = option.label === mood;
                  return (
                    <motion.button
                      key={option.label}
                      onClick={() => setMood(option.label)}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.94 }}
                      className={`flex items-center gap-2 rounded-full border-4 border-slate-900 px-4 py-2 text-sm font-semibold shadow-[10px_10px_0px_rgba(15,23,42,0.22)] transition ${
                        active
                          ? "bg-[#D6ECFF]"
                          : "bg-white/80 hover:bg-[#F1F5FF]"
                      }`}
                      type="button"
                    >
                      <span className="text-lg">{option.emoji}</span>
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Daily highlight
                <input
                  value={highlight}
                  onChange={(event) => setHighlight(event.target.value)}
                  placeholder="What moment do you want to remember?"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-[#B7CCFF]/40"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Entry
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Let your thoughts flow..."
                  rows={6}
                  className="w-full resize-none rounded-[1.8rem] border-2 border-slate-200 bg-white px-4 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-[#F9E2AF]/50"
                />
              </label>

              <div className="flex flex-col gap-4 border-t border-dashed border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-3">
                  <span>
                    {todayEntries.length > 0 ? (
                      <>
                        {todayEntries.length} entry
                        {todayEntries.length > 1 ? " entries" : ""} already
                        saved today.
                      </>
                    ) : (
                      <>No entries saved yet today.</>
                    )}
                  </span>
                  <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-slate-400 sm:inline-flex">
                    Viewing{" "}
                    {entryScope === "today" ? "today only" : "all entries"}
                  </span>
                </div>
                <button
                  onClick={handleAddEntry}
                  className="inline-flex items-center justify-center gap-3 rounded-full border-4 border-slate-900 bg-[#FFE5A5] px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-slate-900 shadow-[12px_12px_0px_rgba(15,23,42,0.26)] transition-transform duration-150 hover:-translate-y-1 hover:scale-[1.02]"
                >
                  Save reflection
                  <span className="text-lg leading-none">✍️</span>
                </button>
              </div>
            </div>
          </motion.article>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex flex-col gap-6 overflow-hidden rounded-[2.6rem] border-4 border-slate-900 bg-gradient-to-br from-[#F8FBFF]/95 via-[#EEF6FF]/92 to-white/95 p-6 shadow-[20px_20px_0px_rgba(15,23,42,0.22)] backdrop-blur-[18px] sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(199,231,255,0.4),_transparent_58%)]" />
            <div className="pointer-events-none absolute inset-x-[15%] top-10 h-24 rounded-full bg-white/30 blur-2xl" />
            <div className="relative z-10 flex flex-col gap-6">
              <header className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Daily rhythm
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">
                      Gentle checklist
                    </h2>
                  </div>
                  <motion.span
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="text-2xl"
                  >
                    ✅
                  </motion.span>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-full border-3 border-slate-900 bg-white/80 p-1 shadow-[8px_8px_0px_rgba(15,23,42,0.18)]">
                  {taskScopes.map((tab) => {
                    const active = tab.value === taskFilter;
                    return (
                      <motion.button
                        key={tab.value}
                        onClick={() => setTaskFilter(tab.value)}
                        whileTap={{ scale: 0.95 }}
                        className={`rounded-full px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.22em] transition ${
                          active
                            ? "bg-[#C7E7FF] text-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,0.2)]"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        type="button"
                      >
                        {tab.label}
                      </motion.button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {activeTaskCount} active • {completedTaskCount} completed
                </span>
              </header>

              {filteredTasks.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {filteredTasks.map((task) => (
                    <motion.li
                      key={task.id}
                      layout
                      className="relative overflow-hidden rounded-2xl border-3 border-slate-900 px-4 py-3 shadow-[12px_12px_0px_rgba(15,23,42,0.18)] transition"
                    >
                      <span
                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
                          task.done
                            ? "from-[#DDFCE0]/95 via-[#B8F5B7]/85 to-[#F0FFEA]/95"
                            : "from-white via-[#F5F8FF]/95 to-[#E5EEFF]/85"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="relative z-10 flex items-center gap-4">
                        <motion.button
                          onClick={() => toggleTask(task.id)}
                          whileTap={{ scale: 0.9 }}
                          className={`grid h-9 w-9 place-items-center rounded-full border-3 border-slate-900 text-lg font-bold shadow-[0_4px_0_rgba(15,23,42,0.25)] transition ${
                            task.done
                              ? "bg-gradient-to-br from-[#7DD86A] via-[#5AC65A] to-[#3FA94B] text-slate-900"
                              : "bg-gradient-to-br from-white via-[#EFF4FF] to-[#DDE7FF] text-slate-700 hover:from-[#F5F8FF] hover:to-white"
                          }`}
                          type="button"
                        >
                          {task.done ? "✔" : ""}
                        </motion.button>
                        <span
                          className={`text-sm font-semibold ${
                            task.done
                              ? "text-slate-500 line-through"
                              : "text-slate-800"
                          }`}
                        >
                          {task.text}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border-3 border-dashed border-slate-200 bg-white/70 px-4 py-5 text-center text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400 shadow-[8px_8px_0px_rgba(15,23,42,0.1)]">
                  Nothing in this view yet.
                </div>
              )}
            </div>
          </motion.aside>
        </section>

        <section className="grid gap-6">
          <header className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Recent moments
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              Your reflection timeline
            </h2>
          </header>

          {filteredEntries.length === 0 ? (
            <div className="rounded-[2.4rem] border-4 border-slate-900 bg-white/90 px-6 py-10 text-center text-sm font-semibold text-slate-500 shadow-[16px_16px_0px_rgba(15,23,42,0.22)]">
              {entryScope === "today"
                ? "Entries will bloom here once you begin writing today."
                : "Your archive is waiting for its first story."}
            </div>
          ) : (
            <div className="relative ml-1 grid gap-6 before:absolute before:inset-y-3 before:left-2 before:w-[3px] before:bg-gradient-to-b before:from-[#A5B4FC] before:via-[#FFD07F] before:to-[#FBC2EB] sm:ml-4 sm:gap-8 sm:before:left-4">
              {filteredEntries.map((entry, index) => {
                const isExpanded = expandedEntryIds.includes(entry.id);
                const bodyPreview = entry.body.trim();
                return (
                  <motion.article
                    key={entry.id}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="relative ml-6 overflow-hidden rounded-[2.3rem] border-4 border-slate-900 bg-gradient-to-br from-white/95 via-[#F3F8FF]/93 to-[#FFF7EC]/95 px-5 py-5 shadow-[18px_18px_0px_rgba(15,23,42,0.2)] backdrop-blur-[14px] sm:ml-12 sm:px-8 sm:py-7"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(252,216,164,0.32),_transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(197,220,255,0.25),transparent_60%)]" />
                    <span className="absolute -left-7 top-6 grid h-10 w-10 place-items-center rounded-full border-4 border-slate-900 bg-[#FFE5A5] text-lg font-bold text-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,0.22)] sm:-left-8">
                      {entry.mood === "Joyful"
                        ? "🌞"
                        : entry.mood === "Reflective"
                        ? "🪞"
                        : entry.mood === "Resolute"
                        ? "⚡"
                        : "🪷"}
                    </span>
                    <header className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                          {entry.highlight || "Quiet note"}
                        </h3>
                        <time className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-xs">
                          {formatDate(entry.createdAt)}
                        </time>
                      </div>
                      <motion.button
                        onClick={() => toggleEntryExpansion(entry.id)}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-2 self-start rounded-full border-[3px] border-slate-900 bg-white/80 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-slate-800 shadow-[6px_6px_0px_rgba(15,23,42,0.2)] sm:self-auto"
                        type="button"
                      >
                        {isExpanded ? "Hide entry" : "View entry"}
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.span>
                      </motion.button>
                    </header>
                    {!isExpanded && (
                      <p className="relative z-10 mt-3 text-sm text-slate-600 sm:text-[0.92rem]">
                        {bodyPreview
                          ? bodyPreview.length > 160
                            ? `${bodyPreview.slice(0, 160)}…`
                            : bodyPreview
                          : "Tap above to view this moment’s details."}
                      </p>
                    )}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="entry-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="relative z-10 mt-4 overflow-hidden"
                        >
                          <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[8px_8px_0px_rgba(15,23,42,0.14)]">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-[0.95rem]">
                              {bodyPreview ||
                                "No detailed entry provided, just the highlight — and that is enough."}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: #e3eeff;
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
        .animate-glide-slow {
          animation: glideSlow 16s ease-in-out infinite;
        }
        .animate-glide-fast {
          animation: glideFast 11s ease-in-out infinite;
        }
        @keyframes shimmerLoop {
          0%,
          100% {
            transform: scale(0.96) rotate(0deg);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.04) rotate(5deg);
            opacity: 0.85;
          }
        }
        .animate-shimmer {
          animation: shimmerLoop 9s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
};

export default JournalPage;
