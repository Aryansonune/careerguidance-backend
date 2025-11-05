document.getElementById("getSuggestions").addEventListener("click", async () => {
  const skills = document.getElementById("skills").value;
  const interests = document.getElementById("interests").value;
  const workStyle = document.getElementById("workStyle").value;

  document.getElementById("results").innerText = "🔍 Getting suggestions from AI...";

  try {
    const response = await fetch("/get-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills, interests, workStyle })
    });

    const data = await response.json();

    if (data.suggestions) {
      document.getElementById("results").innerText = data.suggestions;
    } else {
      document.getElementById("results").innerText = "❌ Failed to get suggestions";
    }
  } catch (err) {
    document.getElementById("results").innerText = "⚠️ Error contacting server.";
    console.error(err);
  }
});
