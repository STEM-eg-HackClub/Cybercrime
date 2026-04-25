import { apiJson } from "./api.js";

const TOKEN_KEY = "questAdminToken";

const authSection = document.getElementById("auth-section") as HTMLElement;
const panel = document.getElementById("panel") as HTMLElement;
const tokenInput = document.getElementById("token") as HTMLInputElement;
const saveTokenBtn = document.getElementById("save-token") as HTMLButtonElement;
const broadcastCb = document.getElementById("broadcast") as HTMLInputElement;
const teamSelect = document.getElementById("team-select") as HTMLSelectElement;
const hintText = document.getElementById("hint-text") as HTMLTextAreaElement;
const sendHintBtn = document.getElementById("send-hint") as HTMLButtonElement;
const hintStatus = document.getElementById("hint-status") as HTMLParagraphElement;
const eventsLog = document.getElementById("events-log") as HTMLPreElement;
const refreshEventsBtn = document.getElementById("refresh-events") as HTMLButtonElement;

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

saveTokenBtn.addEventListener("click", () => {
  const t = tokenInput.value.trim();
  if (!t) return;
  sessionStorage.setItem(TOKEN_KEY, t);
  tokenInput.value = "";
  void bootstrap();
});

async function bootstrap() {
  const token = getToken();
  if (!token) {
    authSection.hidden = false;
    panel.hidden = true;
    return;
  }
  authSection.hidden = true;
  panel.hidden = false;
  try {
    const { teams } = await apiJson<{ teams: { teamSessionId: string; displayName: string }[] }>(
      "/api/teams",
      { headers: authHeaders() }
    );
    teamSelect.innerHTML = "";
    for (const t of teams) {
      const opt = document.createElement("option");
      opt.value = t.teamSessionId;
      opt.textContent = t.displayName;
      teamSelect.appendChild(opt);
    }
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    authSection.hidden = false;
    panel.hidden = true;
    hintStatus.textContent = "Invalid token — try again.";
  }
}

sendHintBtn.addEventListener("click", async () => {
  hintStatus.textContent = "";
  const text = hintText.value.trim();
  if (!text) return;
  const broadcast = broadcastCb.checked;
  const teamSessionId = broadcast ? undefined : teamSelect.value;
  try {
    await apiJson("/api/admin/hints", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        text,
        broadcast,
        teamSessionId,
      }),
    });
    hintText.value = "";
    hintStatus.textContent = "Sent.";
  } catch (e) {
    hintStatus.textContent = e instanceof Error ? e.message : "Failed";
  }
});

async function loadEvents() {
  try {
    const { events } = await apiJson<
      {
        events: {
          id: number;
          displayName: string;
          eventType: string;
          payload: string;
          createdAt: number;
        }[];
      }
    >("/api/admin/events?limit=100", { headers: authHeaders() });
    const lines = events.map(
      (ev) =>
        `${new Date(ev.createdAt).toISOString()}  ${ev.displayName}  ${ev.eventType}  ${ev.payload}`
    );
    eventsLog.textContent = lines.join("\n");
  } catch {
    eventsLog.textContent = "(unauthorized or network error)";
  }
}

refreshEventsBtn.addEventListener("click", () => void loadEvents());

broadcastCb.addEventListener("change", () => {
  teamSelect.disabled = broadcastCb.checked;
});

void bootstrap();
void loadEvents();
setInterval(loadEvents, 8000);
