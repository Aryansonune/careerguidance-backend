import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌ Missing GROQ_API_KEY in .env file");
  process.exit(1);
}

console.log("✅ Groq API Key loaded:", !!GROQ_API_KEY);

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

app.post("/api/suggestions", async (req, res) => {
  try {
    const { preferences } = req.body;

    console.log("Incoming Request:");
    console.log(req.body);

    if (!preferences) {
      return res.status(400).json({
        error: "Missing 'preferences' field."
      });
    }

    const prompt = `
You are an expert career counselor.

Suggest 5 career options for someone with these preferences:

${preferences}

For each career provide:

1. Career Name
2. Why it matches the user
3. Skills required
4. Future scope
5. Average salary
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are an expert career guidance assistant."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    console.log(
      "🧠 Groq Response:",
      JSON.stringify(completion, null, 2)
    );

    const suggestions =
      completion.choices?.[0]?.message?.content ||
      "No suggestions generated.";

    res.json({
      modelUsed: "llama-3.3-70b-versatile",
      suggestions
    });

  } catch (err) {
    console.error("❌ Groq Error:", err);

    res.status(500).json({
      error: "Groq API Error",
      message: err.message
    });
  }
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});