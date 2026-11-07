import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const XAI_API_KEY = process.env.XAI_API_KEY;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const ttsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.TTS_REQUESTS_PER_HOUR || 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "এই মুহূর্তে আপনার অনুরোধের সীমা পূর্ণ হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।" }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(XAI_API_KEY) });
});

app.post("/api/speech", ttsLimiter, async (req, res) => {
  try {
    if (!XAI_API_KEY) {
      return res.status(503).json({ error: "সার্ভারে এখনো TTS API key যোগ করা হয়নি।" });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const voiceId = ["eve", "ara", "rex", "sal", "leo"].includes(req.body?.voice)
      ? req.body.voice : "ara";
    const language = req.body?.language === "en" ? "en" : "bn";

    if (!text) return res.status(400).json({ error: "আগে কিছু লেখা পেস্ট করুন।" });
    if (text.length > 12000) {
      return res.status(413).json({ error: "একবারে সর্বোচ্চ ১২,০০০ অক্ষর দেওয়া যাবে। বড় লেখা কয়েক ভাগে দিন।" });
    }

    const upstream = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text, voice_id: voiceId, language })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("TTS provider error:", upstream.status, detail.slice(0, 500));
      return res.status(502).json({ error: "অডিও তৈরি করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।" });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.set({
      "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
      "Content-Length": String(audio.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    res.send(audio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Shunun is running on port ${PORT}`));