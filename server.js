import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log("✅ Gemini API Key loaded:", !!GEMINI_API_KEY);

app.post("/api/suggestions", async (req, res) => {
  try {
    const { preferences } = req.body;

    const prompt = `Suggest 3 career options for someone with these interests: ${preferences}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("🧠 Gemini API Response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No suggestions found.";
    res.json({ suggestions: text });
  } catch (err) {
    console.error("❌ Gemini API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));
