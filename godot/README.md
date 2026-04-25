# Quest shell bridge (Godot 4 Web)

1. Copy `QuestBridge.gd` into your Godot project (e.g. `res://scripts/QuestBridge.gd`).
2. **Project → Project Settings → Autoload**: add the script as a singleton (e.g. name `QuestBridge`).
3. Connect `QuestBridge.hint_received` to your UI (floating label, etc.).
4. When the player submits a level password (and optional extra user text), call:
   - `QuestBridge.report_level_password(team_session_id, level, password, user_input)` — `user_input` defaults to `""` if omitted.
   - Use `var team_id := QuestBridge.get_team_session_id_from_url()` — the quest shell appends `?team=<sessionId>` to the iframe URL.
5. When a level is cleared, call `QuestBridge.report_progress(team_session_id, level, score)` so the leaderboard updates.

The exported `CyberCrime.html` in this repo already queues parent hints in `window.__questShellInbound` for the bridge to drain.

**Security:** Production builds should use a fixed `targetOrigin` in `postMessage` instead of `'*'` once shell and game origins are known.
