// server.js — production-ready for Render
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

// Config
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const // optional comma-separated preference, e.g. "gemini-2.0-flash,gemini-1.5-pro"
  MODELS_ENV = process.env.GEMINI_MODELS || "";
const MODEL_CANDIDATES = MODELS_ENV
  ? MODELS_ENV.split(",").map((m) => m.trim())
  : [
      // fallback list — we will try each candidate until one works
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ];

// Basic checks
if (!GEMINI_API_KEY) {
  console.warn(
    "⚠️  Warning: GEMINI_API_KEY is not set. Add it as an environment variable before using the AI routes."
  );
}

// helper: call Gemini with a specific model name and handle response
async function callGeminiWithModel(modelName, prompt, attempt = 0) {
  // Try v1 first, then v1beta as fallback
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // SDK-like request body expected by the REST API
          // Keep it simple: single text prompt content
          // If your account expects other shapes, adjust later
          // Here we use `contents` with `parts` (works with a number of endpoints)
          // If you get shape errors, check the error log printed below.
          contents: [{ parts: [{ text: prompt }] }],
        }),
        // optional: set a higher timeout externally if needed
      });

      const data = await resp.json().catch(() => ({}));

      // If rate-limited, bubble up so caller can decide retry/backoff
      if (!resp.ok) {
        // Return both status and body for caller to inspect
        return { ok: false, status: resp.status, body: data, url };
      }

      // success
      return { ok: true, status: resp.status, body: data, url };
    } catch (err) {
      // network-level error — return to caller
      return { ok: false, status: 0, body: { message: err.message }, url };
    }
  }

  // If we somehow didn't return in the loop
  return {
    ok: false,
    status: 404,
    body: { message: "no endpoint succeeded for model" },
    url: null,
  };
}

// Try candidate models in order, with retries on 429 (RESOURCE_EXHAUSTED)
async function generateWithRetries(prompt) {
  const maxRetries = 3;

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await callGeminiWithModel(model, prompt, attempt);

      if (result.ok) {
        // Extract text from common response shapes
        // The REST response may contain:
        // - data.candidates[0].content.parts[0].text (v1 style)
        // - data?.candidates?.[0]?.content?.parts?.[0]?.text
        // - or data?.response?.text etc.
        const body = result.body || {};
        let text =
          body?.candidates?.[0]?.content?.parts?.[0]?.text ||
          body?.candidates?.[0]?.content?.text ||
          body?.response?.text ||
          body?.output?.[0]?.content?.[0]?.text ||
          JSON.stringify(body);

        return { ok: true, model, url: result.url, text, raw: body };
      }

      // not ok: if 429, retry with backoff; if 404 for model, break to try next model
      const status = result.status;
      const body = result.body || {};
      console.warn(
        `Attempt ${attempt + 1} for model ${model} -> status ${status} url ${result.url}`
      );
      if (status === 429) {
        // backoff
        const backoffMs = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue; // retry same model
      } else if (status === 404) {
        // model not supported in this API version — try next model
        console.warn(`Model ${model} not found for this API version. Trying next model.`);
        break;
      } else if (status === 403) {
        // permission denied — no point in retrying same model (likely key lacking)
        console.error("Permission denied from Gemini API:", body);
        break;
      } else {
        // other error (400, 500) — retry a couple times for transient 500s
        if (attempt + 1 < maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        } else {
          console.error("Gemini API final error for model", model, body);
          break;
        }
      }
    } // attempts loop
  } // models loop

  return { ok: false, message: "All model attempts failed" };
}

// HEALTH route
app.get("/health", (req, res) => {
  res.json({ status: "ok", gemini: !!GEMINI_API_KEY });
});

// Main suggestions endpoint (POST)
app.post("/api/suggestions", async (req, res) => {
  try {
    const { preferences } = req.body;
    if (!preferences || !preferences.toString().trim()) {
      return res.status(400).json({ error: "preferences (text) required in body" });
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server is not configured with GEMINI_API_KEY" });
    }

    const prompt = `Suggest 5 suitable career options for a person with these details:
Skills/Interests: ${preferences}

Provide a short title and a 1-2 sentence reason for each suggestion.`;

    console.log("Calling Gemini with prompt:", prompt.slice(0, 200));

    const out = await generateWithRetries(prompt);

    if (!out.ok) {
      console.error("All model attempts failed:", out);
      return res.status(502).json({ error: out.message || "AI generation failed" });
    }

    // Return the AI text (string)
    return res.json({
      modelUsed: out.model,
      endpoint: out.url,
      suggestions: out.text,
      // raw: out.raw // uncomment if you want raw full response for debugging
    });
  } catch (err) {
    console.error("Server error /api/suggestions:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// Fallback to serve index if needed (optional)
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "career-step3.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT} (env PORT used)`);
});
