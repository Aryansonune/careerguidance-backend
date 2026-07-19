// public/app.js
const prefsEl = document.getElementById("prefs");
const goBtn = document.getElementById("go");
const status = document.getElementById("status");
const results = document.getElementById("results");

async function getSuggestions(preferences){
  status.textContent = "🔎 Getting suggestions...";
  results.textContent = "";
  try {
    const resp = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences })
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(()=>null);
      status.textContent = "🚨 Error connecting to server.";
      console.error("Server response error", resp.status, errJson);
      results.textContent = JSON.stringify(errJson || {status: resp.status}, null, 2);
      return;
    }

    const data = await resp.json();
    status.textContent = "✅ Suggestions received";
    results.textContent = data.suggestions || JSON.stringify(data, null, 2);
  } catch (err) {
    status.textContent = "🚨 Error connecting to server.";
    results.textContent = String(err);
    console.error("Fetch error", err);
  }
}

goBtn.addEventListener("click", () => {
  const p = prefsEl.value.trim();
  if (!p) {
    status.textContent = "Please enter your interests first.";
    return;
  }
  getSuggestions(p);
});

// optional: allow Enter to submit
prefsEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    goBtn.click();
  }
});
