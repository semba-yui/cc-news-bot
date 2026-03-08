## rust-v0.112.0 (2026-03-08T20:44:14Z)
## New Features
- Added `@plugin` mentions so users can reference plugins directly in chat and auto-include their associated MCP/app/skill context. (#13510)
- Added a new model-selection surface update so the latest model catalog changes are surfaced in the TUI picker flow. (#13617)
- Merged executable permission profiles into per-turn sandbox policy for zsh-fork skill execution, allowing safer, additive privilege handling for tool runs. (#13496)

## Bug Fixes
- Fixed JS REPL state handling so previously-initialized bindings persist after a failed cell, reducing brittle restarts during iterative sessions. (#13482)
- Treated `SIGTERM` like Ctrl-C for graceful app-server websocket shutdown instead of abrupt termination behavior. (#13594)
- Hardened js_repl image emission to accept only `data:` URLs, preventing external URL forwarding through `emitImage`. (#13507)
- Ensured Linux bubblewrap sandbox runs always unshare the user namespace to keep isolation consistent even for root-owned invocations. (#13624)
- Improved macOS sandbox network and unix-socket handling in Seatbelt, improving reliability for constrained subprocess environments. (#12702)
- Surfaced feedback/diagnostics earlier in the workflow so connectivity and diagnostics are visible before later steps. (#13604)

## Documentation
- Clarified js_repl image guidance (emission and encoding semantics), including clearer usage around repeated `emitImage` calls. (#13639)

## Chores
- Fixed a small codespell warning in the TUI theme picker path. (#13605)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.111.0...rust-v0.112.0

- #13594 treat SIGTERM like ctrl-c for graceful shutdown @maxj-oai
- #13605 Fix codespell warning about pre-selects @fjord-oai
- #13482 Persist initialized js_repl bindings after failed cells @fjord-oai
- #13604 [diagnostics] show diagnostics earlier in workflow @rhan-oai
- #13496 feat: merge skill permission profiles into the turn sandbox for zsh-fork execs @celia-oai
- #13507 Harden js_repl emitImage to accept only data: URLs @fjord-oai
- #13602 feat(core): persist trace_id for turns in RolloutItem::TurnContext @owenlin0
- #13624 fix(linux-sandbox): always unshare bwrap userns @viyatb-oai
- #12702 Improve macOS Seatbelt network and unix socket handling @viyatb-oai
- #13639 Clarify js_repl image emission and encoding guidance @fjord-oai
- #13510 add @plugin mentions @sayan-oai
- #13499 core/protocol: add structured macOS additional permissions and merge them into sandbox execution @celia-oai
- #13617 Update models.json @aibrahim-oai


