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




## rust-v0.105.0 (2026-02-25T17:21:45Z)
## New Features
- The TUI now syntax-highlights fenced code blocks and diffs, adds a `/theme` picker with live preview, and uses better theme-aware diff colors for light and dark terminals. (#11447, #12581)
- You can now dictate prompts by holding the spacebar to record and transcribe voice input directly in the TUI. This feature is still under development; to enable it set features.voice_transcription = true in your config. (#3381)
- Multi-agent workflows are easier to run and track: `spawn_agents_on_csv` can fan out work from a CSV with built-in progress/ETA, and sub-agents are easier to follow with nicknames, a cleaner picker, and visible child-thread approval prompts. (#10935, #12320, #12327, #12332, #12570, #12767)
- The TUI picked up new convenience commands: `/copy` copies the latest complete assistant reply, while `/clear` and `Ctrl-L` clear the screen without losing thread context, with `/clear` also able to start a fresh chat. (#12444, #12520, #12613, #12628)
- Approval controls are more flexible: Codex can now ask for extra sandbox permissions for a command, and you can auto-reject specific approval prompt types without turning approvals off entirely. (#11871, #12087)
- App-server clients can do more with threads: `thread/list` can search by title, thread status is exposed in read/list responses and notifications, and `thread/resume` returns the latest turn inline so reconnects are less lossy. (#11776, #11786, #12578)

## Bug Fixes
- Long links in the TUI stay clickable when wrapped, which also fixes related clipping and layout issues in several views. (#12067)
- Several TUI interaction edge cases were fixed: queued-message editing now works in more terminals, follow-up prompts no longer get stuck if you press Enter while a final answer is still streaming, and approval dialogs now respond with the correct request id. (#12240, #12569, #12746)
- `@` parsing in the chat composer is more reliable, so commands like `npx -y @scope/pkg@latest` no longer accidentally open the file picker or block submission. (#12643)
- App-server websocket handling is more robust: thread listeners survive disconnects, Ctrl-C waits for in-flight turns before restarting, and websocket clients that send `permessage-deflate` can connect successfully. (#12373, #12517, #12629)
- Linux sandboxed commands now get a minimal `/dev`, fixing failures in tools that need entropy or other standard device nodes. (#12081)
- `js_repl` now reports uncaught kernel failures more clearly, recovers cleanly afterward, and correctly attaches `view_image` results from nested tool calls. (#12636, #12725)

## Documentation
- Added a public security policy with Bugcrowd reporting guidance. (#12193)
- Updated install and local workflow docs to use `cargo install --locked cargo-nextest` and to avoid routine `--all-features` builds unless you specifically need full feature coverage. (#12377, #12429)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.104.0...rust-v0.105.0

- #12071 Use V2 websockets if feature enabled @pakrym-oai
- #12052 feat(core): zsh exec bridge @owenlin0
- #12072 Add message phase to agent message thread item @mousseau-oai
- #12077 got rid of experimental_mode for configtoml @won-openai
- #12036 codex-api: realtime websocket session.create + typed inbound events @aibrahim-oai
- #12073 Add model-visible context layout snapshot tests @charley-oai
- #12096 Updated issue labeler script to include safety-check label @etraut-openai
- #11944 [js_repl] paths for node module resolution can be specified for js_repl @aaronl-openai
- #11798 fix: Restricted Read: /System is too permissive for macOS platform de… @leoshimo-oai
- #12015 Enable default status line indicators in TUI config @jif-oai
- #12124 feat: phase 1 and phase 2 e2e latencies @jif-oai
- #12121 feat: phase 2 usage @jif-oai
- #12120 feat: memory usage metrics @jif-oai
- #12133 feat: validate agent config file paths @jif-oai
- #12137 nit: change model for phase 1 @jif-oai
- #12069 Stop filtering model tools in js_repl_tools_only mode @fjord-oai
- #12135 feat: better slug for rollout summaries @jif-oai
- #12157 Disable collab tools during review delegation @jif-oai
- #11802 Fixed a hole in token refresh logic for app server @etraut-openai
- #12105 fix: file watcher @jif-oai
- #12167 memories: bump rollout summary slug cap to 60 @zuxin-oai
- #12177 js_repl: canonicalize paths for node_modules boundary checks @fjord-oai
- #12025 app-server support for Windows sandbox setup. @iceweasel-oai
- #12187 fix: Remove citation @zuxin-oai
- #12180 [apps] Temporary app block. @mzeng-openai
- #11786 app-server: expose loaded thread status via read/list and notifications @euroelessar
- #12038 state: enforce 10 MiB log caps for thread and threadless process logs @charley-oai
- #12203 Stabilize app-server detached review and running-resume tests @charley-oai
- #12211 [apps] Update apps allowlist. @mzeng-openai
- #12081 fix(linux-sandbox): mount /dev in bwrap sandbox @viyatb-oai
- #12164 Update docs links for feature flag notice @etraut-openai
- #12231 Adjust memories rollout defaults @jif-oai
- #12152 feat: sub-agent injection @jif-oai
- #12233 feat: add shell snapshot failure reason @jif-oai
- #12193 docs: add codex security policy @viyatb-oai
- #12228 feat: add configurable write_stdin timeout @jif-oai
- #11787 Adjust MCP tool approval handling for custom servers @colby-oai
- #12179 Move previous turn context tracking into ContextManager history @charley-oai
- #12244 Restore phase when loading from history @mousseau-oai
- #12101 client side modelinfo overrides @sayan-oai
- #12251 Add configurable agent spawn depth @jif-oai
- #12254 chore: increase stack size for everyone @jif-oai
- #12250 feat: no timeout mode on ue @jif-oai
- #12255 chore: consolidate new() and initialize() for McpConnectionManager @bolinfest
- #12256 Revert "feat: no timeout mode on ue" @jif-oai
- #12258 Undo stack size Bazel test hack @charley-oai
- #12264 Fix flaky test @jif-oai
- #12087 feat: add Reject approval policy with granular prompt rejection controls @bolinfest
- #12253 Skip removed features during metrics emission @jif-oai
- #12265 Clarify cumulative proposed_plan behavior in Plan mode @charley-oai
- #12266 app-server tests: reduce intermittent nextest LEAK via graceful child shutdown @bolinfest
- #11953 ws turn metadata via client_metadata @pash-openai
- #11778 fix(bazel): replace askama templates with include_str! in memories @rupurt
- #11382 Add configurable MCP OAuth callback URL for MCP login @dkumar-oai
- #12274 [bazel] Fix proc_macro_dep libs @zbarsky-openai
- #12054 feat(config): add permissions.network proxy config wiring @viyatb-oai
- #12269 tests(thread_resume): interrupt running turns in resume error-path tests @bolinfest
- #12009 Update pnpm versions to fix cve-2026-24842 @mjr-openai
- #12080 skill-creator: lazy-load PyYAML in frontmatter parsing @xl-openai
- #12271 tests: centralize in-flight turn cleanup helper @bolinfest
- #12286 app-server: fix flaky list_apps_returns_connectors_with_accessible_flags test @bolinfest
- #11776 app-server: improve thread resume rejoin flow @maxj-oai
- #11822 [apps] Store apps tool cache in disk to reduce startup time. @mzeng-openai
- #12221 memories: add rollout_summary_file header to raw memories and tune prompts @zuxin-oai
- #12309 Set memories phase reasoning effort constants @jif-oai
- #12315 chore: nit explorer @jif-oai
- #12320 feat: add nick name to sub-agents @jif-oai
- #12328 chore: better agent names @jif-oai
- #12326 disable collab for phase 2 @jif-oai
- #12267 Add MCP server context to otel tool_result logs @colby-oai
- #12327 feat: cleaner TUI for sub-agents @jif-oai
- #12332 feat: better agent picker in TUI @jif-oai
- #12344 feat: do not enqueue phase 2 if not necessary @jif-oai
- #12340 fix: simplify macOS sleep inhibitor FFI @yvolovich-cyber
- #12347 fix: nick name at thread/read @jif-oai
- #12294 Reuse connection between turns @pakrym-oai
- #12287 app-server: add JSON tracing logs @maxj-oai
- #12140 Refactor network approvals to host/protocol/port scope @viyatb-oai
- #12300 js_repl: block wrapped payload prefixes in grammar @fjord-oai
- #11368 fix(network-proxy): add unix socket allow-all and update seatbelt rules @viyatb-oai
- #12275 js_repl: remove codex.state helper references @fjord-oai
- #12289 CODEX-4927: Surface local login entitlement denials in browser @daniel-oai
- #12205 ci(bazel): install Node from node-version.txt in remote image @fjord-oai
- #12312 feat: add config `allow_login_shell` @jif-oai
- #12086 [apps] Implement apps configs. @mzeng-openai
- #12353 fix(core): require approval for destructive MCP tool calls @colby-oai
- #12218 app-server: harden disconnect cleanup paths @maxj-oai
- #12291 core tests: use hermetic mock server in review suite @viyatb-oai
- #12374 [apps] Enforce simple logo url format. @mzeng-openai
- #12377 docs: use --locked when installing cargo-nextest @derekf-oai
- #12370 Add ability to attach extra files to feedback @pakrym-oai
- #12306 Move sanitizer into codex-secrets @viyatb-oai
- #12379 clarify model_catalog_json only applied on startup @sayan-oai
- #12307 Show model/reasoning hint when switching modes @charley-oai
- #12403 [apps] Fix gateway url. @mzeng-openai
- #12240 fix(tui): queued-message edit shortcut unreachable in some terminals @fcoury
- #12405 [apps] Bump MCP tool call timeout. @mzeng-openai
- #12406 fix: explicitly list name collisions in JSON schema generation @bolinfest
- #12301 Add field to Thread object for the latest rename set for a given thread @natea-oai
- #12268 Wire realtime api to core @aibrahim-oai
- #12415 fix(nix): include libcap dependency on linux builds @rgodha24
- #12416 Add experimental realtime websocket URL override @aibrahim-oai
- #12303 Improve Plan mode reasoning selection flow @charley-oai
- #12418 Add experimental realtime websocket overrides and text mirroring @aibrahim-oai
- #12381 fix: address flakiness in thread_resume_rejoins_running_thread_even_with_override_mismatch @bolinfest
- #12422 feat: use OAI Responses API MessagePhase type directly in App Server v2 @bolinfest
- #12376 test(app-server): wait for turn/completed in turn_start tests @yvolovich-cyber
- #12408 ignore v1 in JSON schema codegen @bolinfest
- #12314 fix(core) Filter non-matching prefix rules @dylan-hurd-oai
- #12429 feat: discourage the use of the --all-features flag @bolinfest
- #12252 Fix compaction context reinjection and model baselines @charley-oai
- #12427 chore: move config diagnostics out of codex-core @bolinfest
- #12430 Collapse waited message @pakrym-oai
- #12432 chore: remove codex-core public protocol/shell re-exports @bolinfest
- #12434 fix: codex-arg0 no longer depends on codex-core @bolinfest
- #12435 refactor(core): move embedded system skills into codex-skills crate @bolinfest
- #12440 chore: delete empty codex-rs/code file @bolinfest
- #12441 Delete AggregatedStream @pakrym-oai
- #11293 feat(linux-sandbox): implement proxy-only egress via TCP-UDS-TCP bridge @viyatb-oai
- #12410 profile-level model_catalog_json overrie @sayan-oai
- #12420 Prevent replayed runtime events from forcing active status @etraut-openai
- #12428 Prefer v2 websockets if available @pakrym-oai
- #12419 Improve token usage estimate for images @etraut-openai
- #12474 fix: make skills loader tests hermetic with ~/.agents skills @bolinfest
- #12473 core: preserve constrained approval/sandbox policies in TurnContext @bolinfest
- #12067 fix(tui): preserve URL clickability across all TUI views @fcoury
- #12469 Route inbound realtime text into turn start or steer @aibrahim-oai
- #12479 Revert "Route inbound realtime text into turn start or steer" @aibrahim-oai
- #12475 fix: make realtime conversation flake test order-insensitive @bolinfest
- #12476 Make shell detection tests
     robust to Nix shell paths @rupurt
- #11447 feat(tui): syntax highlighting via syntect with theme picker @fcoury
- #12373 app-server: retain thread listener across disconnects @maxj-oai
- #12444 feat(tui) /clear @won-openai
- #12485 fix(core) exec policy parsing 3 @dylan-hurd-oai
- #12423 Send events to realtime api @aibrahim-oai
- #12364 feat: monitor role @jif-oai
- #12313 Handle orphan exec ends without clobbering active exploring cell @jif-oai
- #12455 feat(tui): support Alt-d delete-forward-word @dougEfresh
- #12480 Revert "Revert "Route inbound realtime text into turn start or steer"" @aibrahim-oai
- #12509 Sort themes case-insensitively in picker @etraut-openai
- #12511 Add C# syntax option to highlight selections @etraut-openai
- #12513 Add PR babysitting skill for this repo @etraut-openai
- #12518 test: vendor zsh fork via DotSlash and stabilize zsh-fork tests @bolinfest
- #12553 Return image content from view_image @pakrym-oai
- #12555 refactor: decouple MCP policy construction from escalate server @bolinfest
- #12559 chore: nit name @jif-oai
- #12562 chore: awaiter @jif-oai
- #12565 chore: add doc to memories @jif-oai
- #12568 chore: phase 2 name @jif-oai
- #12571 fix: TUI constraint @jif-oai
- #12570 feat: keep dead agents in the agent picker @jif-oai
- #12575 feat: agent nick names to model @jif-oai
- #12500 feat: add uuid helper @jif-oai
- #12580 chore: rename memory feature flag @jif-oai
- #12541 Allow exec resume to parse output-last-message flag after command @etraut-openai
- #12579 feat: role metrics multi-agent @jif-oai
- #12141 feat: land sqlite @jif-oai
- #12576 chore: better bazel test logs @jif-oai
- #12028 remove feature flag collaboration modes @aibrahim-oai
- #12520 tweaked /clear to support clear + new chat, also fix minor bug for macos terminal @won-openai
- #12556 refactor: normalize unix module layout for exec-server and shell-escalation @bolinfest
- #12421 app-server: box request dispatch future to reduce stack pressure @charley-oai
- #12528 chore(deps): bump libc from 0.2.180 to 0.2.182 in /codex-rs @dependabot
- #12529 chore(deps): bump syn from 2.0.114 to 2.0.117 in /codex-rs @dependabot
- #12583 Use Arc-based ToolCtx in tool runtimes @bolinfest
- #12540 fix: add ellipsis for truncated status indicator @sayan-oai
- #12609 fix(tui): recover on owned wrap mapping mismatch @fcoury
- #12569 fix(tui): queue steer Enter while final answer is still streaming to prevent dead state @guidedways
- #12530 chore(deps): bump owo-colors from 4.2.3 to 4.3.0 in /codex-rs @dependabot
- #12549 fix: show command running in background terminal in details under status indicator @sayan-oai
- #3381 voice transcription @nornagon-openai
- #12619 Handle realtime spawn_transcript delegation @aibrahim-oai
- #11408 Update models.json @github-actions
- #12629 app-server: fix connecting via websockets with `Sec-WebSocket-Extensions: permessage-deflate` @JaviSoto
- #12632 refactor: delete exec-server and move execve wrapper into shell-escalation @bolinfest
- #12638 refactor: decouple shell-escalation from codex-core @bolinfest
- #12357 feat(core): persist network approvals in execpolicy @viyatb-oai
- #12648 fix(exec) Patch resume test race condition @dylan-hurd-oai
- #12049 Support implicit skill invocation analytics events @alexsong-oai
- #12647 Avoid `AbsolutePathBuf::parent()` panic under `EMFILE` by skipping re-absolutization @etraut-openai
- #12633 Add skill approval event/response @pakrym-oai
- #12650 chore: rm hardcoded PRESETS list @sayan-oai
- #12652 Simplify skill tracking @pakrym-oai
- #12653 memories: tighten consolidation prompt schema and indexing guidance @zuxin-oai
- #12667 feat: mutli agents persist config overrides @jif-oai
- #12635 memories: tighten memory lookup guidance and citation requirements @zuxin-oai
- #12663 fix: replay after `/agent` @jif-oai
- #11258 Send warmup request @pakrym-oai
- #12688 feat: use process group to kill the PTY @jif-oai
- #11871 feat(core) Introduce Feature::RequestPermissions @dylan-hurd-oai
- #12628 ctrl-L (clears terminal but does not start a new chat)  @won-openai
- #9859 feat(network-proxy): add MITM support and gate limited-mode CONNECT @viyatb-oai
- #12649 feat: run zsh fork shell tool via shell-escalation @bolinfest
- #12643 Fix @mention token parsing in chat composer @etraut-openai
- #12658 fix: also try matching namespaced prefix for modelinfo candidate @sayan-oai
- #11766 feat(sleep-inhibitor): add Linux and Windows idle-sleep prevention @yvolovich-cyber
- #12581 feat(tui): add theme-aware diff backgrounds with capability-graded palettes @fcoury
- #12697 Ensure shell command skills trigger approval @pakrym-oai
- #12707 refactor: remove unused seatbelt unix socket arg @bolinfest
- #12687 Add TUI realtime conversation mode @aibrahim-oai
- #12639 Honor `project_root_markers` when discovering `AGENTS.md` @etraut-openai
- #10935 Agent jobs (spawn_agents_on_csv) + progress UI @daveaitel-openai
- #12700 revert audio scope @nornagon-openai
- #12711 fix: temp remove citation @zuxin-oai
- #12613 feat(tui) - /copy @won-openai
- #12695 Add app-server event tracing @pakrym-oai
- #12717 Raise image byte estimate for compaction token accounting @etraut-openai
- #12724 fix: make EscalateServer public and remove shell escalation wrappers @bolinfest
- #12517 codex-rs/app-server: graceful websocket restart on Ctrl-C @maxj-oai
- #12636 fix(js_repl): surface uncaught kernel errors and reset cleanly @fjord-oai
- #12729 fix: clarify the value of SkillMetadata.path @bolinfest
- #12719 feat: pass helper executable paths via Arg0DispatchPaths @bolinfest
- #12720 add AWS_LC_SYS_NO_JITTER_ENTROPY=1 to release musl build step to unblock releases @sayan-oai
- #12725 Fix js_repl view_image attachments in nested tool calls @fjord-oai
- #12656 chore: change catalog mode to enum @sayan-oai
- #12731 chore: migrate additional permissions to PermissionProfile @celia-oai
- #12407 tests(js_repl): stabilize CI runtime test execution @fjord-oai
- #12737 feat:  add experimental additionalPermissions to v2 command execution approval requests @celia-oai
- #12372 feat: update Docker image digest to reflect #12205 @fjord-oai
- #12746 fix: chatwidget was not honoring approval_id for an ExecApprovalRequestEvent @bolinfest
- #12185 tests(js_repl): remove node-related skip paths from js_repl tests @fjord-oai
- #12358 feat(ui): add network approval persistence plumbing @viyatb-oai
- #12730 feat: zsh-fork forces scripts/**/* for skills to trigger a prompt @bolinfest
- #12750 fix: keep shell escalation exec paths absolute @bolinfest
- #12753 Surface skill permission profiles in zsh-fork exec approvals @celia-oai
- #12319 feat: add service name to app-server @jif-oai
- #12692 fix: flaky test due to second-resolution for thread ordering @jif-oai
- #12578 feat: add search term to thread list @jif-oai
- #12660 Support external agent config detect and import @alexsong-oai
- #12756 feat: record whether a skill script is approved for the session @bolinfest
- #12767 Display pending child-thread approvals in TUI @jif-oai
- #12768 feat: add large stack test macro @jif-oai
- #12666 feat: adding stream parser @jif-oai
- #12761 feat: record memory usage @jif-oai
- #12772 nit: migration @jif-oai
- #12352 otel: add host.name resource attribute to logs/traces via gethostname @mcgrew-oai
- #12770 chore: unify max depth parameter @jif-oai
- #12787 feat: fix sqlite home @jif-oai




## rust-v0.104.0 (2026-02-18T07:12:45Z)
## New Features
- Added `WS_PROXY`/`WSS_PROXY` environment support (including lowercase variants) for websocket proxying in the network proxy. (#11784)
- App-server v2 now emits notifications when threads are archived or unarchived, enabling clients to react without polling. (#12030)
- Protocol/core now carry distinct approval IDs for command approvals to support multiple approvals within a single shell command execution flow. (#12051)

## Bug Fixes
- `Ctrl+C`/`Ctrl+D` now cleanly exits the cwd-change prompt during resume/fork flows instead of implicitly selecting an option. (#12040)
- Reduced false-positive safety-check downgrade behavior by relying on the response header model (and websocket top-level events) rather than the response body model slug. (#12061)

## Documentation
- Updated docs and schemas to cover websocket proxy configuration, new thread archive/unarchive notifications, and the command approval ID plumbing. (#11784, #12030, #12051)

## Chores
- Made the Rust release workflow resilient to `npm publish` attempts for an already-published version. (#12044)
- Standardized remote compaction test mocking and refreshed related snapshots to align with the default production-shaped behavior. (#12050)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.103.0...rust-v0.104.0

- #11784 feat(network-proxy): add websocket proxy env support @viyatb-oai
- #12044 don't fail if an npm publish attempt is for an existing version. @iceweasel-oai
- #12040 tui: exit session on Ctrl+C in cwd change prompt @charley-oai
- #12030 app-server: Emit thread archive/unarchive notifications @euroelessar
- #12061 Chore: remove response model check and rely on header model for downgrade @shijie-oai
- #12051 feat(core): plumb distinct approval ids for command approvals @owenlin0
- #12050 Unify remote compaction snapshot mocks around default endpoint behavior @charley-oai




## rust-v0.103.0 (2026-02-17T23:02:52Z)
## New Features
- App listing responses now include richer app details (`app_metadata`, branding, and labels), so clients can render more complete app cards without extra requests. (#11706)
- Commit co-author attribution now uses a Codex-managed `prepare-commit-msg` hook, with `command_attribution` override support (default label, custom label, or disable). (#11617)

## Bug Fixes
- Removed the `remote_models` feature flag to prevent fallback model metadata when it was disabled, improving model selection reliability and performance. (#11699)

## Chores
- Updated Rust dependencies (`clap`, `env_logger`, `arc-swap`) and refreshed Bazel lock state as routine maintenance. (#11888, #11889, #11890, #12032)
- Reverted the Rust toolchain bump to `1.93.1` after CI breakage. (#11886, #12035)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.102.0...rust-v0.103.0

- #11699 chore: rm remote models fflag @sayan-oai
- #11706 [apps] Expose more fields from apps listing endpoints. @mzeng-openai
- #11890 chore(deps): bump arc-swap from 1.8.0 to 1.8.2 in /codex-rs @dependabot
- #11886 chore(deps): bump rust-toolchain from 1.93.0 to 1.93.1 in /codex-rs @dependabot
- #12032 chore: just bazel-lock-update @bolinfest
- #11888 chore(deps): bump clap from 4.5.56 to 4.5.58 in /codex-rs @dependabot
- #11889 chore(deps): bump env_logger from 0.11.8 to 0.11.9 in /codex-rs @dependabot
- #11617 Use prompt-based co-author attribution with config override @gabec-openai
- #12035 Revert "chore(deps): bump rust-toolchain from 1.93.0 to 1.93.1 in /co…dex-rs (#11886)" @etraut-openai




## rust-v0.102.0 (2026-02-17T20:02:35Z)
## New Features
- Added a more unified permissions flow, including clearer permissions history in the TUI and a slash command to grant sandbox read access when directories are blocked. (#11633, #11512, #11550, #11639)
- Introduced structured network approval handling, with richer host/protocol context shown directly in approval prompts. (#11672, #11674)
- Expanded app-server fuzzy file search with explicit session-complete signaling so clients can stop loading indicators reliably. (#10268, #11773)
- Added customizable multi-agent roles via config, including migration toward the new multi-agent naming/config surface. (#11917, #11982, #11939, #11918)
- Added a `model/rerouted` notification so clients can detect and render model reroute events explicitly. (#12001)

## Bug Fixes
- Fixed remote image attachments so they persist correctly across resume/backtrack and history replay in the TUI. (#10590)
- Fixed a TUI accessibility regression where animation gating for screen reader users was not consistently respected. (#11860)
- Fixed app-server thread resume behavior to correctly rejoin active in-memory threads and tighten invalid resume cases. (#11756)
- Fixed `model/list` output to return full model data plus visibility metadata, avoiding unintended server-side filtering. (#11793)
- Fixed several `js_repl` stability issues, including reset hangs, in-flight tool-call races, and a `view_image` panic path. (#11932, #11922, #11800, #11796)
- Fixed app integration edge cases in mention parsing and app list loading/filtering behavior. (#11894, #11518, #11697)

## Documentation
- Updated contributor guidance to require snapshot coverage for user-visible TUI changes. (#10669)
- Updated docs/help text around Codex app and MCP command usage. (#11926, #11813)

## Chores
- Improved developer log tooling with new `just log --search` and `just log --compact` modes. (#11995, #11994)
- Updated vendored `rg` and tightened Bazel/Cargo lockfile sync checks to reduce dependency drift. (#12007, #11790)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.101.0...rust-v0.102.0

- #10268 app-server: add fuzzy search sessions for streaming file search @nornagon-openai
- #11547 Parse first order skill/connector mentions @canvrno-oai
- #11227 feat(app-server): experimental flag to persist extended history @owenlin0
- #10672 Add js_repl host helpers and exec end events @fjord-oai
- #11512 add a slash command to grant sandbox read access to inaccessible directories @iceweasel-oai
- #11631 chore(core) Deprecate approval_policy: on-failure @dylan-hurd-oai
- #11636 Better error message for model limit hit. @xl-openai
- #11633 feat: introduce Permissions @bolinfest
- #10669 docs: require insta snapshot coverage for UI changes @joshka-oai
- #11645 fix: skip review_start_with_detached_delivery_returns_new_thread_id o… @owenlin0
- #11639 [feat] add seatbelt permission files @celia-oai
- #11622 Remove absolute path in rollout_summary @wendyjiao-openai
- #10671 Add js_repl_tools_only model and routing restrictions @fjord-oai
- #11657 app-server tests: disable shell_snapshot for review suite @bolinfest
- #11646 app-server: stabilize detached review start on Windows @bolinfest
- #11638 fix(app-server): surface more helpful errors for json-rpc @owenlin0
- #11417 [apps] Add is_enabled to app info. @mzeng-openai
- #11630 Add new apps_mcp_gateway @canvrno-oai
- #11656 Persist complete TurnContextItem state via canonical conversion @charley-oai
- #11510 Remove git commands from dangerous command checks @joshka-oai
- #11668 feat(shell-tool-mcp): add patched zsh build pipeline @nornagon-openai
- #11275 Added a test to verify that feature flags that are enabled by default are stable @etraut-openai
- #11651 Add cwd as an optional field to thread/list @acrognale-oai
- #11660 chore(approvals) More approvals scenarios @dylan-hurd-oai
- #11518 [apps] Fix app loading logic. @mzeng-openai
- #11679 fix: dont show NUX for upgrade-target models that are hidden @sayan-oai
- #11515 Point Codex App tooltip links to app landing page @joshka-oai
- #11671 chore(core) Restrict model-suggested rules @dylan-hurd-oai
- #11703 fix(ci) lock rust toolchain at 1.93.0 to unblock @dylan-hurd-oai
- #11662 feat(network-proxy): structured policy signaling and attempt correlation to core @viyatb-oai
- #11709 fix(shell-tool-mcp) build dependencies @dylan-hurd-oai
- #11618 feat: add token usage on memories @jif-oai
- #11722 Lower missing rollout log level @jif-oai
- #11712 chore: streamline phase 2 @jif-oai
- #11731 feat: memories config @jif-oai
- #11736 feat: increase windows workers stack @jif-oai
- #11739 feat: add slug in name @jif-oai
- #11745 chore: move explorer to spark @jif-oai
- #11748 Fix memories output schema requirements @jif-oai
- #11669 core: limit search_tool_bm25 to Apps and clarify discovery guidance @apanasenko-oai
- #11755 app-server-test-client websocket client and thread tools @maxj-oai
- #11663 fix: reduce flakiness of compact_resume_after_second_compaction_preserves_history @bolinfest
- #11667 sandbox NUX metrics update @iceweasel-oai
- #11695 Updated app bug report template @etraut-openai
- #11477 feat: switch on dying sub-agents @jif-oai
- #11711 feat(tui): prevent macOS idle sleep while turns run @yvolovich-cyber
- #11686 Report syntax errors in rules file @etraut-openai
- #11763 Update read_path prompt @zuxin-oai
- #11772 chore: mini @jif-oai
- #11697 [apps] Improve app listing filtering. @mzeng-openai
- #11666 Add js_repl kernel crash diagnostics @fjord-oai
- #11687 support app usage analytics @alexsong-oai
- #11769 Improve GitHub issue deduplication reliability by introducing a stage… @etraut-openai
- #11770 fix(nix): use correct version from Cargo.toml in flake build @rupurt
- #11677 turn metadata: per-turn non-blocking @pash-openai
- #11692 rmcp-client: fix auth crash @maxj-oai
- #10590 tui: preserve remote image attachments across resume/backtrack @charley-oai
- #11782 turn metadata followups @pash-openai
- #11773 [app-server] add fuzzyFileSearch/sessionCompleted @nornagon-openai
- #11756 codex-rs: fix thread resume rejoin semantics @maxj-oai
- #11793 fix: send unfiltered models over model/list @sayan-oai
- #11799 fix(protocol): make local image test Bazel-friendly @joshka-oai
- #11796 Fix js_repl view_image test runtime panic @fjord-oai
- #11800 Fix js_repl in-flight tool-call waiter race @fjord-oai
- #11658 feat(skills): add permission profiles from openai.yaml metadata @celia-oai
- #11790 bazel: enforce MODULE.bazel.lock sync with Cargo.lock @joshka-oai
- #11803 add perf metrics for connectors load @alexsong-oai
- #11659 Handle model-switch base instructions after compaction @charley-oai
- #11813 Fixed help text for `mcp` and `mcp-server` CLI commands @etraut-openai
- #11672 feat(core): add structured network approval plumbing and policy decision model @viyatb-oai
- #11674 feat(tui): render structured network approval prompts in approval overlay @viyatb-oai
- #11550 feat(tui) Permissions update history item @dylan-hurd-oai
- #11767 fix(core): add linux bubblewrap sandbox tag @viyatb-oai
- #11534 Add process_uuid to sqlite logs @charley-oai
- #11487 core: snapshot tests for compaction requests, post-compaction layout, some additional compaction tests @charley-oai
- #11690 fix: show user warning when using default fallback metadata @sayan-oai
- #11780 chore(tui): reduce noisy key logging @apanasenko-oai
- #11884 fix: only emit unknown model warning on user turns @sayan-oai
- #11893 bazel: fix snapshot parity for tests/*.rs rust_test targets @apanasenko-oai
- #11759 feat: use shell policy in shell snapshot @jif-oai
- #11615 Allow hooks to error @gt-oai
- #11918 chore: rename collab feature flag key to multi_agent @jif-oai
- #11924 nit: memory storage @jif-oai
- #11917 feat: add customizable roles for multi-agents @jif-oai
- #11926 docs: mention Codex app in README intro @vb-openai
- #11900 feat: drop MCP managing tools if no MCP servers @jif-oai
- #11939 Rename collab modules to multi agents @jif-oai
- #11894 [apps] Fix app mention syntax. @mzeng-openai
- #11866 chore(core) rm Feature::RequestRule @dylan-hurd-oai
- #11948 add(feedback): over-refusal / safety check @fouad-openai
- #11860 Fixed screen reader regression in CLI @etraut-openai
- #11964 add(core): safety check downgrade warning @fouad-openai
- #11951 fix(core) exec_policy parsing fixes @dylan-hurd-oai
- #11932 fix: js_repl reset hang by clearing exec tool calls without waiting @jif-oai
- #11974 Hide /debug slash commands from popup menu @jif-oai
- #11922 fix: race in js repl @jif-oai
- #11969 fix(ci) Fix shell-tool-mcp.yml @dylan-hurd-oai
- #11908 Exit early when session initialization fails @jif-oai
- #11986 nit: wording multi-agent @jif-oai
- #11995 feat: add `--search` to `just log` @jif-oai
- #11994 feat: add `--compact` mode to `just log` @jif-oai
- #11833 Don't allow model_supports_reasoning_summaries to disable reasoning @etraut-openai
- #11807 Centralize context update diffing logic @charley-oai
- #12007 Update vendored rg to the latest stable version (15.1) @etraut-openai
- #11970 Protect workspace .agents directory in Windows sandbox @etraut-openai
- #12005 Add /statusline tooltip entry @jif-oai
- #11982 feat: move agents config to main config @jif-oai
- #11224 chore: clarify web_search deprecation notices and consolidate tests @sayan-oai
- #12001 Feat: add model reroute notification @shijie-oai
- #11801 Add remote skill scope/product_surface/enabled params and cleanup @xl-openai




## rust-v0.101.0 (2026-02-12T20:05:52Z)
## Bug Fixes
- Model resolution now preserves the requested model slug when selecting by prefix, so model references stay stable instead of being rewritten. (#11602)
- Developer messages are now excluded from phase-1 memory input, reducing noisy or irrelevant content entering memory. (#11608)
- Memory phase processing concurrency was reduced to make consolidation/staging more stable under load. (#11614)

## Chores
- Cleaned and simplified the phase-1 memory pipeline code paths. (#11605)
- Minor repository maintenance: formatting and test-suite hygiene updates in remote model tests. (#11619)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.100.0...rust-v0.101.0

- #11605 chore: drop and clean from phase 1 @jif-oai
- #11602 fix(core) model_info preserves slug @dylan-hurd-oai
- #11608 exclude developer messages from phase-1 memory input @wendyjiao-openai
- #11591 Add cwd to memory files @wendyjiao-openai
- #11614 chore: reduce concurrency of memories @jif-oai
- #11619 fix: fmt @jif-oai




## rust-v0.100.0 (2026-02-12T18:29:57Z)
## New Features
- Added an experimental, feature-gated JavaScript REPL runtime (`js_repl`) that can persist state across tool calls, with optional runtime path overrides. (#10674)
- Added support for multiple simultaneous rate limits across the protocol, backend client, and TUI status surfaces. (#11260)
- Reintroduced app-server websocket transport with a split inbound/outbound architecture, plus connection-aware thread resume subscriptions. (#11370, #11474)
- Added memory management slash commands in the TUI (`/m_update`, `/m_drop`) and expanded memory-read/metrics plumbing. (#11569, #11459, #11593)
- Enabled Apps SDK apps in ChatGPT connector handling. (#11486)
- Promoted sandbox capabilities on both Linux and Windows, and introduced a new `ReadOnlyAccess` policy shape for configurable read access. (#11381, #11341, #11387)

## Bug Fixes
- Fixed websocket incremental output duplication, prevented appends after `response.completed`, and treated `response.incomplete` as an error path. (#11383, #11402, #11558)
- Improved websocket session stability by continuing ping handling when idle and suppressing noisy first-retry errors during quick reconnects. (#11413, #11548)
- Fixed stale thread entries by dropping missing rollout files and cleaning stale DB metadata during thread listing. (#11572)
- Fixed Windows multi-line paste reliability in terminals (especially VS Code integrated terminal) by increasing paste burst timing tolerance. (#9348)
- Fixed incorrect inheritance of `limit_name` when merging partial rate-limit updates. (#11557)
- Reduced repeated skill parse-error spam during active edits by increasing file-watcher debounce from 1s to 10s. (#11494)

## Documentation
- Added JS REPL documentation and config/schema guidance for enabling and configuring the feature. (#10674)
- Updated app-server websocket transport documentation in the app-server README. (#11370)

## Chores
- Split `codex-common` into focused `codex-utils-*` crates to simplify dependency boundaries across Rust workspace components. (#11422)
- Improved Rust release pipeline throughput and reliability for Windows and musl targets, including parallel Windows builds and musl link fixes. (#11488, #11500, #11556)
- Prevented GitHub release asset upload collisions by excluding duplicate `cargo-timing.html` artifacts. (#11564)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.99.0...rust-v0.100.0

- #11383 Do not resend output items in incremental websockets connections @pakrym-oai
- #11246 chore: persist turn_id in rollout session and make turn_id uuid based @celia-oai
- #11260 feat: support multiple rate limits @xl-openai
- #11412 tui: show non-file layer content in /debug-config @bolinfest
- #11405 Remove `test-support` feature from `codex-core` and replace it with explicit test toggles @bolinfest
- #11428 fix: flaky test @jif-oai
- #11429 feat: improve thread listing @jif-oai
- #11422 feat: split codex-common into smaller utils crates @bolinfest
- #11439 feat: new memory prompts @jif-oai
- #11305 Cache cloud requirements @gt-oai
- #11452 nit: increase max raw memories @jif-oai
- #11455 feat: close mem agent after consolidation @jif-oai
- #11454 fix: optional schema of memories @jif-oai
- #11449 feat: set policy for phase 2 memory @jif-oai
- #11420 chore: rename disable_websockets -> websockets_disabled @sayan-oai
- #11402 Do not attempt to append after response.completed @pakrym-oai
- #11462 clean: memory rollout recorder @jif-oai
- #11381 feat(core): promote Linux bubblewrap sandbox to Experimental @viyatb-oai
- #11389 Extract `codex-config` from `codex-core` @bolinfest
- #11370 Reapply "Add app-server transport layer with websocket support" @maxj-oai
- #11470 feat: panic if Constrained<WebSearchMode> does not support Disabled @bolinfest
- #11475 feat: remove "cargo check individual crates" from CI @bolinfest
- #11459 feat: memory read path @jif-oai
- #11471 chore: clean rollout extraction in memories @jif-oai
- #9348 fix(tui): increase paste burst char interval on Windows to 30ms @yuvrajangadsingh
- #11464 chore: sub-agent never ask for approval @jif-oai
- #11414 Linkify feedback link @pakrym-oai
- #11480 chore: update mem prompt @jif-oai
- #11485 fix: Constrained import @owenlin0
- #11341 Promote Windows Sandbox @iceweasel-oai
- #10674 Add feature-gated freeform js_repl core runtime @fjord-oai
- #11419 refactor: codex app-server ThreadState @maxj-oai
- #11413 Pump pings @pakrym-oai
- #11488 feat: use more powerful machines for building Windows releases @bolinfest
- #11479 nit: memory truncation @jif-oai
- #11494 Increased file watcher debounce duration from 1s to 10s @etraut-openai
- #11335 Add AfterToolUse hook @gt-oai
- #11500 feat: build windows support binaries in parallel @bolinfest
- #11290 chore(tui) Simplify /status Permissions @dylan-hurd-oai
- #11503 Make codex-sdk depend on openai/codex @pakrym-oai
- #11474 app-server: thread resume subscriptions @maxj-oai
- #11277 Added seatbelt policy rule to allow os.cpus @etraut-openai
- #11506 chore: inject originator/residency headers to ws client @apanasenko-oai
- #11497 Hydrate previous model across resume/fork/rollback/task start @aibrahim-oai
- #11513 feat: try to fix bugs I saw in the wild in the resource parsing logic @bolinfest
- #11509 Consolidate search_tool feature into apps @apanasenko-oai
- #11388 change model cap to server overload @willwang-openai
- #11504 Pre-sampling compact with previous model context @aibrahim-oai
- #11516 Clamp auto-compact limit to context window @aibrahim-oai
- #11520 Update context window after model switch @aibrahim-oai
- #11519 Use slug in tui @pakrym-oai
- #11522 fix: add --test_verbose_timeout_warnings to bazel.yml @bolinfest
- #11526 fix: remove errant Cargo.lock files @bolinfest
- #11521 test(app-server): stabilize app/list thread feature-flag test by using file-backed MCP OAuth creds @bolinfest
- #11387 feat: make sandbox read access configurable with `ReadOnlyAccess` @bolinfest
- #11486 [apps] Allow Apps SDK apps. @mzeng-openai
- #11532 fix compilation @sayan-oai
- #11531 Teach codex to test itself @pakrym-oai
- #11540 ci: remove actions/cache from rust release workflows @bolinfest
- #11542 ci(windows): use DotSlash for zstd in rust-release-windows @bolinfest
- #11498 build(linux-sandbox): always compile vendored bubblewrap on Linux; remove CODEX_BWRAP_ENABLE_FFI @viyatb-oai
- #11545 fix: make project_doc skill-render tests deterministic @bolinfest
- #11543 ci: capture cargo timings in Rust CI and release workflows @bolinfest
- #11539 Bump rmcp to 0.15 @gpeal
- #11548 Hide the first websocket retry @pakrym-oai
- #11551 Add logs to model cache @aibrahim-oai
- #11556 Fix rust-release failures in musl linking and release asset upload @bolinfest
- #11558 Handle response.incomplete @pakrym-oai
- #11557 fix: stop inheriting rate-limit limit_name @xl-openai
- #11564 rust-release: exclude cargo-timing.html from release assets @bolinfest
- #11546 fix: update memory writing prompt @zuxin-oai
- #11448 Fix test flake @gt-oai
- #11569 feat: mem slash commands @jif-oai
- #11573 Fix flaky pre_sampling_compact switch test @jif-oai
- #11571 feat: mem drop cot @jif-oai
- #11572 Ensure list_threads drops stale rollout files @jif-oai
- #11575 fix: db stuff mem @jif-oai
- #11581 nit: upgrade DB version @jif-oai
- #11577 feat: truncate with model infos @jif-oai
- #11590 chore: clean consts @jif-oai
- #11593 feat: metrics to memories @jif-oai
- #11579 Fix config test on macOS @gt-oai
- #11600 feat: add sanitizer to redact secrets @jif-oai
- #11609 chore: drop mcp validation of dynamic tools @jif-oai




## rust-v0.99.0 (2026-02-11T20:43:00Z)
## New Features

- Running direct shell commands no longer interrupts an in-flight turn; commands can execute concurrently when a turn is active. (#10513)
- Added `/statusline` to configure which metadata appears in the TUI footer interactively. (#10546)
- The TUI resume picker can now toggle sort order between creation time and last-updated time with an in-picker mode indicator. (#10752)
- App-server clients now get dedicated APIs for steering active turns, listing experimental features, resuming agents, and opting out of specific notifications. (#10721, #10821, #10903, #11319)
- Enterprise/admin requirements can now restrict web search modes and define network constraints through `requirements.toml`. (#10964, #10958)
- Image attachments now accept GIF and WebP inputs in addition to existing formats. (#11237)
- Enable snapshotting of the shell environment and `rc` files (#11172)

## Bug Fixes

- Fixed a Windows startup issue where buffered keypresses could cause the TUI sign-in flow to exit immediately. (#10729)
- Required MCP servers now fail fast during start/resume flows instead of continuing in a broken state. (#10902)
- Fixed a file-watcher bug that emitted spurious skills reload events and could generate very large log files. (#11217)
- Improved TUI input reliability: long option labels wrap correctly, Tab submits in steer mode when idle, history recall keeps cursor placement consistent, and stashed drafts restore image placeholders correctly. (#11123, #10035, #11295, #9040)
- Fixed model-modality edge cases by surfacing clearer `view_image` errors on text-only models and stripping unsupported image history during model switches. (#11336, #11349)
- Reduced false approval mismatches for wrapped/heredoc shell commands and guarded against empty command lists in exec policy evaluation. (#10941, #11397)

## Documentation

- Expanded app-server docs and protocol references for `turn/steer`, experimental-feature discovery, `resume_agent`, notification opt-outs, and null `developer_instructions` normalization. (#10721, #10821, #10903, #10983, #11319)
- Updated TUI composer docs to reflect draft/image restoration, steer-mode Tab submit behavior, and history-navigation cursor semantics. (#9040, #10035, #11295)

## Chores

- Reworked npm release packaging so platform-specific binaries are distributed via `@openai/codex` dist-tags, reducing package-size pressure while preserving platform-specific installs (including `@alpha`). (#11318, #11339)
- Pulled in a security-driven dependency update for `time` (RUSTSEC-2026-0009). (#10876)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.98.0...rust-v0.99.0

- #10729 fix(tui): flush input buffer on init to prevent early exit on Windows @Ashutosh0x
- #10689 fix: flaky landlock @jif-oai
- #10513 Allow user shell commands to run alongside active turns @jif-oai
- #10738 nit: backfill stronger @jif-oai
- #10246 adding fork information (UI) when forking @pap-openai
- #10748 Update explorer role default model @jif-oai
- #10425 Include real OS info in metrics. @iceweasel-oai
- #10745 feat: resumable backfill @jif-oai
- #10758 feat: wire ephemeral in `codex exec` @jif-oai
- #10756 chore: handle shutdown correctly in tui @jif-oai
- #10637 feat: add memory tool @jif-oai
- #10751 feat: repair DB in case of missing lines @jif-oai
- #10762 nit: add DB version in discrepancy recording @jif-oai
- #10621 Leverage state DB metadata for thread summaries @jif-oai
- #9691 Add hooks implementation and wire up to `notify` @gt-oai
- #10546 feat(tui): add /statusline command for interactive status line configuration @fcoury
- #10752 feat(tui): add sortable resume picker with created/updated timestamp toggle @fcoury
- #10769 fix(tui): fix resume_picker_orders_by_updated_at test @owenlin0
- #10423 fix(auth): isolate chatgptAuthTokens concept to auth manager and app-server @owenlin0
- #10775 nit: gpt-5.3-codex announcement @jif-oai
- #10782 nit: gpt-5.3-codex announcement 2 @jif-oai
- #10711 add sandbox policy and sandbox name to codex.tool.call metrics @iceweasel-oai
- #10660 chore: rm web-search-eligible header @sayan-oai
- #10783 fix: announcement in prio @jif-oai
- #10721 [app-server] Add a method to list experimental features. @mzeng-openai
- #10787 chore: limit update to 0.98.0 NUX to < 0.98.0 ver @sayan-oai
- #10655 Add analytics for /rename and /fork @pap-openai
- #10790 feat: wait for backfill to be ready @jif-oai
- #10693 Add app-server transport layer with websocket support @maxj-oai
- #10818 other announcement @jif-oai
- #10815 Sync app-server requirements API with refreshed cloud loader @xl-openai
- #10820 go back to auto-enabling web_search for azure @sayan-oai
- #10727 Send beta header with websocket connects @pakrym-oai
- #10809 updates: use brew api for version check @magus
- #10793 Add stage field for experimental flags. @mzeng-openai
- #10821 feat(app-server): turn/steer API @owenlin0
- #10792 Print warning when config does not meet requirements @gt-oai
- #10699 feat: expose detailed metrics to runtime metrics @apanasenko-oai
- #10784 Gate app tooltips to macOS @aibrahim-oai
- #10843 Log an event (info only) when we receive a file watcher event @etraut-openai
- #10852 Personality setting is no longer available in experimental menu @etraut-openai
- #10840 Removed the "remote_compaction" feature flag @etraut-openai
- #10876 sec: fix version of `time` to prevent vulnerability @jif-oai
- #10892 nit: test an @jif-oai
- #10894 feat: backfill async again @jif-oai
- #10902 Handle required MCP startup failures across components @jif-oai
- #10851 Removed "exec_policy" feature flag @etraut-openai
- #10457 Queue nudges while plan generating @charley-oai
- #10822 Add app configs to config.toml @canvrno-oai
- #10420 feat(network-proxy): add structured policy decision to blocked errors @viyatb-oai
- #10814 fix(linux-sandbox): block io_uring syscalls in no-network seccomp policy @viyatb-oai
- #10698 core: preconnect Responses websocket for first turn @joshka-oai
- #10574 core: refresh developer instructions after compaction replacement history @charley-oai
- #10914 chore(app-server): update AGENTS.md for config + optional collection guidance @owenlin0
- #10928 chore(app-server): add experimental annotation to relevant fields @owenlin0
- #10927 Treat compaction failure as failure state @aibrahim-oai
- #10861 Support alternative websocket API @by-openai
- #10826 add originator to otel @alexsong-oai
- #10855 TUI/Core: preserve duplicate skill/app mention selection across submit + resume @daniel-oai
- #10943 app-server: print help message to console when starting websockets server @JaviSoto
- #10938 Mark Config.apps as experimental, correct schema generation issue @canvrno-oai
- #10947 fix(tui): conditionally restore status indicator using message phase @sayan-oai
- #10965 refactor(network-proxy): flatten network config under [network] @viyatb-oai
- #10970 Fixed a flaky test @etraut-openai
- #10710 Process-group cleanup for stdio MCP servers to prevent orphan process storms @etraut-openai
- #10964 feat: add support for allowed_web_search_modes in requirements.toml @bolinfest
- #10977 fix: use expected line ending in codex-rs/core/config.schema.json @bolinfest
- #10973 Do not poll for usage when using API Key auth @etraut-openai
- #10921 Show left/right arrows to navigate in tui request_user_input @charley-oai
- #10988 fix: normalize line endings when reading file on Windows @bolinfest
- #10903 Add resume_agent collab tool @jif-oai
- #10909 Bootstrap shell commands via user shell snapshot @jif-oai
- #10993 Fix flaky windows CI test @etraut-openai
- #10987 Fixed a flaky Windows test that is consistently causing a CI failure @etraut-openai
- #10958 feat(core): add network constraints schema to requirements.toml @viyatb-oai
- #10983 app-server: treat null mode developer instructions as built-in defaults @charley-oai
- #11039 feat: include state of [experimental_network] in /debug-config output @bolinfest
- #11040 Simplify pre-connect @pakrym-oai
- #10966 feat: enable premessage-deflate for websockets @apanasenko-oai
- #9040 fix(tui): rehydrate drafts and restore image placeholders @Chriss4123
- #10824 Fallback to HTTP on UPGRADE_REQUIRED @pakrym-oai
- #11028 Defer persistence of rollout file @etraut-openai
- #10980 fix: remove config.schema.json from tag check @bolinfest
- #11051 Gate view_image tool by model input_modalities @wiltzius-openai
- #11109 [bazel] Upgrade some rulesets in preparation for enabling windows @zbarsky-openai
- #11114 chore: refactor network-proxy so that ConfigReloader is injectable behavior @bolinfest
- #10718 Upgrade rmcp to 0.14 @mzeng-openai
- #11044 feat: include [experimental_network] in <environment_context> @bolinfest
- #10994 [apps] Improve app loading. @mzeng-openai
- #11121 chore: reverse the codex-network-proxy -> codex-core dependency @bolinfest
- #11105 feat: include NetworkConfig through ExecParams @bolinfest
- #11155 tui: avoid no-op status-line redraws @rakan-oai
- #10799 feat: do not close unified exec processes across turns @jif-oai
- #11172 chore: enable shell snapshot @jif-oai
- #11175 fix: do not show closed agents in `/agent` @jif-oai
- #11173 chore: enable sub agents @jif-oai
- #11193 Deflake mixed parallel tools timing test @gt-oai
- #10770 Load requirements on windows @gt-oai
- #11132 core: account for all post-response items in auto-compact token checks @charley-oai
- #11198 tools: remove get_memory tool and tests @jif-oai
- #10937 Translate websocket errors @rasmusrygaard
- #11217 Fixed bug in file watcher that results in spurious skills update events and large log files @etraut-openai
- #11216 Move warmup to the task level @pakrym-oai
- #11203 Try to stop small helper methods @pakrym-oai
- #11197 [bazel] Upgrade some rulesets in preparation for enabling windows, part 2 @zbarsky-openai
- #11158 chore: remove network-proxy-cli crate @viyatb-oai
- #11230 Revert "chore: enable sub agents" @jif-oai
- #11123 TUI: fix request_user_input wrapping for long option labels @charley-oai
- #11133 core: add focused diagnostics for remote compaction overflows @charley-oai
- #10657 feat: search_tool @apanasenko-oai
- #11199 state: add memory consolidation lock primitives @jif-oai
- #10835 feat: extend skills/list to support additional roots. @xl-openai
- #10960 skill-creator: Remove invalid reference. @xl-openai
- #11219 feat: use a notify instead of grace to close ue process @jif-oai
- #11231 feat: tie shell snapshot to cwd @jif-oai
- #10962 fix(tui): keep unified exec summary on working line @joshka-oai
- #11232 Add originator to otel metadata tags @alexsong-oai
- #11237 adding image support for gif and webp @natea-oai
- #10924 [apps] Add gated instructions for Apps. @mzeng-openai
- #11228 Use longest remote model prefix matching @aibrahim-oai
- #11242 fix(feature) UnderDevelopment feature must be off @dylan-hurd-oai
- #11185 fix: nix build by adding missing dependencies and fix outputHashes @Philipp-M
- #10035 fix(tui): tab submits when no task running in steer mode @joshka-oai
- #11238 Remove offline fallback for models @aibrahim-oai
- #9739 Update models.json @github-actions
- #11255 Revert "Update models.json" @aibrahim-oai
- #11245 deflake linux-sandbox NoNewPrivs timeout @joshka-oai
- #11256 Revert "Revert "Update models.json"" @aibrahim-oai
- #11262 chore: change ConfigState so it no longer depends on a single config.toml file for reloading @bolinfest
- #11263 test: deflake nextest child-process leak in MCP harnesses @joshka-oai
- #11247 Adjust shell command timeouts for Windows @dylan-hurd-oai
- #11240 fix(app-server): for external auth, replace id_token with chatgpt_acc… @owenlin0
- #11140 chore(deps): bump insta from 1.46.2 to 1.46.3 in /codex-rs @dependabot
- #11139 chore(deps): bump anyhow from 1.0.100 to 1.0.101 in /codex-rs @dependabot
- #11138 chore(deps): bump regex from 1.12.2 to 1.12.3 in /codex-rs @dependabot
- #11239 Disable dynamic model refresh for custom model providers @etraut-openai
- #11269 feat: reserve loopback ephemeral listeners for managed proxy @bolinfest
- #11279 [apps] Add thread_id param to optionally load thread config for apps feature check. @mzeng-openai
- #11244 feat: add SkillPolicy to skill metadata and support allow_implicit_invocation @alexsong-oai
- #10215 chore(tui) cleanup /approvals @dylan-hurd-oai
- #11113 feat(sandbox): enforce proxy-aware network routing in sandbox @viyatb-oai
- #10940 feat: support configurable metric_exporter @alexsong-oai
- #11294 chore: put crypto provider logic in a shared crate @bolinfest
- #11207 feat: retain NetworkProxy, when appropriate @bolinfest
- #11200 memories: add extraction and prompt module foundation @jif-oai
- #11191 feat: add connector capabilities to sub-agents @jif-oai
- #11304 Fix spawn_agent input type @jif-oai
- #11300 feat: align memory phase 1 and make it stronger @jif-oai
- #11311 Extract hooks into dedicated crate @jif-oai
- #11306 feat: phase 2 consolidation @jif-oai
- #11318 chore: split NPM packages @jif-oai
- #11322 Fix pending input test waiting logic @jif-oai
- #11265 Remove ApiPrompt @pakrym-oai
- #11295 tui: keep history recall cursor at line end @joshka-oai
- #11288 fix(protocol): approval policy never prompt @fouad-openai
- #11323 Revert "Add app-server transport layer with websocket support (#10693)" @maxj-oai
- #11162 Fix: update parallel tool call exec approval to approve on request id @shijie-oai
- #11249 [apps] Improve app installation flow. @mzeng-openai
- #11319 feat: opt-out of events in the app-server @jif-oai
- #11241 Treat first rollout session_meta as canonical thread identity @guinness-oai
- #11339 # Use `@openai/codex` dist-tags for platform binaries instead of separate package names @bolinfest
- #11330 test(core): stabilize ARM bazel remote-model and parallelism tests @dylan-hurd-oai
- #11345 core: remove stale apply_patch SandboxPolicy TODO in seatbelt @bolinfest
- #11343 Compare full request for websockets incrementality @pakrym-oai
- #11344 fix: reduce usage of `open_if_present`  @jif-oai
- #11336 Always expose view_image and return unsupported image-input error @aibrahim-oai
- #11346 Sanitize MCP image output for text-only models @aibrahim-oai
- #11337 Extract tool building @pakrym-oai
- #10941 fix(core): canonicalize wrapper approvals and support heredoc prefix … @viyatb-oai
- #10946 include sandbox (seatbelt, elevated, etc.) as in turn metadata header @iceweasel-oai
- #11349 Strip unsupported images from prompt history to guard against model switch @aibrahim-oai
- #11348 Use thin LTO for alpha Rust release builds @bolinfest
- #11334 chore: unify memory job flow @jif-oai
- #11364 feat: mem v2 - PR1 @jif-oai
- #11365 feat: mem v2 - PR2 @jif-oai
- #11366 feat: mem v2 - PR3 @jif-oai
- #11274 Update models.json @github-actions
- #11361 # Split command parsing/safety out of `codex-core` into new `codex-command` @bolinfest
- #11369 feat: mem v2 - PR4 @jif-oai
- #11362 Enable SOCKS defaults for common local network proxy use cases @viyatb-oai
- #11359 ci: fall back to local Bazel on forks without BuildBuddy key @joshka-oai
- #11372 feat: mem v2 - PR5 @jif-oai
- #11374 feat: mem v2 - PR6 (consolidation) @jif-oai
- #11377 feat: prevent double backfill @jif-oai
- #11378 chore: rename codex-command to codex-shell-command @bolinfest
- #11376 Update models.json @github-actions
- #11394 Disable very flaky tests @pakrym-oai
- #11386 Prefer websocket transport when model opts in @pakrym-oai
- #11373 tui: queue non-pending rollback trims in app-event order @charley-oai
- #11393 Remove `deterministic_process_ids` feature to avoid duplicate `codex-core` builds @bolinfest
- #11397 fix(exec-policy) No empty command lists @dylan-hurd-oai




## rust-v0.98.0 (2026-02-05T17:00:36Z)
## New Features
- Introducing GPT-5.3-Codex. [Learn More](https://openai.com/index/introducing-gpt-5-3-codex/)
- Steer mode is now stable and enabled by default, so `Enter` sends immediately during running tasks while `Tab` explicitly queues follow-up input. (#10690)

## Bug Fixes
- Fixed `resumeThread()` argument ordering in the TypeScript SDK so resuming with local images no longer starts an unintended new session. (#10709)
- Fixed model-instruction handling when changing models mid-conversation or resuming with a different model, ensuring the correct developer instructions are applied. (#10651, #10719)
- Fixed a remote compaction mismatch where token pre-estimation and compact payload generation could use different base instructions, improving trim accuracy and avoiding context overflows. (#10692)
- Cloud requirements now reload immediately after login instead of requiring a later refresh path to take effect. (#10725)

## Chores
- Restored the default assistant personality to Pragmatic across config and related tests/UI snapshots. (#10705)
- Unified collaboration mode naming and metadata across prompts, tools, protocol types, and TUI labels for more consistent mode behavior and messaging. (#10666)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.97.0...rust-v0.98.0

- #10709 fix: ensure resume args precede image args @cryptonerdcn
- #10705 chore(config) Default Personality Pragmatic @dylan-hurd-oai
- #10651 fix(core) switching model appends model instructions @dylan-hurd-oai
- #10666 Sync collaboration mode naming across Default prompt, tools, and TUI @charley-oai
- #10690 Make steer stable by default @aibrahim-oai
- #10692 Fix remote compaction estimator/payload instruction small mismatch @charley-oai
- #10725 Reload cloud requirements after user login @xl-openai
- #10719 fix(core,app-server) resume with different model @dylan-hurd-oai




## rust-v0.97.0 (2026-02-05T05:11:10Z)
## New Features
- Added a session-scoped “Allow and remember” option for MCP/App tool approvals, so repeated calls to the same tool can be auto-approved during the session. (#10584)
- Added live skill update detection, so skill file changes are picked up without restarting. (#10478)
- Added support for mixed text and image content in dynamic tool outputs for app-server integrations. (#10567)
- Added a new `/debug-config` slash command in the TUI to inspect effective configuration. (#10642)
- Introduced initial memory plumbing (API client + local persistence) to support thread memory summaries. (#10629, #10634)
- Added configurable `log_dir` so logs can be redirected (including via `-c` overrides) more easily. (#10678)

## Bug Fixes
- Fixed jitter in the TUI apps/connectors picker by stabilizing description-column rendering. (#10593)
- Restored and stabilized the TUI “working” status indicator/shimmer during preamble and early exec flows. (#10700, #10701)
- Improved cloud requirements reliability with higher timeouts, retries, and corrected precedence over MDM settings. (#10631, #10633, #10659)
- Persisted pending-input user events more consistently for mid-turn injected input handling. (#10656)

## Documentation
- Documented how to opt in to the experimental app-server API. (#10667)
- Updated docs/schema coverage for new `log_dir` configuration behavior. (#10678)

## Chores
- Added a gated Bubblewrap (`bwrap`) Linux sandbox path to improve filesystem isolation options. (#9938)
- Refactored model client lifecycle to be session-scoped and reduced implicit client state. (#10595, #10664)
- Added caching for MCP actions from apps to reduce repeated load latency for users with many installed apps. (#10662)
- Added a `none` personality option in protocol/config surfaces. (#10688)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.96.0...rust-v0.97.0

- #10595 Stop client from being state carrier @pakrym-oai
- #10584 Add option to approve and remember MCP/Apps tool usage @canvrno-oai
- #10644 fix: flaky test @jif-oai
- #10629 feat: add phase 1 mem client @jif-oai
- #10633 Cloud Requirements: take precedence over MDM @gt-oai
- #10659 Increase cloud req timeout @gt-oai
- #9938 feat(linux-sandbox): add bwrap support @viyatb-oai
- #10656 Persist pending input user events @aibrahim-oai
- #10634 feat: add phase 1 mem db @jif-oai
- #10593 Fix jitter in TUI apps/connectors picker  @canvrno-oai
- #10662 [apps] Cache MCP actions from apps. @mzeng-openai
- #10649 Fix test_shell_command_interruption flake @gt-oai
- #10642 Add /debug-config slash command @gt-oai
- #10478 Added support for live updates to skills @etraut-openai
- #10688 add none personality option @aibrahim-oai
- #10567 feat(app-server, core): allow text + image content items for dynamic tool outputs @owenlin0
- #10667 chore(app-server): document experimental API opt-in @owenlin0
- #10664 Session-level model client @pakrym-oai
- #10678 feat(core): add configurable log_dir @joshka-oai
- #10631 Cloud Requirements: increase timeout and retries @gt-oai
- #10650 chore(core) personality migration tests @dylan-hurd-oai
- #10701 fix(tui): restore working shimmer after preamble output @joshka-oai
- #10700 fix: ensure status indicator present earlier in exec path @sayan-oai




## rust-v0.96.0 (2026-02-04T18:23:37Z)
## New Features
- Added `thread/compact` to the v2 app-server API as an async trigger RPC, so clients can start compaction immediately and track completion separately. (#10445)
- Added websocket-side rate limit signaling via a new `codex.rate_limits` event, with websocket parity for ETag/reasoning metadata handling. (#10324)
- Enabled `unified_exec` on all non-Windows platforms. (#10641)
- Constrained requirement values now include source provenance, enabling source-aware config debugging in UI flows like `/debug-config`. (#10568)

## Bug Fixes
- Fixed `Esc` handling in the TUI `request_user_input` overlay: when notes are open, `Esc` now exits notes mode instead of interrupting the session. (#10569)
- Thread listing now queries the state DB first (including archived threads) and falls back to filesystem traversal only when needed, improving listing correctness and resilience. (#10544)
- Fixed thread path lookup to require that the resolved file actually exists, preventing invalid thread-id resolutions. (#10618)
- Dynamic tool injection now runs in a single transaction to avoid partial state updates. (#10614)
- Refined `request_rule` guidance used in approval-policy prompting to correct rule behavior. (#10379, #10598)

## Documentation
- Updated app-server docs for `thread/compact` to clarify its asynchronous behavior and thread-busy lifecycle. (#10445)
- Updated TUI docs to match the mode-specific `Esc` behavior in `request_user_input`. (#10569)

## Chores
- Migrated state DB helpers to a versioned SQLite filename scheme and cleaned up legacy state files during runtime initialization. (#10623)
- Expanded runtime telemetry with websocket timing metrics and simplified internal metadata flow in core client plumbing. (#10577, #10589)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.95.0...rust-v0.96.0

- #10569 tui: make Esc clear request_user_input notes while notes are shown @charley-oai
- #10577 feat: log webscocket timing into runtime metrics @apanasenko-oai
- #10445 Add thread/compact v2  @aibrahim-oai
- #10589 Move metadata calculation out of client @pakrym-oai
- #10379 fix(core) updated request_rule guidance @dylan-hurd-oai
- #10598 fix(core) Request Rule guidance tweak @dylan-hurd-oai
- #10544 Prefer state DB thread listings before filesystem @jif-oai
- #10614 fix: single transaction for dyn tools injection @jif-oai
- #10568 Requirements: add source to constrained requirement values @gt-oai
- #10611 chore: simplify user message detection @jif-oai
- #10618 fix: make sure file exist in `find_thread_path_by_id_str_in_subdir` @jif-oai
- #10619 nit: cleaning @jif-oai
- #10324 Add a codex.rate_limits event for websockets @rasmusrygaard
- #10623 Migrate state DB path helpers to versioned filename @jif-oai
- #10638 Update tests to stop using sse_completed fixture @pakrym-oai
- #10641 feat: land unified_exec @jif-oai




## rust-v0.95.0 (2026-02-04T04:54:32Z)
## New Features
- Added `codex app <path>` on macOS to launch Codex Desktop from the CLI, with automatic DMG download if it is missing. (#10418)
- Added personal skill loading from `~/.agents/skills` (with `~/.codex/skills` compatibility), plus app-server APIs/events to list and download public remote skills. (#10437, #10448)
- `/plan` now accepts inline prompt arguments and pasted images, and slash-command editing/highlighting in the TUI is more polished. (#10269)
- Shell-related tools can now run in parallel, improving multi-command execution throughput. (#10505)
- Shell executions now receive `CODEX_THREAD_ID`, so scripts and skills can detect the active thread/session. (#10096)
- Added vendored Bubblewrap + FFI wiring in the Linux sandbox as groundwork for upcoming runtime integration. (#10413)

## Bug Fixes
- Hardened Git command safety so destructive or write-capable invocations no longer bypass approval checks. (#10258)
- Improved resume/thread browsing reliability by correctly showing saved thread names and fixing thread listing behavior. (#10340, #10383)
- Fixed first-run trust-mode handling so sandbox mode is reported consistently, and made `$PWD/.agents` read-only like `$PWD/.codex`. (#10415, #10524)
- Fixed `codex exec` hanging after interrupt in websocket/streaming flows; interrupted turns now shut down cleanly. (#10519)
- Fixed review-mode approval event wiring so `requestApproval` IDs align with the corresponding command execution items. (#10416)
- Improved 401 error diagnostics by including server message/body details plus `cf-ray` and `requestId`. (#10508)

## Documentation
- Expanded TUI chat composer docs to cover slash-command arguments and attachment handling in plan/review flows. (#10269)
- Refreshed issue templates and labeler prompts to better separate CLI/app bug reporting and feature requests. (#10411, #10453, #10548, #10552)

## Chores
- Completed migration off the deprecated `mcp-types` crate to `rmcp`-based protocol types/adapters, then removed the legacy crate. (#10356, #10349, #10357)
- Updated the `bytes` dependency for a security advisory and cleaned up resolved advisory configuration. (#10525)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.94.0...rust-v0.95.0

- #10340 Session picker shows thread_name if set @pap-openai
- #10381 chore: collab experimental @jif-oai
- #10231 feat: experimental flags @jif-oai
- #10382 nit: shell snapshot retention to 3 days @jif-oai
- #10383 fix: thread listing @jif-oai
- #10386 fix: Rfc3339 casting @jif-oai
- #10356 feat: add MCP protocol types and rmcp adapters @bolinfest
- #10269 Nicer highlighting of slash commands, /plan accepts prompt args and pasted images @charley-oai
- #10274 Add credits tooltip @pakrym-oai
- #10394 chore: ignore synthetic messages @jif-oai
- #10398 feat: drop sqlx logging @jif-oai
- #10281 Select experimental features with space @pakrym-oai
- #10402 feat: add `--experimental` to `generate-ts` @jif-oai
- #10258 fix: unsafe auto-approval of git commands @viyatb-oai
- #10411 Updated labeler workflow prompt to include "app" label @etraut-openai
- #10399 emit a separate metric when the user cancels UAT during elevated setup @iceweasel-oai
- #10377 chore(tui) /personalities tip @dylan-hurd-oai
- #10252 [feat] persist thread_dynamic_tools in db @celia-oai
- #10437 feat: Read personal skills from .agents/skills @gverma-openai
- #10145 make codex better at git @pash-openai
- #10418 Add `codex app` macOS launcher @aibrahim-oai
- #10447 Fix plan implementation prompt reappearing after /agent thread switch @charley-oai
- #10064 TUI: Render request_user_input results in history and simplify interrupt handling @charley-oai
- #10349 feat: replace custom mcp-types crate with equivalents from rmcp @bolinfest
- #10415 Fixed sandbox mode inconsistency if untrusted is selected @etraut-openai
- #10452 Hide short worked-for label in final separator @aibrahim-oai
- #10357 chore: remove deprecated mcp-types crate @bolinfest
- #10454 app tool tip @aibrahim-oai
- #10455 chore: add phase to message responseitem @sayan-oai
- #10414 Require models refresh on cli version mismatch @aibrahim-oai
- #10271 [Codex][CLI] Gate image inputs by model modalities @ccy-oai
- #10374 Trim compaction input @pakrym-oai
- #10453 Updated bug and feature templates @etraut-openai
- #10465 Restore status after preamble @pakrym-oai
- #10406 fix: clarify deprecation message for features.web_search @sayan-oai
- #10474 Ignore remote_compact_trims_function_call_history_to_fit_context_window on windows @pakrym-oai
- #10413 feat(linux-sandbox): vendor bubblewrap and wire it with FFI @viyatb-oai
- #10142 feat(secrets): add codex-secrets crate @viyatb-oai
- #10157 chore: nuke chat/completions API @jif-oai
- #10498 feat: drop wire_api from clients @jif-oai
- #10501 feat: clean codex-api part 1 @jif-oai
- #10508 Add more detail to 401 error @gt-oai
- #10521 Avoid redundant transactional check before inserting dynamic tools @jif-oai
- #10525 chore: update bytes crate in response to security advisory @bolinfest
- #10408 fix WebSearchAction type clash between v1 and v2 @sayan-oai
- #10404 Cleanup collaboration mode variants @charley-oai
- #10505 Enable parallel shell tools @jif-oai
- #10532 feat: `find_thread_path_by_id_str_in_subdir` from DB @jif-oai
- #10524 fix: make $PWD/.agents read-only like $PWD/.codex @bolinfest
- #10096 Inject CODEX_THREAD_ID into the terminal environment @maxj-oai
- #10536 Revert "Load untrusted rules" @viyatb-oai
- #10412 fix(app-server): fix TS annotations for optional fields on requests @owenlin0
- #10416 fix(app-server): fix approval events in review mode @owenlin0
- #10545 Improve Default mode prompt (less confusion with Plan mode) @charley-oai
- #10289 [apps] Gateway MCP should be blocking. @mzeng-openai
- #10189 implement per-workspace capability SIDs for workspace specific ACLs @iceweasel-oai
- #10548 Updated bug templates and added a new one for app @etraut-openai
- #10531 [codex] Default values from requirements if unset @gt-oai
- #10552 Fixed icon for CLI bug template @etraut-openai
- #10039 chore(arg0): advisory-lock janitor for codex tmp paths @viyatb-oai
- #10448 feat: add APIs to list and download public remote skills @xl-openai
- #10519 Handle exec shutdown on Interrupt (fixes immortal `codex exec` with websockets) @rasmusrygaard
- #10556 Feat: add upgrade to app server modelList @shijie-oai
- #10461 feat(tui): pace catch-up stream chunking with hysteresis @joshka-oai
- #10367 chore: add `codex debug app-server` tooling @celia-oai

## rust-v0.94.0 (2026-02-02T18:27:37Z)
## New Features
- Plan mode is now enabled by default with updated interaction guidance in the plan prompt. (#10313, #10308, #10329)
- Personality configuration is now stable: default is friendly, the config key is `personality`, and existing settings migrate forward. (#10305, #10314, #10310, #10307)
- Skills can be loaded from `.agents/skills`, with clearer relative-path instructions and nested-folder markers supported. (#10317, #10282, #10350)
- Console output now includes runtime metrics for easier diagnostics. (#10278)

## Bug Fixes
- Unarchiving a thread updates its timestamp so sidebar ordering refreshes. (#10280)
- Conversation rules output is capped and prefix rules are deduped to avoid repeated rules. (#10351, #10309)
- Override turn context no longer appends extra items. (#10354)

## Documentation
- Fixed a broken image link in the npm README. (#10303)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.93.0...rust-v0.94.0

- #10278 feat: show runtime metrics in console @apanasenko-oai
- #10285 display promo message in usage error @willwang-openai
- #10302 fix(nix): update flake for newer Rust toolchain requirements @douglaz
- #10296 chore(features) remove Experimental tag from UTF8 @dylan-hurd-oai
- #10303 Fix npm README image link @fouad-openai
- #10306 chore(app-server) add personality update test @dylan-hurd-oai
- #10308 plan mode prompt @aibrahim-oai
- #10305 chore(core) Default to friendly personality @dylan-hurd-oai
- #10307 feat(core,tui,app-server) personality migration @dylan-hurd-oai
- #10313 enable plan mode @aibrahim-oai
- #10120 feat: fire tracking events for skill invocation @alexsong-oai
- #10317 feat: Support loading skills from .agents/skills @gverma-openai
- #10282 Make skills prompt explicit about relative-path lookup @xl-openai
- #10316 Add websocket telemetry metrics and labels @apanasenko-oai
- #10314 chore(config) Rename config setting to personality @dylan-hurd-oai
- #10310 chore(features) Personality => Stable @dylan-hurd-oai
- #10320 Sync system skills from public repo @gverma-openai
- #10322 Sync system skills from public repo for openai yaml changes @gverma-openai
- #10323 fix(config) config schema newline @dylan-hurd-oai
- #10329 Improve plan mode interaction rules @charley-oai
- #10280 Bump thread updated_at on unarchive to refresh sidebar ordering @charley-oai
- #10350 fix: System skills marker includes nested folders recursively @gverma-openai
- #10351 fix(rules) Limit rules listed in conversation @dylan-hurd-oai
- #10354 Do not append items on override turn context @pakrym-oai
- #10309 fix(core) Deduplicate prefix_rules before appending @dylan-hurd-oai
- #10373 chore(core) gpt-5.2-codex personality template @dylan-hurd-oai
- #10375 fix(personality) prompt patch @dylan-hurd-oai
- #10371 feat: vendor app-server protocol schema fixtures @bolinfest




## rust-v0.93.0 (2026-01-31T06:59:51Z)
## New Features
- Added an optional SOCKS5 proxy listener with policy enforcement and config gating. (#9803)
- Plan mode now streams proposed plans into a dedicated TUI view, plus a feature-gated `/plan` shortcut for quick mode switching. (#9786, #10103)
- Added `/apps` to browse connectors in TUI and `$` insertion for app prompts. (#9728)
- App-server can now run in external auth mode, accepting ChatGPT auth tokens from a host app and requesting refreshes when needed. (#10012)
- Smart approvals are now enabled by default, with explicit approval prompts for MCP tool calls. (#10286, #10200)
- Introduced a SQLite-backed log database with an improved logs client, thread-id filtering, retention, and heuristic coloring. (#10086, #10087, #10150, #10151, #10229, #10228)

## Bug Fixes
- MCP tool image outputs render reliably even when image blocks aren’t first or are partially malformed. (#9815)
- Input history recall now restores local image attachments and rich text elements. (#9628)
- File search now tracks session CWD changes and supports multi-root traversal with better performance. (#9279, #9939, #10240)
- Resuming a thread no longer updates `updated_at` until the first turn actually starts. (#9950)
- Shell snapshots no longer inherit stdin, avoiding hangs from startup scripts. (#9735)
- Connections fall back to HTTP when WebSocket proxies fail. (#10139)

## Documentation
- Documented app-server AuthMode usage and behavior. (#10191)

## Chores
- Upgraded the Rust toolchain to 1.93. (#10080)
- Updated pnpm versions used in the repo. (#9992, #10161)
- Bazel build and runfiles handling improvements, including remote cache compression. (#10079, #10098, #10102, #10104)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.92.0...rust-v0.93.0

- #9988 nit: better tool description @jif-oai
- #9991 nit: better unused prompt @jif-oai
- #9994 chore: clean orchestrator prompt @jif-oai
- #10001 backend-client: add get_config_requirements_file @gt-oai
- #9992 update pnpm to 10.28.2 to address security issues @mjr-openai
- #9993 description in role type @jif-oai
- #9944 TUI footer: right-align context and degrade shortcut summary + mode cleanly @charley-oai
- #9803 feat(network-proxy): add a SOCKS5 proxy with policy enforcement @viyatb-oai
- #9950 fix(app-server, core): defer initial context write to rollout file until first turn @owenlin0
- #10003 feat: make it possible to specify --config flags in the SDK @bolinfest
- #9797 remove sandbox globals. @iceweasel-oai
- #10009 chore: introduce *Args types for new() methods @bolinfest
- #10011 really fix pwd for windows codex zip @iceweasel-oai
- #10007 Remove load from SKILL.toml fallback @alexsong-oai
- #10008 enable live web search for DangerFullAccess sandbox policy @sayan-oai
- #9815 Fix: Render MCP image outputs regardless of ordering @Kbediako
- #9654 Show OAuth error descriptions in callback responses @blevy-oai
- #10030 Clarify external editor env var message @joshka-oai
- #9949 Ask user question UI footer improvements @charley-oai
- #9359 tui: stabilize shortcut overlay snapshots on WSL @slkzgm
- #10040 fix: enable per-turn updates to web search mode @sayan-oai
- #10041 fix: allow unknown fields on Notice in schema @sayan-oai
- #9628 Restore image attachments/text elements when recalling input history (Up/Down) @charley-oai
- #9982 [skills] Auto install MCP dependencies when running skils with dependency specs. @mzeng-openai
- #9986 fix(core) info cleanup @dylan-hurd-oai
- #9941 error code/msg details for failed elevated setup @iceweasel-oai
- #9489 feat(core) RequestRule @dylan-hurd-oai
- #10026 Add exec policy TOML representation @gt-oai
- #9821 feat: codex exec auto-subscribe to new threads @jif-oai
- #10004 feat: sqlite 1 @jif-oai
- #10083 feat: sort metadata by date @jif-oai
- #10092 Update shell-tool-mcp.yml @dylan-hurd-oai
- #10079 [bazel] Enable remote cache compression @zbarsky-openai
- #10025 Refine request_user_input TUI interactions and option UX @charley-oai
- #10080 Upgrade to rust 1.93 @zbarsky-openai
- #10095 Update shell-tool-mcp.yml @dylan-hurd-oai
- #9939 file-search: improve file query perf @nornagon-openai
- #10097 chore: deprecate old web search feature flags @sayan-oai
- #10034 compaction @aibrahim-oai
- #10028 allow elevated sandbox to be enabled without base experimental flag @iceweasel-oai
- #10101 fix(ci) fix shell-tool-mcp version v2 @dylan-hurd-oai
- #10043 Added `tui.notifications_method` config option @etraut-openai
- #10104 [bazel] Fix the build @zbarsky-openai
- #10102 default enable compression, update test helpers @sayan-oai
- #10111 fix(ci) more shell-tool-mcp issues @dylan-hurd-oai
- #10115 update the ci pnpm workflow for shell-tool-mcp to use corepack for pnpm versioning @mjr-openai
- #10098 [bazel] Improve runfiles handling @zbarsky-openai
- #10129 Ensure auto-compaction starts after turn started @aibrahim-oai
- #10116 chore(config) personality as a feature @dylan-hurd-oai
- #10123 Add app-server compaction item notifications tests @aibrahim-oai
- #10114 chore(config) Update personality instructions @dylan-hurd-oai
- #10128 removing quit from dropdown menu, but not autocomplete [cli] @natea-oai
- #9728 [connectors] Support connectors part 2 - slash command and tui @mzeng-openai
- #10133 chore(core) personality under development @dylan-hurd-oai
- #10125 emit a metric when we can't spawn powershell @iceweasel-oai
- #10134 fix(tui) reorder personality command @dylan-hurd-oai
- #10135 fix(ci) missing package.json for shell-mcp-tool @dylan-hurd-oai
- #10131 fix: ignore key release events during onboarding @joshka-oai
- #10138 fix: remove references to corepack @bolinfest
- #10086 feat: add log db @jif-oai
- #10089 feat: async backfill @jif-oai
- #10087 feat: log db client @jif-oai
- #10149 chore: improve client @jif-oai
- #10161 nit: update npm @jif-oai
- #10163 [experimental] nit: try to speed up apt-install @jif-oai
- #10164 [experimental] nit: try to speed up apt-install 2 @jif-oai
- #10150 feat: adding thread ID to logs + filter in the client @jif-oai
- #10151 feat: add log retention and delete them after 90 days @jif-oai
- #10152 chore: unify log queries @jif-oai
- #10175 Add OpenAI docs MCP tooltip @joshka-oai
- #10171 feat: reduce span exposition @jif-oai
- #10139 Fall back to http when websockets fail @pakrym-oai
- #10140 chore: ensure pnpm-workspace.yaml is up-to-date @bolinfest
- #9017 Better handling skill depdenencies on ENV VAR. @xl-openai
- #10182 fix: unify `npm publish` call across shell-tool-mcp.yml and rust-release.yml @bolinfest
- #10180 Add features enable/disable subcommands @joshka-oai
- #10184 fix: /approvals -> /permissions @bolinfest
- #10179 Remove WebSocket wire format @pakrym-oai
- #10186 updating comment to better indicate intent of skipping `quit` in the main slash command menu @natea-oai
- #10118 [Codex][CLI] Show model-capacity guidance on 429 @ccy-oai
- #10012 feat(app-server): support external auth mode @owenlin0
- #10103 tui: add feature-gated /plan slash command to switch to Plan mode @charley-oai
- #10191 chore(app-server): document AuthMode @owenlin0
- #10130 [feat] persist dynamic tools in session rollout file @celia-oai
- #10181 add error messages for the go plan type @willwang-openai
- #10198 feat(tui): route employee feedback follow-ups to internal link @joshka-oai
- #10194 load from yaml @alexsong-oai
- #10147 chore(personality) new schema with fallbacks @dylan-hurd-oai
- #10200 MCP tool call approval (simplified version) @mzeng-openai
- #10154 feat: add output to `/ps` @jif-oai
- #10217 nit: actually run tests @jif-oai
- #10177 Add community links to startup tooltips @joshka-oai
- #10210 Chore: plan mode do not include free form question and always include isOther @shijie-oai
- #10218 feat: backfill timing metric @jif-oai
- #10220 chore: unify metric @jif-oai
- #8991 Conversation naming @pap-openai
- #10167 Fetch Requirements from cloud @gt-oai
- #10225 explorer prompt @jif-oai
- #10222 fix: make sure the shell exists @jif-oai
- #10232 chore: do not clean the DB anymore @jif-oai
- #10229 feat: improve logs client @jif-oai
- #10228 feat: heuristic coloring of logs @jif-oai
- #10237 nit: fix db with multiple metadata lines @jif-oai
- #10208 feat: refactor CodexAuth so invalid state cannot be represented @bolinfest
- #10212 chore(feature) Experimental: Personality @dylan-hurd-oai
- #10211 chore(feature) Experimental: Smart Approvals @dylan-hurd-oai
- #10190 Load exec policy rules from requirements @gt-oai
- #10195 plan mode: add TL;DR checkpoint and client behavior note @baumann-oai
- #10239 chore: fix the build breakage that came from a merge race @bolinfest
- #9786 Plan mode: stream proposed plans, emit plan items, and render in TUI @charley-oai
- #10063 Tui: hide Code mode footer label @charley-oai
- #10244 chore: rename ChatGpt -> Chatgpt in type names @bolinfest
- #10238 Plan mode prompt @aibrahim-oai
- #10251 Fix deploy @charley-oai
- #10255 plan prompt @aibrahim-oai
- #10253 Make plan highlight use popup grey background @charley-oai
- #10207 Skip loading codex home as project layer @daniel-oai
- #10256 Update copy @pakrym-oai
- #9735 core: prevent shell_snapshot from inheriting stdin @swordfish444
- #10262 Fix main @pakrym-oai
- #10265 Hide /approvals from the slash-command list @pakrym-oai
- #10267 Update announcement_tip.toml @pakrym-oai
- #10240 file-search: multi-root walk @nornagon-openai
- #10266 fix: dont auto-enable web_search for azure @sayan-oai
- #9279 fix: update file search directory when session CWD changes @yuvrajangadsingh
- #10249 Validate CODEX_HOME before resolving @etraut-openai
- #10272 chore: implement Mul for TruncationPolicy @bolinfest
- #10241 Wire up cloud reqs in exec, app-server @gt-oai
- #10263 Add enforce_residency to requirements @gt-oai
- #10276 add missing fields to WebSearchAction and update app-server types @sayan-oai
- #10283 Turn on cloud requirements for business too @gt-oai
- #10287 Fix minor typos in comments and documentation @ruyut
- #10286 feat(core) Smart approvals on @dylan-hurd-oai




## rust-v0.92.0 (2026-01-27T11:50:52Z)
## New Features
- API v2 threads can now inject dynamic tools at startup and route their calls/responses end-to-end through the server and core tool pipeline. (#9539)
- Added filtering on the thread list in the app server to make large thread sets easier to browse. (#9897)
- Introduced a `thread/unarchive` RPC to restore archived rollouts back into active sessions. (#9843)
- MCP servers can now define OAuth scopes in `config.toml`, reducing the need to pass `--scopes` on each login. (#9647)
- Multi-agent collaboration is more capable and safer, with an explorer role, better collab event mapping, and max-depth guardrails. (#9817, #9818, #9918, #9899)
- Cached `web_search` is now the default client behavior. (#9974)

## Bug Fixes
- Fixed a TUI deadlock/freeze under high streaming throughput by avoiding blocking sends on the main Tokio thread. (#9951)
- The `web_search` tool now handles and displays all action types, and shows in-progress activity instead of appearing stuck. (#9960)
- Reduced high CPU usage in collaboration flows by eliminating busy-waiting on subagents. (#9776)
- Fixed `codex resume --last --json` so prompts parse correctly without conflicting argument errors. (#9475)
- Windows sandbox logging now handles UTF-8 safely, preventing failures when truncating multibyte content. (#8647)
- `request_user_input` is now rejected outside Plan/Pair modes to prevent invalid tool calls. (#9955)

## Documentation
- Updated the contribution guidelines for clearer onboarding and workflow expectations. (#9933)
- Refreshed protocol/MCP docs to reflect `thread/unarchive` and the updated `request_user_input` question shape. (#9843, #9890)

## Chores
- Self-update via Homebrew now uses an explicit cask upgrade command to avoid warnings and ambiguity. (#9823)
- Release packaging now consistently writes the bundle zip to `dist/`. (#9934)
- Updated key dependencies in the Rust workspace (including `axum`, `tracing`, `globset`, and `tokio-test`). (#9880, #9882, #9883, #9884)
- Aligned feature stage naming with public maturity stages and added clearer warnings for underdevelopment features. (#9929, #9954)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.91.0...rust-v0.92.0

- #9850 chore: remove extra newline in println @SohailRaoufi
- #9868 Adjust modes masks @aibrahim-oai
- #9874 Prompt @aibrahim-oai
- #9877 Plan prompt @aibrahim-oai
- #9718 feat(tui) /personality @dylan-hurd-oai
- #9871 chore(core) move model_instructions_template config @dylan-hurd-oai
- #9539 feat: dynamic tools injection @jif-oai
- #9818 feat: rebase multi-agent tui on `config_snapshot` @jif-oai
- #9789 Fix flakey resume test @gt-oai
- #9784 Fix flakey conversation flow test @gt-oai
- #9918 feat: explorer collab @jif-oai
- #9899 feat: disable collab at max depth @jif-oai
- #9916 Fix up config disabled err msg @gt-oai
- #9890 Feat: add isOther to question returned by request user input tool @shijie-oai
- #9817 feat: codex exec mapping of collab tools @jif-oai
- #9919 Fix flakey shell snapshot test @gt-oai
- #9776 fix: attempt to reduce high cpu usage when using collab @eugeneoden
- #9928 prompt @aibrahim-oai
- #9925 chore: update interrupt message @jif-oai
- #9843 Add thread/unarchive to restore archived rollouts @charley-oai
- #9929 Aligned feature stage names with public feature maturity stages @etraut-openai
- #9934 ensure codex bundle zip is created in dist/ @iceweasel-oai
- #9897 [app-server] feat: add filtering on thread list  @jif-oai
- #9647 Add MCP server `scopes` config and use it as fallback for OAuth login @blevy-oai
- #9943 plan prompt @aibrahim-oai
- #8647 fix: handle utf-8 in windows sandbox logs @davidgilbertson
- #9891 Add composer config and shared menu surface helpers @aibrahim-oai
- #9880 chore(deps): bump tracing from 0.1.43 to 0.1.44 in /codex-rs @dependabot
- #9882 chore(deps): bump tokio-test from 0.4.4 to 0.4.5 in /codex-rs @dependabot
- #9883 chore(deps): bump axum from 0.8.4 to 0.8.8 in /codex-rs @dependabot
- #9884 chore(deps): bump globset from 0.4.16 to 0.4.18 in /codex-rs @dependabot
- #9901 fix: remove cli tooltip references to custom prompts @mattridley
- #9823 fix: use `brew upgrade --cask codex` to avoid warnings and ambiguity @JBallin
- #9951 fix: try to fix freezes 2 @jif-oai
- #9955 Reject request_user_input outside Plan/Pair @charley-oai
- #9933 Updated contribution guidelines @etraut-openai
- #9892 Reuse ChatComposer in request_user_input overlay @aibrahim-oai
- #9957 NIT larger buffer @jif-oai
- #9953 feat: load interface metadata from SKILL.json @alexsong-oai
- #9954 Warn users on enabling underdevelopment features @aibrahim-oai
- #9961 Use test_codex more @pakrym-oai
- #9960 fix: handle all web_search actions and in progress invocations @sayan-oai
- #9966 plan prompt v7 @aibrahim-oai
- #9968 Improve plan mode prompt @aibrahim-oai
- #9969 prompt final @aibrahim-oai
- #9475 Fix `resume --last` with `--json` option @etraut-openai
- #9970 prompt @aibrahim-oai
- #9975 plan prompt @aibrahim-oai
- #9974 make cached web_search client-side default @sayan-oai
- #9971 tui: wrapping user input questions @aibrahim-oai
- #9977 make plan prompt less detailed @aibrahim-oai
- #9980 Fixing main and make plan mode reasoning effort medium @aibrahim-oai
- #9759 Fix: cap aggregated exec output consistently @Kbediako




## rust-v0.91.0 (2026-01-25T17:33:33Z)
## Chores
- Reduced the maximum allowed number of sub-agents to 6 to tighten resource usage and guardrails in agent fan-out behavior (#9861)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.90.0...rust-v0.91.0

- #9861 chore: half max number of sub-agents @jif-oai




## rust-v0.90.0 (2026-01-25T16:37:37Z)
## New Features
- Added a network sandbox proxy with policy enforcement to better control outbound network access. (#8442)
- Introduced the first phase of connectors support via the app server and MCP integration, including new config/docs updates. (#9667)
- Shipped collaboration mode as beta in the TUI, with a clearer plan → execute handoff and simplified mode selection (Coding vs Plan). (#9690, #9712, #9802, #9834)
- Added ephemeral threads and improved collaboration tool provenance metadata for spawned threads. (#9765, #9769)
- WebSocket connections now support proxy configuration. (#9719)
- More strict limitation on multi-agents

## Bug Fixes
- Fixed exec policy parsing for multiline quoted arguments. (#9565)
- `--yolo` now skips the git repository check instead of failing outside a repo. (#9590)
- Improved resume reliability by handling out-of-order events and prompting for the working directory when it differs. (#9512, #9731)
- Backspace no longer deletes a text element when the cursor is at the element’s left edge. (#9630)
- Config loading errors are clearer and more actionable across surfaces. (#9746)
- Default model selection now respects filtered presets to avoid invalid defaults. (#9782)

## Documentation
- Corrected a typo in the experimental collaboration prompt template. (#9716)
- Added documentation for the new connectors configuration surface. (#9667)

## Chores
- Refreshed the bundled model catalog/presets. (#9726)
- Updated GitHub Actions for Node 24 compatibility. (#9722)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.89.0...rust-v0.90.0

- #9715 feat: fix formatting of `codex features list` @bolinfest
- #9716 Fix typo in experimental_prompt.md @iudizm
- #9719 feat: support proxy for ws connection @apanasenko-oai
- #9712 TUI: prompt to implement plan and switch to Execute @charley-oai
- #9713 use machine scope instead of user scope for dpapi. @iceweasel-oai
- #9726 Update models.json @github-actions
- #9667 [connectors] Support connectors part 1 - App server & MCP @mzeng-openai
- #9674 feat(app-server) Expose `personality` @dylan-hurd-oai
- #9733 Change the prompt for planning and reasoning effort @aibrahim-oai
- #9730 Hide mode cycle hint while a task is running @charley-oai
- #9720 feat: add session source as otel metadata tag @alexsong-oai
- #9565 Fix execpolicy parsing for multiline quoted args @jdsalasca
- #9745 chore: use some raw strings to reduce quoting @bolinfest
- #9753 nit: exclude PWD for rc sourcing @jif-oai
- #9690 feat: tui beta for collab @jif-oai
- #9116 Persist text element ranges and attached images across history/resume @charley-oai
- #9777 plan mode prompt change @aibrahim-oai
- #9590 fix(exec): skip git repo check when --yolo flag is used @zerone0x
- #9722 Upgrade GitHub Actions for Node 24 compatibility @salmanmkc
- #9611 Print warning if we skip config loading @gt-oai
- #9782 Select default model from filtered presets @aibrahim-oai
- #9512 Fix resume picker when user event appears after head @jdsalasca
- #9787 Remove stale TODO comment from defs.bzl @jcoens-openai
- #9700 still load skills @gt-oai
- #9791 Load untrusted rules @gt-oai
- #9707 bundle sandbox helper binaries in main zip, for winget. @iceweasel-oai
- #9792 Chore: remove mode from header @aibrahim-oai
- #9793 change collaboration mode to struct @aibrahim-oai
- #8442 feat: introducing a network sandbox proxy @viyatb-oai
- #9802 Have a coding mode and only show coding and plan @aibrahim-oai
- #9746 Another round of improvements for config error messages @etraut-openai
- #9812 Remove batman reference from experimental prompt @charley-oai
- #9769 feat: add thread spawn source for collab tools @jif-oai
- #9765 feat: ephemeral threads @jif-oai
- #9819 fix: libcc link @jif-oai
- #9820 fix: musl build @jif-oai
- #9316 fix(windows-sandbox): remove request files after read @MaxMiksa
- #9630 Prevent backspace from removing a text element when the cursor is at the element’s left edge @charley-oai
- #9840 Revert "fix: musl build" @aibrahim-oai
- #9778 Raise welcome animation breakpoint to 37 rows @mzeng-openai
- #9731 Ask for cwd choice when resuming session from different cwd @charley-oai
- #9841 Revert "fix: libcc link" @aibrahim-oai
- #9806 Use collaboration mode masks without mutating base settings @aibrahim-oai
- #9834 Mark collab as beta @pakrym-oai
- #9847 Revert "Revert "fix: musl build"" @jif-oai
- #9855 feat: cap number of agents @jif-oai




## rust-v0.89.0 (2026-01-22T21:35:51Z)
## New Features
- Added a `/permissions` command with a shorter approval set while keeping `/approvals` for compatibility. (#9561)
- Added a `/skill` UI to enable or disable individual skills. (#9627)
- Improved slash-command selection by prioritizing exact and prefix matches over fuzzy matches. (#9629)
- App server now supports `thread/read` and can filter archived threads in `thread/list`. (#9569, #9571)
- App server clients now support layered `config.toml` resolution and `config/read` can compute effective config from a given cwd. (#9510)
- Release artifacts now include a stable URL for the published config schema. (#9572)

## Bug Fixes
- Prevented tilde expansion from escaping HOME on paths like `~//...`. (#9621)
- TUI turn timing now resets between assistant messages so elapsed time reflects the latest response. (#9599)

## Documentation
- Updated MCP subcommand docs to match current CLI behavior. (#9622)
- Refreshed the `skills/list` protocol README example to match the latest response shape. (#9623)

## Chores
- Removed the TUI2 experiment and its related config/docs, keeping Codex on the terminal-native UI. (#9640)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.88.0...rust-v0.89.0

- #9576 [bazel] Upgrade to bazel9 @zbarsky-openai
- #9606 nit: ui on interruption @jif-oai
- #9609 chore: defensive shell snapshot @jif-oai
- #9621 fix: Fix tilde expansion to avoid absolute-path escape @tiffanycitra
- #9573 define/emit some metrics for windows sandbox setup @iceweasel-oai
- #9622 docs: fix outdated MCP subcommands documentation @htiennv
- #9623 Update skills/list protocol readme @gverma-openai
- #9616 [bazel] Upgrade llvm toolchain and enable remote repo cache @zbarsky-openai
- #9624 forgot to add some windows sandbox nux events. @iceweasel-oai
- #9633 Add websockets logging @pakrym-oai
- #9592 Chore: update plan mode output in prompt @shijie-oai
- #9583 Add collaboration_mode to TurnContextItem @charley-oai
- #9510 Add layered config.toml support to app server @etraut-openai
- #9629 feat: better sorting of shell commands @jif-oai
- #9599 fix(tui) turn timing incremental @dylan-hurd-oai
- #9572 feat: publish config schema on release @sayan-oai
- #9549 Reduce burst testing flake @charley-oai
- #9640 feat(tui): retire the tui2 experiment @joshka-oai
- #9597 feat(core) ModelInfo.model_instructions_template @dylan-hurd-oai
- #9627 Add UI for skill enable/disable. @xl-openai
- #9650 chore: tweak AGENTS.md @dylan-hurd-oai
- #9656 Add tui.experimental_mode setting @pakrym-oai
- #9561 feat(tui) /permissions flow @dylan-hurd-oai
- #9653 Fix: Lower log level for closed-channel send @Kbediako
- #9659 Chore: add cmd related info to exec approval request @shijie-oai
- #9693 Revert "feat: support proxy for ws connection" @pakrym-oai
- #9698 Support end_turn flag @pakrym-oai
- #9645 Modes label below textarea @charley-oai
- #9644 feat(core) update Personality on turn @dylan-hurd-oai
- #9569 feat(app-server): thread/read API @owenlin0
- #9571 feat(app-server): support archived threads in thread/list @owenlin0




## rust-v0.88.0 (2026-01-21T19:19:10Z)
## New Features
- Added device-code auth as a standalone fallback in headless environments. (#9333)

## Bug Fixes
- Load configs from trusted folders only and fix symlinked `config.toml` resolution. (#9533, #9445)
- Fixed Azure endpoint invalid input errors. (#9387)
- Resolved a memory leak in core runtime. (#9543)
- Prevented interrupted turns from repeating. (#9043)
- Fixed WSL TUI image paste regression. (#9473)

## Documentation
- Updated MCP documentation link to the current destination. (#9490)
- Corrected a “Multi-agents” naming typo in docs. (#9542)
- Added developer instructions for collaboration modes. (#9424)

## Chores
- Upgraded to Rust 1.92 and refreshed core Rust dependencies. (#8860, #9465, #9466, #9467, #9468, #9469)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.87.0...rust-v0.88.0

- #9373 fix: flaky tests @jif-oai
- #9333 [device-auth] Add device code auth as a standalone option when headless environment is detected. @mzeng-openai
- #9352 Made `codex exec resume --last` consistent with `codex resume --last` @etraut-openai
- #9324 add codex cloud list @nornagon-openai
- #9332 Turn-state sticky routing per turn @aibrahim-oai
- #9364 feat: tool call duration metric @jif-oai
- #8860 chore: upgrade to Rust 1.92.0 @viyatb-oai
- #9385 feat: /fork the current session instead of opening session picker @apanasenko-oai
- #9247 feat(app-server, core): return threads by created_at or updated_at @owenlin0
- #9330 feat: show forked from session id in /status @apanasenko-oai
- #9340 Introduce collaboration modes @aibrahim-oai
- #9328 Support enable/disable skill via config/api. @xl-openai
- #9408 Add collaboration_mode override to turns @aibrahim-oai
- #9400 fix(codex-api): treat invalid_prompt as non-retryable @fouad-openai
- #9401 Defer backtrack trim until rollback confirms @aibrahim-oai
- #9414 fix unified_exec::tests::unified_exec_timeouts to use a more unique match value @ahornby
- #9421 Expose collaboration presets @aibrahim-oai
- #9422 chore(core) Create instructions module @dylan-hurd-oai
- #9423 chore(instructions) Remove unread SessionMeta.instructions field @dylan-hurd-oai
- #9424 Add collaboration developer instructions @aibrahim-oai
- #9425 Preserve slash command order in search @aibrahim-oai
- #9059 tui: allow forward navigation in backtrack preview @slkzgm
- #9443 Add collaboration modes test prompts @aibrahim-oai
- #9457 fix(tui2): running /mcp was not printing any output until another event triggered a flush @bolinfest
- #9445 Fixed symlink support for config.toml @etraut-openai
- #9466 chore(deps): bump log from 0.4.28 to 0.4.29 in /codex-rs @dependabot
- #9467 chore(deps): bump tokio from 1.48.0 to 1.49.0 in /codex-rs @dependabot
- #9468 chore(deps): bump arc-swap from 1.7.1 to 1.8.0 in /codex-rs @dependabot
- #9469 chore(deps): bump ctor from 0.5.0 to 0.6.3 in /codex-rs @dependabot
- #9465 chore(deps): bump chrono from 0.4.42 to 0.4.43 in /codex-rs @dependabot
- #9473 Fixed TUI regression related to image paste in WSL @etraut-openai
- #9382 feat: timer total turn metrics @jif-oai
- #9478 feat: close all threads in `/new` @jif-oai
- #9477 feat: detach non-tty childs @jif-oai
- #9479 prompt 3 @jif-oai
- #9387 Fix invalid input error on Azure endpoint @etraut-openai
- #9463 Remove unused protocol collaboration mode prompts @aibrahim-oai
- #9487 chore: warning metric @jif-oai
- #9490 Fixed stale link to MCP documentation @etraut-openai
- #9461 TUI: collaboration mode UX + always submit `UserTurn` when enabled @aibrahim-oai
- #9472 Feat: request user input tool @shijie-oai
- #9402 Act on reasoning-included per turn @aibrahim-oai
- #9496 chore: fix beta VS experimental @jif-oai
- #9495 Feat: plan mode prompt update @shijie-oai
- #9451 tui: avoid Esc interrupt when skill popup active @prateek-oai
- #9497 Migrate tui to use UserTurn @aibrahim-oai
- #9427 fix(core) Preserve base_instructions in SessionMeta @dylan-hurd-oai
- #9393 Persist text elements through TUI input and history @charley-oai
- #9407 fix(tui) fix user message light mode background @dylan-hurd-oai
- #9525 chore: collab in experimental @jif-oai
- #9374 nit: do not render terminal interactions if no task running @jif-oai
- #9529 feat: record timer with additional tags @jif-oai
- #9528 feat: metrics on remote models @jif-oai
- #9527 feat: metrics on shell snapshot @jif-oai
- #9533 Only load config from trusted folders @gt-oai
- #9409 feat: support proxy for ws connection @apanasenko-oai
- #9507 Tui: use collaboration mode instead of model and effort @aibrahim-oai
- #9193 fix: `writable_roots` doesn't recognize home directory symbol in non-windows OS @tiffanycitra
- #9542 Fix typo in feature name from 'Mult-agents' to 'Multi-agents' @simonw
- #9459 feat(personality) introduce model_personality config @dylan-hurd-oai
- #9543 fix: memory leak issue @jif-oai
- #9509 Fixed config merging issue with profiles @etraut-openai
- #9043 fix: prevent repeating interrupted turns @swordfish444
- #9553 fix(core): don't update the file's mtime on resume @owenlin0
- #9552 lookup system SIDs instead of hardcoding English strings. @iceweasel-oai
- #9314 fix(windows-sandbox): deny .git file entries under writable roots @MaxMiksa
- #9319 fix(windows-sandbox): parse PATH list entries for audit roots @MaxMiksa
- #9547 merge remote models @aibrahim-oai
- #9545 Add total (non-partial) TextElement placeholder accessors @charley-oai
- #9532 fix(cli): add execute permission to bin/codex.js @zerone0x
- #9162 Improve UI spacing for queued messages @charley-oai
- #9554 Enable remote models @aibrahim-oai
- #9558 queue only when task is working @aibrahim-oai
- #8590 fix(core): require approval for force delete on Windows @hdcodedev
- #9293 [codex-tui] exit when terminal is dumb @jmickey-oai
- #9562 feat(tui2): add /experimental menu @joshka-oai
- #9563 fix: bminor/bash is no longer on GitHub so use bolinfest/bash instead @bolinfest
- #9568 Show session header before configuration @aibrahim-oai
- #9555 feat: rename experimental_instructions_file to model_instructions_file @bolinfest
- #9518 Prompt Expansion: Preserve Text Elements @charley-oai
- #9560 Reject ask user question tool in Execute and Custom @charley-oai
- #9575 feat: add skill injected counter metric @alexsong-oai
- #9578 Feature to auto-enable websockets transport @pakrym-oai
- #9587 fix CI by running pnpm @aibrahim-oai
- #9586 don't ask for approval for `just fix` @aibrahim-oai
- #9585 Add request-user-input overlay @aibrahim-oai
- #9596 fix going up and down on questions after writing notes @aibrahim-oai
- #9483 feat: max threads config @jif-oai
- #9598 feat: display raw command on user shell @jif-oai
- #9594 Added "codex." prefix to "conversation.turn.count" metric name @etraut-openai
- #9600 feat: async shell snapshot @jif-oai
- #9602 fix: nit tui on terminal interactions @jif-oai
- #9551 nit: better collab tui @jif-oai




## rust-v0.87.0 (2026-01-16T15:37:42Z)
## New Features
- User message metadata (text elements and byte ranges) now round-trips through protocol/app-server/core so UI annotations can survive history rebuilds. (#9331)
- Collaboration wait calls can block on multiple IDs in one request, simplifying multi-thread coordination. (#9294)
- User shell commands now run under the user snapshot so aliases and shell config are honored. (#9357)
- The TUI now surfaces approval requests from spawned/unsubscribed threads. (#9232)

## Bug Fixes
- Token estimation during compaction is now accurate, improving budgeting during long sessions. (#9337)
- MCP CallToolResult now includes `threadId` in both `content` and `structuredContent`, and returns a defined output schema for compatibility. (#9338)
- The TUI “Worked for” separator only appears after actual work has occurred. (#8958)
- Piped non-PTY commands no longer hang waiting on stdin. (#9369)

## Documentation
- MCP interface docs updated to reflect structured output schema and `threadId` behavior. (#9338)

## Chores
- Windows builds enable the PowerShell UTF-8 feature by default. (#9195)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.86.0...rust-v0.87.0

- #9331 Add text element metadata to protocol, app server, and core @charley-oai
- #9195 chore(windows) Enable Powershell UTF8 feature @dylan-hurd-oai
- #8958 fix(tui): only show 'Worked for' separator when actual work was performed @ThanhNguyxn
- #9338 fix(mcp): include threadId in both content and structuredContent in CallToolResult @bolinfest
- #9337 Fix token estimate during compaction @etraut-openai
- #9336 rename model turn to sampling request @aibrahim-oai
- #9232 feat: propagate approval request of unsubscribed threads @jif-oai
- #9357 feat: run user commands under user snapshot @jif-oai
- #9294 feat: collab wait multiple IDs @jif-oai
- #9366 feat: CODEX_CI @jif-oai
- #9367 prompt collab @jif-oai
- #9369 chore: close pipe on non-pty processes @jif-oai




## rust-v0.86.0 (2026-01-16T01:18:52Z)
## New Features
- Skill metadata can now be defined in `SKILL.toml` (names, descriptions, icons, brand color, default prompt) and surfaced in the app server and TUI (#9125)
- Clients can explicitly disable web search and signal eligibility via a header to align with server-side rollout controls (#9249)

## Bug Fixes
- Accepting an MCP elicitation now sends an empty JSON payload instead of null to satisfy servers expecting content (#9196)
- Input prompt placeholder styling is back to non-italic to avoid terminal rendering issues (#9307)
- Empty paste events no longer trigger clipboard image reads (#9318)
- Unified exec cleans up background processes to prevent late End events after listeners stop (#9304)

## Chores
- Refresh the orchestrator prompt to improve internal routing behavior (#9301)
- Reduce noisy `needs_follow_up` error logging (#9272)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.85.0...rust-v0.86.0

- #9301 chore: better orchestrator prompt @jif-oai
- #9304 nit: clean unified exec background processes @jif-oai
- #9307 Revert recent styling change for input prompt placeholder text @etraut-openai
- #9125 Support SKILL.toml file. @xl-openai
- #9249 [search] allow explicitly disabling web search @sayan-oai
- #9272 remove needs_follow_up error log @pap-openai
- #9318 Revert empty paste image handling @aibrahim-oai
- #9196 fix: send non-null content on elicitation Accept @yuvrajangadsingh




## rust-v0.85.0 (2026-01-15T18:38:22Z)
## New Features
- App-server v2 now emits collaboration tool calls as item events in the turn stream, so clients can render agent coordination in real time. (#9213)
- Collaboration tools gained richer agent control: `spawn_agent` accepts an agent role preset, and `send_input` can optionally interrupt a running agent before delivering the message. (#9275, #9276)
- `/models` metadata now includes upgrade migration markdown so clients can display richer guidance when suggesting model upgrades. (#9219)

## Bug Fixes
- [revert] Linux sandboxing now falls back to Landlock-only restrictions when user namespaces are unavailable, and sets `no_new_privs` before applying sandbox rules. (#9250)
- `codex resume --last` now respects the current working directory, with `--all` as an explicit override. (#9245)
- Stdin prompt decoding now handles BOMs/UTF-16 and provides clearer errors for invalid encodings. (#9151)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.84.0...rust-v0.85.0

- #9219 Add `migration_markdown` in `model_info` @aibrahim-oai
- #9250 fix: fallback to Landlock-only when user namespaces unavailable and set PR_SET_NO_NEW_PRIVS early @viyatb-oai
- #9213 feat: collab tools app-server event mapping @jif-oai
- #9275 feat: add agent roles to collab tools @jif-oai
- #9276 feat: add interrupt capabilities to `send_input` @jif-oai
- #9209 feat: basic tui for event emission @jif-oai
- #9245 Changed `codex resume --last` to honor the current cwd @etraut-openai
- #9207 Propagate MCP disabled reason @gt-oai
- #9151 fix(exec): improve stdin prompt decoding @liqiongyu
- #9300 revert: remove pre-Landlock bind mounts apply @viyatb-oai




## rust-v0.84.0 (2026-01-15T01:29:12Z)
## New Features
- Extend the Rust protocol/types to include additional metadata on text elements, enabling richer client rendering and schema evolution (#9235)

## Chores
- Reduce flaky Rust release pipelines (notably on Windows) by increasing the release build job timeout (#9242)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.83.0...rust-v0.84.0

- #9242 fix: increase timeout for release builds from 30 to 60 minutes @bolinfest
- #9235 Add text element metadata to types @charley-oai




## rust-v0.81.0 (2026-01-14T18:12:36Z)
## New Features
- Default API model moved to gpt-5.2-codex. (#9188)
- The `codex` tool in `codex mcp-server` now includes the `threadId` in the response so it can be used with the `codex-reply` tool, fixing #3712. The documentation has been updated at https://developers.openai.com/codex/guides/agents-sdk/. (#9192)
- Headless runs now switch to device-code login automatically so sign-in works without a browser. (#8756)
- Linux sandbox can mount paths read-only to better protect files from writes. (#9112)
- Support partial tool calls rendering in `tui`

## Bug Fixes
- Alternate-screen handling now avoids breaking Zellij scrollback and adds a config/flag to control it. (#8555)
- Windows correctly prompts before unsafe commands when running with a read-only sandbox policy. (#9117)
- Config.toml and rules parsing errors are reported to app-server clients/TUI instead of failing silently. (#9182, #9011)
- Worked around a macOS system-configuration crash in proxy discovery. (#8954)
- Invalid user image uploads now surface an error instead of being silently replaced. (#9146)

## Documentation
- Published a generated JSON Schema for `config.toml` in `docs/` to validate configs. (#8956)
- Documented the TUI paste-burst state machine for terminals without reliable bracketed paste. (#9020)

## Chores
- Added Bazel build support plus a `just bazel-codex` helper for contributors. (#8875, #9177)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.80.0...rust-v0.81.0

- #8756 [device-auth] When headless environment is detected, show device login flow instead. @mzeng-openai
- #8930 feat: first pass on clb tool @jif-oai
- #8966 nit: rename session metric @jif-oai
- #8969 chore: non mutable btree when building specs @jif-oai
- #8968 chore: move otel provider outside of trace module @jif-oai
- #8973 chore: add mcp call metric @jif-oai
- #8970 chore: add approval metric @jif-oai
- #8975 chore: metrics tool call @jif-oai
- #8901 chore: update metrics temporality @jif-oai
- #8954 Work around crash in system-configuration library @etraut-openai
- #8873 fix(app-server): set originator header from initialize JSON-RPC request @owenlin0
- #8909 Add config to disable /feedback @gt-oai
- #8985 chore: nuke telemetry file @jif-oai
- #8986 Revert "fix(app-server): set originator header from initialize JSON-RPC request" @jif-oai
- #8978 nit: rename to analytics_enabled @jif-oai
- #8963 renaming: task to turn @jif-oai
- #8555 fix: add tui.alternate_screen config and --no-alt-screen CLI flag for Zellij scrollback @hjanuschka
- #8875 feat: add support for building with Bazel @zbarsky-openai
- #8988 fix(app-server): set originator header from initialize (re-revert) @owenlin0
- #8766 fix: harden arg0 helper PATH handling @viyatb-oai
- #8949 Log unhandled sse events @pakrym-oai
- #8996 Add hierarchical agent prompt @pakrym-oai
- #9003 Delete announcement_tip.toml @pakrym-oai
- #8940 Refactor remote models tests to use TestCodex builder @aibrahim-oai
- #8981 Add model provider info to /status if non-default @gt-oai
- #8984 Add URL to responses error messages @gt-oai
- #9008 fix: add .git to .bazelignore @bolinfest
- #9010 fix: include AGENTS.md as repo root marker for integration tests @bolinfest
- #8950 Label attached images so agent can understand in-message labels @charley-oai
- #9032 Revert "Delete announcement_tip.toml" @jif-oai
- #9018 fix: support remote arm64 builds, as well @zbarsky-openai
- #8983 feat: testing harness for collab 1 @jif-oai
- #9088 feat: add wait tool implementation for collab @jif-oai
- #9090 feat: add close tool implementation for collab @jif-oai
- #8971 add static mcp callback uri support @WhammyLeaf
- #9099 nit: add docstring @jif-oai
- #8994 feat: wire fork to codex cli @apanasenko-oai
- #9071 chore(deps): bump tui-scrollbar from 0.2.1 to 0.2.2 in /codex-rs @dependabot
- #9072 chore(deps): bump ts-rs from 11.0.1 to 11.1.0 in /codex-rs @dependabot
- #9074 chore(deps): bump which from 6.0.3 to 8.0.0 in /codex-rs @dependabot
- #9075 chore(deps): bump clap from 4.5.53 to 4.5.54 in /codex-rs @dependabot
- #9076 chore(deps): bump tokio-util from 0.7.16 to 0.7.18 in /codex-rs @dependabot
- #8957 feat: hot reload mcp servers @shijie-oai
- #9107 Remove unused conversation_id header @pakrym-oai
- #9080 Add some tests for image attachments @charley-oai
- #9114 Extract single responses SSE event parsing @pakrym-oai
- #8961 Assemble sandbox/approval/network prompts dynamically @aibrahim-oai
- #9102 Add model client sessions @pakrym-oai
- #8246 fix(tui): show in-flight coalesced tool calls in transcript overlay @Chriss4123
- #9127 Reuse websocket connection @pakrym-oai
- #9117 fix: prompt for unsafe commands on Windows @bolinfest
- #9128 Websocket append support @pakrym-oai
- #9077 Send message by default mid turn. queue messages by tab @aibrahim-oai
- #9049 Handle image paste from empty paste events @aibrahim-oai
- #8952 Use markdown for migration screen @aibrahim-oai
- #9109 Updated heuristic for tool call summary to detect file modifications @etraut-openai
- #9138 Show tab queue hint in footer @aibrahim-oai
- #9140 Use thread rollback for Esc backtrack @aibrahim-oai
- #9143 chore: better error handling on collab tools @jif-oai
- #9147 nit: collab send input cleaning @jif-oai
- #9129 Support response.done and add integration tests @pakrym-oai
- #8798 ollama: default to Responses API for built-ins @drifkin
- #8956 add generated jsonschema for config.toml @sayan-oai
- #9122 Fix queued messages during /review @charley-oai
- #9126 fix: drop session span at end of the session @apanasenko-oai
- #9101 Restrict MCP servers from `requirements.toml` @gt-oai
- #9020 fix(tui): document paste-burst state machine @joshka-oai
- #9118 feat(app-server): add an --analytics-default-enabled flag @owenlin0
- #9130 Fresh tooltips @mzeng-openai
- #9134 fix(windows-sandbox-rs) bump SETUP_VERSION @dylan-hurd-oai
- #9121 test(tui): add deterministic paste-burst tests @joshka-oai
- #8661 Fix spinner/Esc interrupt when MCP startup completes mid-turn @2mawi2
- #9165 Allow close skill popup with esc. @xl-openai
- #9169 Fix flakiness in WebSocket tests @pakrym-oai
- #9011 fix: report an appropriate error in the TUI for malformed rules @bolinfest
- #9166 fix: integration test for #9011 @bolinfest
- #9177 feat: add bazel-codex entry to justfile @bolinfest
- #9175 WebSocket test server script @pakrym-oai
- #9136 Update models.json @github-actions
- #9168 clean models manager @aibrahim-oai
- #8933 [CODEX-4427] improve parsed commands @aibrahim-oai
- #9174 Renew cache ttl on etag match @aibrahim-oai
- #9124 fix(tui): harden paste-burst state transitions @joshka-oai
- #9186 Use offline cache for tui migrations @aibrahim-oai
- #9182 Improve handling of config and rules errors for app server clients @etraut-openai
- #8997 chore: clarify default shell for unified_exec @sayan-oai
- #9192 feat: add threadId to MCP server messages @bolinfest
- #9188 change api default model @aibrahim-oai
- #9150 feat: add sourcing of rc files to shell snapshot @jif-oai
- #9155 fix: shell snapshot clean-up @jif-oai
- #9146 feat: return an error if the image sent by the user is a bad image @jif-oai
- #9197 feat: only source shell snapshot if the file exists @jif-oai
- #9145 fix: drop double waiting header in TUI @jif-oai
- #9194 Render exec output deltas inline @aibrahim-oai
- #9156 chore: clamp min yield time for empty write_stdin @jif-oai
- #9105 feat: add auto refresh on thread listeners @jif-oai
- #9112 feat: add support for read-only bind mounts in the linux sandbox @viyatb-oai
- #9179 Use current model for review @pakrym-oai




## rust-v0.80.0 (2026-01-09T19:48:15Z)
## New Features
- Add conversation/thread fork endpoints in the protocol and app server so clients can branch a session into a new thread. (#8866)
- Expose requirements via `requirement/list` so clients can read `requirements.toml` and adjust agent-mode UX. (#8800)
- Introduce metrics capabilities with additional counters for observability. (#8318, #8910)
- Add elevated sandbox onboarding with prompts for upgrade/degraded mode plus the `/elevate-sandbox` command. (#8789)
- Allow explicit skill invocations through v2 API user input. (#8864)

## Bug Fixes
- Codex CLI subprocesses again inherit env vars like `LD_LIBRARY_PATH`/`DYLD_LIBRARY_PATH` to avoid runtime issues. As explained in #8945, failure to pass along these environment variables to subprocesses that expect them (notably GPU-related ones), was causing 10x+ performance regressions! Special thanks to @johnzfitch for the detailed investigation and write-up in #8945. (#8951)
- `/review <instructions>` in TUI/TUI2 now launches the review flow instead of sending plain text. (#8823)
- Patch approval “allow this session” now sticks for previously approved files. (#8451)
- Model upgrade prompt now appears even if the current model is hidden from the picker. (#8802)
- Windows paste handling now supports non-ASCII multiline input reliably. Special thanks to @occurrent laying the groundwork for this fix in #8021! (#8774)
- Git apply path parsing now handles quoted/escaped paths and `/dev/null` correctly to avoid misclassified changes. (#8824)

## Documentation
- App-server README now documents skills support and usage. (#8853)
- Skill-creator docs clarify YAML frontmatter formatting and quoting rules. (#8610)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.79.0...rust-v0.80.0

- #8734 fix: do not propose to add multiline commands to execpolicy @tibo-openai
- #8802 Enable model upgrade popup even when selected model is no longer in picker @charley-oai
- #8805 chore: stabilize core tool parallelism test @tibo-openai
- #8820 chore: silent just fmt @jif-oai
- #8824 fix: parse git apply paths correctly @tibo-openai
- #8823 fix: handle /review arguments in TUI @tibo-openai
- #8822 chore: rename unified exec sessions @jif-oai
- #8825 fix: handle early codex exec exit @tibo-openai
- #8830 chore: unify conversation with thread name @jif-oai
- #8840 Move tests below auth manager @pakrym-oai
- #8845 fix: upgrade lru crate to 0.16.3 @bolinfest
- #8763 Merge Modelfamily into modelinfo @aibrahim-oai
- #8842 remove unnecessary todos @aibrahim-oai
- #8846 Stop using AuthManager as the source of codex_home @pakrym-oai
- #8844 Fix app-server `write_models_cache` to treat models with less priority number as higher priority.  @aibrahim-oai
- #8850 chore: drop useless feature flags @jif-oai
- #8848 chore: drop some deprecated @jif-oai
- #8853 [chore] update app server doc with skills @celia-oai
- #8451 fix: implement 'Allow this session' for apply_patch approvals @owenlin0
- #8856 Override truncation policy at model info level @aibrahim-oai
- #8849 Simplify error managment in `run_turn` @aibrahim-oai
- #8767 Add feature for optional request compression @cconger
- #8610 Clarify YAML frontmatter formatting in skill-creator @darlingm
- #8847 Warn in /model if BASE_URL set @gt-oai
- #8801 Support symlink for skills discovery. @xl-openai
- #8800 Feat: appServer.requirementList for requirement.toml @shijie-oai
- #8861 fix: update resource path resolution logic so it works with Bazel @bolinfest
- #8868 fix: use tokio for I/O in an async function @bolinfest
- #8867 add footer note to TUI @iceweasel-oai
- #8879 feat: introduce find_resource! macro that works with Cargo or Bazel @bolinfest
- #8864 Support UserInput::Skill in V2 API. @xl-openai
- #8876 add ability to disable input temporarily in the TUI. @iceweasel-oai
- #8884 fix: make the find_resource! macro responsible for the absolutize() call @bolinfest
- #8774 fix: windows can now paste non-ascii multiline text @dylan-hurd-oai, @occurrent
- #8855 chore: add list thread ids on manager @jif-oai
- #8318 feat: metrics capabilities @jif-oai
- #8826 fix: stabilize list_dir pagination order @tibo-openai
- #8892 chore: drop metrics exporter config @jif-oai
- #8896 chore: align error limit comment @tibo-openai
- #8899 fix: include project instructions in /review subagent @tibo-openai
- #8894 chore: add small debug client @jif-oai
- #8888 fix: leverage find_resource! macro in load_sse_fixture_with_id @bolinfest
- #8691 Avoid setpgid for inherited stdio on macOS @seeekr
- #8887 fix: leverage codex_utils_cargo_bin() in codex-rs/core/tests/suite @bolinfest
- #8907 chore: drop useless interaction_input @jif-oai
- #8903 nit: drop unused function call error @jif-oai
- #8910 feat: add a few metrics @jif-oai
- #8911 gitignore bazel-* @zbarsky-openai
- #8843 config requirements: improve requirement error messages @gt-oai
- #8914 fix: reduce duplicate include_str!() calls @bolinfest
- #8902 feat: add list loaded threads to app server @jif-oai
- #8870 [fix] app server flaky thread/resume tests @celia-oai
- #8916 clean: all history cloning @jif-oai
- #8915 otel test: retry WouldBlock errors @gt-oai
- #8792 Update models.json @github-actions
- #8897 fix: preserve core env vars on Windows @tibo-openai
- #8913 Add `read-only` when backfilling requirements from managed_config @gt-oai
- #8926 add tooltip hint for shell commands (!) @fps7806
- #8857 Immutable CodexAuth @pakrym-oai
- #8927 nit: parse_arguments @jif-oai
- #8932 fix: increase timeout for tests that have been flaking with timeout issues @bolinfest
- #8931 fix: correct login shell mismatch in the accept_elicitation_for_prompt_rule() test @bolinfest
- #8874 [fix] app server flaky send_messages test @celia-oai
- #8866 feat: fork conversation/thread @apanasenko-oai
- #8858 remove `get_responses_requests` and `get_responses_request_bodies` to use in-place matcher @aibrahim-oai
- #8939 [chore] move app server tests from chat completion to responses @celia-oai
- #8880 Attempt to reload auth as a step in 401 recovery @pakrym-oai
- #8946 fix: increase timeout for wait_for_event() for Bazel @bolinfest
- #8789 Elevated sandbox NUX @iceweasel-oai
- #8917 fix: treat null MCP resource args as empty @tibo-openai
- #8942 Add 5s timeout to models list call + integration test @aibrahim-oai
- #8951 fix: remove existing process hardening from Codex CLI @bolinfest




## rust-v0.79.0 (2026-01-07T00:56:03Z)
## New Features
- Add multi-conversation “agent control” so a session can spawn or message other conversations programmatically (#8783, #8788)
- Add app-server `thread/rollback` so IDE clients can undo the last N turns without rewriting history (#8454)
- Add `web_search_cached` to enable cached-only Web Search results as a safer alternative to live requests (#8795)
- Allow global exec flags (model/json/sandbox toggles, etc.) to be passed after `codex exec resume` (#8440)
- Show time/version-targeted announcement tips in the TUI, driven by a TOML file in the repo (#8752)
- Add an `[analytics] enabled=...` config section to control analytics behavior (#8350)

## Bug Fixes
- Fix TUI2 transcripts so streamed markdown reflows on resize and copy/paste preserves soft wraps (#8761)
- Make `apply_patch` parsing tolerant of whitespace-padded `*** Begin Patch` / `*** End Patch` markers (#8746)
- Render paths relative to the current working directory before checking git roots, improving output in non-git workspaces (#8771)
- Prevent `CODEX_MANAGED_CONFIG_PATH` from overriding managed config in production, closing a policy bypass (#8762)
- Ensure app-server conversations respect the config passed in by the client (#8765)
- Reduce TUI UX glitches: suppress popups when browsing input history, fix copy “pill” rendering, and clear background terminals on interrupt (#8772, #8777, #8786)

## Documentation
- Clarify onboarding/login guidance for headless/remote setups by steering users to `codex login --device-auth` (#8753)
- Update model examples used in tooling/config to current `gpt-5.2` naming (#8566)

## Chores
- Refactor skills discovery to use the config layer stack so all configured skill folders are considered (#8497)
- Auto-populate GitHub release notes at release creation time (#8799)
- Add more `apply_patch` test scenarios to harden coverage (#8230)
- Tweak unified exec event emission to only send “begin” when a PTY is present (#8780)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.78.0...rust-v0.79.0

- #8753 [device-auth] Update login instruction for headless environments. @mzeng-openai
- #8497 Use ConfigLayerStack for skills discovery. @xl-openai
- #8440 Allow global exec flags after `resume` and fix CI codex build/timeout @fjord-oai
- #8230 chore(apply-patch) additional scenarios @dylan-hurd-oai
- #8746 fix: accept whitespace-padded patch markers @tibo-openai
- #8761 tui2: stop baking streaming wraps; reflow agent markdown @joshka-oai
- #8771 fix: render cwd-relative paths in tui @joshka-oai
- #8770 fix: fix readiness subscribe token wrap-around @tibo-openai
- #8780 chore: emit unified exec begin only when PTY exist @jif-oai
- #8762 fix: stop honoring CODEX_MANAGED_CONFIG_PATH environment variable in production @bolinfest
- #8566 fix: update model examples to gpt-5.2 @seuros
- #8735 feat: add head-tail buffer for `unified_exec` @jif-oai
- #8331 chore: add model/list call to app-server-test-client @owenlin0
- #8752 feat: forced tool tips @jif-oai
- #8786 chore: clear background terminals on interrupt @jif-oai
- #8350 feat: add analytics config setting @JaviSoto
- #8783 feat: agent controller @jif-oai
- #8772 suppress popups while browsing input history @xl-openai
- #8777 Clear copy pill background and add snapshot test @joshka-oai
- #8788 feat: drop agent bus and store the agent status in codex directly @jif-oai
- #8454 feat(app-server): thread/rollback API @owenlin0
- #8765 [app-server] fix config loading for conversations @celia-oai
- #8795 add web_search_cached flag @sayan-oai
- #8799 fix: populate the release notes when the release is created @bolinfest




## rust-v0.78.0 (2026-01-06T18:47:47Z)
## New Features
- Add `Ctrl+G` to open the current prompt in your configured external editor (`$VISUAL`/`$EDITOR`) and sync edits back into the TUI. (#7606)
- Support project-aware config layering: load repo-local `.codex/config.toml`, honor configurable `project_root_markers`, and merge that with system config like `/etc/codex/config.toml`. (#8354, #8359, #8461)
- Support enterprise-managed configuration requirements on macOS via an MDM-provided TOML payload. (#8743)
- Improve `tui2` transcript navigation with multi-click selection, a copy shortcut/affordance, and a draggable auto-hiding scrollbar. (#8462, #8471, #8728)
- Start Windows PowerShell sessions in UTF-8 mode to reduce encoding-related prompt/output issues. (#7902)
- Exec policy rules can now include human-readable justifications, and policy loading follows the unified config-layer stack. (#8349, #8453, #8751)

## Bug Fixes
- Fix failures when the model returns multiple tool calls in a single turn by emitting tool calls in the format the Chat Completions API expects. (#8556)
- Make `/review` compute diffs from the session’s working directory so base-branch detection works correctly with runtime cwd overrides. (#8738)
- Handle the legacy Chat Completions streaming terminator cleanly to avoid spurious SSE parse errors. (#8708)
- Fix a set of `tui2` rendering/input edge cases (screen corruption, scroll stickiness, and selection/copy correctness). (#8463, #8695, #8449)
- Improve diagnostics when `ripgrep` download fails during CLI packaging so failures are easier to debug. (#8486)
- Avoid a panic when parsing alpha/stable version strings. (#8406)

## Documentation
- Replace and de-duplicate user docs with links to the developer documentation site (including skills docs). (#8662, #8407)
- Clarify configuration documentation, including the `developer_instructions` option. (#8376, #8701)
- Fix broken README links. (#8682)

## Chores
- Performance tuning for TUIs: cap redraw scheduling and reduce unnecessary rerenders during streaming to lower CPU usage. (#8499, #8681, #8693)
- Update Rust dependencies across `codex-rs`. (#8414, #8596, #8597)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.77.0...rust-v0.78.0

- #8407 Point skills docs to developer documentation site @etraut-openai
- #8406 fix: do not panic on alphas @aibrahim-oai
- #8091 Update ghost_commit flag reference to undo @charlie-openai
- #8423 test(tui2): re-enable ANSI for VT100 tests @joshka-oai
- #8419 fix(tui2): constrain transcript mouse selection bounds @joshka-oai
- #8424 chore: un-ship undo @jif-oai
- #8376 docs: add `developer_instructions` config option and update descriptions @448523760
- #8431 chore: drop undo from the docs @jif-oai
- #8410 chore(deps): bump peter-evans/create-pull-request from 7 to 8 @dependabot
- #8412 chore(deps): bump test-log from 0.2.18 to 0.2.19 in /codex-rs @dependabot
- #8413 chore(deps): bump landlock from 0.4.2 to 0.4.4 in /codex-rs @dependabot
- #8414 chore(deps): bump clap from 4.5.47 to 4.5.53 in /codex-rs @dependabot
- #8416 chore(deps): bump openssl-sys from 0.9.109 to 0.9.111 in /codex-rs @dependabot
- #7902 feat(windows) start powershell in utf-8 mode @dylan-hurd-oai
- #8349 Add ExecPolicyManager @pakrym-oai
- #8354 feat: support in-repo .codex/config.toml entries as sources of config info @bolinfest
- #8359 feat: add support for project_root_markers in config.toml @bolinfest
- #8395 Handle concatenation nodes in bash command parser for exec policy @ivanmurashko
- #8446 Update models.json @github-actions
- #8444 use a junction for the cwd while read ACLs are being applied @iceweasel-oai
- #8447 remove minimal client version  @aibrahim-oai
- #8448 chore: add ConfigLayerStack as a field of Config @bolinfest
- #7606 feat: open prompt in configured external editor @sayan-oai
- #8449 fix(tui2): copy transcript selection outside viewport @joshka-oai
- #8418 chore(tui): include tracing targets in file logs @joshka-oai
- #8456 chore: include User layer in ConfigLayerStack even if config.toml is empty @bolinfest
- #8453 feat: load ExecPolicyManager from ConfigLayerStack @bolinfest
- #8462 feat(tui2): add copy selection shortcut + UI affordance @joshka-oai
- #8461 feat: honor /etc/codex/config.toml @bolinfest
- #8463 fix(tui2): fix screen corruption @joshka-oai
- #8458 chore: save more about turn context in rollout log file @apanasenko-oai
- #8466 fix(tui2): start transcript selection on drag @joshka-oai
- #8293 [tui] add optional details to TUI status header @sayan-oai
- #8471 feat(tui2): add multi-click transcript selection @joshka-oai
- #8486 fix(codex-cli): improve ripgrep download diagnostics @joshka-oai
- #8460 fix: limit output size for exec command in unified exec @shijie-oai
- #8493 fix: fix test that was writing temp file to cwd instead of TMPDIR @bolinfest
- #8484 Remove reasoning format @aibrahim-oai
- #8499 perf(tui): cap redraw scheduling to 60fps @joshka-oai
- #8496 feat: introduce codex-utils-cargo-bin as an alternative to assert_cmd::Command @bolinfest
- #8498 fix: declare test path relative to `$CARGO_MANIFEST_DIR` @bolinfest
- #8307 [chore] add additional_details to StreamErrorEvent + wire through @sayan-oai
- #8522 fix: restrict windows-sys to Windows target @RunjiLiu
- #8595 chore(deps): bump toml_edit from 0.23.7 to 0.24.0+spec-1.1.0 in /codex-rs @dependabot
- #8596 chore(deps): bump tracing-subscriber from 0.3.20 to 0.3.22 in /codex-rs @dependabot
- #8597 chore(deps): bump tokio from 1.47.1 to 1.48.0 in /codex-rs @dependabot
- #8598 chore(deps): bump regex-lite from 0.1.7 to 0.1.8 in /codex-rs @dependabot
- #8491 Refresh on models etag mismatch @aibrahim-oai
- #8483 use a SandboxUsers group for ACLs instead of granting to each sandbox user separately @iceweasel-oai
- #8676 Log compaction request bodies @pakrym-oai
- #8488 Remove model family from tui @aibrahim-oai
- #8662 Replaced user documentation with links to developers docs site @etraut-openai
- #8681 perf(tui2): reduce unnecessary redraws @joshka-oai
- #8682 Fixed broken link in README @etraut-openai
- #8677 Account for last token count on resume @aibrahim-oai
- #8687 hard disable remote models refresh when feature is disabled @aibrahim-oai
- #8415 chore(deps): bump tracing-opentelemetry from 0.31.0 to 0.32.0 in /codex-rs @dependabot
- #8688 Attach more tags to feedback submissions @pakrym-oai
- #8701 chore: update outdated docs @tibo-openai
- #8693 perf(tui2): cache transcript view rendering @joshka-oai
- #8697 fix: brighten transcript copy affordance @joshka-oai
- #8629 ci: prevent workflows from running on forks @leezenn
- #8695 fix(tui2): avoid scroll stickiness at cell boundaries @joshka-oai
- #8716 fix(tui2): render copy pill at viewport bottom @joshka-oai
- #8718 tui2: copy selection dismisses highlight @joshka-oai
- #8721 chore(deps): bump clap_complete from 4.5.57 to 4.5.64 in /codex-rs @dependabot
- #8723 chore(deps): bump tokio-stream from 0.1.17 to 0.1.18 in /codex-rs @dependabot
- #8724 chore(deps): bump derive_more from 2.0.1 to 2.1.1 in /codex-rs @dependabot
- #8725 chore(deps): bump insta from 1.44.3 to 1.46.0 in /codex-rs @dependabot
- #8556 fix: chat multiple tool calls @jif-oai
- #8738 fix: /review to respect session cwd @tibo-openai
- #8694 [MCP] Sanitize MCP tool names to ensure they are compatible with the Responses APO @gpeal
- #8728 feat(tui2): transcript scrollbar (auto-hide + drag) @joshka-oai
- #8708 fix(codex-api): handle Chat Completions DONE sentinel @joshka-oai
- #8743 (MacOS) Load config requirements from MDM @gt-oai
- #8377 feat: expose outputSchema to user_turn/turn_start app_server API @apanasenko-oai
- #8747 chore: GH pager @jif-oai
- #8686 better idempotency for creating/updating firewall rules during setup. @iceweasel-oai
- #8683 never let sandbox write to .codex/ or .codex/.sandbox/ @iceweasel-oai
- #8459 chore: improve skills render section @gverma-openai
- #7858 Use issuer URL in device auth prompt link @abrar71
- #8492 best effort to "hide" Sandbox users @iceweasel-oai
- #8751 feat: add justification arg to prefix_rule() in *.rules @bolinfest

## rust-v0.77.0 (2025-12-21T05:37:01Z)
  ## New Features
  - TUI2: Normalize mouse wheel + trackpad scrolling across terminals; add `tui.scroll_*` config settings (PR #8357)
  - Add `allowed_sandbox_modes` to `requirements.toml` to constrain permitted sandbox modes (PR #8298)
  - MCP: OAuth login for streamable HTTP MCP servers no longer requires the `rmcp_client` feature flag (PR #8087)
  - Improve fuzzy file search display/consistency by centralizing file-name derivation in `codex-file-search` (PR #8334)
  - Update bundled model metadata (`models.json`) (PR #8168)

  ## Bug Fixes
  - Fix `/undo` interacting destructively with git staging / ghost commits (PR #8303)
  - TUI2: Reduce redundant redraws while scrolling transcripts (PR #8295)
  - Docs: Fix link to `contributing.md` in `experimental.md` (PR #8311)

  Full Changelog: https://github.com/openai/codex/compare/rust-v0.76.0...rust-v0.77.0

  Changelog (PRs merged in this tag range)

  - #8374 Remove plan from system skills: https://github.com/openai/codex/pull/8374
  - #8357 TUI2 scroll normalization + config knobs: https://github.com/openai/codex/pull/8357
  - #8353 Thread config loading now receives cwd (internal plumbing): https://github.com/openai/codex/pull/8353
  - #8346 Rename “OpenAI models” to “models manager” (internal refactor): https://github.com/openai/codex/pull/8346
  - #8345 Bump cargo-deny-action version (CI): https://github.com/openai/codex/pull/8345
  - #8334 Move file-name derivation into codex-file-search: https://github.com/openai/codex/pull/8334
  - #8333 Enable resume_warning suite module (test coverage / wiring fix): https://github.com/openai/codex/pull/8333
  - #8330 Make ConstraintError an enum (more structured errors): https://github.com/openai/codex/pull/8330
  - #8303 Fix /undo staging interaction: https://github.com/openai/codex/pull/8303
  - #8298 Add allowed_sandbox_modes in requirements.toml: https://github.com/openai/codex/pull/8298
  - #8295 Coalesce transcript scroll redraws (TUI2 performance): https://github.com/openai/codex/pull/8295
  - #8168 Update models.json: https://github.com/openai/codex/pull/8168
  - #8087 Remove rmcp_client feature flag usage (no longer needed for OAuth login): https://github.com/openai/codex/pull/8087
  - #8311 Fix docs link in experimental.md: https://github.com/openai/codex/pull/8311

## rust-v0.76.0 (2025-12-19T18:55:54Z)
  ### New Features

  - Add a macOS DMG build target (PR #8207)
  - Improve terminal detection metadata for per-terminal scroll tuning (PR #8252)
  - UI tweaks on the skills popup (PR #8250)
  - TUI search cell rendering improvements (PR #8273)
  - Add /ps command (PR #8279)
  - Add support for /etc/codex/requirements.toml on UNIX (PR #8277)
  - Support shortDescription for skills (PR #8278, PR #8301)
  - Add model list UI (PR #8286)
  - Add app-server v2 deprecation notice event (PR #8285)
  - Introduce ExternalSandbox policy (PR #8290)
  - Skills default on (PR #8297)
  - Support admin-scoped skills (PR #8296)
  - Update bundled system skills (PR #8253, PR #8328)
  - Set exclude default to true in app server (PR #8281)

  ### Bug Fixes

  - Ensure pipes work in restricted sandbox tokens (PR #8280)
  - Grant read ACL to the command-runner directory earlier (PR #8275)
  - Fix duplicate shell_snapshot FeatureSpec regression (PR #8274)
  - Fix sandbox-state update ordering by switching to request (PR #8142)

  ### PRs Merged

  - #8328 Update system skills from OSS repo
  - #8325 Revert "Keep skills feature flag default OFF for windows."
  - #8308 Keep skills feature flag default OFF for windows.
  - #8305 Fix admin skills.
  - #8301 Add short descriptions to system skills
  - #8299 Fix tests
  - #8297 skills feature default on.
  - #8296 Support admin scope skills.
  - #8290 feat: introduce ExternalSandbox policy
  - #8288 chore: upgrade rmcp crate from 0.10.0 to 0.12.0
  - #8286 model list
  - #8285 feat(app-server): add v2 deprecation notice
  - #8282 fix: flaky tests 5
  - #8281 Set exclude to true by default in app server
  - #8280 add a default dacl to restricted token to enable reading of pipes
  - #8279 feat: add /ps
  - #8278 Support skills shortDescription.
  - #8277 feat: add support for /etc/codex/requirements.toml on UNIX
  - #8276 chore: migrate from Config::load_from_base_config_with_overrides to ConfigBuilder
  - #8275 grant read ACL to exe directory first so we can call the command runner
  - #8274 fix: remove duplicate shell_snapshot FeatureSpec
  - #8273 tui: improve rendering of search cell
  - #8271 use mainline version as baseline in ci
  - #8257 feat: collapse "waiting" of unified_exec
  - #8253 Update system skills bundled with codex-rs
  - #8252 Terminal Detection Metadata for Per-Terminal Scroll Scaling
  - #8250 UI tweaks on skills popup.
  - #8207 [release] Add a dmg target for MacOS
  - #8142 fix: change codex/sandbox-state/update from a notification to a request

## rust-v0.75.0 (2025-12-18T19:29:04Z)
### PRs Merged
#8270 — splash screen
#8251 — migrate to new constraint-based loading strategy
#7460 — cloud: default to current branch in cloud exec

## rust-v0.74.0 (2025-12-18T18:08:47Z)
### Highlights
- Introducing gpt-5.2-codex our latest frontier model with improvements across knowledge, reasoning and coding. [Learn more](https://openai.com/index/introducing-gpt-5-2-codex)
- Add new slash command `/experimental` for trying out `experimental` features
- Ghost snapshot warning disable toggle (#8178)
- UI polish (background terminals, picker cleanup) (#8255, #8232).

### PRs Merged
- #8266 feat: add name to beta features
- #8265 caribou
- #8264 docs: clarify codex resume --all (CWD column & filtering)
- #8255 nit: ui background terminals
- #8249 chore: prefer AsRef<Path> to &Path
- #8248 chore: simplify loading of Mac-specific logic in config_loader
- #8244 Reintroduce feature flags for skills.
- #8243 Make loading malformed skills fail-open
- #8235 fix: introduce ConfigBuilder
- #8232 chores: clean picker
- #8228 Show migration link
- #8226 chore: cleanup Config instantiation codepaths
- #8221 Change “Team” to “Buisness” and add Education
- #8220 Support SYSTEM skills.
- #8216 speed and reliability improvements for setting reads ACLs
- #8209 feat: model picker
- #8205 fix: PathBuf -> AbsolutePathBuf in ConfigToml struct
- #8203 download new windows binaries when staging npm package
- #8201 chore: add beta features
- #8199 chore: move back stuff out of beta program
- #8198 feat: make list_models non-blocking
- #8196 fix: session downgrade
- #8194 fix: proper skills dir cleanup
- #8186 nit: doc
- #8182 nit: drop dead branch with unified_exec tool
- #8181 nit: prevent race in event rendering
- #8178 feat: add config to disable warnings around ghost snapshot
- #8175 fix: flaky test 6
- #8163 fix the models script
- #8153 Load models from static file
- #8152 [app-server] add new RawResponseItem v2 event
- #8151 chore: update listMcpServerStatus to be non-blocking
- #8149 Add user_agent header
- #8141 chore(apply-patch) unicode scenario
- #8140 include new windows binaries in npm package.
- #8127 Revert “chore: review in read-only (#7593)”
- #8124 fix tui2 compile error
- #8122 docs: refine tui2 viewport roadmap
- #8118 Add a workflow for a hardcoded version of models
- #8117 feat: unified exec footer
- #8114 chore: update listMcpServers to listMcpServerStatus
- #8111 chore(apply-patch) move invocation tests
- #8109 Revert “feat: unified exec footer”
- #8108 feat(sdk): add xhigh reasoning effort support to TypeScript SDK
- #8102 Upgrade GitHub Actions for Node 24 compatibility
- #8098 Add public skills + improve repo skill discovery and error UX
- #8095 feat: change ConfigLayerName into a disjoint union rather than a simple enum
- #8094 bug fixes and perf improvements for elevated sandbox setup
- #8089 refactor(tui2): make transcript line metadata explicit
- #8088 feat: if .codex is a sub-folder of a writable root, then make it read-only to the sandbox
- #8086 chore(app-server): remove stubbed thread/compact API
- #8085 chore: mac codesign refactor
- #8084 chore(ci): drop Homebrew origin/main workaround for macOS runners
- #8079 docs: fix gpt-5.2 typo in config.md
- #8077 better name for windows sandbox features
- #8075 feat: fallback unified_exec to shell_command
- #8071 feat: experimental menu
- #8067 feat: unified exec footer
- #8060 feat: do not compact on last user turn
- #8057 chore: dedup review result duplication
- #8053 nit: trace span for regular task
- #8052 feat: close unified_exec at end of turn
- #8020 Fixes mcp elicitation test that fails for me when run locally
- #8004 Fix: Detect Bun global install via path check
- #8000 Fixed resume matching to respect case insensitivity when using WSL mount points
- #7997 feat: merge remote models instead of destructing
- #7969 Fix: Skip Option<()> schema generation to avoid invalid Windows filenames (#7479)
- #7961 refactor TUI event loop to enable dropping + recreating crossterm event stream
- #7956 fix parallel tool calls
- #7935 exec-server: additional context for errors
- #7931 chore: persist comments in edit
- #7791 chore(shell_command) fix freeform timeout output
- #7778 feat: Constrain values for approval_policy
- #7601 WIP: Rework TUI viewport, history printing, and selection/copy

## rust-v0.73.0 (2025-12-15T22:38:50Z)
  ## New Features
  - Add ghost snapshot v2 for improved session capture (PR #8055)
  - Support ghost commits in config (PR #7873)
  - Reimplement skills loading via SkillsManager and skills/list for consistent discovery (PR
  #7914)
  - Add OpenTelemetry tracing for Codex (PR #7844)

  ## Bug Fixes
  - Prevent panic when session contains a tool call without an output (PR #8048)
  - Avoid triggering keybindings view on input bursts (PR #7980)
  - Change default wrap algorithm from OptimalFit to FirstFit (PR #7960)
  - Introduce AbsolutePathBuf as part of sandbox config (PR #7856)
  - Include Error in log messages (PR #7955)

  ## PRs Merged
  - #8076 stage new windows sandbox binaries as artifacts
  - #8069 Fixed formatting issue
  - #8066 Update config.md
  - #8055 feat: ghost snapshot v2
  - #7873 feat: config ghost commits
  - #7980 fix: Don't trigger keybindings view on input burst
  - #8045 chore(deps): bump lru from 0.12.5 to 0.16.2 in /codex-rs
  - #8043 chore(deps): bump sentry from 0.34.0 to 0.46.0 in /codex-rs
  - #8039 chore(deps): bump actions/cache from 4 to 5
  - #8037 chore(deps): bump actions/download-artifact from 4 to 7
  - #8048 Do not panic when session contains a tool call without an output
  - #8046 chore(deps): bump socket2 from 0.6.0 to 0.6.1 in /codex-rs
  - #8038 chore(deps): bump actions/upload-artifact from 5 to 6
  - #8047 chore: fix tooltip typos and align tone
  - #8024 docs: document enabling experimental skills
  - #7914 Reimplement skills loading using SkillsManager + skills/list op.
  - #7962 docs: update the docs for @openai/codex-shell-tool-mcp
  - #7960 Changed default wrap algorithm from OptimalFit to FirstFit
  - #7965 Sync tui2 with tui and keep dual-run glue
  - #7844 [codex] add otel tracing
  - #7957 docs: remove blanket ban on unsigned integers
  - #7955 fix: include Error in log message
  - #7954 fix: added test helpers for platform-specific paths
  - #7856 fix: introduce AbsolutePathBuf as part of sandbox config

## rust-v0.72.0 (2025-12-13T01:22:42Z)
  # Highlights
  - Config API cleanup (#7924): new config API and cleaner config loading flow.
  - Remote compact for API-key users (#7835): enable remote compacting in key-based sessions.
  - MCP and TUI status visibility (#7828, #7907): restore MCP startup progress messages in the TUI and use latest disk values
  for server status.
  - Windows and PowerShell quality-of-life (#7607, #7893, #7942, #7137): locate pwsh/powershell reliably, parse PowerShell with
  PowerShell, sign additional Windows executables, and fix WSL2 toasts.
  - Sandbox and safety updates (#7809, #7889, #7728): Elevated Sandbox 3/4 plus expanded safe command list.
  - Model/prompt UX for gpt-5.2 (#7934, #7910, #7874, #7911): prompt updates and clearer xhigh reasoning warnings/docs.

  # PRs Merged
  - fix cargo build switch #7948 @[iceweasel-oai]
  - fix: restore MCP startup progress messages in TUI (fixes #7827) #7828 @[ivanmurashko]
  - support 1p #7945 @[aibrahim-oai]
  - Sign two additional exes for Windows #7942 @[iceweasel-oai]
  - fix: use PowerShell to parse PowerShell #7607 @[bolinfest]
  - chore(prompt) Update base prompt #7943 @[dylan-hurd-oai]
  - Elevated Sandbox 4 #7889 @[iceweasel-oai]
  - chore(prompt) Remove truncation details #7941 @[dylan-hurd-oai]
  - feat: clean config loading and config api #7924 @[jif-oai]
  - chores: models manager #7937 @[aibrahim-oai]
  - Remote compact for API-key users #7835 @[pakrym-oai]
  - chore(gpt-5.2) prompt update #7934 @[dylan-hurd-oai]
  - fix: race on rx subscription #7921 @[jif-oai]
  - fix: break tui #7876 @[jif-oai]
  - feat: more safe commands #7728 @[jif-oai]
  - fix(tui): show xhigh reasoning warning for gpt-5.2 #7910 @[voctory]
  - Make skill name and description limit based on characters not byte counts #7915 @[etraut-openai]
  - feat: introduce utilities for locating pwsh.exe and powershell.exe #7893 @[bolinfest]
  - docs: clarify xhigh reasoning effort on gpt-5.2 #7911 @[voctory]
  - feat: use latest disk value for mcp servers status #7907 @[shijie-oai]
  - Revert "fix(apply-patch): preserve CRLF line endings on Windows" #7903 @[dylan-hurd-oai]
  - Make migration screen dynamic #7896 @[aibrahim-oai]
  - Fix misleading 'maximize' high effort description on xhigh models #7874 @[voctory]
  - Added deprecation notice for "chat" wire_api #7897 @[etraut-openai]
  - Fix toasts on Windows under WSL 2 #7137 @[dank-openai]
  - fix: policy/*.codexpolicy -> rules/*.rules #7888 @[bolinfest]
  - Update RMCP client config guidance #7895 @[nornagon-openai]
  - Update Model Info #7853 @[aibrahim-oai]
  - Elevated Sandbox 3 #7809 @[iceweasel-oai]
  - remove release script #7885 @[aibrahim-oai]
  - Chore: limit find family visability #7891 @[aibrahim-oai]
  - fix: omit reasoning summary when ReasoningSummary::None #7845 @[apanasenko-oai]
  - fix: drop stale filedescriptor output hash for nix #7865 @[tyleranton]
  - fix: dont quit on 'q' in onboarding ApiKeyEntry state #7869 @[sayan-oai]

## rust-v0.71.0 (2025-12-11T18:36:44Z)
### Highlights
- Introducing gpt-5.2 our latest frontier model with improvements across knowledge, reasoning and coding. [Learn More](https://openai.com/index/introducing-gpt-5-2/)
### PRs Merged
#7838 Show the default model in model picker @aibrahim-oai
#7833 feat(tui2): copy tui crate and normalize snapshots @joshka-oai
#7509 fix: thread/list returning fewer than the requested amount due to filtering CXA-293 @JaviSoto
#7832 fix: ensure accept_elicitation_for_prompt_rule() test passes locally @bolinfest
#7847 fixing typo in execpolicy docs @zhao-oai
#7831 [app-server] make app server not throw error when login id is not found @celia-oai
#7848 fix: add a hopefully-temporary sleep to reduce test flakiness @bolinfest
#7850 [app-server] Update readme to include mcp endpoints @celia-oai
#7851 fix: remove inaccurate #[allow(dead_code)] marker @bolinfest
#7859 Fixed regression that broke fuzzy matching for slash commands @etraut-openai
#7854 Only show Worked for after the final assistant message @pakrym-oai
#7792 Elevated Sandbox 2 @iceweasel-oai
#7855 fix(stuff) @dylan-hurd-oai
#7870 feat: warning for long snapshots @jif-oai
#7786 feat: add shell snapshot for shell command @jif-oai
#7875 fix: flaky tests 4 @jif-oai
#7882 feat: robin @aibrahim-oai
#7884 Revert “Only show Worked for after the final assistant message” @pakrym-oai

## rust-v0.69.0 (2025-12-10T22:28:39Z)
  ### Highlights

  - Skills: Explicit skill selections now inject SKILL.md content into the turn; skills load once per session and warn if a file
    can’t be read (#7763).
  - Config API: config/read is fully typed; config writes preserve comments/order; model is optional to match real configs (#7658,
    #7789, #7769).
  - TUI/UX: Log files drop ANSI codes; vim navigation for option selection and transcript pager; transcript continuity fix; slash-
    command popup no longer triggers on invalid input; experimental tui2 frontend behind a flag (#7836, #7784, #7550, #7363,
    #7704, #7793).
  - Exec & sandbox: Shell snapshotting, reworked unified-exec events, elevated sandbox allowances (sendmsg/recvmsg), clearer rate-
    limit warnings, better request-id logging, and safer escalations (#7641, #7775, #7788, #7779, #7795, #7830, #7750).
  - Platform/auth/build: MCP in-session login, remote-branch review support, Windows signing toggles, ConPty vendoring, Nix hash
    fixes, and safer release guardrails (#7751, #7813, #7757/#7804/#7806, #7656, #7762, #7834).
  - Misc fixes: Unsupported images error cleanly, absolute config paths, parallel test stability, duplicated feature spec removal,
    experimental-model prompt/tools, and more (#7478, #7796, #7589, #7818, #7826, #7823, #7765).

  ### PRs Merged

  - #7836 Disable ansi codes in TUI log file
  - #7834 Error when trying to push a release while another release is in progress
  - #7830 Remove conversation_id and bring back request ID logging
  - #7826 fix: flaky tests 3
  - #7823 fix: remove duplicated parallel FeatureSpec
  - #7818 fix: flaky test 2
  - #7817 fix: Upgrade @modelcontextprotocol/sdk to ^1.24.0
  - #7813 feat: use remote branch for review is local trails
  - #7807 chore: disable trusted signing pkg cache hit
  - #7806 Revert "Revert "feat: windows codesign with Azure trusted signing""
  - #7804 Revert "feat: windows codesign with Azure trusted signing"
  - #7799 Removed experimental "command risk assessment" feature
  - #7797 parse rg | head a search
  - #7796 fix: introduce AbsolutePathBuf and resolve relative paths in config.toml
  - #7795 Express rate limit warning as % remaining
  - #7793 feat(tui2): add feature-flagged tui2 frontend
  - #7789 [app-server] Preserve comments & order in config writes
  - #7788 Elevated Sandbox 1
  - #7787 fix more typos in execpolicy.md
  - #7784 Add vim-style navigation for CLI option selection
  - #7779 allow sendmsg/recvmsg syscalls in Linux sandbox
  - #7775 chore: rework unified exec events
  - #7769 make model optional in config
  - #7765 Use codex-max prompt/tools for experimental models
  - #7763 Inject SKILL.md when it’s explicitly mentioned
  - #7762 Fix Nix cargo output hashes for rmcp and filedescriptor
  - #7757 Revert "Revert "feat: windows codesign with Azure trusted signing""
  - #7756 Vendor ConPtySystem
  - #7751 feat: support mcp in-session login
  - #7750 refactor with_escalated_permissions to use SandboxPermissions
  - #7704 fix: Prevent slash command popup from activating on invalid inputs
  - #7658 [app-server-protocol] Add types for config
  - #7641 feat: shell snapshotting
  - #7589 chore: enable parallel tc
  - #7550 Add vim navigation keys to transcript pager
  - #7478 Fix: gracefully error out for unsupported images
  - #7363 Fix transcript pager page continuity
  - #7779 allow sendmsg/recvmsg syscalls in Linux sandbox (already listed; ensure single entry)
  - #7788 Elevated Sandbox 1 (already listed)
  - #7784 Add vim-style navigation for CLI option selection (already listed)
  - #7807/7806/7804 Windows signing toggles (grouped above)

## rust-v0.66.0 (2025-12-09T03:37:53Z)
### Highlights

 - Execpolicy: TUI can whitelist command prefixes after an approval, sandbox denials propose an amendment you can accept, shell MCP now runs execpolicy so MCP tools follow the same rules, and
    fallback checks inspect each pipeline segment so unsafe tails (e.g., | rm -rf) are still caught (#7033, #7543, #7609, #7653, #7544).
  - Unified exec & shell stability: status line shows clearer progress, Windows unified-exec crash fixed, long commands wrap without breaking layout, and SSE/session cleanup reduces stuck or
    dangling sessions after tool calls (#7563, #7620, #7655, #7594, #7592).
  - TUI updates: cross-platform shortcut handling is consistent (Ctrl+N/P and list selection now work everywhere), so navigation matches between overlays, lists, and text areas (#7583, #7629).
  - Apply-patch: Windows CRLF line endings are preserved, new e2e scenarios cover more patch shapes, and Windows-specific test coverage reduces regressions in patch flows (#7515, #7567, #7554). Thanks to @cnaples79 who contributed the [core part](https://github.com/openai/codex/pull/4017) of this fix!
  - Cloud exec: codex cloud exec accepts --branch for remote runs and now exposes status/diff/apply flows so you can inspect and apply changes from the cloud path (#7602, #7614).
  - Signing: Linux artifacts are signed via sigstore. (#7674).
  - General fixes: parallel tool-call chat now returns correctly, ghost snapshot tokens aren’t billed, missing tool names no longer crash the litellm proxy, and migration prompts use HTTPS links
    (#7634, #7638, #7724, #7705).


### PRs Merged

  - #6793 FIX: WSL Paste image does not work @Waxime64
  - #6846 feat(core) Add login to shell_command tool @dylan-hurd-oai
  - #6918 Add Enterprise plan to ChatGPT login description @ae-openai
  - #7033 whitelist command prefix integration in core and tui @zhao-oai
  - #7310 Inline response recording and remove process_items indirection @aibrahim-oai
  - #7515 fix(apply-patch): preserve CRLF line endings on Windows @dylan-hurd-oai
  - #7543 execpolicy tui flow @zhao-oai
  - #7544 Refactor execpolicy fallback evaluation @zhao-oai
  - #7547 Use shared check sandboxing @pakrym-oai
  - #7554 chore(core): test apply_patch_cli on Windows @dylan-hurd-oai
  - #7561 Do not emit start/end events for write stdin @pakrym-oai
  - #7563 Slightly better status display for unified exec @pakrym-oai
  - #7567 chore(apply-patch) scenarios for e2e testing @dylan-hurd-oai
  - #7571 remove model_family from `config @aibrahim-oai
  - #7580 feat: update sandbox policy to allow TTY @jif-oai
  - #7583 Fix handle_shortcut_overlay_key for cross-platform consistency @448523760
  - #7588 chore: default warning messages to true @jif-oai
  - #7591 chore: tool tip for /prompt @jif-oai
  - #7592 fix: release session ID when not used @jif-oai
  - #7593 chore: review in read-only @jif-oai
  - #7594 fix: sse for chat @jif-oai
  - #7595 Update execpolicy.md @zhao-oai
  - #7602 add --branch to codex cloud exec @nornagon-openai
  - #7603 Add models endpoint @aibrahim-oai
  - #7605 fix(app-server): add duration_ms to McpToolCallItem @owenlin0
  - #7609 feat: exec policy integration in shell mcp @zhao-oai
  - #7610 fix: taking plan type from usage endpoint instead of thru auth token @zhao-oai
  - #7611 fix(app-server): add will_retry to ErrorNotification @owenlin0
  - #7614 cloud: status, diff, apply @nornagon-openai
  - #7615 chore: refactor to move Arc<RwLock> concern outside exec_policy_for @bolinfest
  - #7616 Call models endpoint in models manager @aibrahim-oai
  - #7617 fix: add integration tests for codex-exec-mcp-server with execpolicy @bolinfest
  - #7620 Fix unified_exec on windows @pakrym
  - #7621 Wire with_remote_overrides to construct model families @aibrahim-oai
  - #7626 fix typo @zhao-oai
  - #7629 fix(tui): add missing Ctrl+n/Ctrl+p support to ListSelectionView @pppp606
  - #7634 fix: chat completion with parallel tool call @jif-oai
  - #7638 fix: ignore ghost snapshots in token consumption @jif-oai
  - #7645 Also load skills from repo root. @xl-openai
  - #7648 Add remote models feature flag @aibrahim-oai
  - #7651 fix: OTEL HTTP exporter panic and mTLS support @asm89
  - #7652 Move justfile to repository root @joshka-oai
  - #7653 proposing execpolicy amendment when prompting due to sandbox denial @zhao-oai
  - #7654 fix: exec-server stream was erroring for large requests @bolinfest
  - #7655 fix wrap behavior for long commands @zhao-oai
  - #7660 Restore status header after stream recovery @joshka-oai
  - #7665 docs: fix documentation of rmcp client flag @JaySabva
  - #7669 fix(doc): TOML otel exporter example — multi-line inline table is invalid @448523760
  - #7672 docs: Remove experimental_use_rmcp_client from config @JaySabva
  - #7673 docs: point dev checks to just @voctory
  - #7674 feat: linux codesign with sigstore @shijie-oai
  - #7675 feat: windows codesign with Azure trusted signing @shijie-oai
  - #7678 fix: clear out space on ubuntu runners before running Rust tests @bolinfest
  - #7680 fix: ensure macOS CI runners for Rust tests include recent Homebrew fixes @bolinfest
  - #7685 fix: refine the warning message and docs for deprecated tools config @gameofby
  - #7705 fix: update URLs to use HTTPS in model migration prompts @rakleed
  - #7709 Enhance model picker @aibrahim-oai
  - #7711 Add formatting client version to the x.x.x style. @aibrahim-oai
  - #7713 chore(deps): bump ts-rs from 11.0.1 to 11.1.0 in /codex-rs @dependabot[bot]
  - #7714 chore(deps): bump derive_more from 2.0.1 to 2.1.0 in /codex-rs @dependabot[bot]
  - #7715 chore(deps): bump insta from 1.43.2 to 1.44.3 in /codex-rs @dependabot[bot]
  - #7716 chore(deps): bump wildmatch from 2.5.0 to 2.6.1 in /codex-rs @dependabot[bot]
  - #7722 load models from disk and set a ttl and etag @aibrahim-oai
  - #7724 Fixed regression for chat endpoint; missing tools name caused litellm proxy to crash @etraut-openai
  - #7729 feat: add is-mutating detection for shell command handler @jif-oai
  - #7745 Make the device auth instructions more clear. @mzeng-openai
  - #7747 updating app server types to support execpoilcy amendment @zhao-oai
  - #7748 Remove legacy ModelInfo and merge it with ModelFamily @aibrahim-oai
  - #7749 fix: pre-main hardening logic must tolerate non-UTF-8 env vars @bolinfest
  - #7753 Revert "feat: windows codesign with Azure trusted signing" @shijie-oai
  - #7754 override instructions using ModelInfo @aibrahim-oai
  - #7756 use chatgpt provider for /models @aibrahim-oai

## rust-v0.65.0 (2025-12-04T18:23:17Z)
### Highlights
- Codex Max as default (#7566): Codex Max is now the default model, and a TUI panic related to async-in-sync code was fixed.
- Better resume UX (#7302, #7303): Added a /resume slash command and improved resume performance so picking work back up is snappier.
- Tooltips & tips UX (#7557, #7440): Tips/tooltips are rendered via markdown with a bold “Tip” label and richer Codex tooltips across the app.
- TUI quality-of-life (#7530, #7448, #7514, #7461): TUI gets Ctrl‑P/N navigation, screen-line-capped shell output, restored Windows clipboard image paste, and a refactor for cleaner layout.
- History and context hygiene (#6242, #7483, #7545, #7431, #7483): history.jsonl is trimmed by history.max_bytes, common junk dirs (incl. __pycache__) are ignored by default, and paste placeholders stay distinct.

# PRs Merged
- use markdown for rendering tips #7557 @[Jeremy Rose]  
- Migrate codex max #7566 @[Ahmed Ibrahim]  
- Remove test from #7481 that doesn't add much value #7558 @[Eric Traut]  
- [app-server] make `file_path` for config optional #7560 @[Celia Chen]  
- Migrate model family to models manager #7565 @[Ahmed Ibrahim]  
- Migrate `tui` to use models manager #7555 @[Ahmed Ibrahim]  
- Introduce `ModelsManager` and migrate `app-server` to use it. #7552 @[Ahmed Ibrahim]  
- fix: wrap long exec lines in transcript overlay #7481 @[muyuanjin]  
- fix: Features should be immutable over the lifetime of a session/thread #7540 @[Michael Bolin]  
- feat: Support listing and selecting skills via $ or /skills #7506 @[xl-openai]  
- [app-server] fix: add thread_id to turn/plan/updated #7553 @[Owen Lin]  
- feat(tui): map Ctrl-P/N to arrow navigation in textarea #7530 @[Aofei Sheng]  
- fix(tui): limit user shell output by screen lines #7448 @[muyuanjin]  
- Migrate model preset #7542 @[Ahmed Ibrahim]  
- fix: main #7546 @[jif-oai]  
- feat: add pycache to excluded directories #7545 @[jif-oai]  
- chore: update unified exec sandboxing detection #7541 @[jif-oai]  
- add slash resume #7302 @[Ahmed Ibrahim]  
- chore: conversation_id -> thread_id in app-server feedback/upload #7538 @[Owen Lin]  
- chore: delete unused TodoList item from app-server #7537 @[Owen Lin]  
- chore: update app-server README #7510 @[Owen Lin]  
- chore: remove bun env var detect #7534 @[Shijie Rao]  
- feat: support list mcp servers in app server #7505 @[Shijie Rao]  
- seatbelt: allow openpty() #7507 @[Jeremy Rose]  
- feat: codex tool tips #7440 @[jif-oai]  
- feat: retroactive image placeholder to prevent poisoning #6774 @[jif-oai]  
- feat: model warning in case of apply patch #7494 @[jif-oai]  
- fix(tui) Support image paste from clipboard on native Windows #7514 @[Dylan Hurd]  
- fix(unified_exec): use platform default shell when unified_exec shell… #7486 @[Robby He]  
- Update device code auth strings. #7498 @[Matthew Zeng]  
- fix: inline function marked as dead code #7508 @[Michael Bolin]  
- improve resume performance #7303 @[Ahmed Ibrahim]  
- fix: path resolution bug in npx #7134 @[Michael Bolin]  
- Ensure duplicate-length paste placeholders stay distinct #7431 @[Joshua Sutton]  
- feat: support --version flag for @openai/codex-shell-tool-mcp #7504 @[Michael Bolin]  
- refactor: tui.rs extract several pieces #7461 @[Josh McKinney]  
- chore: make create_approval_requirement_for_command an async fn #7501 @[Michael Bolin]  
- Trim `history.jsonl` when `history.max_bytes` is set #6242 @[liam]  
- fix: remove serde(flatten) annotation for TurnError #7499 @[Owen Lin]  
- persisting credits if new snapshot does not contain credit info #7490 @[zhao-oai]  
- fix: drop lock once it is no longer needed #7500 @[Michael Bolin]  
- execpolicy helpers #7032 @[zhao-oai]  
- Show token used when context window is unknown #7497 @[Ahmed Ibrahim]  
- Use non-blocking mutex #7467 @[Ahmed Ibrahim]  
- Fix: track only untracked paths in ghost snapshots #7470 @[lionel-oai]  
- feat: ignore standard directories #7483 @[jif-oai]  
- fix: add ts number annotations for app-server v2 types #7492 @[Owen Lin]  
- feat: intercept apply_patch for unified_exec #7446 @[jif-oai]  
- chore: remove mention of experimental/unstable from app-server README #7474 @[Owen Lin]  
- Add request logging back #7471 @[pakrym-oai]  
- feat: add one off commands to app-server v2 #7452 @[jif-oai]  
- feat: add warning message for the model #7445 @[jif-oai]  
- chore: review everywhere #7444 @[jif-oai]  
- feat: alias compaction #7442 @[jif-oai]  
- feat: experimental support for skills.md #7412 @[Thibault Sottiaux]

## rust-v0.64.0 (2025-12-02T22:15:06Z)
## Features

  - Threads and turns now include git info, current working directory, CLI version, source metadata, and propagate thread and turn IDs on every item and error. They emit new notifications for diffs, plan updates, token-usage changes, and compaction events. File-change items provide output deltas, and ImageView items render images inline.
  - Review flow is enhanced with a detached review mode, explicit enter and exit events, review thread IDs, and review history remains visible after rollout filtering changes.
  - Execution gains an experimental “exp” model, unified exec pruning to limit session bloat, per-run custom environment injection, policy-approved command bypass, and Windows protections that flag risky browser or URL launches. History lookup now works on Windows and WSL, and model selection honors use_model.
  - Safety defaults improve via consolidated world-writable scanning and workspace-write enforcement of read-only .git directories. Sandbox assessment and approval flows align with trust policies.
  - MCP and shell tooling add shell-tool MCP login support, explicit capability declaration, sandbox awareness, publication to npm, and MCP elicitations. The rmcp client is upgraded to 0.10.0 for modern notifications.
  - Observability increases as command items expose process IDs and threads and turns emit token-usage and compaction events. Feedback metadata captures source information.
  - Tooling and ops gain follow-up v2 in the app-server test client, new config management utilities, and refreshed approvals documentation and quickstart placement.

 ## Bug fixes

  - PowerShell apply_patch parsing is corrected, and apply_patch tests now cover shell_command behavior.
  - Sandbox assessment regression is fixed, policy-approved commands are honored, dangerous-command checks are tightened on Windows, and workspace-write enforces .git read-only.
  - MCP startup tolerates missing type fields, stream error messages are clarified, and rmcp nix output hash issues are resolved.
  - Delegate cancellation no longer hangs unified exec, early-exit sessions are cleaned up, and duplicate “waited” renderings are suppressed.
  - recent_commits with limit zero now returns zero, and the NetBSD process-hardening build is unblocked.
  - Review rollout filtering is disabled so history shows, approval presets respect workspace-write, /approvals trust detection is corrected, and sandbox command assessment edge cases are fixed.
  - Compaction accounts for encrypted reasoning, handles token budgets accurately, and emits reliable token-usage and compaction events.
  - TTY stdin is required, WSL clipboard paths are normalized, and stale conversations are dropped on /new to avoid conflicts.
  - Custom prompt expansion with large pastes is fixed, example-config mistakes are corrected, and relative links and streamable_shell references are cleaned up. Upgrade messaging is corrected.
  - Windows sandbox treats <workspace_root>/.git as read-only, and risky browser launches are flagged before execution.
  - CLA allowlist now includes dependabot variants, and enterprises can skip upgrade checks and messages.
  - Flaky tests are stabilized, session recycling is improved, and rollout session initialization surfaces errors for diagnosis.

 ## Maintenance

  - Security and CI add cargo-audit and cargo-deny. GitHub Actions are updated to checkout v6 and upload-artifact v5. macOS 13 builds are dropped. A flaky Ubuntu variant is skipped. The next_minor_version script now resets the patch number correctly.
  - Dependencies are updated: libc 0.2.177, webbrowser 1.0.6, regex 1.12.2, toml_edit 0.23.5, arboard 3.6.1, serde_with 3.16.1, image 0.25.9, reqwest 0.12.24, tracing 0.1.43, and rmcp 0.10.0.
  - Documentation is refreshed: approvals and config guidance, codex max and xhigh defaults, example-config fixes, CLA guidance, and removal of streamable_shell references.

## PRs Merged

  - fix(scripts) next_minor_version should reset patch number by @dylan-hurd-oai in #7050
  - [app-server] feat: expose gitInfo/cwd/etc. on Thread by @owenlin0 in #7060
  - feat: Add exp model to experiment with the tools by @aibrahim-oai in #7115
  - enable unified exec for experiments by @aibrahim-oai in #7118
  - [app-server] doc: approvals by @owenlin0 in #7105
  - Windows: flag some invocations that launch browsers/URLs as dangerous by @iceweasel-oai in #7111
  - Use use_model by @pakrym-oai in #7121
  - feat: support login as an option on shell-tool-mcp by @bolinfest in #7120
  - fix(tui): Fail when stdin is not a terminal by @joshka-oai in #6382
  - support MCP elicitations by @nornagon-openai in #6947
  - refactor: inline sandbox type lookup in process_exec_tool_call by @bolinfest in #7122
  - bypass sandbox for policy approved commands by @zhao-oai in #7110
  - fix: start publishing @openai/codex-shell-tool-mcp to npm by @bolinfest in #7123
  - feat: declare server capability in shell-tool-mcp by @bolinfest in #7112
  - move execpolicy quickstart by @zhao-oai in #7127
  - Account for encrypted reasoning for auto compaction by @aibrahim-oai in #7113
  - chore: use proxy for encrypted summary by @jif-oai in #7252
  - fix: codex delegate cancellation by @jif-oai in #7092
  - feat: unified exec basic pruning strategy by @jif-oai in #7239
  - consolidate world-writable-directories scanning. by @iceweasel-oai in #7234
  - fix: flaky test by @jif-oai in #7257
  - [feedback] Add source info into feedback metadata. by @mzeng-openai in #7140
  - fix(windows) support apply_patch parsing in powershell by @dylan-hurd-oai in #7221
  - chore(deps): bump regex from 1.11.1 to 1.12.2 in /codex-rs by @dependabot[bot] in #7222
  - chore(deps): bump toml_edit from 0.23.4 to 0.23.5 in /codex-rs by @dependabot[bot] in #7223
  - chore(deps): bump actions/upload-artifact from 4 to 5 by @dependabot[bot] in #7229
  - chore(deps): bump actions/checkout from 5 to 6 by @dependabot[bot] in #7230
  - fix: Fix build process-hardening build on NetBSD by @0-wiz-0 in #7238
  - Removed streamable_shell from docs by @etraut-openai in #7235
  - chore(deps): bump libc from 0.2.175 to 0.2.177 in /codex-rs by @dependabot[bot] in #7224
  - chore(deps): bump webbrowser from 1.0.5 to 1.0.6 in /codex-rs by @dependabot[bot] in #7225
  - Added alternate form of dependabot to CLA allow list by @etraut-openai in #7260
  - Allow enterprises to skip upgrade checks and messages by @gpeal in #7213
  - fix: custom prompt expansion with large pastes by @Priya-753 in #7154
  - chore(ci): add cargo audit workflow and policy by @joshka-oai in #7108
  - chore: add cargo-deny configuration by @joshka-oai in #7119
  - Windows Sandbox: treat <workspace_root>/.git as read-only in workspace-write mode by @iceweasel-oai in #7142
  - chore: dedup unified exec "waited" rendering by @jif-oai in #7256
  - fix: don't store early exit sessions by @jif-oai in #7263
  - fix: Correct the stream error message by @CSRessel in #7266
  - [app-server-test-client] add send-followup-v2 by @celia-oai in #7271
  - feat[app-serve]: config management by @jif-oai in #7241
  - feat: add custom env for unified exec process by @jif-oai in #7286
  - [app-server] feat: add thread_id and turn_id to item and error notifications by @owenlin0 in #7124
  - feat: add compaction event by @jif-oai in #7289
  - [app-server] feat: add turn/diff/updated event by @owenlin0 in #7279
  - fix: Drop MacOS 13 by @jif-oai in #7295
  - fix: drop conversation when /new by @jif-oai in #7297
  - chore: proper client extraction by @jif-oai in #6996
  - tmp: drop flaky ubuntu by @jif-oai in #7300
  - [app-server] add thread/tokenUsage/updated v2 event by @celia-oai in #7268
  - correctly recognize WorkspaceWrite policy on /approvals by @iceweasel-oai in #7301
  - feat: update process ID for event handling by @jif-oai in #7261
  - Fixed regression in experimental "sandbox command assessment" feature by @etraut-openai in #7308
  - nit: drop file by @jif-oai in #7314
  - doc: fix relative links and add tips by @lionel-oai in #7319
  - Fixes two bugs in example-config.md documentation by @etraut-openai in #7324
  - chore: improve rollout session init errors by @jobchong in #7336
  - feat: detached review by @jif-oai in #7292
  - fix: other flaky tests by @jif-oai in #7372
  - chore: better session recycling by @jif-oai in #7368
  - chore(deps): bump arboard from 3.6.0 to 3.6.1 in /codex-rs by @dependabot[bot] in #7426
  - chore(deps): bump serde_with from 3.14.0 to 3.16.1 in /codex-rs by @dependabot[bot] in #7422
  - chore(deps): bump reqwest from 0.12.23 to 0.12.24 in /codex-rs by @dependabot[bot] in #7424
  - chore(deps): bump tracing from 0.1.41 to 0.1.43 in /codex-rs by @dependabot[bot] in #7428
  - Fixed CLA action to properly exempt dependabot by @etraut-openai in #7429
  - chore(deps): bump image from 0.25.8 to 0.25.9 in /codex-rs by @dependabot[bot] in #7421
  - [app-server] add turn/plan/updated event by @celia-oai in #7329
  - fix: disable review rollout filtering by @jif-oai in #7371
  - [app-server] fix: ensure thread_id and turn_id are on all events by @owenlin0 in #7408
  - [app-server] fix: emit item/fileChange/outputDelta for file change items by @owenlin0 in #7399
  - Fix recent_commits(limit=0) returning 1 commit instead of 0 by @Towaiji in #7334
  - fix: nix build missing rmcp output hash by @Alb-O in #7436
  - docs: clarify codex max defaults and xhigh availability by @kgruiz in #7449
  - fix: prevent MCP startup failure on missing 'type' field by @linuxmetel in #7417
  - chore: update to rmcp@0.10.0 to pick up support for custom client notifications by @bolinfest in #7462
  - fix(apply_patch) tests for shell_command by @dylan-hurd-oai in #7307
  - [app-server] Add ImageView item by @celia-oai in #7468
  - fix(core): enable history lookup on windows by @stevemostovoy-openai in #7457
  - fix(tui): handle WSL clipboard image paths by @manoelcalixto in #3990

**Full Changelog**: https://github.com/openai/codex/compare/rust-v0.63.0...rust-v0.64.0

## rust-v0.63.0 (2025-11-21T18:25:18Z)
## Bug fixes
- Fixes the bug where enabling web search can lead to `Invalid value: 'other'.` errors. 

## PRs Merged 
* [app-server] feat: add Declined status for command exec by @owenlin0 in https://github.com/openai/codex/pull/7101
* chore: drop model_max_output_tokens by @jif-oai in https://github.com/openai/codex/pull/7100
* fix: clear out duplicate entries for `bash` in the GitHub release by @bolinfest in https://github.com/openai/codex/pull/7103


**Full Changelog**: https://github.com/openai/codex/compare/rust-v0.62.0...rust-v0.63.0

## rust-v0.61.0 (2025-11-20T16:14:58Z)
### Highlights

- ExecPolicy2 integration and exec-server prep: core now integrates ExecPolicy2 with exec-server refactors and cutover groundwork, plus quickstart docs to help teams adopt the new policy engine.
- Improved truncation and error reporting: single-pass truncation reduces duplicate work, and error events can now carry optional status codes for clearer observability.
- Shell reliability and sandbox warnings: fallback shell selection is hardened and world-writable directory warnings are less noisy, including improved messaging on Windows.
- UX fixes: corrected reasoning display, preserved review footer context after `/review`, and the model migration screen now shows only once.

### PRs Merged

- fix(app-server) move windows world writable warning (#6916) — @dylan-hurd-oai
- [core] add optional status_code to error events (#6865) — @celia-oai
- fix: prepare ExecPolicy in exec-server for execpolicy2 cutover (#6888) — @bolinfest
- stop over-reporting world-writable directories (#6936) — @iceweasel-oai
- fix(context left after review): review footer context after `/review` (#5610) — @guidedways
- Fix/correct reasoning display (#6749) — @lionelchg
- chore: refactor exec-server to prepare it for standalone MCP use (#6944) — @bolinfest
- fix(shell) fallback shells (#6948) — @dylan-hurd-oai
- execpolicy2 core integration (#6641) — @zhao-oai
- Single pass truncation (#6914) — @pakrym-oai
- update execpolicy quickstart readme (#6952) — @zhao-oai
- stop model migration screen after first time. (#6954) — @aibrahim-oai


## rust-v0.60.1 (2025-11-19T19:45:42Z)
Bug fix release, most of the new important changes are in https://github.com/openai/codex/releases/tag/rust-v0.59.0

## Bug fix:
- Default model for API users is now `gpt-5.1-codex`

## rust-v0.59.0 (2025-11-19T18:09:22Z)
### Highlights

- GPT-5.1-Codex-Max: introducing our newest frontier agentic coding model. GPT-5.1-Codex-Max delivers higher reliability, faster iteration, and support for long-running, project-scale workflows. Learn more at https://www.openai.com/index/gpt-5-1-codex-max
- Native Compaction Support: added first-class support for Compaction, improving performance across extended coding sessions.
- Expanded Tool Token Limits: codex models now support up to 10,000 tool output tokens. Configure this via `tool_output_token_limit` in `config.toml`.
- Windows Agent mode: Introduced Agent mode for native Windows. Codex can read files, write files, and run commands in your working folder with fewer approvals. Agent mode uses a new experimental Windows sandbox to limit filesystem and network access. Learn more at https://developers.openai.com/codex/windows
- TUI and UX Improvements
  * Eliminated ghost snapshot notifications when no `git` repository is present.
  * Codex Resume now displays branches and respects the current working directory for filtering.
  * Added placeholder icons for images.
  * Credits are now visible in `/status`.

### PRs Merged

- fix: don't truncate at new lines (#6907) — @aibrahim
- feat: arcticfox in the wild (#6906) — @aibrahim
- [app-server] populate thread>turns>items on thread/resume (#6848) — @owenlin0
- nit: useless log to debug (#6898) — @jif
- fix(core) Support changing /approvals before conversation (#6836) — @dylan.hurd
- chore: consolidate compaction token usage (#6894) — @jif
- chore(app-server) world-writable windows notification (#6880) — @dylan.hurd
- fix: parallel tool call instruction injection (#6893) — @jif
- nit: stable (#6895) — @jif
- feat: warning large commits (#6838) — @jif
- fix label (#6892) — @tibo
- Move shell to use `truncate_text` (#6842) — @aibrahim
- Run remote auto compaction (#6879) — @pakrym
- flaky-unified_exec_formats_large_output_summary (#6884) — @aibrahim
- shell_command returns freeform output (#6860) — @pakrym
- chore(core) arcticfox (#6876) — @dylan.hurd
- fix(tui) ghost snapshot notifications (#6881) — @dylan.hurd
- fix: typos in model picker (#6859) — @aibrahim
- chore: update windows docs url (#6877) — @ae
- feat: tweak windows sandbox strings (#6875) — @ae
- fix: add more fields to ThreadStartResponse and ThreadResumeResponse (#6847) — @mbolin
- chore: update windows sandbox docs (#6872) — @ae
- Remote compaction on by-default (#6866) — @pakrym
- [app-server] introduce `turn/completed` v2 event (#6800) — @celia
- update credit status details (#6862) — @zhao
- tui: add branch to 'codex resume', filter by cwd (#6232) — @172423086+nornagon-openai
- smoketest for browser vuln, rough draft of Windows security doc (#6822) — @iceweasel
- windows sandbox: support multiple workspace roots (#6854) — @iceweasel
- updating codex backend models (#6855) — @zhao
- exec-server (#6630) — @172423086+nornagon-openai
- Fix tests so they don't emit an extraneous `config.toml` in the source tree (#6853) — @etraut
- [app-server-test-client] feat: auto approve command (#6852) — @owenlin0
- Improved runtime of `generated_ts_has_no_optional_nullable_fields` test (#6851) — @etraut
- fix: local compaction (#6844) — @jif
- Fix typo in config.md for MCP server (#6845) — @simcoea
- [codex][otel] support mtls configuration (#6228) — @apanasenko
- feat: review in app server (#6613) — @jif
- chore(config) enable shell_command (#6843) — @dylan.hurd
- Prompt to turn on windows sandbox when auto mode selected. (#6618) — @iceweasel
- Add the utility to truncate by tokens (#6746) — @aibrahim
- Update faq.md section on supported models (#6832) — @adpena
- fixing localshell tool calls (#6823) — @zhao
- feat: enable parallel tool calls (#6796) — @jif
- feat: remote compaction (#6795) — @jif
- nit: app server (#6830) — @jif
- nit: mark ghost commit as stable (#6833) — @jif
- feat: git branch tooling (#6831) — @jif
- :bug: fix(rmcp-client): refresh OAuth tokens using expires_at (#6574) — @LaelLuo
- fix(windows) shell_command on windows, minor parsing (#6811) — @dylan.hurd
- chore(core) Add shell_serialization coverage (#6810) — @dylan.hurd
- Update defaults to gpt-5.1 (#6652) — @aibrahim
- Demote function call payload log to debug to avoid noisy error-level stderr (#6808) — @cassirer
- execpolicy2 extension (#6627) — @zhao
- [app-server] feat: add v2 command execution approval flow (#6758) — @owenlin0
- background rate limits fetch (#6789) — @zhao
- move cap_sid file into ~/.codex so the sandbox cannot overwrite it (#6798) — @iceweasel
- Fix TUI issues with Alt-Gr on Windows (#6799) — @etraut
- core: add a feature to disable the shell tool (#6481) — @172423086+nornagon-openai
- chore(core) Update shell instructions (#6679) — @dylan.hurd
- fix: annotate all app server v2 types with camelCase (#6791) — @owenlin0
- LM Studio OSS Support (#2312) — @rugved
- [app-server] add events to readme (#6690) — @celia
- core/tui: non-blocking MCP startup (#6334) — @172423086+nornagon-openai
- chore: delete chatwidget::tests::binary_size_transcript_snapshot tui test (#6759) — @owenlin0
- feat: execpolicy v2 (#6467) — @zhao
- nit: personal git ignore (#6787) — @jif
- tmp: drop sccache for windows 2 (#6775) — @jif
- feat: placeholder for image that can't be decoded to prevent 400 (#6773) — @jif
- fix(core) serialize shell_command (#6744) — @dylan.hurd
- Fix FreeBSD/OpenBSD builds: target-specific keyring features and BSD hardening (#6680) — @jinxiaoyong
- Exempt the "codex" github user from signing the CLA (#6724) — @etraut
- chore(deps): bump actions/github-script from 7 to 8 (#6755) — @49699333+dependabot[bot]
- Fix: Claude models return incomplete responses due to empty finish_reason handling (#6728) — @dulikaifazr
- Fix AltGr/backslash input on Windows Codex terminal (#6720) — @pornotato
- Revert "tmp: drop sccache for windows (#6673)" (#6751) — @etraut
- fix: resolve Windows MCP server execution for script-based tools (#3828) — @jlee14281
- Fix documentation errors for Custom Prompts named arguments and add canonical examples (#5910) — @169171880+Sayeem3051
- Tighten panic on double truncation (#6701) — @aibrahim
- Improve compact (#6692) — @aibrahim
- Refactor truncation helpers into its own file (#6683) — @aibrahim
- Revert "templates and build step for validating/submitting winget package" (#6696) — @aibrahim
- ci: only run CLA assistant for openai org repos (#6687) — @joshka
- Handle "Don't Trust" directory selection in onboarding (#4941) — @viniciusmotta8
- Ignore unified_exec_respects_workdir_override (#6693) — @pakrym
- Order outputs before inputs (#6691) — @pakrym
- feat: add app-server-test-client crate for internal use (#5391) — @owenlin0
- fix codex detection, add new security-focused smoketests. (#6682) — @iceweasel
- feat(ts-sdk): allow overriding CLI environment (#6648) — @lopopolo
- templates and build step for validating/submitting winget package (#6485) — @iceweasel
- Add test timeout (#6612) — @pakrym
- Enable TUI notifications by default (#6633) — @172423086+nornagon-openai
- tmp: drop sccache for windows (#6673) — @jif
- [App server] add mcp tool call item started/completed events (#6642) — @celia
- feat: cache tokenizer (#6609) — @jif
- feat: better UI for unified_exec (#6515) — @jif
- feat: add resume logs when doing /new (#6660) — @jif
- tests: replace mount_sse_once_match with mount_sse_once for SSE mocking (#6640) — @pakrym
- Promote shared helpers for suite tests (#6460) — @aibrahim
- Use shared network gating helper in chat completion tests (#6461) — @aibrahim
- Avoid double truncation (#6631) — @aibrahim
- Revert "Revert \"Overhaul shell detection and centralize command generation for unified exec\"" (#6607) — @pakrym
- [app-server] small fixes for JSON schema export and one-of types (#6614) — @owenlin0
- [App-server] add new v2 events:`item/reasoning/delta`, `item/agentMessage/delta` & `item/reasoning/summaryPartAdded` (#6559) — @celia
- chore(core) Consolidate apply_patch tests (#6545) — @dylan.hurd
- Only list failed tests (#6619) — @pakrym
- feat: Add support for --add-dir to exec and TypeScript SDK (#6565) — @33551757+danfhernandez
- Add AbortSignal support to TypeScript SDK (#6378) — @33551757+danfhernandez
- Enable close-stale-contributor-prs.yml workflow (#6615) — @pakrym
- Update default yield time (#6610) — @pakrym
- Close stale PRs workflow (#6594) — @pakrym
- Migrate prompt caching tests to test_codex (#6605) — @pakrym
- Revert "Overhaul shell detection and centralize command generation for unified exec" (#6606) — @pakrym
- Overhaul shell detection and centralize command generation for unified exec (#6577) — @pakrym

## rust-v0.58.0 (2025-11-13T18:04:00Z)
### Highlights
- Support for gpt5.1 models family. [Read more](www.openai.com/index/gpt-5-1)
- App server enhancements: new JSON schema generator command, item started/completed events, macro cleanup, reduced boilerplate, and tightened duplicate-code hygiene (#6406 #6517 #6470 #6488).
- Quality of life fixes: doc updates (web_search, SDK, config), TUI shortcuts inline, seatbelt/Wayland/brew/compaction/cloud-tasks bugfixes, clearer warnings, auth-aware status output, and OTEL test stabilization (#5889 #6424 #6425 #6376 #6421 #4824 #6238 #5856 #6446 #6529 #6541).

### PRs Merged
- #6381 — Improve world-writable scan (`917f39ec1`)
- #5889 — feat(tui): Display keyboard shortcuts inline for approval options (`5beb6167c`)
- #6389 — more world-writable warning improvements (`a47181e47`)
- #6425 — Fix SDK documentation: replace “file diffs” with “file change notifications” (`8b80a0a26`)
- #6421 — fix(seatbelt): Allow reading hw.physicalcpu (`c07461e6f`)
- #5856 — fix(cloud-tasks): respect `cli_auth_credentials_store` config (`5f1fab0e7`)
- #6387 — For npm upgrade on Windows, go through cmd.exe to get path traversal working (`625f2208c`)
- #6437 — chore(deps): bump codespell-project/actions-codespell from 2.1 to 2.2 (`7c7c7567d`)
- #6438 — chore(deps): bump taiki-e/install-action from 2.60.0 to 2.62.49 (`082d2fa19`)
- #6443 — chore(deps): bump askama from 0.12.1 to 0.14.0 in /codex-rs (`78b2aeea5`)
- #6444 — chore(deps): bump zeroize from 1.8.1 to 1.8.2 in /codex-rs (`e2598f509`)
- #6446 — Fix warning message phrasing (`131c38436`)
- #6424 — Fix config documentation: correct TOML parsing description (`557ac6309`)
- #6454 — Move compact (`50a77dc13`)
- #6376 — Updated docs to reflect recent changes in `web_search` configuration (`65cb1a1b7`)
- #6407 — fix: use generate_ts from app_server_protocol (`42683dadf`)
- #6419 — Support exiting from the login menu (`b46012e48`)
- #6422 — Don’t lock PRs that have been closed without merging (`591615315`)
- #6406 — [app-server] feat: add command to generate json schema (`fbdedd9a0`)
- #6238 — fix: update brew auto update version check (`788badd22`)
- #6433 — Add opt-out for rate limit model nudge (`e743d251a`)
- #6246 — Add user command event types (`980886498`)
- #6466 — feat: add workdir to unified_exec (`f01f2ec9e`)
- #6468 — [app-server] chore: move initialize out of deprecated API section (`2ac49fea5`)
- #4824 — Fix wayland image paste error (`52e97b9b6`)
- #4098 — add codex debug seatbelt --log-denials (`0271c20d8`)
- #6477 — refactor(tui): job-control for Ctrl-Z handling (`60deb6773`)
- #6470 — [app-server] update macro to make renaming methods less boilerplate-y (`3838d6739`)
- #6478 — upload Windows .exe file artifacts for CLI releases (`9aff64e01`)
- #6482 — flip rate limit status bar (`930f81a17`)
- #6480 — Use codex-linux-sandbox in unified exec (`6c36318bd`)
- #6489 — Colocate more of bash parsing (`bb7b0213a`)
- #6488 — [hygiene][app-server] have a helper function for duplicate code in turn APIs (`695187277`)
- #6041 — Enable ghost_commit feature by default (`052b05283`)
- #6503 — nit: logs to trace (`ad279eacd`)
- #6492 — Add unified exec escalation handling and tests (`807e2c27f`)
- #6517 — [app-server] add item started/completed events for turn items (`e357fc723`)
- #6523 — Update full-auto description with on-request (`eb1c651c0`)
- #6528 — Re-add prettier log-level=warn to generate-ts (`424bfecd0`)
- #6507 — feat: warning switch model on resume (`530db0ad7`)
- #6510 — feat: shell_command tool (`29364f3a9`)
- #6516 — chore: verify boolean values can be parsed as config overrides (`c3a710ee1`)
- #6541 — Fix otel tests (`7d9ad3eff`)
- #6534 — feat: only wait for mutating tools for ghost commit (`e00eb50db`)
- #6529 — Fixed status output to use auth information from AuthManager (`ad09c138b`)
- #6551 — Add gpt-5.1 model definitions (`ec69a4a81`)
- #6558 — Do not double encode request bodies in logging (`2f58e6999`)
- #6483 — [app-server] feat: thread/resume supports history, path, and overrides (`964220ac9`)
- #6561 — NUX for gpt5.1 (`e63ab0dd6`)
- #6568 — Set verbosity to low for 5.1 (`f97874093`)
- #6567 — Update subtitle of model picker as part of the nux (`966d71c02`)
- #6569 — Change model picker to include gpt5.1 (`ad7eaa80f`)
- #6575 — Avoid hang when tool’s process spawns grandchild that shares stderr/stdout (`73ed30d7e`)
- #6580 — remove porcupine model slug (`b1979b70a`)
- #6583 — feat: show gpt mini (`e3aaee00c`)
- #6585 — copy for model migration nudge (`305fe73d8`)
- #6586 — Reasoning level update (`e3dd362c9`)
- #6593 — Default to explicit medium reasoning for 5.1 (`34621166d`)
- #6588 — chore(core) Update prompt for gpt-5.1 (`8dcbd29ed`)
- #6597 — feat: proxy context left after compaction (`2a417c47a`)
- #6589 — fix model picker wrapping (`ba74cee6f`)

## rust-v0.57.0 (2025-11-09T22:30:05Z)
### Highlights
- TUI quality-of-life: ctrl-n/p navigation for slash command lists and backtracking skips the /status noise.
- Improve timeout on long running commasnds

### PRs Merged
- #6233 – Freeform unified exec output formatting  
- #6342 – Make `generate_ts` prettier output warn-only  
- #6335 – TUI: fix backtracking past `/status`  
- #1994 – Enable CTRL-n/CTRL-p for navigating slash commands, files, history  
- #6340 – Skip retries on `insufficient_quota` errors  
- #6345 – Remove shell tool when unified exec is enabled  
- #6347 – Refresh AI labeler rules to match issue tracker labels  
- #6346 – Prefer `wait_for_event` over `wait_for_event_with_timeout` (initial update)  
- #5486 – Fix `apply_patch` rename/move path resolution  
- #6349 – Prefer `wait_for_event` over `wait_for_event_with_timeout` (follow-up)  
- #6336 – App-server: implement `account/read` endpoint  
- #6338 – App-server: expose additional fields on `Thread`  
- #6353 – App-server: add auth v2 doc & update Codex MCP interface section  
- #6368 – App-server: README updates for threads and turns  
- #6351 – Promote shell config tool to model family config  
- #6369 – TUI: add inline comments to `tui.rs`  
- #6370 – Add `--promote-alpha` option to `create_github_release` script  
- #6367 – SDK: add `network_access` and `web_search` options to TypeScript SDK  
- #6097 (includes work from #6086) – WSL: normalize Windows paths during update  
- #6377 – App-server docs: add initialization section  
- #6373 – Terminal refactor: remove deprecated flush logic  
- #6252 – Core: replace Cloudflare 403 HTML with friendly message  
- #6380 – Unified exec: allow safe commands without approval  
- #5258 – Kill shell tool process groups on timeout  

## rust-v0.56.0 (2025-11-07T18:09:48Z)
### Highlights
  - Introducing our new model GPT-5-Codex-Mini — a more compact and cost-efficient version of GPT-5-Codex
### PRs merged
  - #6211 fix: Update the deprecation message to link to the docs
  - #6212 [app-server] feat: export.rs supports a v2 namespace, initial v2
    notifications
  - #6230 Fix nix build
  - #3643 fix(core): load custom prompts from symlinked Markdown files
  - #4200 allow codex to be run from pid 1
  - #6234 Upgrade rmcp to 0.8.4
  - #6237 Add modelReasoningEffort option to TypeScript SDK
  - #5565 tui: refactor ChatWidget and BottomPane to use Renderables
  - #6229 refactor Conversation history file into its own directory
  - #6231 Improved token refresh handling to address “Re-connecting” behavior
  - #6261 Update rmcp to 0.8.5
  - #6214 [app-server] feat: v2 Thread APIs
  - #6282 Fixes intermittent test failures in CI
  - #6249 stop capturing r when environment selection modal is open
  - #6183 [App-server] Implement v2 for account/login/start and account/login/completed
  - #6285 Prevent dismissal of login menu in TUI
  - #4388 fix: ToC so it doesn’t include itself or duplicate the end marker
  - #6288 [App-server] Add account/login/cancel v2 endpoint
  - #6286 feat: add model nudge for queries
  - #6300 feat: support models with single reasoning effort
  - #6319 chore: rename for clarity
  - #6216 [app-server] feat: v2 Turn APIs
  - #6295 docs: Fix code fence and typo in advanced guide
  - #6326 chore: fix grammar mistakes
  - #6283 Windows Sandbox: Show Everyone-writable directory warning
  - #6289 chore: move relevant tests to app-server/tests/suite/v2
  - #6333 feat: clarify that gpt-5-codex should not amend commits unless requested
  - #6332 Updated contributing guidelines and PR template to request link to bug report
    in PR notes
  - #5980 core: widen sandbox to allow certificate ops when network is enabled
  - #6337 [App Server] Add more session metadata to listConversations

## rust-v0.55.0 (2025-11-04T20:26:09Z)
## Highlights

#6222 reverted #6189, fixing #6220 (and other similar reports of the Codex CLI failing to start on Linux).

## Merged PRs
 
- #6222 Revert "fix: pin musl 1.2.5 for DNS fixes"
- #6208 ignore deltas in `codex_delegate`

## rust-v0.54.0 (2025-11-04T18:53:40Z)
 **⚠️ WARNING:** Attempting to pin musl 1.2.5 for DNS fixes in #6189 turned out to be the wrong fix. We reverted it in #6222 and published [0.55.0](https://github.com/openai/codex/releases/rust-v0.55.0).

Otherwise, this release was mostly bugfixes and documentation tweaks.

## Merged PRs

- #6189 fix: pin musl 1.2.5 for DNS fixes (#6189)
- #6202 fix: ignore reasoning deltas because we send it with turn item (#6202)
- #6175 [App-server] v2 for account/updated and account/logout (#6175)
- #6156 Fix is_api_message to correctly exclude reasoning messages (#6156)
- #4453 Follow symlinks during file search (#4453)
- #5175 docs: add example config.toml (#5175)
- #6180 fix: `--search` shouldn't show deprecation message (#6180)
- #6143 Fixed notify handler so it passes correct `input_messages` details (#6143)
- #6171 log sandbox commands to $CODEX_HOME instead of cwd (#6171)
- #5996 feat: add the time after aborting (#5996)
- #5541 tui: refine text area word separator handling (#5541)
- #6167 Do not skip trust prompt on Windows if sandbox is enabled. (#6167)
- #6129 feat: add options to responses-api-proxy to support Azure (#6129)
- #6161 Include reasoning tokens in the context window calculation (#6161)
- #6051 Fix rmcp client feature flag reference (#6051)
- #6159 Fix typo in error message for OAuth login (#6159)
- #5685 Add documentation for slash commands in `docs/slash_commands.md`. (#5685)
- #6111 fix: improve usage URLs in status card and snapshots (#6111)
- #6124 Fix "archive conversation" on Windows (#6124)
- #6137 chore(deps): bump actions/upload-artifact from 4 to 5 (#6137)
- #4903 fix: pasting api key stray character (#4903)
- #6131 Fix incorrect "deprecated" message about experimental config key (#6131)
- #6091 Changes to sandbox command assessment feature based on initial experiment feedback (#6091)
- #5956 Parse the Azure OpenAI rate limit message (#5956)
- #5649 docs: Fix link anchor and markdown format in advanced guide (#5649)
- #5659 Fixing small typo in docs (#5659)
- #5935 tui: patch crossterm for better color queries (#5935)
- #6050 [codex][app-server] improve error response for client requests (#6050)
- #4973 docs: fix broken link in contributing guide (#4973)
- #6027 feat: compactor 2 (#6027)
- #6052 Add warning on compact (#6052)
- #6043 chore: Add shell serialization tests for json (#6043)
- #5979 Truncate total tool calls text (#5979)
- #4797 docs: "Configuration" is not belongs "Getting started" (#4797)
- #4804 chore(deps): bump indexmap from 2.10.0 to 2.11.4 in /codex-rs (#4804)
- #4802 chore(deps): bump anyhow from 1.0.99 to 1.0.100 in /codex-rs (#4802)
- #4800 chore(deps): bump actions/checkout from 4 to 5 (#4800)
- #4801 chore(deps): bump actions/github-script from 7 to 8 (#4801)
- #6045 fix: brew upgrade link (#6045)
- #6034 test: undo (#6034)
- #4426 chore(deps): bump thiserror from 2.0.16 to 2.0.17 in /codex-rs (#4426)
- #6010 Update user instruction message format (#6010)
- #4266 fix(tui): propagate errors in insert_history_lines_to_writer (#4266)



## rust-v0.53.0 (2025-10-31T01:21:24Z)
### Highlights
- Fixing error 400 issues
- Improve sandboxing for Java

### PRs
#5897 – codex: add developer instructions
#5939 – app-server: remove serde(skip_serializing_if = "Option::is_none") annotations
#3754 – docs: add missing period
#5976 – hygiene: remove include_view_image_tool config
#3987 – fix: update Seatbelt policy for Java on macOS
#4905 – Windows Sandbox alpha version
#5997 – build: bump Windows stack size to 8 MB
#5986 – remove last-turn reasoning filtering
#6005 – app-server: split API types into v1 and v2
#6002 – feat: add /exit slash-command alias for quit
#6000 – rate-limit errors now return absolute time
#4144 – docs: fix markdown list spacing in review_prompt.md
#6007 – override verbosity for gpt-5-codex

## rust-v0.52.0 (2025-10-30T18:32:13Z)
### Highlights
- TUI polish: queued messages visible during streaming; Windows auto-mode guidance; undo op; compaction prompt configurable.
- Images: client-side image resizing; prevent crashes with MIME verification; SDK image forwarding tests re-enabled.
- Execute commands directly with `!<cmd>`
- Ability to buy credits for more usage. [More information](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-pluspro)

### Other improvements
- Auth: new CLI auth storage abstraction with keyring support and configurable backend.
- App server: GetConversationSummary RPC; fetch/resume conversation summaries by id; refined account/protocol types.
- Execution/events: item streaming events; ghost commits; clearer deprecation warnings; better token refresh handling and logs.
- Conversation management: centralized truncation for all tool outputs; filter out prior-turn reasoning; annotate conversations with model_provider.

### List of merged PRs

1. Log HTTP Version in https://github.com/openai/codex/pull/5475
2. feat: local tokenizer in https://github.com/openai/codex/pull/5508
3. chore: drop approve all in https://github.com/openai/codex/pull/5503
4. [MCP] Add support for specifying scopes for MCP oauth in https://github.com/openai/codex/pull/5487
5. chore: clean spec tests in https://github.com/openai/codex/pull/5517
6. [MCP] Remove the legacy stdio client in favor of rmcp in https://github.com/openai/codex/pull/5529
7. [app-server] send account/rateLimits/updated notifications in https://github.com/openai/codex/pull/5477
8. Fix unified exec session id test helper in https://github.com/openai/codex/pull/5535
9. [app-server] add new account method API stubs in https://github.com/openai/codex/pull/5527
10. chore: clean handle_container_exec_with_params in https://github.com/openai/codex/pull/5516
11. fix: approval issue in https://github.com/openai/codex/pull/5525
12. tui: show aggregated output in display in https://github.com/openai/codex/pull/5539
13. Handle cancelling/aborting while processing a turn in https://github.com/openai/codex/pull/5543
14. chore: testing on apply_path in https://github.com/openai/codex/pull/5557
15. feat: use actual tokenizer for unified_exec truncation in https://github.com/openai/codex/pull/5514
16. feat: end events on unified exec in https://github.com/openai/codex/pull/5551
17. Use Option symbol for mac key hints in https://github.com/openai/codex/pull/5582
18. Moving token_info to ConversationHistory in https://github.com/openai/codex/pull/5581
19. [MCP] Update rmcp to 0.8.3 in https://github.com/openai/codex/pull/5542
20. [MCP] Improve startup errors for timeouts and github in https://github.com/openai/codex/pull/5595
21. fix: flaky tests in https://github.com/openai/codex/pull/5625
22. adding messaging for stale rate limits + when no rate limits are cached in https://github.com/openai/codex/pull/5570
23. Add CodexHttpClient wrapper with request logging in https://github.com/openai/codex/pull/5564
24. [app-server] fix account/read response annotation in https://github.com/openai/codex/pull/5642
25. Add instruction for upgrading codex with brew in https://github.com/openai/codex/pull/5640
26. Log more types of request IDs in https://github.com/openai/codex/pull/5645
27. Added model summary and risk assessment for commands that violate sandbox policy in https://github.com/openai/codex/pull/5536
28. [MCP] Redact environment variable values in /mcp and mcp get in https://github.com/openai/codex/pull/5648
29. [MCP] Properly gate login after mcp add with experimental_use_rmcp_client in https://github.com/openai/codex/pull/5653
30. [codex][app-server] introduce codex/event/raw_item events in https://github.com/openai/codex/pull/5578
31. Fixed flaky unit test in https://github.com/openai/codex/pull/5654
32. Improve feedback in https://github.com/openai/codex/pull/5661
33. Followup feedback in https://github.com/openai/codex/pull/5663
34. Skip flaky test in https://github.com/openai/codex/pull/5680
35. Added support for sandbox_mode in profiles in https://github.com/openai/codex/pull/5686
36. Reduced runtime of unit test that was taking multiple minutes in https://github.com/openai/codex/pull/5688
37. [MCP] Minor docs clarifications around stdio tokens in https://github.com/openai/codex/pull/5676
38. fix: use codex-exp prefix for experimental models and consider codex- models to be production in https://github.com/openai/codex/pull/5797
39. fix: revert "[app-server] fix account/read response annotation (#5642)" in https://github.com/openai/codex/pull/5796
40. Add feedback upload request handling in https://github.com/openai/codex/pull/5682
41. feat: annotate conversations with model_provider for filtering in https://github.com/openai/codex/pull/5658
42. feat: update NewConversationParams to take an optional model_provider in https://github.com/openai/codex/pull/5793
43. feat: undo wiring in https://github.com/openai/codex/pull/5630
44. feat: async ghost commit in https://github.com/openai/codex/pull/5618
45. feat: TUI undo op in https://github.com/openai/codex/pull/5629
46. nit: doc on session task in https://github.com/openai/codex/pull/5809
47. chore: undo nits in https://github.com/openai/codex/pull/5631
48. fix: test yield time in https://github.com/openai/codex/pull/5811
49. feat: introduce GetConversationSummary RPC in https://github.com/openai/codex/pull/5803
50. feat: return an error if unknown enabled/disabled feature in https://github.com/openai/codex/pull/5817
51. Made token refresh code resilient to missing id_token in https://github.com/openai/codex/pull/5782
52. [Auth] Introduce New Auth Storage Abstraction for Codex CLI in https://github.com/openai/codex/pull/5569
53. feat: support verbosity in model_family in https://github.com/openai/codex/pull/5821
54. [Auth] Add keyring support for Codex CLI in https://github.com/openai/codex/pull/5591
55. Centralize truncation in conversation history in https://github.com/openai/codex/pull/5652
56. fix: move account struct to app-server-protocol and use camelCase in https://github.com/openai/codex/pull/5829
57. [MCP] Render MCP tool call result images to the model in https://github.com/openai/codex/pull/5600
58. fix image drag drop in https://github.com/openai/codex/pull/5794
59. Truncate the content-item for mcp tools in https://github.com/openai/codex/pull/5835
60. feat(tui): clarify Windows auto mode requirements in https://github.com/openai/codex/pull/5568
61. [Auth] Choose which auth storage to use based on config in https://github.com/openai/codex/pull/5792
62. chore: speed-up pipeline in https://github.com/openai/codex/pull/5812
63. chore: drop useless shell stuff in https://github.com/openai/codex/pull/5848
64. chore: use anyhow::Result for all app-server integration tests in https://github.com/openai/codex/pull/5836
65. chore: decompose submission loop in https://github.com/openai/codex/pull/5854
66. fix advanced.md in https://github.com/openai/codex/pull/5833
67. tui: show queued messages during response stream in https://github.com/openai/codex/pull/5540
68. Filter out reasoning items from previous turns in https://github.com/openai/codex/pull/5857
69. revert #5812 release file in https://github.com/openai/codex/pull/5887
70. remove beta experimental header in https://github.com/openai/codex/pull/5892
71. Fixed bug that results in a sporadic hang when attaching images in https://github.com/openai/codex/pull/5891
72. verify mime type of images in https://github.com/openai/codex/pull/5888
73. [app-server] Annotate more exported types with a title in https://github.com/openai/codex/pull/5879
74. [App Server] Allow fetching or resuming a conversation summary from the conversation id in https://github.com/openai/codex/pull/5890
75. [codex][app-server] resume conversation from history in https://github.com/openai/codex/pull/5893
76. Refresh tokens more often and log a better message when both auth and token refresh fails in https://github.com/openai/codex/pull/5655
77. fix(windows-path): preserve PATH order; include core env vars in https://github.com/openai/codex/pull/5579
78. chore: merge git crates in https://github.com/openai/codex/pull/5909
79. feat: deprecation warning in https://github.com/openai/codex/pull/5825
80. feat: add output even in sandbox denied in https://github.com/openai/codex/pull/5908
81. Add missing "nullable" macro to protocol structs that contain optional fields in https://github.com/openai/codex/pull/5901
82. Add a wrapper around raw response items in https://github.com/openai/codex/pull/5923
83. fix: icu_decimal version in https://github.com/openai/codex/pull/5919
84. chore: config editor in https://github.com/openai/codex/pull/5878
85. Delegate review to codex instance in https://github.com/openai/codex/pull/5572
86. [exec] Add MCP tool arguments and results in https://github.com/openai/codex/pull/5899
87. Add item streaming events in https://github.com/openai/codex/pull/5546
88. Re-enable SDK image forwarding test in https://github.com/openai/codex/pull/5934
89. ignore agent message deltas for the review mode in https://github.com/openai/codex/pull/5937
90. asdf in https://github.com/openai/codex/pull/5940
91. Add debug-only slash command for rollout path in https://github.com/openai/codex/pull/5943
92. Add debug-only slash command for rollout path in https://github.com/openai/codex/pull/5936
93. Send delegate header in https://github.com/openai/codex/pull/5942
94. chore: unify config crates in https://github.com/openai/codex/pull/5958
95. Pass initial history as an optional to codex delegate in https://github.com/openai/codex/pull/5950
96. feat: compaction prompt configurable in https://github.com/openai/codex/pull/5959
97. nit: log rmcp_client in https://github.com/openai/codex/pull/5978
98. chore: testing on freeform apply_patch in https://github.com/openai/codex/pull/5952
99. [codex] add developer instructions in https://github.com/openai/codex/pull/5897
100. [app-server] remove serde(skip_serializing_if = \"Option::is_none\") annotations in https://github.com/openai/codex/pull/5939

## rust-v0.50.0 (2025-10-25T21:37:23Z)
### Highlights
- Improved `/feedback` to get better diagnostics. Please use it to report any issues. (#5661, #5663).

### Merged PRs

  - #5536 — Added model summary and risk assessment for commands that violate sandbox policy
    (@etraut-openai)
  - #5542 — [MCP] Update rmcp to 0.8.3 (@gpeal)
  - #5564 — Add CodexHttpClient wrapper with request logging (@pakrym-oai)
  - #5570 — adding messaging for stale rate limits + when no rate limits are cached (@zhao-oai)
  - #5578 — [codex][app-server] introduce codex/event/raw_item events (@apanasenko-oai)
  - #5581 — Moving token_info to ConversationHistory (@aibrahim-oai)
  - #5582 — Use Option symbol for mac key hints (@joshka-oai)
  - #5595 — [MCP] Improve startup errors for timeouts and github (@gpeal)
  - #5625 — fix: flaky tests (@jif-oai)
  - #5640 — Add instruction for upgrading codex with brew (@shijie-oai)
  - #5642 — [app-server] fix account/read response annotation (@owenlin0)
  - #5645 — Log more types of request IDs (@pakrym-oai)
  - #5648 — [MCP] Redact environment variable values in /mcp and mcp get (@gpeal)
  - #5653 — [MCP] Properly gate login after mcp add with experimental_use_rmcp_client (@gpeal)
  - #5654 — Fixed flaky unit test (@etraut-openai)
  - #5661 — Improve feedback (@aibrahim-oai)
  - #5663 — Followup feedback (@aibrahim-oai)
  - #5680 — Skip flaky test (@pakrym-oai)

## rust-v0.49.0 (2025-10-24T18:58:35Z)
## Highlights
* No major changes comparing to `v0.48.0` - `v0.49.0` is used for testing homebrew upgrade script. 

**Full Changelog**: https://github.com/openai/codex/compare/rust-v0.48.0...rust-v0.49.0

## rust-v0.48.0 (2025-10-23T23:47:39Z)
## Highlights 
* `--add-dir` to add an additional working directory.
* Many MCP improvements:
  * stdio servers now use a new client backed by the official [rust MCP sdk](https://github.com/modelcontextprotocol/rust-sdk)
  * stdio servers can specify a `cwd`
  * All servers can specify `enabled_tools` or `disabled_tools`
  * Streamable HTTP servers can specify `scopes` during `codex mcp login`
  * Improved startup error messages
  * Better instruction following for calling tools
* Configuration options for `forced_login_method` and `forced_chatgpt_workspace_id` which can be paired with [managed configs](https://developers.openai.com/codex/security#managed-configuration) to give enterprises more control over Codex usage.

## Full list of merged PRs:
* Support graceful agent interruption by @pakrym-oai in https://github.com/openai/codex/pull/5287
* Fix nix build by @Mic92 in https://github.com/openai/codex/pull/4048
* [MCP] Render full MCP errors to the model by @gpeal in https://github.com/openai/codex/pull/5298
* Fix link to MCP Servers config section by @lopopolo-openai in https://github.com/openai/codex/pull/5301
* [MCP] When MCP auth expires, prompt the user to log in again. by @gpeal in https://github.com/openai/codex/pull/5300
* fix: switch rate limit reset handling to timestamps by @tibo-openai in https://github.com/openai/codex/pull/5304
* fix: diff_buffers clear-to-end when deleting wide graphemes by @MomentDerek in https://github.com/openai/codex/pull/4921
* docs(changelog): update install command to @openai/codex@<version> by @truls27a in https://github.com/openai/codex/pull/2073
* fix: handle missing resume session id gracefully by @tibo-openai in https://github.com/openai/codex/pull/5329
* fix: improve custom prompt documentation and actually use prompt descriptions by @tibo-openai in https://github.com/openai/codex/pull/5332
* Move rust analyzer target dir by @pakrym-oai in https://github.com/openai/codex/pull/5328
* Create independent TurnContexts by @pakrym-oai in https://github.com/openai/codex/pull/5308
* feat: add --add-dir flag for extra writable roots by @tibo-openai in https://github.com/openai/codex/pull/5335
* docs: add AGENTS.md discovery guide by @tibo-openai in https://github.com/openai/codex/pull/5353
* docs: improve overall documentation by @tibo-openai in https://github.com/openai/codex/pull/5354
* fix: config.md docs inaccuracies by @tibo-openai in https://github.com/openai/codex/pull/5355
* fix: update CLI usage order for codex -h by @tibo-openai in https://github.com/openai/codex/pull/5356
* docs: align sandbox defaults, dedupe sections and improve getting started guide by @tibo-openai in https://github.com/openai/codex/pull/5357
* [MCP] Prefix MCP tools names with `mcp__` by @gpeal in https://github.com/openai/codex/pull/5309
* feat: experimental `codex stdio-to-uds` subcommand by @bolinfest in https://github.com/openai/codex/pull/5350
* Add forced_chatgpt_workspace_id and forced_login_method configuration options by @gpeal in https://github.com/openai/codex/pull/5303
* Expand approvals integration coverage by @pakrym-oai in https://github.com/openai/codex/pull/5358
* feat: add images support to the Codex Typescript SDK by @needs in https://github.com/openai/codex/pull/5281
* Strip zsh -lc wrapper from TUI command headers by @hxreborn in https://github.com/openai/codex/pull/5374
* Update Homebrew install instructions to use cask by @shijie-oai in https://github.com/openai/codex/pull/5377
* Always enable plan tool in exec by @pakrym-oai in https://github.com/openai/codex/pull/5380
* Auto compact at ~90% by @aibrahim-oai in https://github.com/openai/codex/pull/5292
* Generate JSON schema for app-server protocol by @rasmusrygaard in https://github.com/openai/codex/pull/5063
* fix: warn when --add-dir would be ignored by @tibo-openai in https://github.com/openai/codex/pull/5351
* Use int timestamps for rate limit reset_at by @owenlin0 in https://github.com/openai/codex/pull/5383
* chore: rework tools execution workflow by @jif-oai in https://github.com/openai/codex/pull/5278
* Add ItemStarted/ItemCompleted events for UserInputItem by @pakrym-oai in https://github.com/openai/codex/pull/5306
* tui: drop citation rendering by @nornagon-openai in https://github.com/openai/codex/pull/4855
* [app-server] read rate limits API by @owenlin0 in https://github.com/openai/codex/pull/5302
* fix terminal corruption that could happen when onboarding and update banner by @nornagon-openai in https://github.com/openai/codex/pull/5269
* Reduce symbol size for tests by @pakrym-oai in https://github.com/openai/codex/pull/5389
* docs: update advanced guide details by @tibo-openai in https://github.com/openai/codex/pull/5395
* docs: clarify responses proxy metadata by @tibo-openai in https://github.com/openai/codex/pull/5406
* [MCP] Add configuration options to enable or disable specific tools by @gpeal in https://github.com/openai/codex/pull/5367
* Treat `zsh -lc` like `bash -lc` by @gpeal in https://github.com/openai/codex/pull/5411
* docs: clarify prompt metadata behavior by @tibo-openai in https://github.com/openai/codex/pull/5403
* docs: remove stale contribution reference by @tibo-openai in https://github.com/openai/codex/pull/5400
* docs: document exec json events by @tibo-openai in https://github.com/openai/codex/pull/5399
* docs: correct getting-started behaviors by @tibo-openai in https://github.com/openai/codex/pull/5407
* [MCP] Dedicated error message for GitHub MCPs missing a personal access token by @gpeal in https://github.com/openai/codex/pull/5393
* chore(ci): Speed up macOS builds by using larger runner by @JaviSoto in https://github.com/openai/codex/pull/5234
* feat: include cwd in notify payload by @tibo-openai in https://github.com/openai/codex/pull/5415
* fix(tui): Update WSL instructions by @dylan-hurd-oai in https://github.com/openai/codex/pull/5307
* [MCP] Bump rmcp to 0.8.2 by @gpeal in https://github.com/openai/codex/pull/5423
* Pass TurnContext around instead of sub_id by @pakrym-oai in https://github.com/openai/codex/pull/5421
* Fix flaky auth tests by @gpeal in https://github.com/openai/codex/pull/5461
* chore: drop env var flag by @jif-oai in https://github.com/openai/codex/pull/5462
* Enable plan tool by default by @pakrym-oai in https://github.com/openai/codex/pull/5384
* feat: emit events for unified_exec by @jif-oai in https://github.com/openai/codex/pull/5448
* fix: fix UI issue when 0 omitted lines by @jif-oai in https://github.com/openai/codex/pull/5451
* [app-server] model/list API by @owenlin0 in https://github.com/openai/codex/pull/5382
* Add a baseline test for resume initial messages by @pakrym-oai in https://github.com/openai/codex/pull/5466
* [otel] init otel for app-server by @apanasenko-oai in https://github.com/openai/codex/pull/5469
* feat: add experimental_bearer_token option to model provider definition by @bolinfest in https://github.com/openai/codex/pull/5467
* Log HTTP Version by @pakrym-oai in https://github.com/openai/codex/pull/5475
* feat: add text cleared with ctrl+c to the history so it can be recovered with up arrow by @JaviSoto in https://github.com/openai/codex/pull/5470
* docs: Add `--cask` option to brew command to suggest by @yanskun in https://github.com/openai/codex/pull/5432
* chore: align unified_exec by @jif-oai in https://github.com/openai/codex/pull/5442
* feat: local tokenizer by @jif-oai in https://github.com/openai/codex/pull/5508
* chore: drop approve all by @jif-oai in https://github.com/openai/codex/pull/5503
* [MCP] Add support for specifying scopes for MCP oauth by @gpeal in https://github.com/openai/codex/pull/5487
* Add new thread items and rewire event parsing to use them by @pakrym-oai in https://github.com/openai/codex/pull/5418
* chore: clean spec tests by @jif-oai in https://github.com/openai/codex/pull/5517
* docs: fix agents fallback example by @tibo-openai in https://github.com/openai/codex/pull/5396
* [MCP] Remove the legacy stdio client in favor of rmcp by @gpeal in https://github.com/openai/codex/pull/5529
* Move changing turn input functionalities to `ConversationHistory` by @aibrahim-oai in https://github.com/openai/codex/pull/5473
* [app-server] send account/rateLimits/updated notifications by @owenlin0 in https://github.com/openai/codex/pull/5477
* Fix IME submissions dropping leading digits by @genki in https://github.com/openai/codex/pull/4359
* [app-server] add new account method API stubs by @owenlin0 in https://github.com/openai/codex/pull/5527
* chore: clean `handle_container_exec_with_params` by @jif-oai in https://github.com/openai/codex/pull/5516
* fix: approval issue by @jif-oai in https://github.com/openai/codex/pull/5525
* tui: show aggregated output in display by @nornagon-openai in https://github.com/openai/codex/pull/5539
* Handle cancelling/aborting while processing a turn by @aibrahim-oai in https://github.com/openai/codex/pull/5543
* chore: testing on apply_path by @jif-oai in https://github.com/openai/codex/pull/5557
* feat: use actual tokenizer for unified_exec truncation by @jif-oai in https://github.com/openai/codex/pull/5514
* fix: resume lookup for gitignored CODEX_HOME by @tibo-openai in https://github.com/openai/codex/pull/5311
* feat: end events on unified exec by @jif-oai in https://github.com/openai/codex/pull/5551

## New Contributors
* @Mic92 made their first contribution in https://github.com/openai/codex/pull/4048
* @lopopolo-openai made their first contribution in https://github.com/openai/codex/pull/5301
* @MomentDerek made their first contribution in https://github.com/openai/codex/pull/4921
* @truls27a made their first contribution in https://github.com/openai/codex/pull/2073
* @needs made their first contribution in https://github.com/openai/codex/pull/5281
* @hxreborn made their first contribution in https://github.com/openai/codex/pull/5374
* @owenlin0 made their first contribution in https://github.com/openai/codex/pull/5383
* @yanskun made their first contribution in https://github.com/openai/codex/pull/5432
* @genki made their first contribution in https://github.com/openai/codex/pull/4359

**Full Changelog**: https://github.com/openai/codex/compare/rust-v0.47.0...rust-v0.48.0

## rust-v0.47.0 (2025-10-17T17:07:34Z)
## Highlights

- Improvements and bug-fixes in Codex CLI
- Code signing binaries on MacOS
- Auto update banner
- :new: Warning when enabling "full access" mode

## Full list of merged PRs:

- Indentation mode for read_file (#4887)
- Message when stream get correctly resumed (#4988)
- Make shortcut works even with capslock (#5049)
- Discard prompt starting with a slash (#5048)
- Add header for task kind (#5142)
- Pass codex thread ID in notifier metadata (#4582)
- Updated github issue template (#5191)
- Agent override file (#5215)
- Prompt mcp login when adding a streamable HTTP server that supports oauth (#5193)
- Add parsed command to ExecApprovalRequestEvent (#5222)
- Add warning about rate limit when using high effort (#5035)
- Auto update approval (#5185)
- Add macOS notarization step to release workflow (#5233)
- Add confirmation prompt for enabling full access approvals (#4980)
- Add path field to `ParsedCommand::Read` variant (#5275)
- Better UX during refusal (#5260)
- Lagged output in unified_exec buffer (#4992)
- Sandbox denied error logs (#4874)
- Add code signing for MacOS binary (#4899)
- Fix wrapping in user approval decisions (#5008)
- Fix wrapping in trust_directory (#5007)
- /diff mode wraps long lines (#4891)
- Fix crash when alt+bksp past unicode nbsp (#5016)
- Include the image name in the textarea placeholder (#5056)
- Detect Bun installs in CLI update banner (#5074)
- Add dangerous auto-approval for codex exec (#5043)
- Update tui to sandbox_workspace_write (#3341)
- Codex cloud exec (#5060)


## rust-v0.46.0 (2025-10-09T02:06:27Z)
## Highlights

### Improved MCP support
We are in the middle of significantly improving support for connecting to MCP servers including support for streamable http servers with optional bearer token or oauth login support.

Enable the `experimental_use_rmcp_client = true` flag in `config.toml` to use the new MCP stack. If you encounter issues, create a GitHub issue and add the `mcp` label. We would like to remove the experimental flag soon and will continue to expand MCP support over time.

## What's Changed
* [MCP] Fix the bearer token authorization header by @gpeal in https://github.com/openai/codex/pull/4846
* Print codex resume note when quitting after codex resume by @nornagon-openai in https://github.com/openai/codex/pull/4695
* Use Number instead of BigInt for TokenCountEvent by @ccy-oai in https://github.com/openai/codex/pull/4856
* Simplify request body assertions by @pakrym-oai in https://github.com/openai/codex/pull/4845
* Fix zsh completion by @tamird in https://github.com/openai/codex/pull/4692
* [Cloud Tasks] Use workspace deps by @tamird in https://github.com/openai/codex/pull/4693
* Simplify parallel by @pakrym-oai in https://github.com/openai/codex/pull/4829
* [TUI] Remove bottom padding by @gpeal in https://github.com/openai/codex/pull/4854
* [TUI] Dynamic width for line numbers in diffs by @nornagon-openai in https://github.com/openai/codex/pull/4664
* [TUI] Wrapping bugfix by @nornagon-openai in https://github.com/openai/codex/pull/4674
* Fix flaky test by @jif-oai in https://github.com/openai/codex/pull/4878
* `list_dir` tool by @jif-oai in https://github.com/openai/codex/pull/4817
* [TUI] Breathing spinner on true-color terms by @nornagon-openai in https://github.com/openai/codex/pull/4853
* [TUI] Remove instruction hack for /review by @dedrisian-oai in https://github.com/openai/codex/pull/4896
* Set codex SDK TypeScript originator by @pakrym-oai in https://github.com/openai/codex/pull/4894
* [TUI] Bring the transcript closer to display mode by @nornagon-openai in https://github.com/openai/codex/pull/4848
* [TUI] Switch to tree-sitter-highlight bash highlighting by @nornagon-openai in https://github.com/openai/codex/pull/4666
* remove experimental prefix by @rakesh-oai in https://github.com/openai/codex/pull/4907
* [MCP] Add the ability to explicitly specify a credentials store by @gpeal in https://github.com/openai/codex/pull/4857
* [MCP] Add support for streamable http servers with `codex mcp add` and replace bearer token handling by @gpeal in https://github.com/openai/codex/pull/4904
* featgrep_files as a tool by @jif-oai in https://github.com/openai/codex/pull/4820
* CLI UP/ENTER by @jif-oai in https://github.com/openai/codex/pull/4944
* change log_sse_event() so it no longer takes a closure by @bolinfest in https://github.com/openai/codex/pull/4953
* truncate on compact by @jif-oai in https://github.com/openai/codex/pull/4942
* Fix transcript mode rendering issue when showing tab chars by @dedrisian-oai in https://github.com/openai/codex/pull/4911
* [TUI] hardcode xterm palette, shimmer blends between fg and bg by @nornagon-openai in https://github.com/openai/codex/pull/4957
* [MCP] Add an `enabled` config field by @gpeal in https://github.com/openai/codex/pull/4917
* Make context line permanent by @dedrisian-oai in https://github.com/openai/codex/pull/4699
* [MCP] Add auth status to MCP servers by @gpeal in https://github.com/openai/codex/pull/4918
* [TUI] fix off-by-16 in terminal_palette by @nornagon-openai in https://github.com/openai/codex/pull/4967
* Create alias by @rakesh-oai in https://github.com/openai/codex/pull/4971
* Set chat name by @dedrisian-oai in https://github.com/openai/codex/pull/4974
* revert /name for now by @dedrisian-oai in https://github.com/openai/codex/pull/4978

## New Contributors
* @ccy-oai made their first contribution in https://github.com/openai/codex/pull/4856
* @tamird made their first contribution in https://github.com/openai/codex/pull/4692

**Full Changelog**: https://github.com/openai/codex/compare/rust-v0.45.0...rust-v0.46.0

## rust-v0.45.0 (2025-10-06T19:21:42Z)
## Breaking changes
`codex login --api-key` was replaced with `codex login --with-api-key` that reads the key from `stdin` to improve security.

Sample usage:
```bash
printenv OPENAI_API_KEY | codex login --with-api-key
```

## Highlights:

- #4517 Experimental support for OAuth MCP server authentication

## Full list of merged PRs:

- #4636 Replace `--api-key` with `--with-api-key` for logging into the CLI with an API key
- #4644 Only write the final message to stdout for `codex exec`
- #4676 Default to `gpt-5` for Windows users who have not set a default model
- #4689 Remove the requirement to use `experimental_use_rmcp_client` for streamable HTTP MCP servers that don't require OAuth
- #4673 Fix colors when refocusing the terminal after a system theme update
- #4694 Fix reasoning effort title
- #4616 Updated device code login copy
- #4706 Fix command output truncation that sometimes used too much of the context window
- #4663 Initial parallel tool call support
- #4736 Pulsing dot loading state

## rust-v0.44.0 (2025-10-03T17:01:36Z)
## Highlights:

- New UI refresh! Updated chat composer, bottom pane, model picker, and upgrade nudge (#4240, #4316, #4178, #4405)
- Custom prompts now support named & positional arguments (#4474, #4470)
- Add support for streamable HTTP MCP servers (#4317)
- (experimental) Reduce repetitive approval for read-only commands on Windows (#4269)
- (very experimental) Manage cloud tasks with `codex cloud` (#3197)

+ many more fixes and improvements


## Full list of merged PRs:

- #4642 Nit: Pop model effort picker on esc
- #4641 Move gpt-5-codex to top
- #4639 Fix tab+enter regression on slash commands
- #4619 feat: add file name to fuzzy search response
- #4629 tui: • Working, 100% context dim
- #4633 Use supports_color in codex exec
- #4636 Enable codex workflows
- #4638 Update issue-deduplicator.yml
- #4571 feat: write pid in addition to port to server info
- #4635 Deduplicator fixes
- #4627 fix false "task complete" state during agent message
- #4634 Bump codex version in actions to latest
- #4610 Rename assistant message to agent message and fix item type field naming
- #4630 Use GH cli to fetch current issue
- #4622 tui: tweaks to dialog display
- #4628 Add issue deduplicator workflow
- #4585 Minor cleanup of codex exec output
- #4626 Revert "chore: sandbox extraction"
- #4621 Add issue labeler workflow
- #4583 Add a separate exec doc
- #4612 Separate interactive and non-interactive sessions
- #4178 Make model switcher two-stage
- #4475 show "Viewed Image" when the model views an image
- #4586 normalize key hints
- #4584 Fix status usage ratio
- #4454 fix: handle JSON Schema in additionalProperties for MCP tools
- #4615 Support CODEX_API_KEY for codex exec
- #4569 fix: update the gpt-5-codex prompt to be more explicit that it should always used fenced code blocks info tags
- #4579 Store settings on the thread instead of turn
- #4572 Include request ID in the error message
- #4577 canonicalize display of Agents.md paths on Windows.
- #4573 rework patch/exec approval UI
- #4513 Add initial set of doc comments to the SDK
- #4576 Revert "chore: prompt update to enforce good usage of apply_patch"
- #4567 Explicit node imports
- #4568 Fix hang on second oauth login attempt
- #4575 fix: use `number` instead of `bigint` for the generated TS for RequestId
- #4566 fix ctr-n hint
- #4556 feat: add --emergency-version-override option to create_github_release script
- #4563 SDK: support working directory and skipGitRepoCheck options
- #4544 Fall back to configured instruction files if AGENTS.md isn't available
- #4536 Show context window usage while tasks run
- #4509 Show placeholder for commands with no output
- #4468 Add Updated at time in resume picker
- #4559 Handle trailing backslash properly
- #4269 implement command safety for PowerShell commands
- #4555 fix: pnpm/action-setup@v4 should run before actions/setup-node@v5
- #4543 chore: introduce publishing logic for @openai/codex-sdk
- #4286 chore: sanbox extraction
- #4533 Fix Callback URL for staging and prod environments
- #4537 fix: remove mcp-types from app server protocol
- #4532 Add executable detection and export Codex from the SDK
- #4529 fix: use macros to ensure request/response symmetry
- #4525 Remove legacy codex exec --json format
- #4506 wrap markdown at render time
- #4520 Delete codex proto
- #4521 fix: enable process hardening in Codex CLI for release builds
- #4518 fix: clean up TypeScript exports
- #4512 fix: ensure every variant of ClientRequest has a params field
- #4511 Wire up web search item
- #4508 [SDK] Test that a tread can be continued with extra params
- #3846 chore: prompt update to enforce good usage of apply_patch
- #4474 Named args for custom prompts
- #4503 Support model and sandbox mode in the sdk
- #3197 Add cloud tasks
- #4471 fix: separate `codex mcp` into `codex mcp-server` and `codex app-server`
- #4422 Update MCP docs to reference experimental RMCP client
- #4486 Move PR-style review to top
- #4483 SDK CI
- #4485 Set originator for codex exec
- #4482 Rename conversation to thread in codex exec
- #4481 Add MCP tool call item to codex exec
- #4472 Add some types and a basic test to the SDK
- #3531 Rakesh/support device auth
- #4478 Add turn.failed and rename session created to thread started
- #4476 Custom prompts begin with `/prompts:`
- #4458 Fixes
- #4364 reintroduce "? for shortcuts"
- #4470 Custom prompt args (numeric)
- #4469 no background for /command or @file popup
- #4467 render • as dim
- #4461 [Core]: add tail in the rollout data
- #4455 TypeScript SDK scaffold
- #4456 Parse out frontmatter for custom prompts
- #2677 [mcp-server] Expose fuzzy file search in MCP
- #2103 OpenTelemetry events
- #4447 fix clear-to-end being emitted at the end of a row
- #4419 [CODEX-3595] Remove period when copying highlighted text in iTerm
- #4417 feat: introduce npm module for codex-responses-api-proxy
- #4416 Add /review to main commands
- #4408 fix: clean up some minor issues with .github/workflows/ci.yml
- #4406 feat: build codex-responses-api-proxy for all platforms as part of the GitHub Release
- #4404 chore: remove responses-api-proxy from the multitool
- #4412 chore: lower logging level from error to info for MCP startup
- #4403 chore: move pre_main_hardening() utility into its own crate
- #4405 Improve update nudge
- #4332 chore: remove model upgrade popup
- #4362 fix(tui): make `?` work again
- #4336 fix: remove default timeout of 30s in the proxy
- #4330 Edit the spacing in shortcuts
- #4324 tui: separator above final agent message
- #4335 fix: set gpt-5-codex medium preset reasoning
- #4333 docs: refresh README under codex-rs
- #4316 Add "? for shortcuts"
- #4317 [MCP] Add support for streamable HTTP MCP servers
- #4240 update composer + user message styling
- #4309 Add turn started/completed events and correct exit code on error
- #4307 reject dangerous commands for AskForApproval::Never

## rust-v0.42.0 (2025-09-26T18:42:34Z)
## Notable Changes

- Experimental Rust SDK–based MCP client introduced (#4252)
- New `responses-api-proxy` component to simplify and secure response handling/proxying (#4246)
- Added secure mode: `CODEX_SECURE_MODE=1` to restrict process observability (#4220)
- More explicit `codex exec` events, including `item.started` and improved output display (#4177, #4250, #4113)
- Safer command execution: dangerous command checks in core and Windows-specific safety (#4211, #4119)
- UX improvements:  revamped `/status` with clearer presentation and details, pageless session list, approvals moved to `ListSelectionView`, better MCP tool call styling, and hiding status indicator during streaming (#3194, #4275, #3871, #4101,  #4196)
- Stability and correctness: token usage fix for compaction, SSE mounting reliability, and improving bugs on editing previous conversations (#4281, #4264, #4237)
- IDE extension reliability: fix login with API key when `.codex` directory is missing (#4258)
- Internal cleanup and refactors for state, footer logic, and unused code (#4174, #4259, #4310)

## Merged PRs

- [#4304] /status followup (#4304)
- [#4310] chore: dead code removal; remove frame count and stateful render helpers (#4310)
- [#4252] [MCP] Introduce an experimental official rust sdk based mcp client (#4252)
- [#4255] Add todo-list tool support (#4255)
- [#4246] feat: introduce responses-api-proxy (#4246)
- [#4281] fix: token usage for compaction (#4281)
- [#4113] Show exec output on success with trimmed display (#4113)
- [#4275] Move approvals to use ListSelectionView (#4275)
- [#4259] Refactor the footer logic to a new file (#4259)
- [#4229] ref: state - 2 (#4229)
- [#4211] core: add potentially dangerous command check (#4211)
- [#4264] Actually mount sse once (#4264)
- [#4254] Add codex exec testing helpers (#4254)
- [#4258] Fixed login failure with API key in IDE extension when a `.codex` directory doesn't exist (#4258)
- [#4256] fix typo in sandbox doc (#4256)
- [#4250] [codex exec] Add item.started and support it for command execution (#4250)
- [#4251] fix (#4251)
- [#4248] fix bug when resizing to a smaller width (#4248)
- [#4067] make tests pass cleanly in sandbox (#4067)
- [#4204] Fix error message (#4204)
- [#4177] Add explicit codex exec events (#4177)
- [#4194] chore: refactor attempt_stream_responses() out of stream_responses() (#4194)
- [#4237] fix: esc w/ queued messages overwrites draft in composer (#4237)
- [#4220] feat: add support for CODEX_SECURE_MODE=1 to restrict process observability (#4220)
- [#4196] revamp /status (#4196)
- [#4174] ref: full state refactor (#4174)
- [#4205] github: update codespell action to v2.1 in workflow (#4205)
- [#4195] Send text parameter for non-gpt-5 models (#4195)
- [#4188] chore: drop unused values from env_flags (#4188)
- [#4119] adds a windows-specific method to check if a command is safe (#4119)
- [#3194] pageless session list (#3194)
- [#3871] improve MCP tool call styling (#3871)
- [#4101] hide the status indicator when the answer stream starts (#4101)
- [#4160] Simplify tool implemetations (#4160)

## rust-v0.41.0 (2025-09-24T17:10:52Z)
### Highlights:
- Rate limits visibility: You can see when is your limits resetting (#4111) and see your usage when rate limited (#4102)
- You can specify output schema in `exec` mode using `output-schema`. (#4079)
- Ripgrep (`rg`) is now vendored into the `npm` release (#3660), which should fix issues such as #3842 where the `postinstall` step of `@vscode/ripgrep` would sometimes fail when installing `codex` via `npm`.

### Merged PRs:
#4090 feat: readiness tool
#4088 chore: compact do not modify instructions
#4069 refactor codex card layout
#4105 Use anyhow::Result in tests for error propagation
#4079 Add exec output-schema parameter
#4102 Send limits when getting rate limited
#3461 [exec] add include-plan-tool flag and print it nicely
#3660 fix: vendor ripgrep in the npm module
#4112 fix: npm publish --tag alpha when building an alpha release
#4031 chore(deps): bump serde from 1.0.224 to 1.0.226 in /codex-rs
#4027 chore(deps): bump log from 0.4.27 to 0.4.28 in /codex-rs
#4030 chore(deps): bump tempfile from 3.20.0 to 3.22.0 in /codex-rs
#4135 nit: update auto compact to 250k
#4137 nit: drop instruction override for auto-compact
#4140 chore: extract readiness in a dedicated utils crate
#4111 Add Reset in for rate limits
#4156 nit: 350k tokens
#4124 chore: upgrade to Rust 1.90
#4162 fix: add tolerance for ambiguous behavior in gh run list
#4154 chore: remove once_cell dependency from multiple crates
#2156 chore(deps): bump unicode-width from 0.1.14 to 0.2.1 in /codex-rs
#4028 chore(deps): bump chrono from 0.4.41 to 0.4.42 in /codex-rs

## rust-v0.40.0 (2025-09-23T16:28:39Z)
## Notable Changes

- Default model is now `gpt-5-codex` (#4076)
- Autocompaction is triggered automatically for `gpt-5-codex` when hitting 220k tokens (#4093)
- Usage limits are now visible in `/status` (#4053)
- New `/review` commands (review specific commit, against a base branch, or custom instructions) (#3961)
- The default timeout for MCP tool calls is `60s` and can be overridden in `config.toml` by setting `tool_timeout_sec` for an individual MCP server. (#3959)

## Merged PRs

- [#3881] fix: update try_parse_word_only_commands_sequence() to return commands in order (#3881)
- [#3814] Use a unified shell tell to not break cache (#3814)
- [#3878] Move responses mocking helpers to a shared lib (#3878)
- [#3888] Use helpers instead of fixtures (#3888)
- [#3937] fix alignment in slash command popup (#3937)
- [#3925] don't clear screen on startup (#3925)
- [#3950] Cache keyboard enhancement detection before event streams (#3950)
- [#3965] Forward Rate limits to the UI (#3965)
- [#3977] Tui: Rate limits (#3977)
- [#3961] feat: Add more /review options (#3961)
- [#3880] Add non_sandbox_test helper (#3880)
- [#4044] chore: unify cargo versions (#4044)
- [#4057] chore: more clippy rules 2 (#4057)
- [#3959] timeouts for mcp tool calls (#3959)
- [#4053] Add limits to /status (#4053)
- [#3928] simplify StreamController (#3928)
- [#4020] Tui: fix backtracking (#4020)
- [#4055] Remove /limits after moving to /status (#4055)
- [#4026] feat: Add view stack to BottomPane (#4026)
- [#4059] Change limits warning copy (#4059)
- [#4058] chore: clippy on redundant closure (#4058)
- [#4061] Fix branch mode prompt for /review (#4061)
- [#4060] Change headers and struct of rate limits (#4060)
- [#3952] Fix pager overlay clear between pages (#3952)
- [#3957] fix codex resume message at end of session (#3957)
- [#4068] Truncate potentially long user messages in compact message. (#4068)
- [#4076] feat: update default (#4076)
- [#4064] Add notifier tests (#4064)
- [#4093] chore: enable auto-compaction for `gpt-5-codex` (#4093)
- [#4096] Use TestCodex builder in stream retry tests (#4096)
- [#3914] feat: git tooling for undo (#3914)
- [#4082] fix: usage data tweaks (#4082)
- [#4075] Rate limits warning (#4075)

## rust-v0.39.0 (2025-09-18T21:48:53Z)
## New Features

- new `/review` command introduced in #3774

## Merged PRs:

- [#3874] fix: ensure cwd for conversation and sandbox are separate concerns (#3874)
- [#3774] feat: /review (#3774)
- [#3753] Reland "refactor transcript view to handle HistoryCells" (#3753)
- [#3867] fix error on missing notifications in [tui] (#3867)
- [#3850] chore: use tokio mutex and async function to prevent blocking a worker (#3850)
- [#3849] fix: some nit Rust reference issues (#3849)
- [#3757] hint for codex resume on tui exit (#3757)
- [#3857] Make ESC button work when auto-compaction (#3857)
- [#3729] Unify animations (#3729)
- [#3819] Switch to uuid_v7 and tighten ConversationId usage (#3819)
- [#3777] bug: Ignore tests for now (#3777)
- [#3822] chore: update "Codex CLI harness, sandboxing, and approvals" section (#3822)
- [#3756] Use agent reply text in turn notifications (#3756)
- [#3807] AGENTS.md: Add instruction to install missing commands (#3807)

## rust-v0.38.0 (2025-09-17T18:17:55Z)
This release includes only one change on top of [0.37.0](https://github.com/openai/codex/releases/tag/rust-v0.37.0), which is a fix to the `npm-publish` step in the release process (#3806). Updating `npm` with the latest release is now fully automated, and if you visit https://www.npmjs.com/package/@openai/codex#provenance-details-header, you should now see this special _Provenance_ badge:

<img width="777" height="196" alt="Screenshot 2025-09-17 at 11 24 50 AM" src="https://github.com/user-attachments/assets/faea39e2-9f21-4f60-9053-24e40c77b110" />

Merged PRs:

- [#3806] fix: specify --repo when calling gh (#3806)

## rust-v0.37.0 (2025-09-17T17:59:38Z)
Mostly small quality-of-life fixes in this release.

## Highlights

Updated the npm release process to use ["trusted publishing"](https://docs.npmjs.com/trusted-publishers) (#3431). Though apparently there was a bug, so we may not see the benefit until `0.38.0`. Fix is in #3806.

## Merged PRs

- [#3329] notifications on approvals and turn end (#3329)
- [#3659] chore: restore prerelease logic in rust-release.yml (#3659)
- [#3617] chore(deps): bump serde_json from 1.0.143 to 1.0.145 in /codex-rs (#3617)
- [#3664] chore: simplify dep so serde=1 in Cargo.toml (#3664)
- [#3618] chore(deps): bump serde from 1.0.219 to 1.0.223 in /codex-rs (#3618)
- [#3619] chore(deps): bump wildmatch from 2.4.0 to 2.5.0 in /codex-rs (#3619)
- [45bccd36](https://github.com/openai/codex/commit/45bccd36b038a28b23663189cc6f7557e49e06d0) fix permissions alignment
- [#3673] fix: read-only escalations (#3673)
- [#3680] Update azure model provider example (#3680)
- [#3745] Persist search items (#3745)
- [#3678] fix: Record EnvironmentContext in SendUserTurn (#3678)
- [#3701] Review mode core updates (#3701)
- [#3755] restyle thinking outputs (#3755)
- [#3758] Add dev message upon review out (#3758)
- [#3431] fix: make GitHub Action publish to npm using trusted publishing (#3431)
- [#3763] fix: ensure pnpm is installed before running `npm install` (#3763)
- [#3767] fix: make publish-npm its own job with specific permissions (#3767)
- [#3806] fix: specify --repo when calling gh (#3806)

## rust-v0.36.0 (2025-09-15T17:17:00Z)
### **Breaking change:** `OPENAI_API_KEY` is no longer read from the environment

API login is no longer implicit; we do not pick up `OPENAI_API_KEY` from the environment. To use an API key programmatically, run the following _once_:

```shell
codex login --api-key "your-api-key-here"
```

and this value will be stored in `CODEX_HOME/auth.json`.

The next time you run `codex`, the API key stored in `auth.json` will be used automatically.

To switch to ChatGPT login instead of using your API key, run `codex login`.

Note that `codex logout` will remove whatever login credential is stored in `auth.json` (API key or ChatGPT auth token).

### Highlights

**Introducing our newest model GPT-5-Codex**
GPT-5-Codex works faster through easy tasks and harder on complex tasks, improves on code quality, and is more steerable with AGENTS.md. [Learn More](https://openai.com/index/introducing-upgrades-to-codex/)
  
**Resuming old sessions** 
Resuming old conversations with `codex resume` (#3537, #3625).

**Unified execution and reliability**
Unified execution improvements (#3288, #3479) and race-condition fix (#3644); include command output on timeouts (#3576); do not execute when command parses as a patch (#3382); improved sandbox timeout handling (#3435); flaky test fixes (#3596, #3564).

**Auth and login experience**
- login polish (#3632); fix issue allowing to be both logged in and using API key simultaneously (#3611); fix stray login URL characters (#3639); fix `get_auth_status` for custom providers (#3581).

**JSON-RPC and MCP**
JSON-RPC: `SetDefaultModel` and `None` clears default (#3512, #3529), `UserInfo` (#3428), `reasoning_effort` in `NewConversationResponse` (#3506); initial MCP interface and docs (#3543, #3507, #3345); standardized shell description (#3514).

**TUI onboarding and polish**
New onboarding flow and animation (#3398, #3631, #3590, #3627), consistent headers on resume (#3615, #3592), improved spacing/padding (#3469, #3471, #3472, #3474), clearer interruption and status styling (#3470), numerous UX nits addressed (#3650, #3534).

**Core platform**
Experimental automatic context compaction (#3446); expanded default sandbox (#3483); Azure Responses API workaround (#3528); preserve more item IDs in Azure (#3542); logging and clippy improvements (#3488, #3489); `just test` via nextest (#3508).

### All merged PRs

- fix: change MIN_ANIMATION_HEIGHT so show_animation is calculated correctly (#3656)
- feat: tweak onboarding strings (#3650)
- fix stray login url characters persisting in login (#3639)
- Add file reference guidelines to gpt-5 prompt (#3651)
- feat: skip animations on small terminals (#3647)
- chore: rename (#3648)
- fix: add references (#3633)
- chore: set `prerelease:true` for now (#3645)
- fix: race condition unified exec (#3644)
- feat: update splash (#3631)
- chore(deps): bump tracing-subscriber from 0.3.19 to 0.3.20 in /codex-rs (#3620)
- chore(deps): bump slab from 0.4.10 to 0.4.11 in /codex-rs (#3635)
- Login flow polish (#3632)
- Fix codex resume so flags (cd, model, search, etc.) still work (#3625)
- feat: tighten preset filter, tame storage load logs, enable rollout prompt by default (#3628)
- Show abort in the resume (#3629)
- Change animation frames (#3627)
- initial mcp add interface (#3543)
- chore: update prompts for gpt-5-code (#3624)
- feat: add reasoning level to header (#3622)
- Revert "refactor transcript view to handle HistoryCells" (#3614)
- Show the header when resuming a conversation (#3615)
- When logging in using ChatGPT, make sure to overwrite API key (#3611)
- Don't show the model for apikey (#3607)
- Fix get_auth_status response when using custom provider (#3581)
- fix: model family and apply_patch consistency (#3603)
- fix(tui): update full-auto to default preset (#3608)
- fix(core): flaky test `completed_commands_do_not_persist_sessions` (#3596)
- Skip frames files in codespell (#3606)
- Add session header to chat widget (#3592)
- Append full raw reasoning event text (#3605)
- feat: UI animation (#3590)
- Fix EventMsg Optional (#3604)
- Single branch for gpt-5-code (#3601)
- enable-resume (#3537)
- feat: update model save (#3589)
- Fix flaky windows test (#3564)
- Fix gpt-5-code model selector (#3598)
- Add per-model-family prompts (#3597)
- Include command output when sending timeout to model (#3576)
- Align user history message prefix width (#3467)
- Gate model upgrade prompt behind ChatGPT auth (#3586)
- chore: update `output_lines()` to take a struct instead of bools (#3591)
- Add spacing before queued status indicator messages (#3474)
- Handle resuming/forking after compact (#3533)
- refactor transcript view to handle HistoryCells (#3538)
- Default gpt-5-code models to experimental reasoning summaries (#3560)
- Preserve IDs for more item types in azure (#3542)
- Always request encrypted cot (#3539)
- Review Mode (Core) (#3401)
- fix: NIT None reasoning effort (#3536)
- Fix NUX UI (#3534)
- core: expand default sandbox (#3483)
- Add Azure Responses API workaround (#3528)
- if a command parses as a patch, do not attempt to run it (#3382)
- Update interruption error message styling (#3470)
- feat: context compaction (#3446)
- Add spacing before composer footer hints (#3469)
- Add spacing between dropdown headers and items (#3472)
- feat: reasoning effort as optional (#3527)
- feat: change the behavior of SetDefaultModel RPC so None clears the value. (#3529)
- standardize shell description (#3514)
- bug: fix model save (#3525)
- Add spacing to timer duration formats (#3471)
- MCP Documentation Changes Requests in Code Review (#3507)
- chore: add `just test`, which runs `cargo nextest` (#3508)
- feat: added SetDefaultModel to JSON-RPC server (#3512)
- feat: include reasoning_effort in NewConversationResponse (#3506)
- add(readme): IDE (#3494)
- Log cf-ray header in client traces (#3488)
- bug: default to image (#3501)
- feat: TUI onboarding (#3398)
- Use PlanType enum when formatting usage-limit CTA (#3495)
- Add more detailed documentation on MCP server usage (#3345)
- fix: improve `handle_sandbox_error` timeouts (#3435)
- chore: enable `clippy::redundant_clone` (#3489)
- Assign the entire gpt-5 model family same characteristics (#3490)
- Clear composer on fork (#3445)
- fix: use -F instead of -f for force=true in gh call (#3486)
- Add Compact and Turn Context to the rollout items (#3444)
- NIT unified exec (#3479)
- Simplify auth flow and reconcile differences between ChatGPT and API Key auth (#3189)
- apply-patch: sort replacements and add regression tests (#3425)
- chore: rust-release.yml should update the latest-alpha-cli branch (#3458)
- fix: add check to ensure output of `generate_mcp_types.py` matches `codex-rs/mcp-types/src/lib.rs` (#3450)
- Change forking to read the rollout from file (#3440)
- Unified execution (#3288)
- feat: add UserInfo request to JSON-RPC server (#3428)
- fix: ensure output of `codex-rs/mcp-types/generate_mcp_types.py` matches `codex-rs/mcp-types/src/lib.rs` (#3439)
- fix trampling projects table when accepting trusted dirs (#3434)
- put workspace roots in the environment context (#3375)

## rust-v0.35.0 (2025-09-15T16:04:56Z)
See [0.36.0](https://github.com/openai/codex/releases/tag/rust-v0.36.0)

## rust-v0.34.0 (2025-09-10T21:27:08Z)
#3436: hotfix for issue that prevented Codex from initializing external MCP servers

## Merged PRs

- [#2799] Persist model & reasoning changes (#2799)
- [#3436] Make user_agent optional (#3436)

## rust-v0.33.0 (2025-09-10T19:53:13Z)
## Codex 0.33.0

Key change is https://github.com/openai/codex/pull/3430, which reverts https://github.com/openai/codex/pull/3179 because it introduced a regression.

New Features:
- Try out the new Markdown renderer on #3396.

## Merged PRs

- [#3394] alt+delete deletes the word to the right of the cursor (delete_forward_word) (#3394)
- [#3380] Introduce rollout items  (#3380)
- [#3395] Set a user agent suffix when used as a mcp server (#3395)
- [#3357] fix: remove unnecessary #[allow(dead_code)] annotation (#3357)
- [#3422] Move initial history to protocol (#3422)
- [#3400] Added images to `UserMessageEvent` (#3400)
- [#3356] fix: remove empty file: chatwidget_stream_tests.rs (#3356)
- [#2703] docs: fix codex exec heading typo (#2703)
- [#2858] Remove a broken link to prompting_guide.md in docs/getting-started.md (#2858)
- [#3427] Improved resiliency of two auth-related tests (#3427)
- [#3396] replace tui_markdown with a custom markdown renderer (#3396)
- [#3430] Back out "feat: POSIX unification and snapshot sessions (#3179)" (#3430)

## rust-v0.32.0 (2025-09-10T17:24:16Z)
### Codex 0.32.0

- MCP: add UA suffix when acting as a server; a few stability/compat tweaks
- OSS: Broader `apply_patch` OSS compatibility.
- Rollouts: initial groundwork and `rollout_path` included in responses.
- TUI: Alt+Delete deletes the next word.
- Protocol/Types: `ArchiveConversation` request; small exports and TS type improvements.
- CI/Build: faster tests with `nextest`, add `shear`; minor macOS permission adjustment.
- Docs: clarified shell quoting in config.

### Merged PRs

- [#3395] Set a user agent suffix when used as a mcp server
- [#3394] alt+delete deletes the word to the right of the cursor (delete_forward_word)
- [#3390] Do not send reasoning item IDs
- [#3388] Replace config.responses_originator_header_internal_override with CODEX_INTERNAL_ORIGINATOR_OVERRIDE_ENV_VAR
- [#3387] No fail fast
- [#3380] Introduce rollout items
- [#3374] tweak "failed to find expected lines" message in apply_patch
- [#3357] fix: remove unnecessary #[allow(dead_code)] annotation
- [#3353] feat: add ArchiveConversation to ClientRequest
- [#3352] fix: include rollout_path in NewConversationResponse
- [#3338] feat: Run cargo shear during CI
- [#3334] allow mach-lookup for com.apple.system.opendirectoryd.libinfo
- [#3323] chore: try switching to cargo nextest to speed up CI builds
- [#3222] fix: LoginChatGptCompleteNotification does not need to be listed explicitly in protocol-ts
- [#3270] feat(core): re-export InitialHistory from conversation_manager
- [#3219] Generate more typescript types and return conversation id with ConversationSummary
- [#3179] feat: POSIX unification and snapshot sessions
- [#3169] Improve explanation of how the shell handles quotes in config.md
- [#2811] Include apply_patch tool for oss models from gpt-oss providers with different naming convention (e.g. openai/gpt-oss-*)

## rust-v0.31.0 (2025-09-08T21:32:22Z)
### Codex 0.31.0

- https://github.com/openai/codex/pull/3182 added support for a `startup_timeout_ms` option when declaring an MCP server [(docs)](https://github.com/openai/codex/blob/main/docs/config.md#mcp_servers), which has been a highly requested feature, particularly for Windows users:
  - Issue: https://github.com/openai/codex/issues/3196
  - Issue: https://github.com/openai/codex/issues/2346
  - Issue: https://github.com/openai/codex/issues/2555
  - PR: https://github.com/openai/codex/pull/3249
  - PR: https://github.com/openai/codex/pull/3326
  - PR: https://github.com/openai/codex/pull/3006
  - and more...
- Thanks to @Bit-urd for adding more fault tolerance to MCP startup: https://github.com/openai/codex/pull/3243 
- #3211 fixes image pasting from Finder with `ctrl+v` on macOS

### Merged PRs

- [#3217] Added logic to cancel pending oauth login to free up localhost port
- [#3220] feat(tui): show minutes/hours in thinking timer
- [#3223] Added CLI version to `/status` output
- [#3176] [codex] respect overrides for model family configuration from toml file
- [#3226] chore: rewrite codex-rs/scripts/create_github_release.sh in Python
- [#3228] chore: change create_github_release to create a fresh clone in a temp directory
- [#3230] chore: use gh instead of git to do work to avoid overhead of a local clone
- [#3231] fix: change create_github_release to take either --publish-alpha or --publish-release
- [#3221] Move token usage/context information to session level
- [#3285] Clear non-empty prompts with ctrl + c
- [#3282] Use ConversationId instead of raw Uuids
- [#3300] docs: fix broken link to the "Memory with AGENTS.md" section in codex/README.md
- [#3182] feat(mcp): per-server startup timeout
- [#3294] chore(deps): bump insta from 1.43.1 to 1.43.2 in /codex-rs
- [#3295] chore(deps): bump tree-sitter from 0.25.8 to 0.25.9 in /codex-rs
- [#3296] chore(deps): bump clap from 4.5.45 to 4.5.47 in /codex-rs
- [#3297] chore(deps): bump image from 0.25.6 to 0.25.8 in /codex-rs
- [#3243] fix: improve MCP server initialization error handling #3196 #2346 #2555
- [#3211] tui: paste with ctrl+v checks file_list
- [#3316] chore: upgrade to actions/setup-node@v5
- [#3320] Add a getUserAgent MCP method
- [#3319] Highlight Proposed Command preview


## rust-v0.30.0 (2025-09-05T22:07:26Z)
### Codex 0.30.0
- **Breaking**: Stop loading project `.env` files automatically.
- **Security/behavior**: Never store requests; free port by canceling pending OAuth login.
- **Core/infra**: Introduce rollout policy; shared HTTP client; improved remaining context size; refined reasoning summary config/handling; corrected sandboxed shell tool description; improved server notification serialization.
- **TUI/UX**: Fix approval dialog for large commands; pause status timer during modals; pager auto‑scroll; bash syntax highlighting; mac key glyphs; avoid zero‑height panic; improved @ file search (hidden dirs).
- **DevEx/docs**: Recommended VS Code extensions; AGENTS.md prompt and clarifications; updated API key guidance; CI fixes.
- **Deps**: Bump `uuid` and `wiremock`.
- **Windows**: no more asking for approvals on Full Access mode

### Merged PRs
- [#3218] hide resume until it's complete
- [#3217] Added logic to cancel pending oauth login to free up localhost port
- [#3212] Never store requests
- [#3193] chore: improve serialization of ServerNotification
- [#3191] refactor: remove AttachImage tui event
- [#3190] Correctly calculate remaining context size
- [#3187] ZSH on UNIX system and better detection
- [#3185] MCP: add session resume + history listing;
- [#3184] [BREAKING] Stop loading project .env files
- [#3172] chore: add rust-lang.rust-analyzer and vadimcn.vscode-lldb to the list of recommended extensions
- [#3171] [codex] move configuration for reasoning summary format to model family config type
- [#3170] fix: fix serde_as annotation and verify with test
- [#3167] tui: pager pins scroll to bottom
- [#3163] fix: use a more efficient wire format for ExecCommandOutputDeltaEvent.chunk
- [#3146] fix: add callback to map before sending request to fix race condition
- [#3143] Use ⌥⇧⌃ glyphs for key hints on mac
- [#3142] syntax-highlight bash lines
- [#3138] [codex] improve handling of reasoning summary
- [#3135] TUI: Add session resume picker (--resume) and quick resume (--continue)
- [#3134] [tui] Update /mcp output
- [#3133] tui: avoid panic when active exec cell area is zero height
- [#3132] AGENTS.md: clarify test approvals for codex-rs
- [#3131] Pause status timer while modals are open
- [#3130] Fix failing CI
- [#3128] MCP sandbox call
- [#3127] Dividing UserMsgs into categories to send it back to the tui
- [#3123] Replay EventMsgs from Response Items when resuming a session with history.
- [#3122] prompt to read AGENTS.md files
- [#3121] remove bold the keyword from prompt
- [#3118] [codex] document `use_experimental_reasoning_summary` toml key config
- [#3117] Include originator in authentication URL parameters
- [#3116] Introduce Rollout Policy
- [#3112] Update guidance on API key permissions
- [#3110] Add a common way to create HTTP client
- [#3093] [mcp-server] Update read config interface
- [#3087] tui: fix approval dialog for large commands
- [#3069] core: correct sandboxed shell tool description (reads allowed anywhere)
- [#3056] chore: Clean up verbosity config
- [#2988] Auto-approve DangerFullAccess patches on non-sandboxed platforms
- [#2981] Improve @ file search: include specific hidden dirs such as .github, .gitlab
- [#2666] chore(deps): bump wiremock from 0.6.4 to 0.6.5 in /codex-rs
- [#2493] chore(deps): bump uuid from 1.17.0 to 1.18.0 in /codex-rs

## rust-v0.29.0 (2025-09-03T08:32:19Z)
### Codex 0.29.0
  - **Android/Termux support** by gating `arboard` on unsupported targets.
  - **Stable, cross‑platform file locking** using std `fs` APIs.
  - **Auth consolidation**: `CodexAuth` and `AuthManager` moved into the `core` crate.
  - **Rate‑limit handling restored** for API‑key usage.
  - **Core rollout refactor**: extract `rollout` module, add listing API, return file heads.
  - **Quality of life**: support `cd foo && ...` in `exec`/`apply_patch`, fix TUI flicker, prefer ratatui `Stylize`.
  - **Distribution**: include Windows ARM64 executable in the npm package.
  - **Switch to the latest search tool**.

### Merged PRs
- [#3086] Use the new search tool
- [#1634] core(rollout): extract rollout module, add listing API, and return file heads
- [#2895] Add Android/Termux support by gating arboard dependency
- [#2894] Add stable file locking using std::fs APIs
- [#3074] Move CodexAuth and AuthManager to the core crate
- [#3070] Add back rate‑limit error handling when using API key
- [#3083] Parse “cd foo && ...” for exec and apply_patch
- [#3068] Prefer ratatui Stylize for constructing lines/spans
- [#2918] TUI: fix occasional UI flicker
- [#3061] Show loading state when @ search results are pending
- [#2907] TUI: fix MCP docs hyperlink in empty_mcp_output
- [#3067] Include arm64 Windows executable in npm module
- [#2736] Unify history loading
- [#3071] Use experimental reasoning summary
- [#2461] Improve gpt‑oss compatibility
- [#2651] apply‑patch: fix lark grammar
- [#3089] Docs: update link to https://agents.md/
- [#3082] Docs: fix typo of config.md
- [#2667] Bump thiserror from 2.0.12 to 2.0.16 in codex‑rs

## rust-v0.28.0 (2025-09-02T22:20:34Z)
- [Highlights]
  - TUI polish and stability improvements: reduced typing lag, cleaner streamed message formatting, better error handling, and improved input behavior.
  - Better Windows ARM build reliability and faster release-time builds.
- [TUI/UX]
  - Fix laggy typing (#2922)
  - Rework message styling for clarity (#2877)
  - Remove extra blank lines in streamed agent messages (#3065)
  - Hide “/init” suggestion when `AGENTS.md` exists (#3038)
  - Ignore Enter on empty input to avoid queuing blank messages (#3047)
  - Catch `get_cursor_position` errors to avoid crashes (#2870)
  - Remove extra quote from disabled-command message (#3035)
- [Build & CI]
  - Leverage Windows 11 ARM for Windows ARM builds (#3062)
  - Install `zstd` on Windows 11 ARM image used for releases (#3066)
  - Populate Windows cache for release builds when PRs are opened (#2884)
- [Docs]
  - Fix config reference table (#3063)
  - Update PR template link after docs refactor (#2982)
- [Logging/Telemetry]
  - Add logs when users change the model (#3060)
- [Dependencies]
  - Bump `regex-lite` to 0.1.7 in `codex-rs` (#3010)
 
### PRs merged
- [#3066](https://github.com/openai/codex/pull/3066) fix: install zstd on the windows-11-arm image used to cut a release
- [#3065](https://github.com/openai/codex/pull/3065) tui: fix extra blank lines in streamed agent messages
- [#3063](https://github.com/openai/codex/pull/3063) fix config reference table
- [#3062](https://github.com/openai/codex/pull/3062) fix: leverage windows-11-arm for Windows ARM builds
- [#3060](https://github.com/openai/codex/pull/3060) Add logs to know when we users are changing the model
- [#3047](https://github.com/openai/codex/pull/3047) Bug fix: ignore Enter on empty input to avoid queuing blank messages
- [#3038](https://github.com/openai/codex/pull/3038) tui: hide '/init' suggestion when AGENTS.md exists
- [#3035](https://github.com/openai/codex/pull/3035) remove extra quote from disabled-command message
- [#3010](https://github.com/openai/codex/pull/3010) chore(deps): bump regex-lite from 0.1.6 to 0.1.7 in /codex-rs
- [#2982](https://github.com/openai/codex/pull/2982) Fix: Adapt pr template with correct link following doc refacto
- [#2922](https://github.com/openai/codex/pull/2922) tui: fix laggy typing
- [#2884](https://github.com/openai/codex/pull/2884) fix: try to populate the Windows cache for release builds when PRs are put up for review
- [#2877](https://github.com/openai/codex/pull/2877) rework message styling
- [#2870](https://github.com/openai/codex/pull/2870) tui: catch get_cursor_position errors

## rust-v0.27.0 (2025-08-29T06:15:04Z)
### Codex 0.27.0
  - **MCP stability**: drop mutexes earlier and avoid lock ordering pitfalls.
  - **Channel reliability**: switch to unbounded channel to prevent stalls.
  - **Performance/cleanup**: remove unnecessary flush() calls.
  - **CI**: fix release build; specify `--profile` for `cargo clippy`.
  - **Docs**: safer Homebrew snippet; suggest `just fix -p` in `AGENTS.md`.

### Merged PRs
- [#2881] Suggest just fix -p in agents.md
- [#2878] fix: drop Mutexes earlier in MCP server
- [#2876] fix: drop Mutex before calling tx_approve.send()
- [#2874] fix: switch to unbounded channel
- [#2873] fix: remove unnecessary flush() calls
- [#2871] fix: specify --profile to cargo clippy in CI
- [#2868] Bugfix: Prevents `brew install codex` in comment to be executed
- [#2864] Fix CI release build

## rust-v0.26.0 (2025-08-29T03:34:49Z)
## Highlights:

### New Features
- Custom `/prompts` loaded from `~/.codex/prompts` (#2696)
- New "View Image" tool to let Codex agentically view local images (#2723)
- MCP `GetConfig` endpoint to inspect resolved settings (#2725)

### TUI
- Fix image pasting in Windows + improve burst paste handling (#2683)
- Prevent slash commands during an active task (#2792)
- Fix cursor position when suspending (^Z) (#2690)
- Reduce doubled lines and hanging list markers (#2789)

### Docs & Templates
- Major README/docs refactor and navigation (#2724)
- CHANGELOG now points to Releases page (#2780)
- Add VS Code Extension issue template (#2853)


## Full list of merged PRs:

- #2864 Fix CI release build
- #2747 Bug fix: clone of incoming_tx can lead to deadlock
- #2852 Following up on #2371 post commit feedback
- #2696 Custom /prompts
- #2762 UI: Make slash commands bold in welcome message
- #2737 Changed OAuth success screen to use the string "Codex" rather than "Codex CLI"
- #2853 Add a VS Code Extension issue template
- #2683 burst paste edge cases
- #2746 Race condition in compact
- #2849 chore: print stderr from MCP server to test output using eprintln!
- #2848 chore: try to make it easier to debug the flakiness of test_shell_command_approval_triggers_elicitation
- #2845 chore: require uninlined_format_args from clippy
- #2792 disallow some slash commands while a task is running
- #2723 Add "View Image" tool
- #2690 fix cursor after suspend
- #2789 fix (most) doubled lines and hanging list markers
- #2780 Point the CHANGELOG to the releases page
- #2778 Added back codex-rs/config.md to link to new location
- #2724 README / docs refactor
- #2776 fix: for now, limit the number of deltas sent back to the UI
- #2725 [mcp-server] Add GetConfig endpoint

## rust-v0.25.0 (2025-08-27T08:42:26Z)
## Highlights:

### New Features
- Core: remove_conversation API for manual cleanup in long‑lived servers (#2613)
- TUI: mouse wheel alternate scrolling in transcript/diff views (#2686)
- TUI: Alt+Ctrl+H deletes the previous word (parity with Alt+Backspace) (#2717)
- Execution: include context window on task_started events; model may vary per turn (#2752)

### TUI
- Cache transcript line wraps to keep long transcripts responsive (#2739)
- Fix transcript lines appending to diff while a turn is running (#2721)
- Improve emoji rendering: proper spacing and ⌨️ emoji variant (#2735, #2728)
- ESC with queued messages returns them to the composer (#2687)
- Prevent crash when backspacing placeholders near multibyte text (#2674)

### Tools and execution
- Don’t send Exec deltas on apply_patch (#2742)
- Make git_diff_against_sha more robust (ignore custom drivers; handle dash‑prefixed files) (#2749)
- Reduce test load when running interactively (#2707)

### Misc
- Deduplicate assistant messages in history (#2758)
- Remove the Codex GitHub Action for now (#2729)


## Full list of merged PRs:

 - #2758 [fix] Deduplicate assistant messages
 - #2752 [feat] Send context window with task started (model may change per turn)
 - #2749 [fix] Make git_diff_against_sha more robust
 - #2739 [perf] Cache transcript wraps
 - #2707 [feat] Decrease testing when running interactively
 - #2742 [fix] Don’t send Exec deltas on apply patch
 - #2674 [fix] Crash when backspacing placeholders adjacent to multibyte text
 - #2735 [fix] Emoji spacing
 - #2721 [fix] Transcript lines added to diff view during running turn
 - #2717 [feat] Alt+Ctrl+H deletes backward word
 - #2687 [feat] Esc with queued messages returns them to composer
 - #2728 [tui] Render keyboard icon with emoji variation selector (⌨️)
 - #2613 [feat(core)] Add remove_conversation to ConversationManager
 - #2729 [chore] Remove GitHub Action that runs Codex
 - #2686 [feat] Enable alternate scroll in transcript mode



## rust-v0.24.0 (2025-08-26T17:40:56Z)
## Highlights:

### New Features
- Queued messages (#2637)
- Copy Paste / Drag & Drop image files (#2567)
- Transcript mode (Ctrl+T) with scrolling ability (#2525)
- Edit/resume conversation (esc-esc) from previous messages (#2607)
- Web search when using explicit --search option (#2371)


### TUI
- Hide CoT by default; show headers in status indicator (#2316)
- Show diff output in pager (+ with hunk headers) (#2568)
- Simplify command approval UI (#2708)
- Unify Esc/Ctrl+C interrupt handling (#2661)
- Fix windows powershell paste (#2544)

### Tools and execution
- Add support for long-running shell commands `exec_command`/`write_stdin` (#2574)
- Improve apply_patch reliability (#2646)
- Cap retry counts (#2701)
- Improve cache hit rate by sorting MCP tools deterministically (#2611)

### Misc
- Add model_verbosity config for GPT-5 (#2108)
- Read all AGENTS.md files up to git root (#2532)
- Fix git root resolution in worktrees (#2585)
- Improve error messages & handling (#2695, #2587, #2640, #2540)


## Full list of merged PRs:

 - #2708 [feat] Simplfy command approval UI
 - #2706 [chore] Tweak AGENTS.md so agent doesn't always have to test
 - #2701 Added caps on retry config settings
 - #2702 [fix] emoji padding
 - #2704 [feat] reduce bottom padding to 1 line
 - #2695 Improved user message for rate-limit errors
 - #2691 single control flow for both Esc and Ctrl+C
 - #2699 Fixed a bug that causes token refresh to not work in a seamless manner
 - #2587 do not show timeouts as "sandbox error"s
 - #2693 queued messages rendered italic
 - #2692 do not schedule frames for Tui::Draw events in backtrack
 - #2567 Copying / Dragging image files (MacOS Terminal + iTerm)
 - #2688 Add auth to send_user_turn
 - #2661 Fix esc
 - #2648 [exec] Clean up apply-patch tests
 - #2684 fix: use backslash as path separator on Windows
 - #2637 tui: queue messages
 - #2640 avoid error when /compact response has no token_usage (#2417)
 - #2678 Index file
 - #2665 chore(deps): bump toml_edit from 0.23.3 to 0.23.4 in /codex-rs
 - #2664 fix: Scope ExecSessionManager to Session instead of using global singleton
 - #2663 fix: build is broken on main; introduce ToolsConfigParams to help fix
 - #2611 Fix cache hit rate by making MCP tools order deterministic
 - #2649 fix: update gpt-5 stats
 - #2497 chore(deps): bump whoami from 1.6.0 to 1.6.1 in /codex-rs
 - #2646 feat: use the arg0 trick with apply_patch
 - #2643 [apply_patch] disable default freeform tool
 - #2633 test: faster test execution in codex-core
 - #2607 Resume conversation from an earlier point in history
 - #2371 Add web search tool
 - #2364 send-aggregated output
 - #2605 transcript hint
 - #2381 Add the ability to interrupt and provide feedback to the model
 - #2574 feat: StreamableShell with exec_command and write_stdin tools
 - #2575 fork conversation from a previous message
 - #2600 tui: fix resize on wezterm
 - #2590 tui: coalesce command output; show unabridged commands in transcript
 - #2592 tui: open transcript mode at the bottom
 - #2518 Fix typo in AGENTS.md
 - #2492 chore(deps): bump reqwest from 0.12.22 to 0.12.23 in /codex-rs
 - #2547 Fix flakiness in shell command approval test
 - #2498 chore(deps): bump serde_json from 1.0.142 to 1.0.143 in /codex-rs
 - #2595 Move models.rs to protocol
 - #2594 fix: prefer sending MCP structuredContent as the function call response, if available
 - #2586 test: simplify tests in config.rs
 - #2593 improve performance of 'cargo test -p codex-tui'
 - #2585 [config] Detect git worktrees for project trust
 - #2576 [apply_patch] freeform apply_patch tool
 - #2577 Add AuthManager and enhance GetAuthStatus command
 - #2544 Fix/tui windows multiline paste
 - #1695 ctrl+v image + @file accepts images
 - #2569 improve suspend behavior
 - #2108 feat(gpt5): add model_verbosity for GPT‑5 via Responses API
 - #2568 show diff output in the pager
 - #2539 [apply-patch] Clean up apply-patch tool definitions
 - #2571 [shell_tool] Small updates to ensure shell consistency
 - #2523 core: write explicit [projects] tables for trusted projects
 - #2533 tweak thresholds for shimmer on non-true-color terminals
 - #2564 Update README.md
 - #2562 tui: transcript mode updates live
 - #2536 refactor: move slash command handling into chatwidget
 - #2488 tui: show diff hunk headers to separate sections
 - #2532 read all AGENTS.md up to git root
 - #2535 scroll instead of clear on boot
 - #2540 Parse and expose stream errors
 - #2272 [prompt] xml-format EnvironmentContext
 - #2546 Add a serde tag to ParsedItem
 - #2496 Added new auth-related methods and events to mcp server
 - #2537 tui: show upgrade banner in history
 - #2538 show thinking in transcript
 - #2316 hide CoT by default; show headers in status indicator
 - #2525 add transcript mode
 - #2319 Bridge command generation to powershell when on Windows
 - #2534 fix: update build cache key in .github/workflows/codex.yml
 - #2516 tui: link docs when no MCP servers configured
 - #2528 Fix login for internal employees
 - #2524 refactor onboarding screen to a separate "app"
 - #2477 [apply-patch] Fix applypatch for heredocs
 - #2489 tui: switch to using tokio + EventStream for processing crossterm events
 - #2362 tui: tab-completing a command moves the cursor to the end
 - #2437 detect terminal and include in request headers
 - #2502 feat: copy tweaks

## rust-v0.23.0 (2025-08-20T05:48:52Z)
- Highlights
  - New commands and controls: support `/mcp` in TUI (#2430) and a slash command `/approvals` to control approvals (#2474).
  - Reasoning controls: change reasoning effort and model at runtime (#2435) `/model`; add “minimal” effort for GPT‑5 models (#2326).
  - Auth improvements: show login options when not signed in with ChatGPT (#2440) and auto‑refresh ChatGPT auth token (#2484).
  - UI/UX polish: Ghostty Ctrl‑b/Ctrl‑f fallback (#2427), Ctrl+H as backspace (#2412), cursor position tweak after tab completion (#2442), color/accessibility updates (#2401, #2421).
  - Distribution/infra: zip archived binaries added to releases (#2438) and DotSlash entry for Windows x86_64 (#2361); upgraded to Rust 1.89 (#2465, #2467).

- Full list of merged PRs
  - [#2352](https://github.com/openai/codex/pull/2352) tui: skip identical consecutive entries in local composer history
  - [#2355](https://github.com/openai/codex/pull/2355) fix: introduce codex-protocol crate
  - [#2326](https://github.com/openai/codex/pull/2326) Fix #2296 Add "minimal" reasoning effort for GPT 5 models
  - [#2357](https://github.com/openai/codex/pull/2357) Remove duplicated "Successfully logged in message"
  - [#2337](https://github.com/openai/codex/pull/2337) color the status letter in apply patch summary
  - [#2336](https://github.com/openai/codex/pull/2336) chore: remove duplicated lockfile
  - [#2361](https://github.com/openai/codex/pull/2361) fix: include an entry for windows-x86_64 in the generated DotSlash file
  - [#2245](https://github.com/openai/codex/pull/2245) Show progress indicator for /diff command
  - [#2314](https://github.com/openai/codex/pull/2314) replace /prompts with a rotating placeholder
  - [#2372](https://github.com/openai/codex/pull/2372) Added launch profile for attaching to a running codex CLI process
  - [#2373](https://github.com/openai/codex/pull/2373) Added MCP server command to enable authentication using ChatGPT
  - [#2388](https://github.com/openai/codex/pull/2388) fix: refactor login/src/server.rs so process_request() is a separate function
  - [#2365](https://github.com/openai/codex/pull/2365) fix: introduce EventMsg::TurnAborted
  - [#2360](https://github.com/openai/codex/pull/2360) remove mcp-server/src/mcp_protocol.rs and the code that depends on it
  - [#2401](https://github.com/openai/codex/pull/2401) fix: clean up styles & colors and define in styles.md
  - [#2411](https://github.com/openai/codex/pull/2411) chore(deps-dev): bump @types/node in /.github/actions/codex
  - [#2421](https://github.com/openai/codex/pull/2421) fix: stop using ANSI blue
  - [#2423](https://github.com/openai/codex/pull/2423) chore: move mcp-server/src/wire_format.rs to protocol/src/mcp_protocol.rs
  - [#2424](https://github.com/openai/codex/pull/2424) chore: add TS annotation to generated mcp-types
  - [#2428](https://github.com/openai/codex/pull/2428) consolidate reasoning enums into one
  - [#2431](https://github.com/openai/codex/pull/2431) Add an operation to override current task context
  - [#2425](https://github.com/openai/codex/pull/2425) protocol-ts
  - [#2432](https://github.com/openai/codex/pull/2432) Add cache tests for UserTurn
  - [#2412](https://github.com/openai/codex/pull/2412) Fix #2391 Add Ctrl+H as backspace keyboard shortcut
  - [#2405](https://github.com/openai/codex/pull/2405) chore(deps): bump anyhow in /codex-rs
  - [#2406](https://github.com/openai/codex/pull/2406) chore(deps): bump libc in /codex-rs
  - [#2389](https://github.com/openai/codex/pull/2389) chore: prefer returning Err to expect()
  - [#2393](https://github.com/openai/codex/pull/2393) fix: async-ify login flow
  - [#2404](https://github.com/openai/codex/pull/2404) chore(deps): bump clap in /codex-rs
  - [#2394](https://github.com/openai/codex/pull/2394) fix: change `shutdown_flag` from `Arc<AtomicBool>` to `tokio::sync::Notify`
  - [#2438](https://github.com/openai/codex/pull/2438) Release zip archived binaries
  - [#2395](https://github.com/openai/codex/pull/2395) fix: eliminate ServerOptions.login_timeout and use tokio::time::timeout()
  - [#2396](https://github.com/openai/codex/pull/2396) fix: make ShutdownHandle a private field of LoginServer
  - [#2398](https://github.com/openai/codex/pull/2398) fix: reduce references to Server in codex-login crate
  - [#2399](https://github.com/openai/codex/pull/2399) fix: remove shutdown_flag param to run_login_server()
  - [#2403](https://github.com/openai/codex/pull/2403) chore(deps): bump clap_complete in /codex-rs
  - [#2440](https://github.com/openai/codex/pull/2440) Show login options when not signed in with ChatGPT
  - [#2446](https://github.com/openai/codex/pull/2446) fix: exclude sysprompt etc from context left %
  - [#2430](https://github.com/openai/codex/pull/2430) [tui] Support /mcp command
  - [#2442](https://github.com/openai/codex/pull/2442) Fix #2429 Tweak the cursor position after tab completion
  - [#2457](https://github.com/openai/codex/pull/2457) fix: fix missing spacing in review decision response
  - [#2427](https://github.com/openai/codex/pull/2427) tui: support Ghostty Ctrl-b/Ctrl-f fallback
  - [#2407](https://github.com/openai/codex/pull/2407) chore(deps): bump actions/checkout from 4 to 5
  - [#2435](https://github.com/openai/codex/pull/2435) Support changing reasoning effort
  - [#2462](https://github.com/openai/codex/pull/2462) feat: move session ID bullet in /status
  - [#2464](https://github.com/openai/codex/pull/2464) docs: document writable_roots for sandbox_workspace_write
  - [#2466](https://github.com/openai/codex/pull/2466) fix: prefer `cargo check` to `cargo build` to save time and space
  - [#2465](https://github.com/openai/codex/pull/2465) chore: upgrade to Rust 1.89
  - [#2467](https://github.com/openai/codex/pull/2467) chore: Rust 1.89 promoted file locking to stdlib
  - [#2468](https://github.com/openai/codex/pull/2468) fix apply patch when only one file is rendered
  - [#2475](https://github.com/openai/codex/pull/2475) Fix: Sign in appear even if using other providers.
  - [#2460](https://github.com/openai/codex/pull/2460) Enable Dependabot updates for Rust toolchain
  - [#2476](https://github.com/openai/codex/pull/2476) Diff command
  - [#2487](https://github.com/openai/codex/pull/2487) Client headers
  - [#2484](https://github.com/openai/codex/pull/2484) Refresh ChatGPT auth token
  - [#2495](https://github.com/openai/codex/pull/2495) fix: prefer config var to env var
  - [#2474](https://github.com/openai/codex/pull/2474) Add a slash command to control permissions

## rust-v0.22.0 (2025-08-15T17:31:58Z)
- https://github.com/openai/codex/pull/2294 moves the login server from Python to Rust, which should help with both https://github.com/openai/codex/issues/2000 and https://github.com/openai/codex/issues/2044.
- https://github.com/openai/codex/pull/2029 adds support for markdown streaming
- https://github.com/openai/codex/pull/2270 improves the UI treatment of diffs so they are more readable when using a light background
- https://github.com/openai/codex/pull/2113 `ctrl-z` can be used to suspend the TUI

## rust-v0.21.0 (2025-08-12T04:43:24Z)
Fixes abound!

- https://github.com/openai/codex/pull/2200 send prompt cache key for better caching (should improve token efficiency!)
- https://github.com/openai/codex/pull/2202 split multiline commands to improve readability
- https://github.com/openai/codex/pull/2095 Parse exec commands and format them more nicely in the UI
- https://github.com/openai/codex/pull/2186 recognize `applypatch` command as `apply_patch` command string
- https://github.com/openai/codex/pull/2183 Include output truncation message in tool call results to tell the model when it did not get the full output from a command that it might have expected
- https://github.com/openai/codex/pull/2162 show feedback message after `/compact` command, fixing an issue when no deltas were sent
- https://github.com/openai/codex/pull/2050 show diff preview for `apply_patch`
- https://github.com/openai/codex/pull/1975 add JSON schema sanitization for MCP tools to ensure compatibility with internal JsonSchema enum external contributor: Thanks @yaroslavyaroslav!


## rust-v0.20.0 (2025-08-09T00:29:51Z)
Some key fixes for Windows:

- https://github.com/openai/codex/pull/2035 the `npm` release of `@openai/codex` now runs the Rust CLI instead of falling back to the old TypeScript CLI (TypeScript code was removed from the repo in https://github.com/openai/codex/pull/2048)
- https://github.com/openai/codex/pull/2019 fixes two things for Windows:
  - fixes one class of issues with login logic by writing Python program to a temp file instead of long string arg (FYI, we are planning to replace the Python with Rust: https://github.com/openai/codex/pull/2047)
  - ignores `PopKeyboardEnhancementFlags` failure since not all Windows terminals support it
- https://github.com/openai/codex/pull/2042 should help/fix the Python certificates issue with `codex login`: https://github.com/openai/codex/issues/2044

## rust-v0.19.0 (2025-08-08T01:40:16Z)


## rust-v0.16.0 (2025-08-07T17:59:57Z)
- Small fix for an error message around capacity: https://github.com/openai/codex/pull/1947
- Though the more significant upgrade today is to 0.15.0: https://github.com/openai/codex/releases/rust-v0.15.0

## rust-v0.15.0 (2025-08-07T17:29:06Z)
* `gpt-5` is the default model!
* new `--ask-for-approval on-request` option where the model decides whether to prompt the user (which is somewhat of a balance between the existing `on-failure` and `never`) options
* new onboarding flow that uses `--sandbox workspace-write and --ask-for-approval on-request` as the configuration when users mark a folder is trusted (recommended default when working in a Git repo)

## rust-v0.14.0 (2025-08-06T16:26:30Z)
* Removed some internal messaging from the conversation view: https://github.com/openai/codex/pull/1868, https://github.com/openai/codex/pull/1866
* Fixed issue where `codex exec` was printing `InternalAgentDied `: https://github.com/openai/codex/pull/1864

## rust-v0.13.0 (2025-08-05T21:04:13Z)
Introduces the `--oss` flag so Codex CLI can be used with the new open-weight models from OpenAI. See:

- https://github.com/openai/gpt-oss
- https://github.com/openai/codex/pull/1848

## rust-v0.12.0 (2025-08-05T01:36:13Z)
- Includes https://github.com/openai/codex/pull/1826 to fix a regression introduced in 0.11.0: https://github.com/openai/codex/issues/1796.

## rust-v0.11.0 (2025-08-02T00:49:31Z)
**Big News!!!** This release introduces a new UX where Codex is no longer fullscreen / manages its own scrollback, but "appends to the end" and uses the terminal's native scrolling.

This fixes some longstanding pain points:

- https://github.com/openai/codex/issues/1247 copy/paste works now
- https://github.com/openai/codex/issues/1502 use the terminal's native scrolling

But wait, there's more!

- https://github.com/openai/codex/pull/1527 adds support for the `/compact` command
- https://github.com/openai/codex/pull/1726 introduces an experimental planning tool
- https://github.com/openai/codex/pull/1705 security fix to ensure `apply_patch` is run through the sandbox for the session
- https://github.com/openai/codex/pull/1764 CLI now checks for new versions and lets you know if you are out of date

## rust-v0.10.0 (2025-07-24T21:55:46Z)
* More commands are "trusted" by default: https://github.com/openai/codex/pull/1668
* Thanks to @pbezglasny for fixing a UI inconsistency in the TUI header: https://github.com/openai/codex/pull/1675
* We now record some Git state in the `.jsonl` log due to @vishnu-oai https://github.com/openai/codex/pull/1598

## rust-v0.9.0 (2025-07-23T01:00:57Z)
- Numerous fixes to `codex mcp`.
- https://github.com/openai/codex/pull/1626 to ensure shell commands spawned by Codex get `SIGTERM` when `codex` is killed (Linux only)
- Do not auto-approve certain flags for ripgrep/`rg` https://github.com/openai/codex/pull/1644

## rust-v0.8.0 (2025-07-19T00:35:28Z)
- As of https://github.com/openai/codex/pull/1594, we now stream the response from the model in the TUI and when using `codex exec`
- https://github.com/openai/codex/pull/1589 changes `ctrl-d` so it only exits the TUI if the composer is empty (it will still exit the TUI if the composer is hidden because the Codex agent is thinking)
- As a heads up, https://github.com/openai/codex/pull/1596 changes the organization of the `~/.codex/sessions` folder so it has `YYYY/MM/DD` subfolders. This should make it easier to find recent sessions and avoid degrading filesystem performance because previously `~/.codex/sessions` could end up with an unbounded number of entries
- https://github.com/openai/codex/pull/1571 fixes a longstanding issue where we failed to handle long MCP tool names gracefully (https://github.com/openai/codex/issues/1289 was the relevant GitHub issue)
- https://github.com/openai/codex/pull/1603 introduced a `--json` flag to `codex exec` so that it prints output as JSONL to stdout
- https://github.com/openai/codex/pull/1590 tries to ensure that when the Codex CLI is launched via the Node.js script in the `npm` version that both the Codex CLI process and Node.js process exit together, though from the additional details on https://github.com/openai/codex/issues/1570, it seems like it is not sufficient to fix that specific problem.
- Though https://github.com/openai/codex/pull/1590 should make it so that, on Windows, the `npm` version will fall back to the TypeScript version (for now) rather than just crashing, fixing https://github.com/openai/codex/issues/1573.

## rust-v0.7.0 (2025-07-14T17:02:40Z)
Need to publish a new version on npm. See https://github.com/openai/codex/pull/1568 for details.

## rust-v0.6.0 (2025-07-12T23:36:11Z)
* `id` for notifications associated with a `codex` tool call now match the request id: https://github.com/openai/codex/pull/1554
* Paste summarization for large pastes: https://github.com/openai/codex/pull/1549
* Experimental `codex apply` command to interact with Codex Web: https://github.com/openai/codex/pull/1528

## rust-v0.5.0 (2025-07-10T21:56:47Z)
* Added new config option: `model_supports_reasoning_summaries`: https://github.com/openai/codex/pull/1524
* Thanks to @reneleonhardt for helping update a number of our dependencies (we now build with Rust 1.88!): https://github.com/openai/codex/pull/1494
* Removed reference to `/compact` in https://github.com/openai/codex/pull/1503 because it is not supported yet: https://github.com/openai/codex/issues/1257
* Thanks to @pchuri so that when running Codex installed via `npm`, `process.platform === "android"` will run the Rust CLI: https://github.com/openai/codex/pull/1488
* Fix generated shell completions to use the name `codex` instead of `codex-cli`: https://github.com/openai/codex/pull/1496

## rust-v0.4.0 (2025-07-09T07:06:51Z)
* Honor the `OPENAI_BASE_URL ` environment variable for the built-in `openai` model provider: https://github.com/openai/codex/pull/1487
* Support `model_reasoning_effort` and `model_reasoning_summary` when defining a profile thanks to https://github.com/openai/codex/pull/1484
* Add a `completion` subcommand to the CLI in https://github.com/openai/codex/pull/1491 so we can ultimately add `generate_completions_from_executable()` to our Homebrew formula: https://github.com/Homebrew/homebrew-core/blob/main/Formula/c/codex.rb

## rust-v0.3.0 (2025-07-08T05:46:18Z)
This addresses a number of important issues reported in 0.2.0:

- Fixes an issue where non-ASCII characters were crashing the CLI: https://github.com/openai/codex/issues/1450 (huge thanks to @ryozi-tn for the fix in https://github.com/openai/codex/pull/1467)
- Adds support for a `--sandbox` flag and makes some breaking changes to `config.toml` around this option. See https://github.com/openai/codex/pull/1476 for details.
- Makes it possible to configure custom HTTP headers when making requests to model providers: https://github.com/openai/codex/pull/1473.

## rust-v0.2.0 (2025-06-30T19:25:11Z)