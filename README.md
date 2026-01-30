# 🪷✨ Sarathi AI — Your Calm, Krishna-Inspired Digital Companion 💬🤖  

> “You have the right to perform your duty, but not to the fruits of your actions.” – *Bhagavad Gita 2.47*

---

## 🌍 About the Project  

**Sarathi AI** is your personal AI guide — inspired by the wisdom of **Lord Krishna**.  
It listens, understands, and speaks to you like a *calm friend* — helping you manage **stress, overthinking, and emotional struggles** with wisdom from the *Bhagavad Gita*, adapted for modern life.  

💭 Whether you’re feeling anxious before a hackathon, stuck in confusion, or just need peace — **Sarathi** listens, reflects, and helps you find clarity.  


---

## 🎯 What Problem It Solves  

😞 Many people today feel **lost, stressed, or disconnected** — they need comfort, not just conversation.  
🧘‍♂️ Sarathi acts like a **spiritual yet friendly companion** who understands emotion and offers perspective.  
✨ It blends **AI empathy + Gita philosophy** to give personalized, meaningful guidance — not generic chatbot replies.  

---

## 🧠 Core Features  

### 💬 Voice + Chat Interaction  
Talk naturally — Sarathi listens with **Whisper Turbo**, thinks using **Groq Llama**, and speaks back instantly via **ElevenLabs AI Voice**.

### 🧘 Guided Emotional Support  
Sarathi gently asks questions, understands your mental state, and provides support or small actionable advice (like journaling or self-care).

### 📘 Personal Journal with Karma Points  
Users maintain a daily **Journal**, where AI adds mindful tasks (“Drink water 💧”, “Take a deep breath 🌬️”).  
You earn **Karma Points 🪙** for completing them — reinforcing growth through small habits.

### 🧩 Personalization  
- Remembers your name  
- Adapts tone (🧑‍🤝‍🧑 *Friendly*, 🕉️ *Spiritual*)  
- Saves sessions locally  

---

## 🏗️ Tech Stack  

| Layer | Tools & Frameworks |
|-------|--------------------|
| 🖥️ **Frontend** | Next.js 14, React, Tailwind CSS, Framer Motion |
| 🧩 **Backend** | Next.js Edge API Routes |
| 🗣️ **Voice AI** | Whisper Turbo (Speech-to-Text), ElevenLabs (Text-to-Speech) |
| 🧠 **LLM** | Groq Llama 3.1 (Fast inference for calm, wise replies) |
| 💾 **Storage** | Local Storage (user data + journal) |
| 🔐 **Auth (optional)** | Clerk / Supabase (future integration) |

---

## ⚙️ How It Works  

```mermaid
graph LR
A[🎙️ User Speaks] --> B(🎧 Whisper Turbo - Transcribes)
B --> C(🧠 Groq Llama - Understands + Replies)
C --> D(🗣️ ElevenLabs - Converts to Voice)
D --> E(💬 User Hears Calm Response)
E --> F(📔 Journal - Logs insights + tasks)
