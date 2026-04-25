import "dotenv/config";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { openDb } from "./db.js";
import { isMessageFromGame } from "../../../shared/protocol.ts";

const PORT = Number(process.env.PORT) || 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-change-me";
const WEB_ORIGINS = (process.env.WEB_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const db = openDb();

const app = express();
app.use(express.json({ limit: "64kb" }));

app.use(
  cors({
    origin: WEB_ORIGINS.length ? WEB_ORIGINS : true,
    credentials: true,
  })
);

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/** Simple rate limit for event posts per team */
const eventBuckets = new Map<string, { count: number; reset: number }>();
function rateLimitTeam(teamId: string, max = 120, windowMs = 60_000): boolean {
  const now = Date.now();
  let b = eventBuckets.get(teamId);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs };
    eventBuckets.set(teamId, b);
  }
  b.count += 1;
  return b.count <= max;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/teams/session", (req, res) => {
  const displayName = String(req.body?.displayName || "").trim().slice(0, 120);
  if (!displayName) {
    res.status(400).json({ error: "displayName required" });
    return;
  }
  const id = uuidv4();
  const createdAt = Date.now();
  db.prepare("INSERT INTO teams (id, display_name, created_at) VALUES (?, ?, ?)").run(
    id,
    displayName,
    createdAt
  );
  res.json({ teamSessionId: id, displayName });
});

app.get("/api/teams", requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id as teamSessionId, display_name as displayName, created_at as createdAt
       FROM teams ORDER BY created_at DESC`
    )
    .all();
  res.json({ teams: rows });
});

app.post("/api/teams/:teamId/events", (req, res) => {
  const { teamId } = req.params;
  const row = db.prepare("SELECT id FROM teams WHERE id = ?").get(teamId);
  if (!row) {
    res.status(404).json({ error: "Unknown team" });
    return;
  }
  if (!rateLimitTeam(teamId)) {
    res.status(429).json({ error: "Too many events" });
    return;
  }

  const body = req.body as unknown;
  if (!isMessageFromGame(body)) {
    res.status(400).json({ error: "Invalid event payload" });
    return;
  }
  if (body.teamSessionId !== teamId) {
    res.status(400).json({ error: "teamSessionId mismatch" });
    return;
  }

  const eventType = body.type;
  const payload = JSON.stringify(body);
  const createdAt = Date.now();
  db.prepare(
    "INSERT INTO events (team_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)"
  ).run(teamId, eventType, payload, createdAt);

  res.json({ ok: true, id: createdAt });
});

app.get("/api/leaderboard", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT t.id as teamSessionId,
              t.display_name as displayName,
              COALESCE(MAX(
                CASE WHEN e.event_type = 'progress'
                THEN CAST(json_extract(e.payload, '$.level') AS INTEGER)
                END
              ), 0) AS maxLevel,
              COALESCE(MAX(
                CASE WHEN e.event_type = 'progress'
                THEN CAST(json_extract(e.payload, '$.score') AS REAL)
                END
              ), 0) AS score
       FROM teams t
       LEFT JOIN events e ON e.team_id = t.id
       GROUP BY t.id
       ORDER BY maxLevel DESC, score DESC, t.created_at ASC`
    )
    .all();
  res.json({ leaderboard: rows });
});

app.get("/api/teams/:teamId/hints", (req, res) => {
  const { teamId } = req.params;
  const row = db.prepare("SELECT id FROM teams WHERE id = ?").get(teamId);
  if (!row) {
    res.status(404).json({ error: "Unknown team" });
    return;
  }
  const after = Number(req.query.after) || 0;
  const hints = db
    .prepare(
      `SELECT id, text, created_at as createdAt
       FROM hints
       WHERE id > ? AND (team_id IS NULL OR team_id = ?)
       ORDER BY id ASC`
    )
    .all(after, teamId);
  res.json({ hints });
});

app.post("/api/admin/hints", requireAdmin, (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text || text.length > 4000) {
    res.status(400).json({ error: "text required (max 4000 chars)" });
    return;
  }
  const broadcast = Boolean(req.body?.broadcast);
  const teamSessionId = req.body?.teamSessionId as string | undefined;
  if (!broadcast && !teamSessionId) {
    res.status(400).json({ error: "teamSessionId or broadcast required" });
    return;
  }
  if (!broadcast && teamSessionId) {
    const row = db.prepare("SELECT id FROM teams WHERE id = ?").get(teamSessionId);
    if (!row) {
      res.status(404).json({ error: "Unknown team" });
      return;
    }
  }

  const createdAt = Date.now();
  const teamIdSql = broadcast ? null : teamSessionId!;
  const result = db
    .prepare("INSERT INTO hints (team_id, text, created_at) VALUES (?, ?, ?)")
    .run(teamIdSql, text, createdAt);

  res.json({ ok: true, hintId: Number(result.lastInsertRowid) });
});

app.get("/api/admin/events", requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const rows = db
    .prepare(
      `SELECT e.id, e.team_id as teamSessionId, t.display_name as displayName,
              e.event_type as eventType, e.payload, e.created_at as createdAt
       FROM events e
       JOIN teams t ON t.id = e.team_id
       ORDER BY e.id DESC
       LIMIT ?`
    )
    .all(limit);
  res.json({ events: rows });
});

app.listen(PORT, () => {
  console.log(`Quest API listening on http://localhost:${PORT}`);
});
