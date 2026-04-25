import { apiJson } from "./api.js";

const form = document.getElementById("form") as HTMLFormElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const err = document.getElementById("err") as HTMLParagraphElement;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  const displayName = nameInput.value.trim();
  if (!displayName) return;

  try {
    const { teamSessionId, displayName: dn } = await apiJson<{
      teamSessionId: string;
      displayName: string;
    }>("/api/teams/session", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    });
    localStorage.setItem("questTeamSessionId", teamSessionId);
    localStorage.setItem("questDisplayName", dn);
    window.location.href = "/play.html";
  } catch (f) {
    err.textContent = f instanceof Error ? f.message : "Request failed";
    err.hidden = false;
  }
});
