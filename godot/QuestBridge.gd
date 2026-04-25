extends Node
## Autoload this script (Project Settings → Autoload) for Web export only.
## Receives hints from the quest shell parent via `window.__questShellInbound` (see CyberCrime.html).
## On password / user-input submit, call report_level_password(..., user_input) or
## `window.__questShellReportUnlock(level, password, userInput)` (defined in CyberCrime.html).

signal hint_received(text: String, hint_id: String)

var _poll_timer: Timer

func get_team_session_id_from_url() -> String:
	if OS.get_name() != "Web":
		return ""
	var raw: Variant = JavaScriptBridge.eval(
		"new URLSearchParams(window.location.search).get('team') || ''", true
	)
	return str(raw)

func _ready() -> void:
	if OS.get_name() != "Web":
		return
	_poll_timer = Timer.new()
	_poll_timer.wait_time = 0.25
	_poll_timer.timeout.connect(_drain_js_hints)
	add_child(_poll_timer)
	_poll_timer.start()

func _drain_js_hints() -> void:
	var js := "(() => { var q = window.__questShellInbound; if (!q || !q.length) return null; return JSON.stringify(q.shift()); })()"
	var raw: Variant = JavaScriptBridge.eval(js, true)
	if raw == null or str(raw) == "null" or str(raw).is_empty():
		return
	var json := JSON.new()
	var err := json.parse(str(raw))
	if err != OK:
		return
	var data: Dictionary = json.data
	var t: String = str(data.get("text", ""))
	if t.is_empty():
		return
	var hid := ""
	if data.has("id") and data["id"] != null:
		hid = str(data["id"])
	hint_received.emit(t, hid)

func report_level_password(team_session_id: String, level: Variant, password: String, user_input: String = "") -> void:
	if OS.get_name() != "Web":
		return
	var payload := {
		"source": "cybercrime-game",
		"type": "level_unlock_attempt",
		"teamSessionId": team_session_id,
		"level": level,
		"password": password,
	}
	if not user_input.is_empty():
		payload["userInput"] = user_input
	_post_to_parent(payload)

func report_progress(team_session_id: String, level: int, score: float = 0.0) -> void:
	if OS.get_name() != "Web":
		return
	var payload := {
		"source": "cybercrime-game",
		"type": "progress",
		"teamSessionId": team_session_id,
		"level": level,
		"score": score,
	}
	_post_to_parent(payload)

func _post_to_parent(payload: Dictionary) -> void:
	var json_text := JSON.stringify(payload)
	# JSON is a subset of JS; safe to splice into postMessage first argument.
	var js := "window.parent && window.parent.postMessage(" + json_text + ", '*')"
	JavaScriptBridge.eval(js, true)
