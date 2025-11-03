"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [text, setText] = useState("");
  const [chat, setChat] = useState<Msg[]>([
    { role: "assistant", content: "Namaste 🙏 — ask me anything from the Bhagavad Gita." },
  ]);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    setChat((c) => [...c, userMsg]);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arjun: trimmed }),
      });

      const data = await res.json();
      // safely extract reply
      const reply: string = (data?.SarthiAi ?? data?.error ?? "No reply from AI") as string;

      // create assistant message and append correctly
      const assistantMsg: Msg = { role: "assistant", content: reply };
      setChat((c) => [...c, assistantMsg]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: "⚠️ Network error — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #e0f2fe, #fffaf0)",
        padding: 24,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a" }}>
              🪷 Saarthi — Bhagavad Gita AI
            </h1>
            <p style={{ marginTop: 6, color: "#374151" }}>
              Ask about duty, leadership, karma, and resilience — guided by Krishna’s wisdom.
            </p>
          </div>
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: 999,
                background: "#e0e7ff",
                color: "#1e3a8a",
                fontWeight: 700,
              }}
            >
              SarthiAi
            </span>
          </div>
        </motion.header>

        <section
          style={{
            background: "#fff",
            borderRadius: 18,
            boxShadow: "0 6px 24px rgba(16,24,40,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: "#c7d2fe",
                color: "#312e81",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              SA
            </div>
            <div style={{ color: "#374151" }}>
              <strong>SarthiAi</strong> — Your Bhagavad Gita guide
            </div>
          </div>

          <div
            ref={chatRef}
            style={{
              padding: 16,
              height: "60vh",
              overflow: "auto",
              gap: 12,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {chat.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: 14,
                    background:
                      m.role === "user" ? "#dbeafe" : "#f3f4f6",
                    color: "#111827",
                    border:
                      m.role === "user"
                        ? "1px solid #93c5fd"
                        : "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ color: "#6b7280" }}>SarthiAi is thinking…</div>
            )}
          </div>

          <div
            style={{
              padding: 14,
              borderTop: "1px solid #f3f4f6",
              background: "linear-gradient(180deg,#fff,#ffffffcc)",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Ask: 'What is karma according to Krishna?'"
                style={{
                  flex: 1,
                  resize: "none",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  outline: "none",
                  fontSize: 14,
                  color: "#111827",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                onClick={send}
                disabled={loading}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 4px 8px rgba(37,99,235,0.2)",
                }}
              >
                {loading ? "Thinking..." : "Ask"}
              </button>
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              💡 Tip: Short, specific questions get clearer answers.
            </div>
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            marginTop: 14,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          Built with ❤️ — Inspired by the Bhagavad Gita
        </footer>
      </div>
    </div>
  );
}
// hello