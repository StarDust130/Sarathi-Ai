🧠 4️⃣ /api/chat & /api/voice → AI Logic

Assigned: 🧑‍💻 You + Shreyesh

How AI Works:

User input (text or audio) →

/api/chat or /api/voice route →

Send prompt to Groq/OpenAI model with short system prompt:
"You are Sarathi, a motivational AI coach inspired by Krishna. Guide user through wisdom and action, not philosophy only."

AI returns reply → send back to frontend.

For voice: Use TTS model (Groq or Play.ai) to convert reply to audio.

Backend Code Tasks:

/api/chat: handle JSON { message } → return { reply }

/api/voice: handle { audio } → convert STT → send to AI → return { text, audioUrl }

Add environment vars for API keys.