import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const defaultPath = path.join(process.cwd(), "data", "quest.sqlite");

export function openDb(filePath = process.env.SQLITE_PATH || defaultPath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_team ON events(team_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

    CREATE TABLE IF NOT EXISTS hints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id TEXT,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hints_team ON hints(team_id);
    CREATE INDEX IF NOT EXISTS idx_hints_created ON hints(created_at);
  `);
  return db;
}

export type Db = ReturnType<typeof openDb>;
