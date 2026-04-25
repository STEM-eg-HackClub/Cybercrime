/**
 * Quest shell ↔ Godot iframe postMessage contract.
 * Keep in sync across apps/web, apps/api validation, and Godot bridge.
 */

export const SOURCE_GAME = "cybercrime-game" as const;
export const SOURCE_SHELL = "quest-shell" as const;

/** Parent → iframe (game reads via JS queue / Godot bridge) */
export type MessageToGame = {
  source: typeof SOURCE_SHELL;
  type: "hint";
  text: string;
  id?: string;
};

/** Iframe → parent (forwarded to API by shell) */
export type MessageFromGame =
  | {
      source: typeof SOURCE_GAME;
      type: "level_unlock_attempt";
      teamSessionId: string;
      level: string | number;
      password: string;
      /** Optional second field from the in-game form (e.g. name / answer). */
      userInput?: string;
    }
  | {
      source: typeof SOURCE_GAME;
      type: "progress";
      teamSessionId: string;
      level: number;
      score?: number;
    };

export function isMessageToGame(data: unknown): data is MessageToGame {
  if (data === null || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.source === SOURCE_SHELL &&
    d.type === "hint" &&
    typeof d.text === "string"
  );
}

export function isMessageFromGame(data: unknown): data is MessageFromGame {
  if (data === null || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.source !== SOURCE_GAME) return false;
  if (typeof d.teamSessionId !== "string") return false;

  if (d.type === "level_unlock_attempt") {
    return (
      (typeof d.level === "string" || typeof d.level === "number") &&
      typeof d.password === "string" &&
      (d.userInput === undefined || typeof d.userInput === "string")
    );
  }
  if (d.type === "progress") {
    return typeof d.level === "number";
  }
  return false;
}

/** Allowed origins: exact match. Empty = allow any (dev only). */
export function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}
