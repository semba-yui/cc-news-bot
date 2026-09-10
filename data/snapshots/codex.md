## python-v0.154.0 (2026-09-10T19:51:43Z)
Install with `pip install --upgrade openai-codex==0.154.0` (Python 3.10 or later). This release includes the matching `openai-codex-cli-bin==0.154.0` runtime.

- Add `max` and `ultra` reasoning-effort values. [#39662](https://github.com/openai/codex/pull/39662)
- Add `ExternalMessage` to synchronous and asynchronous `run()` and `turn()` calls. External content can start a turn or join an active regular turn with tool-level authority; it does not grant user authorization. Consumers receive independent event streams. [#44086](https://github.com/openai/codex/pull/44086)
- Add `include_turns` on resume/fork, `turn_service_tier` for one newly started turn, and `source` metadata. History selection changes the returned response, not model context. Existing defaults are preserved when these options are omitted. [#44084](https://github.com/openai/codex/pull/44084)
- Refresh generated protocol models and notifications, and preserve completion events that arrive before a turn-start response. [#44032](https://github.com/openai/codex/pull/44032), [#44400](https://github.com/openai/codex/pull/44400)

Check these migrations when upgrading:

- `HookMetadata` wraps its handler in `.root`. Replace accesses such as `hook.command` with `hook.root.command`, checking `hook.root.handler_type` before reading handler-specific fields.
- Some previously unknown notifications now have typed payloads. Read named fields instead of `.params`; unknown or invalid payloads still use `UnknownNotification`.
- Manually constructed or late-joining turn handles receive events from their attachment point. Earlier output is not replayed, so collected results can be partial; attaching after completion can raise `TransportClosedError`. Use `thread.read(include_turns=True)` for saved history. Handles returned directly by `thread.turn(...)` retain events from when their request is sent.

Custom `codex_bin` overrides require CLI 0.151.0 or newer for `ExternalMessage` and the new history/per-turn options.
