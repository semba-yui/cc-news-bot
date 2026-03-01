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


