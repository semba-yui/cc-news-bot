## rust-v0.107.0-alpha.8 (2026-02-28T02:50:51Z)
Release 0.107.0-alpha.8



## rust-v0.107.0-alpha.7 (2026-02-28T01:53:50Z)
Release 0.107.0-alpha.7



## rust-v0.107.0-alpha.5 (2026-02-27T13:39:19Z)
Release 0.107.0-alpha.5



## rust-v0.107.0-alpha.4 (2026-02-27T07:39:08Z)
Release 0.107.0-alpha.4



## rust-v0.107.0-alpha.3 (2026-02-27T02:17:52Z)
Release 0.107.0-alpha.3



## rust-v0.107.0-alpha.2 (2026-02-27T00:34:43Z)
Release 0.107.0-alpha.2



## rust-v0.106.0 (2026-02-26T23:11:50Z)
## New Features
- Added a direct install script for macOS and Linux and publish it as a GitHub release asset, using the existing platform payload (including `codex` and `rg`) (#12740)
- Expanded the app-server v2 thread API with experimental thread-scoped realtime endpoints/notifications and a `thread/unsubscribe` flow to unload live threads without archiving them (#12715, #10954)
- Promoted `js_repl` to `/experimental`, added startup compatibility checks with user-visible warnings, and lowered the validated minimum Node version to `22.22.0` (#12712, #12824, #12857)
- Enabled `request_user_input` in Default collaboration mode (not just Plan mode) (#12735)
- Made `5.3-codex` visible in the CLI model list for API users (#12808)
- Improved memory behavior with diff-based forgetting and usage-aware memory selection (#12900, #12909)

## Bug Fixes
- Improved realtime websocket reliability by retrying timeout-related HTTP 400 handshake failures and preferring WebSocket v2 when supported by the selected model (#12791, #12838)
- Fixed a zsh-fork shell execution path that could drop sandbox wrappers and bypass expected filesystem restrictions (#12800)
- Added a shared ~1M-character input size cap in the TUI and app-server to prevent hangs/crashes on oversized pastes, with explicit error responses (#12823)
- Improved TUI local file-link rendering to hide absolute paths while preserving visible line/column references (#12705, #12870)
- Fixed `Ctrl-C` handling for sub-agents in the TUI (#12911)

## Documentation
- Fixed a stale sign-in success link in the auth/onboarding flow (#12805)
- Clarified the CLI login hint for remote/device-auth login scenarios (#12813)

## Chores
- Added structured OTEL audit logging for embedded `codex-network-proxy` policy decisions and blocks (#12046)
- Removed the `steer` feature flag and standardized on the always-on steer path in the TUI composer (#12026)
- Reduced sub-agent startup overhead by skipping expensive history metadata scans for subagent spawns (#12918)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.105.0...rust-v0.106.0

- #12046 feat(network-proxy): add embedded OTEL policy audit logging @mcgrew-oai
- #12712 Promote js_repl to experimental with Node requirement @fjord-oai
- #12715 Add app-server v2 thread realtime API @aibrahim-oai
- #12795 Revert "fix(bazel): replace askama templates with include_str! in memories" @jif-oai
- #12791 Handle websocket timeout @pakrym-oai
- #12800 fix: enforce sandbox envelope for zsh fork execution @bolinfest
- #12802 Propagate session ID when compacting @rasmusrygaard
- #12732 feat(app-server): add ThreadItem::DynamicToolCall @owenlin0
- #12807 Add simple realtime text logs @aibrahim-oai
- #12805 Update Codex docs success link @etraut-openai
- #12809 fix: harden zsh fork tests and keep subcommand approvals deterministic @bolinfest
- #12808 make 5.3-codex visible in cli for api users @sayan-oai
- #10954 feat(app-server): thread/unsubscribe API @owenlin0
- #12806 only use preambles for realtime @aibrahim-oai
- #12830 Revert "only use preambles for realtime" @aibrahim-oai
- #12721 Revert "Ensure shell command skills trigger approval (#12697)" @celia-oai
- #12831 only use preambles for realtime @aibrahim-oai
- #12735 Enable request_user_input in Default mode @charley-oai
- #12814 feat: scope execve session approvals by approved skill metadata @bolinfest
- #12026 Remove steer feature flag @aibrahim-oai
- #12740 Add macOS and Linux direct install script @EFRAZER-oai
- #12838 Use websocket v2 as model-preferred websocket protocol @pakrym-oai
- #12811 Revert "Add skill approval event/response (#12633)" @celia-oai
- #12758 feat: include available decisions in command approval requests @bolinfest
- #12824 Disable js_repl when Node is incompatible at startup @fjord-oai
- #12813 Clarify device auth login hint @xl-openai
- #12848 Try fixing windows pipeline @pakrym-oai
- #12856 Attempt 2 to fix release @pakrym-oai
- #12744 Skip system skills for extra roots @xl-openai
- #12857 Reduce js_repl Node version requirement to 22.22.0 @fjord-oai
- #12865 Fix release build take @pakrym-oai
- #12705 Hide local file link destinations in TUI markdown @pash-openai
- #12823 Enforce user input length cap @etraut-openai
- #12417 core: bundle settings diff updates into one dev/user envelope @charley-oai
- #12884 chore: new agents name @jif-oai
- #12885 nit: captial @jif-oai
- #12870 tui: restore visible line numbers for hidden file links @pash-openai
- #12684 Add rollout path to memory files and search for them during read @wendyjiao-openai
- #12901 chore: better awaiter description @jif-oai
- #12900 feat: memories forgetting @jif-oai
- #12905 chore: clean DB runtime @jif-oai
- #12918 Skip history metadata scan for subagents @daveaitel-openai
- #12871 split-debuginfo @pakrym-oai
- #12909 feat: use memory usage for selection @jif-oai
- #12887 fix: do not apply turn cwd to metadata @jif-oai
- #12911 fix: ctrl c sub agent @jif-oai
- #12873 Use model catalog default for reasoning summary fallback @pakrym-oai




## rust-v0.107.0-alpha.1 (2026-02-26T23:47:57Z)
Release 0.107.0-alpha.1



## rust-v0.106.0-alpha.9 (2026-02-26T13:01:29Z)
Release 0.106.0-alpha.9



## rust-v0.106.0-alpha.8 (2026-02-26T06:17:02Z)
Release 0.106.0-alpha.8

