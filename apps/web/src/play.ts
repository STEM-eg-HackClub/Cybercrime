import {
  SOURCE_SHELL,
  isMessageFromGame,
  isAllowedOrigin,
  type MessageToGame,
} from "@quest/shared";
import { apiJson } from "./api.js";

const SESSION_KEY = "questTeamSessionId";
const NAME_KEY = "questDisplayName";

const gameUrl =
  import.meta.env.VITE_GAME_URL || "/game/CyberCrime.html";

const teamId = localStorage.getItem(SESSION_KEY);
const displayName = localStorage.getItem(NAME_KEY);

if (!teamId || !displayName) {
  window.location.href = "/";
}

const gameOrigin = new URL(gameUrl, window.location.href).origin;
const allowedParentOrigins = [gameOrigin, window.location.origin];

const iframe = document.getElementById("game") as HTMLIFrameElement;
const teamLabel = document.getElementById("team-label") as HTMLElement;
const leaderboardEl = document.getElementById("leaderboard") as HTMLOListElement;

teamLabel.textContent = displayName!;
const sep = gameUrl.includes("?") ? "&" : "?";
iframe.src = `${gameUrl}${sep}team=${encodeURIComponent(teamId!)}`;

let lastHintId = 0;

function postDown(msg: MessageToGame) {
  iframe.contentWindow?.postMessage(msg, gameOrigin);
}

window.addEventListener("message", (event: MessageEvent) => {
  if (!isAllowedOrigin(event.origin, allowedParentOrigins)) return;
  if (event.source !== iframe.contentWindow) return;
  const data = event.data;
  if (!isMessageFromGame(data)) return;
  if (data.teamSessionId !== teamId) return;

  if (data.type === "level_unlock_attempt") {
    console.log("[quest] password submit", {
      level: data.level,
      password: data.password,
      userInput: data.userInput,
    });
  }

  void apiJson("/api/teams/" + encodeURIComponent(teamId!) + "/events", {
    method: "POST",
    body: JSON.stringify(data),
  }).catch((e) => console.warn("event forward failed", e));
});

async function pollHints() {
  try {
    const { hints } = await apiJson<{ hints: { id: number; text: string }[] }>(
      "/api/teams/" + encodeURIComponent(teamId!) + "/hints?after=" + lastHintId
    );
    for (const h of hints) {
      lastHintId = Math.max(lastHintId, h.id);
      postDown({
        source: SOURCE_SHELL,
        type: "hint",
        text: h.text,
        id: String(h.id),
      });
    }
  } catch {
    /* offline */
  }
}

setInterval(pollHints, 2500);
void pollHints();

async function refreshLeaderboard() {
  try {
    const { leaderboard } = await apiJson<{
      leaderboard: {
        teamSessionId: string;
        displayName: string;
        maxLevel: number;
        score: number;
      }[];
    }>("/api/leaderboard");
    leaderboardEl.innerHTML = "";
    for (const row of leaderboard) {
      const li = document.createElement("li");
      const mark = row.teamSessionId === teamId ? " · you" : "";
      li.textContent = `${row.displayName} — L${row.maxLevel}${row.score ? ` (${Math.round(row.score)})` : ""}${mark}`;
      leaderboardEl.appendChild(li);
    }
  } catch {
    leaderboardEl.innerHTML = "<li class='muted'>…</li>";
  }
}

setInterval(refreshLeaderboard, 5000);
void refreshLeaderboard();



// --- Final Force-Sync Hint System ---
async function syncExternalHints() {
  try {
    const response = await fetch("https://cybercrime-production-89ca.up.railway.app/api/teams", {
      method: "GET",
      mode: "cors", // Force CORS mode
      headers: { 
        'Authorization': 'Bearer CyberCrime-3mk',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
        console.warn("Server responded with: " + response.status);
        return;
    }

    const teams = await response.json();
    
    // Search for ANY team that has a hint (for testing/safety)
    // You can change this to search for 'displayName' later
    const anyTeamWithHint = teams.reverse().find((t: any) => t.hint && t.hint.trim() !== "");

    if (anyTeamWithHint) {
      const lastSeen = sessionStorage.getItem("active_alert_hint");
      if (anyTeamWithHint.hint !== lastSeen) {
        sessionStorage.setItem("active_alert_hint", anyTeamWithHint.hint);
        alert("🚨 NEW HINT: " + anyTeamWithHint.hint);
      }
    }
  } catch (e) {
    console.error("Connection Error. Checking again in 15s...");
  }
}

setInterval(syncExternalHints, 15000);
syncExternalHints();
