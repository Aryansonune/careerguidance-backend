// public/script.js
document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("prefInput");
  const btn = document.getElementById("goBtn");
  const resultBox = document.getElementById("resultBox");
  const status = document.getElementById("status");
  const spinner = document.getElementById("spinner");

  // ✅ Use your live backend URL
  const API_URL = "https://careerguidance-backend.onrender.com/api/suggestions";

  function showStatus(msg, isError) {
    status.textContent = msg || "";
    status.style.color = isError ? "#c0392b" : "";
  }

  function showSpinner(show) {
    if (show) {
      spinner.classList.add("show");
    } else {
      spinner.classList.remove("show");
    }
  }

  async function getCareerSuggestions() {
    const prefs = input.value.trim();
    if (!prefs) {
      showStatus("Please enter some interests or skills.", true);
      return;
    }

    btn.disabled = true;
    showSpinner(true);
    showStatus("Getting suggestions...");

    try {
      // ✅ Always call deployed backend
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs })
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const errText = data?.error?.message || JSON.stringify(data) || resp.statusText;
        resultBox.textContent = `Error: ${errText}`;
        showStatus("🚨 Server returned an error.", true);
      } else {
        const text = data?.suggestions || JSON.stringify(data, null, 2);
        resultBox.textContent = text;
        showStatus("✅ Suggestions generated.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showStatus("🚨 Error connecting to server.", true);
      resultBox.textContent = "There was a network error while calling the server. Check console or server logs.";
    } finally {
      showSpinner(false);
      btn.disabled = false;
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      getCareerSuggestions();
    }
  });

  btn.addEventListener("click", getCareerSuggestions);
});
