## rust-v0.142.2 (2026-06-25T07:32:07Z)
## New Features

- MCP tools now use tool search by default when supported, improving tool discovery while preserving compatibility with older models and providers. (#29486)
- macOS authentication clients can honor system proxy, PAC, and WPAD settings when `respect_system_proxy` is enabled. (#26709)
- Plugins can provide dedicated dark-mode logos through local manifests and remote catalogs. (#29488)
- Apps can display richer safety-buffering UI using server-provided visibility and faster-model metadata. (#29473)

## Bug Fixes

- Remote plugin catalogs now return curated featured-plugin rankings. (#29485)
- Expired Amazon Bedrock credentials now produce actionable recovery guidance instead of a generic authorization error. (#28992)
- Remote stdio MCP servers now accept absolute working directories written in the remote platform’s path format. (#29493)
- Remote HTTP(S) image inputs now return clear model-visible validation errors; inline data URLs and local images remain supported. (#29417, #29419)
- PowerShell commands containing executable AST regions the safety classifier cannot inspect now require approval. (#24092)
- Code Mode now warns when the selected model lacks the required metadata. (#29490)

## Chores

- Updated bundled OpenSSL and esbuild dependencies to patched releases. (#29487, #29489)
- Successful formatter runs are now quiet while failures still show diagnostics. (#29467)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.142.1...rust-v0.142.2

- #28769 Register full CDP requirements feature @syuan-oai
- #29485 [codex] fetch featured IDs for remote plugins @ericning-o
- #29487 Upgrade bundled OpenSSL to 3.6.3 @jif-oai
- #29489 [codex] Update esbuild to 0.28.1 @pakrym-oai
- #29488 [plugins] Add dark-mode logo metadata @drewschuster-openai
- #29249 [codex] migrate environment context to model world state @pakrym-oai
- #29494 core: wrap token budget window context @bolinfest
- #29417 [codex] replace remote images with model-visible error text @rka-oai
- #28360 feat(core): store turn_id on ResponseItem metadata @owenlin0
- #29486 [codex] Use tool search for MCP tools by default @sayan-oai
- #29501 path-uri: clarify host-native path conversion @anp-oai
- #29504 fix: world state response item test @celia-oai
- #26704 TUI Plugin Sharing 4 - cover remote plugin catalog flows @canvrno-oai
- #29419 [codex] reject remote images at app-server ingress @rka-oai
- #28992 chore: improve expired Bedrock credential errors @celia-oai
- #29467 Make formatter output quiet on success @anp-oai
- #26709 PAC 4 - Add macOS system proxy resolver @canvrno-oai
- #29490 chore: warn when Code Mode lacks model metadata @celia-oai
- #29493 mcp: accept foreign absolute cwd for remote stdio @anp-oai
- #29473 Propagate safety buffering treatment metadata @fc-oai
- #24092 [codex] Reject unlowered PowerShell AST regions @bookholt-oai




## rust-v0.142.1 (2026-06-25T00:36:09Z)
## New Features

- Added opt-in Windows system proxy support for authentication, including PAC, WPAD, static proxies, and bypass rules. (#26708)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.142.0...rust-v0.142.1

- #26708 PAC 3 - Add Windows system proxy resolver @canvrno-oai




## rust-v0.142.0 (2026-06-22T22:19:53Z)
## New Features

- `/usage` can now show and redeem earned usage-limit reset credits, with confirmation, retry, and refreshed availability states. (#28154, #28793)
- `/plugins` now organizes remote plugins into OpenAI Curated, Workspace, and Shared with me sections, while eligible turns can recommend and install relevant plugins. (#26703, #28399, #28400, #27704, #28403)
- Configurable rollout token budgets track usage across agent threads, provide remaining-budget reminders, and abort turns when exhausted. (#28746, #28494, #28707, #29423)
- App-server clients can configure multi-agent delegation as disabled, explicit-request-only, or proactive at the thread and turn level. (#28685, #28792, #29324)
- Added an indexed web-search mode that permits live searches while restricting direct page access to server-approved URLs. (#28489)
- Codex can now receive scheduled UTC time reminders and query the current time directly, including through client-provided app-server clocks. (#28822, #28824, #28835, #29011)

## Bug Fixes

- Restored reliable Linux TUI rendering after suspending with `Ctrl+Z` and resuming with `fg`. (#28342)
- Exec-server processes and stdio MCP sessions now survive transient disconnects, including signed-URL refresh and retry-safe stdin writes. (#28512, #28374, #28546, #28895)
- Remote environments now preserve executor-native paths, shells, `AGENTS.md` discovery, and sandbox behavior across operating systems. (#28146, #28152, #28958, #28983, #29099, #29108, #29113, #29424)
- Plugin loading and installation now handle root marketplace layouts, manifest fallbacks, multiple skill paths, actionable download errors, and immediate tool refreshes. (#28771, #28789, #28790, #28863, #28951)
- Parent agents now receive terminal subagent errors instead of seeing failed work as an empty successful completion. (#28375)
- Goal-first threads are once again persisted and returned by `thread/list` and `thread/search`. (#28808)

## Chores

- Reduced startup and session latency by deferring unnecessary DNS work, warming the model cache, reusing parsed plugin skills, parallelizing skill metadata reads, and skipping redundant catalog synchronization. (#28542, #28699, #28844, #29326, #29005)
- Reduced persistent-log churn by removing per-event WebSocket payload logging and filtering duplicated telemetry records. (#29432, #29457)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.141.0...rust-v0.142.0

- #28396 [codex] Record external agent import results @charlesgong-openai
- #27751 [codex] expose Bedrock credential source in account/read @celia-oai
- #28338 [codex] Compress cold active rollouts @jif-oai
- #28368 feat: render typed envelopes for multi-agent v2 messages @jif-oai
- #28508 [tests] Keep Apps out of generic core test harness @jif-oai
- #28472 [codex] Clarify plugin load and runtime capability stages @xl-openai
- #28375 core: surface terminal subagent errors to parent agents @jif-oai
- #28542 perf(config): defer remote sandbox hostname lookup @fcoury-oai
- #28473 path-uri: clarify invalid host path errors @anp-oai
- #28342 fix(tui): restore TUI after suspend @fcoury-oai
- #28354 [codex] exec-server: stream files in chunks @pakrym-oai
- #28553 chore: side prompt @jif-oai
- #27099 [codex-app-server-test-client & codex-app-server] Plugin Usage Analytics Smoke Test @jameswt-oai
- #28554 fix(tui): highlight C++ module files @fcoury-oai
- #28467 [codex] Warn clearly when code mode output is truncated @aibrahim-oai
- #27750 [codex] Add incremental thread history changes @wiltzius-openai
- #28154 feat(tui): add rate-limit reset redemption to /usage @jayp-oai
- #28562 ci: run code-mode unit tests on all bazel targets @cconger
- #27923 [codex] Route MCP file uploads through environment filesystem @pakrym-oai
- #27100 [codex-app-server-test-client] Plugin Install/Uninstall Analytics Smoke Test @jameswt-oai
- #28581 [codex] re-enable absolute workdir integration test @anp-oai
- #28468 code-mode: extend test coverage to lock in cell lifecycle @cconger
- #28587 [codex] test exec relative additional permissions @anp-oai
- #28577 Clarify model-generated and legacy app path types @anp-oai
- #28589 Record invariants for path migration. @anp-oai
- #28146 app-server: preserve target-native environment cwd @anp-oai
- #28595 Tell codex about PathUri serde compat. @anp-oai
- #28399 [codex] [1/4] Add recommended plugin endpoint cache @adaley-openai
- #28400 [codex] [2/4] Generalize plugin suggestion presentation @adaley-openai
- #27704 [codex] [3/4] Activate endpoint plugin recommendations @adaley-openai
- #28152 core: render remote environment cwd natively @anp-oai
- #28403 [codex] [4/4] Simplify recommended plugin install schema @adaley-openai
- #26706 PAC 1 - Add system proxy feature config surface @canvrno-oai
- #27910 Add thread recencyAt for sidebar ordering @nornagon-openai
- #28627 Revert "Tell codex about PathUri serde compat. (#28595)" @anp-oai
- #28625 [codex] Gate remote plugin catalog by auth @xl-openai
- #28629 [codex] core: restore absolute turn context cwd @anp-oai
- #28642 thread-store: fix response fixture compilation @pakrym-oai
- #28580 [codex] Support object-valued plugin MCP manifests @charlesgong-openai
- #28599 code-mode: move cell state into library actor @cconger
- #28471 [codex] Test code-mode variable truncation @aibrahim-oai
- #28655 Revert thread recencyAt for sidebar ordering @pakrym-oai
- #28638 core: remove redundant TurnContext and Prompt fields @pakrym-oai
- #28656 [codex] Persist built-in image results reported as generating @won-openai
- #28512 Resume exec-server sessions after disconnect @jif-oai
- #28546 Back off registry retries during exec recovery @jif-oai
- #28561 Add join key for MAv2 inter-agent messages @jif-oai
- #28699 app-server: keep the model cache warm @jif-oai
- #28705 Replace SkillsManager with SkillsService @jif-oai
- #27965 [ez][codex-rs] Support apps._default.default_tools_approval_mode @zamoshchin-openai
- #28359 Run fs helper through Windows sandbox wrapper @iceweasel-oai
- #28628 [codex] Repair invalid skill frontmatter scalars @charlesgong-openai
- #28632 Tell codex to avoid changing rollout format. @anp-oai
- #28738 Scope command approvals by execution environment @jif-oai
- #19047 feat: add run task identity primitives @adrian-openai
- #28671 [codex] Restore thread recency with compatible migration history @nornagon-openai
- #28768 Extract TUI plugin catalog rendering @canvrno-oai
- #28389 [codex] Use compact OpenAI docs search queries @kkahadze-oai
- #28681 unified-exec: preserve PathUri through exec-server @anp-oai
- #28731 [codex] Track plugin install and import telemetry failures @charlesgong-openai
- #28651 exec-server: expose environment registry payloads @viyatb-oai
- #28771 fix(plugins): support root local marketplace plugins @caseychow-oai
- #28791 bazel: refresh expired macOS SDK pin @anp-oai
- #28782 [codex] trace tools build latency @owenlin0
- #28778 path-uri: decouple native path parsing @anp-oai
- #28774 feat(exec-server): add Noise rendezvous environment @apanasenko-oai
- #28812 [codex] Add optional IDs to response items @pakrym-oai
- #28784 fix(install): support older awk checksum parsing @fcoury-oai
- #28826 [codex] Use unique IDs for realtime-routed turns @guinness-oai
- #27986 [codex] control automatic realtime handoff delivery @jiayuhuang-openai
- #28836 [codex] Support assistant realtime append text @guinness-oai
- #28374 Refresh signed exec-server URLs on reconnect @apanasenko-oai
- #28825 Expose selecte namespaces as direct model tools @won-openai
- #28790 [codex] Support plugin manifest path lists @charlesgong-openai
- #28851 Record more path migration guidance for codex. @anp-oai
- #28780 unified-exec: retain PathUri in command events @anp-oai
- #28605 [codex] Split plugin and skill warmup tracing @mzeng-openai
- #28608 [codex] Pass plugin namespace into skill loading @mzeng-openai
- #28746 [codex] add rollout token budget configuration (1/N) @rka-oai
- #28766 Add network environment ID plumbing @jif-oai
- #28915 Avoid sandbox helper in apply_patch approval tests @jif-oai
- #28813 Pause active goals before TUI interrupts @etraut-openai
- #28895 Recover exec process stdin writes @jif-oai
- #28940 Pin Windows argument lint to Windows 2022 @rka-oai
- #28914 Scope MCP sandbox metadata to server environment @jif-oai
- #28911 Add turn-scoped context contributions @jif-oai
- #28808 Fix goal-first live threads missing from thread/list @etraut-openai
- #25019 [codex] Initialize exec-server OpenTelemetry at startup @starr-openai
- #28943 [codex] Fix Windows sandbox runtime ACL refresh @iceweasel-oai
- #28946 Synchronize realtime notification test requests @rka-oai
- #28822 Add Config for Time Reminders (1/n) @rka-oai
- #28494 [codex] rollout budget implementation (2/N) @rka-oai
- #27500 Support `openai/form` extended form elicitations @gpeal
- #28949 [codex] Make thread store turn filter optional @wiltzius-openai
- #28824 current time reminders impl for system clock (2/n) @rka-oai
- #27812 [codex] Cache plugin metadata for tool suggestions @mzeng-openai
- #28854 apply-patch: carry paths as PathUri @anp-oai
- #28835 Add app-server current-time impl (3/n) @rka-oai
- #26496 Make auto-review on-request prompt more proactive @maja-openai
- #28947 [codex] Remove hardcoded app ID filters @ericning-o
- #28959 TUI: improve unified mention selection visibility @canvrno-oai
- #27132 Emit Trusted MCP App Identity on Tool-Call Items @martinauyeung-oai
- #19049 feat: opt ChatGPT auth into agent identity @adrian-openai
- #28770 [connectors] Ignore synthetic links for app accessibility @adaley-openai
- #28863 [codex] Preserve remote plugin download status errors @xl-openai
- #28958 core: load AGENTS.md from foreign environments @anp-oai
- #28789 [codex] Support marketplace plugin manifest fallback @charlesgong-openai
- #28993 [codex] Remove child AGENTS.md prompt experiment @pakrym-oai
- #28989 core: log AGENTS.md paths as URIs @anp-oai
- #28983 core: keep remote exec on reported shell @anp-oai
- #28844 [codex] Reuse parsed plugin skills during session startup @xl-openai
- #28953 core: add UUIDv7 context window IDs @pakrym-oai
- #28951 [plugins] Refresh plugin and tool caches after remote install @adaley-openai
- #28856 Always use AVAS for realtime WebRTC calls @bakks
- #28814 [codex] Assign response item IDs when recording history @pakrym-oai
- #29005 [codex] Skip curated repo sync for remote plugins @xl-openai
- #29011 [codex] add clock current-time tool @rka-oai
- #29012 core: assign item IDs to compacted replacement history @pakrym-oai
- #29022 [codex] Support protected resource OAuth discovery @xl-openai
- #28674 [1/3] core: add remote environment connection lifecycle @sayan-oai
- #28683 [2/3] core: track starting environments in snapshots @sayan-oai
- #29025 [3/3] app-server: configure environment connection timeout @sayan-oai
- #28685 Add per-turn multi-agent mode @shijie-oai
- #28792 Expose thread-level multi-agent mode @shijie-oai
- #28707 [codex] abort turns when rollout budgets expire (token budget 3/3) @rka-oai
- #28899 Scope network approvals by environment @jif-oai
- #29086 Document raw response item compatibility @jif-oai
- #28489 Add indexed web search mode @winston-openai
- #28942 Add config toggles for orchestrator skills and MCP @jif-oai
- #29099 Keep remote exec commands native to the executor @jif-oai
- #29095 Use cached and live web access terminology @winston-openai
- #29042 [codex] trace pre-sampling skill and persistence latency @rphilizaire-openai
- #29132 chore(deps): advance tokio-tungstenite @apanasenko-oai
- #29006 [codex] Preserve skill descriptions outside model context @charlesgong-openai
- #29154 Allow resume and settings commands during tasks and MCP startup @etraut-openai
- #29256 core: add context window lineage IDs @pakrym-oai
- #29259 [codex] prototype mcp_history thread hint injection @pakrym-oai
- #29255 [codex] add configurable token budget compaction reminder @pakrym-oai
- #29295 [codex] simplify token budget context @pakrym-oai
- #29108 Carry sandbox intent to remote exec servers @jif-oai
- #29325 Test pipelined scalar exec-server requests @jif-oai
- #29326 Parallelize skill metadata stats @jif-oai
- #29329 Use controlled time for remote initialization timeout test @jif-oai
- #29170 code-mode: define transport-neutral runtime types @cconger
- #29285 code-mode: move session ownership into runtime @cconger
- #29286 code-mode: linearize cell terminal state @cconger
- #29287 code-mode: make session shutdown authoritative @cconger
- #29301 [prompting] updated plan mode prompt @rhan-oai
- #29288 code-mode: preserve dropped observation output @cconger
- #29289 code-mode: preserve initial yield at completion @cconger
- #28260 [codex] Add internal auto-compaction opt-out @rhan-oai
- #29371 Propagate safety buffering events to app-server clients @fc-oai
- #29393 chore: fix merge race (auto-compaction feature access) @sayan-oai
- #29327 Persist session IDs across thread resume @jif-oai
- #29324 Simplify multi-agent mode controls @jif-oai
- #29113 Apply sandbox intent inside remote exec servers @jif-oai
- #29001 Add workspace messages app-server API @xli-oai
- #29432 Stop logging every Responses WebSocket event @jif-oai
- #29073 core: refresh environment context before sampling @sayan-oai
- #29455 fix(core): restore thread_source in x-codex-turn-metadata @owenlin0
- #29457 Filter noisy targets from persistent logs @jif-oai
- #29429 remove flag for image preparation @rka-oai
- #29143 ci: restore custom Windows runner with hermetic LLVM 0.7.9 @anp-oai
- #27102 [codex] Centralize Plugin Analytics Metadata @jameswt-oai
- #26703 TUI Plugin Sharing 3 - render remote plugin catalog sections @canvrno-oai
- #29424 Report remote sandbox denials semantically @jif-oai
- #28968 core: rename metadata -> internal_chat_message_metadata_passthrough @owenlin0
- #29464 [sdk/python] Stop advertising HTTP image URLs @rka-oai
- #28793 [codex] Fix usage-limit reset copy and state @jayp-oai
- #27982 [codex] Start the guardian child session when parent session is started @jgershen-oai
- #29468 core: remove unused permissions cwd plumbing @bolinfest
- #26707 PAC 2 - Add shared auth system proxy contract @canvrno-oai
- #28991 Allow ChatGPT accounts without email @efrazer-oai
- #29423 [codex] configure rollout budget reminder thresholds @rka-oai
- #26678 permission profiles: expose availability to clients @viyatb-oai
- #29476 [codex] handle request_user_input in app-server test client @celia-oai
- #29479 fix(config): address permission profile review follow-ups @viyatb-oai
- #29014 Honor startup custom CA bundles with managed MITM @winston-openai
- #29480 chore: advance tungstenite fork pins @apanasenko-oai
- #27669 [codex-core-plugins] Remote Plugin ID Persisted to File @jameswt-oai




## rust-v0.141.0 (2026-06-18T04:43:06Z)
## New Features

- Remote executors now use authenticated, end-to-end encrypted Noise relay channels. (#26242, #26245)
- Cross-platform remote execution now preserves executor-native working directories and shells, including filesystem permission paths across app-server and exec-server boundaries. (#27819, #27995, #28032, #28122, #28165, #28367)
- Selected executor plugins can activate their stdio MCP servers per thread; plugin discovery also adds a created-by-me marketplace and auth-specific curated catalogs. (#27870, #27884, #27893, #28203, #28383)
- App-server clients can list immediate child threads, correlate external-agent imports with detailed results, and read or redeem rate-limit reset credits. (#26662, #28008, #28143)
- Realtime clients can explicitly append speech, control how Codex responses enter conversations, and omit startup context. (#27917, #28405)
- TUI input prompts can auto-resolve after inactivity, with a countdown that pauses on interaction. (#28235)

## Bug Fixes

- Hook trust bypass now persists through `codex exec` thread start and resume, while blocking `PostToolUse` hooks correctly reject code-mode tool calls. (#26434, #28365)
- Plugin capabilities now route consistently by authentication mode, deduplicate conflicting App/MCP declarations, and preserve remote marketplace ordering. (#27461, #27602, #27607, #27902, #27958, #28395)
- Windows sandbox execution repairs stale credentials automatically and gives PowerShell commands more time before backgrounding. (#27086, #27944)
- Idle exec-server relays remain connected, and steered user input immediately interrupts `wait_agent`. (#28286, #28341)
- Bundled SQLite is pinned to a version containing the WAL-reset corruption fix. (#27992)
- TLS connections now support P-521 certificate signatures commonly used by enterprise proxies. (#27706)

## Chores

- Reduced latency and memory use in large, tool-heavy sessions by caching tool search and eliminating repeated request and history copies. (#27258, #27813, #28306, #28309, #28313, #28323, #28327)
- Bounded prompt-image caching to 64 MiB and feedback uploads to eight related threads. (#28294, #28332)
- Terminal resize reflow is now always enabled, ignoring obsolete disabled settings. (#27794)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.140.0...rust-v0.141.0

- #28001 [codex] package Windows ARM64 on x64 @tamird
- #28032 [codex] Carry exec-server cwd as PathUri @anp-oai
- #27607 [codex] Dedupe plugin MCPs by app declaration name @felixxia-oai
- #27992 [codex] Pin bundled SQLite to fixed WAL-reset version @gpeal
- #28125 build: run buildifier from just fmt @anp-oai
- #28120 bazel: add PowerShell to Wine test harness @anp-oai
- #27819 path-uri: render native paths across platforms @anp-oai
- #28122 [codex] exec-server honors remote environment cwd and shell @anp-oai
- #26662 feat(app-server): filter threads by parent @btraut-openai
- #27884 Add selected-plugin precedence and attribution to the MCP catalog @jif-oai
- #27870 Discover stdio MCP servers from selected executor plugins @jif-oai
- #28283 [codex] update multi-agent v2 prompts @jif-oai
- #27602 [codex] Preserve plugin apps in connector listings @felixxia-oai
- #27461 [codex] Skip plugin MCP OAuth for matching app routes @felixxia-oai
- #27893 Activate selected executor plugin MCPs in app-server @jif-oai
- #28332 [codex] Cap feedback upload subtrees @jif-oai
- #27365 Represent dynamic tools with explicit namespaces internally @sayan-oai
- #28333 skills: hide orchestrator skills with a local executor @jif-oai
- #27756 [codex] simplify shell snapshot ownership @pakrym-oai
- #27794 Remove terminal resize reflow flag gates @etraut-openai
- #28286 chore: restore exec-server relay keepalives @jif-oai
- #28164 [codex] simplify memory read metrics @pakrym-oai
- #27371 Expose explicit dynamic tool namespaces in thread start @sayan-oai
- #28309 linearize history output normalization @jif-oai
- #28306 avoid cloning sampling request input @jif-oai
- #28323 serialize websocket requests directly @jif-oai
- #28313 avoid cloning websocket request history @jif-oai
- #28344 [codex] remove stale PathExt import @pakrym-oai
- #27059 [codex] Cover OTLP HTTP log and trace event export @richardopenai
- #28327 reuse encoded Responses request bodies @jif-oai
- #27995 [codex] preserve explicit environment cwd @pakrym-oai
- #28285 guardian: isolate review context from skills and memories @jif-oai
- #26702 TUI Plugin Sharing 2 - add remote plugin section plumbing @canvrno-oai
- #28294 bound prompt image cache retention @jif-oai
- #28257 Support staging OAuth client ID overrides @apanasenko-oai
- #28341 core: let steer interrupt wait_agent @jif-oai
- #28336 skills: cache orchestrator resources per thread @jif-oai
- #28357 Extract shared Windows sandbox session runner @iceweasel-oai
- #27706 Use aws-lc-rs for rustls crypto provider @malsamiri-oai
- #28347 [codex] add path-types skill @anp-oai
- #28235 Add request user input auto-resolution timer @shijie-oai
- #28234 [mcp] Increase default tool timeout to 300 seconds @adaley-openai
- #28008 [codex] Add external agent import result accounting @charlesgong-openai
- #27944 recover stale Windows sandbox credentials @iceweasel-oai
- #27086 Add Windows unified exec yield floor @iceweasel-oai
- #28358 Add hidden Windows sandbox wrapper entrypoint @iceweasel-oai
- #27258 core: cache the tool search handler per session @mchen-oai
- #28143 feat(app-server): expose rate-limit reset credits @jayp-oai
- #28355 feat(core): add metadata field to ResponseItem @owenlin0
- #28203 [codex] Add created-by-me remote plugin marketplace @ericning-o
- #28365 Respect blocking PostToolUse hooks in code mode @abhinav-oai
- #27813 [codex] Reuse Apps policy evaluation across MCP tool exposure @mzeng-openai
- #28300 Deflake realtime handoff steering test @felixxia-oai
- #28395 [codex] Preserve remote plugin directory order @jameswt-oai
- #27955 [codex] retain resolved environments across turns @pakrym-oai
- #27917 Add realtime speech append control @guinness-oai
- #27093 [codex-analytics] Analytics Capture to File in Debug Builds @jameswt-oai
- #26242 exec-server: add Noise relay transport @viyatb-oai
- #28165 Use PathUri in filesystem permission paths for exec-server @anp-oai
- #28415 [codex] Fix missing response item metadata in tests @adaley-openai
- #27058 [codex] Add second-based OTEL duration histograms @richardopenai
- #27902 [codex] Centralize plugin auth capability filtering @felixxia-oai
- #28405 Add a toggle for realtime startup context @guinness-oai
- #26434 Preserve hook trust bypass in codex exec threads @abhinav-oai
- #26245 exec-server: default remote transport to Noise @viyatb-oai
- #28383 [codex] Load API curated marketplace by auth @felixxia-oai
- #27958 [codex] Make plugin details capability aware @felixxia-oai
- #28367 Use ApiPathString in app-server filesystem permission paths @anp-oai
- #28421 [codex] Bind shell snapshots to retained thread environments @pakrym-oai
- #28429 [codex] Add interruptible sleep tool @pakrym-oai
- #28441 [codex] Use expect in integration tests @pakrym-oai
- #28163 [codex] Use local environment for user shell commands @pakrym-oai




## rust-v0.140.0 (2026-06-15T21:06:37Z)
## New Features

- Added `/usage` views for daily, weekly, and cumulative account token activity. (#27925)
- `/goal` now preserves oversized text, large pasted blocks, and image attachments, including in remote app-server sessions. (#27508, #27509, #27510)
- Added permanent session deletion through `codex delete`, `/delete`, and app-server `thread/delete`, with confirmation safeguards and subagent cleanup. (#25018, #27476)
- Added `/import` for selectively importing setup, project configuration, and recent chats from Claude Code. (#27070, #27071, #27703)
- Typing `@` now opens the unified mentions menu for files, plugins, and skills by default. (#27499)
- Added managed Amazon Bedrock API-key authentication and encrypted local storage for CLI and MCP OAuth credentials. (#27443, #27689, #27504, #27535, #27539, #27541)

## Bug Fixes

- Corrupted SQLite state databases are now backed up and rebuilt automatically from rollout data, including malformed database-directory cases. (#26859, #27719)
- Prevented `/review` from crashing when `Esc` is pressed with queued guidance, while preserving that guidance when the review is canceled. (#22879)
- Improved MCP reliability by retrying transient startup failures, reporting unusable OAuth credentials as logged out, and preserving explicitly disabled servers. (#25147, #26713, #27414)
- Fixed remote plugin uninstall requests and correctly surfaced apps requiring authentication during installation. (#27085, #27223)
- Persisted “Don’t remind me” update dismissals reliably and cleared stale running-hook indicators after completed turns. (#27619, #27783)
- Non-TTY background commands can now be interrupted with Ctrl-C while preserving their final output and exit status. (#26734)

## Documentation

- Clarified contributor guidance around keeping crate APIs narrow and supporting Linux, macOS, and Windows. (#27939, #27966)

## Chores

- Improved responsiveness for large repositories and long sessions by preserving Git’s built-in filesystem monitor, avoiding duplicate history reads, accelerating archive lookup, and caching turn-diff rendering. (#26880, #27031, #27276, #27489)
- Removed the experimental `/realtime` voice controls and related audio dependencies from the TUI. (#27801)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.139.0...rust-v0.140.0

- #26880 [codex] preserve fsmonitor for worktree Git reads @tamird
- #27085 Use server app auth requirements for remote plugin install @xl-openai
- #27098 [codex] Return workspace directory installed plugins @xl-openai
- #27007 multi-agent: add path-based v2 activity tracking @jif-oai
- #27166 app-server: clear stale thread watches after v2 agent interruption @jif-oai
- #27080 [codex] Ignore pending PR review comments @anp-oai
- #26420 Avoid no-op backfill state writes @zanie-oai
- #27031 Avoid rereading rollout history during cold resume @zanie-oai
- #22879 fix: Prevent /review crash when entering Esc on steer message @canvrno-oai
- #27173 app-server: reject direct input to multi-agent v2 sub-agents @jif-oai
- #27184 Load selected executor skills through extensions @jif-oai
- #26835 [codex] Test extension API contracts @anp-oai
- #27063 [codex-analytics] add extensible feature thread sources @marksteinbrick-oai
- #26479 [codex] Speed up local nextest runs @anp-oai
- #27223 fix: use plugin service route for remote uninstall @ericning-o
- #22685 Add SOCKS5 TCP MITM coverage @winston-openai
- #26681 Allow creating a new goal after completion @etraut-openai
- #26711 Reduce TUI legacy core dependencies @etraut-openai
- #27110 [1/6] Add Python goal routing foundation @aibrahim-oai
- #27191 Route hosted Apps MCP through extensions @jif-oai
- #26830 [codex] Characterize global instruction lifecycle @anp-oai
- #26713 [codex] Report unusable MCP OAuth credentials as logged out @anp-oai
- #26734 [codex] Handle Ctrl-C for non-TTY unified exec @pakrym-oai
- #27116 Stop mirroring Codex user input into realtime @guinness-oai
- #27111 [2/6] Add private Python goal operations @aibrahim-oai
- #25147 [codex] Retry streamable HTTP initialize failures @ssetty-oai
- #27257 [codex] Tighten MCP connection manager API visibility and order @aibrahim-oai
- #26701 TUI Plugin Sharing 1 - add remote plugin identity @canvrno-oai
- #27129 feat: use provider defaults for memory models @celia-oai
- #27094 Add spans to build_tool_router @mchen-oai
- #24999 Add per-session realtime model and version overrides @guinness-oai
- #27078 [codex-analytics] emit goal lifecycle analytics @marksteinbrick-oai
- #27285 [codex] Fix post-merge analytics integration failures @anp-oai
- #27107 Add spans to run_turn @mchen-oai
- #27261 [codex] Make MCP connection startup fallible @aibrahim-oai
- #27174 feat: keep child MCP warnings out of parent transcript @jif-oai
- #27198 Use plugin-service MCP as the hosted plugin runtime @jif-oai
- #27375 [codex] Tag multi-agent spawn metrics with version @jif-oai
- #27383 Remove async-trait from extension contributors @jif-oai
- #27259 Use latest-wins MCP manager replacement @charliemarsh-oai
- #27264 [codex] Store compact window id in rollout @pakrym-oai
- #27280 [codex] add io PathUri native conversion APIs @anp-oai
- #27315 [codex] link Windows releases with LLD @tamird
- #27276 Reduce archive rollout lookup CPU @etraut-openai
- #27299 [codex] Outline ToolExecutor handler bodies @anp-oai
- #27391 Index visible thread list ordering @zanie-oai
- #27407 Fix compressed rollout search path matching @jif-oai
- #27304 [codex] Remove async_trait from ToolExecutor @anp-oai
- #26041 Add app-server background terminal process APIs @etraut-openai
- #25018 Add app-server `thread/delete` API @etraut-openai
- #26859 fix: Auto-recover from corrupted sqlite databases @ddr-oai
- #27064 [codex] remove blocking external agent migration flow @stefanstokic-oai
- #27421 [codex] Raise app-server recursion limit @anp-oai
- #27062 [codex] Retry transient Guardian review failures @kbazzi
- #27065 [codex] extract external agent import picker renderer @stefanstokic-oai
- #26409 [plugins] Inject remote_plugin_id into install elicitations @adaley-openai
- #27439 feat: make ThreadStore available on ThreadExtensionDependencies @bolinfest
- #27343 Guard core test subprocess cleanup @etraut-openai
- #27070 [codex] add external agent import picker UX @stefanstokic-oai
- #27321 [codex] Move release platform rules into bazel package @anp-oai
- #27071 [codex] add /import for external agents @stefanstokic-oai
- #27311 [codex] Skip local curated discovery for remote plugins @xl-openai
- #27414 [codex] Preserve disabled MCP servers across runtime overlays @e-provencher
- #27312 [codex] reuse release artifacts for npm staging @tamird
- #27319 Forward standalone assistant output to realtime @guinness-oai
- #27057 [codex] Add reusable OTEL gauge instruments @richardopenai
- #27245 image: add shared data URL preparation utilities @fjord-oai
- #27392 [codex-analytics] emit internally started turn events @marksteinbrick-oai
- #27322 [codex] Preserve build-script dependencies in rules_rs annotations @anp-oai
- #27489 core: cache turn diff rendering @nornagon-openai
- #27465 [codex] Remove redundant plugin app auth state @xl-openai
- #27484 Remove TUI legacy core test_support dependencies @etraut-openai
- #27476 Add session delete commands in CLI and TUI @etraut-openai
- #27247 core: resize all history images behind a feature flag @fjord-oai
- #27487 Trim TUI legacy telemetry and migration dependencies @etraut-openai
- #27438 [codex] Add token budget context feature @pakrym-oai
- #27501 [codex] Expand hosted web search citation guidance @yuning-oai
- #27526 tools: simplify default tool search text @sayan-oai
- #27488 [codex] Add new context window tool @pakrym-oai
- #27443 feat: add Bedrock API key as a managed auth mode @celia-oai
- #27532 [codex] Add comp_hash to model metadata @aibrahim-oai
- #27246 core: strip image detail from Responses Lite requests @fjord-oai
- #27517 [codex] Pass auth mode to plugin manager @xl-openai
- #27520 [codex] Compact when comp_hash changes @aibrahim-oai
- #27518 [codex] Add context remaining tool @pakrym-oai
- #27266 image: preserve metadata when resizing prompt images @fjord-oai
- #27103 [codex-analytics] report cached input tokens for v2 compaction @rhan-oai
- #27356 Use generic search metadata for dynamic tools @sayan-oai
- #27082 [codex-analytics] Emit structured compaction codex errors @rhan-oai
- #26513 [codex] Tune cloud config cache intervals @alexsong-oai
- #27387 skills: make backend plugin skills invocable without an executor @jif-oai
- #27403 skills: cache remote catalog failures per thread @jif-oai
- #27573 core: enable remote compaction v2 by default @jif-oai
- #27388 skills: expose remote skill resource tools @jif-oai
- #27569 multi-agent: move concurrency guidance into v2 usage hints @jif-oai
- #27585 nit: cap error @jif-oai
- #27404 test: cover referenced backend skill reads without an executor @jif-oai
- #27591 skills: render catalog locators by authority @jif-oai
- #27413 skills: decouple the skills extension from core @jif-oai
- #27527 [codex] publish npm packages concurrently @tamird
- #27528 [codex] publish DotSlash alongside npm @tamird
- #27529 [codex] download only release artifacts @tamird
- #27490 Remove TUI legacy Windows sandbox dependency @etraut-openai
- #27483 Emit plugin ID on MCP tool call analytics events @chrisdong-oai
- #27417 Print TUI session info on fatal exits @etraut-openai
- #27507 lint: allow self-documenting builder arguments @anp-oai
- #27420 [codex] Propagate plugin app categories @charlesgong-openai
- #27454 [codex] add cross-platform filesystem adapter coverage @anp-oai
- #27415 [codex] Surface runtime warnings in codex exec @anp-oai
- #27639 [codex] revert concurrent npm publishing @tamird
- #27646 feat: disable orchestrator skills for now @jif-oai
- #27323 [codex] Provide ARM64 MinGW powl compatibility support @anp-oai
- #27433 [codex] remove EnvironmentPathRef @anp-oai
- #27424 [codex] migrate ExecutorFileSystem paths to PathUri @anp-oai
- #27101 [codex] Load user instructions through an injected provider @anp-oai
- #27634 Resolve MCP server registrations through a catalog @jif-oai
- #27122 core: Consolidate Responses API Codex metadata @owenlin0
- #27450 [codex-rs] enforce PAT workspace restrictions @cooper-oai
- #27653 [codex] migrate exec-server filesystem protocol to PathUri @anp-oai
- #27663 Include thread id in token budget context @pakrym-oai
- #26418 [codex] Avoid duplicate hooks.json discovery with profiles @abhinav-oai
- #27689 feat: prefer managed Bedrock auth in model provider @celia-oai
- #27700 Remove fs/join and fs/parent from exec-server protocol @anp-oai
- #26426 Warn when hooks.json has unsupported top-level fields @abhinav-oai
- #27318 [codex] Move persistence policy application into ThreadStore @wiltzius-openai
- #27498 Route image extension reads through turn environments v2 @won-openai
- #27623 Add spans to turn lifecycle gaps @mchen-oai
- #27619 tui: clear stale hook row after turn completion @kotakem-openai
- #27711 Fix image extension PathUri conversion @anp-oai
- #27475 [codex] Remove async_trait from first-party code @anp-oai
- #27719 fix: Recover from sqlite directory being a file @ddr-oai
- #27715 ci(v8): gate Windows source builds on relevant changes @cconger
- #27702 [codex] parallelize release code generation @tamird
- #27709 [codex] resolve environment shell metadata eagerly @pakrym-oai
- #27445 feat(app-server): persist remote-control desired state @apanasenko-oai
- #27508 [1 of 3] Support long raw TUI goal objectives @etraut-openai
- #27256 Add request_user_input auto-resolution window contract @shijie-oai
- #27724 code-mode standalone: extract protocol and add host crate @cconger
- #27778 Translate non-English issues @etraut-openai
- #27316 Keep request_user_input direct-model only @shijie-oai
- #27696 [codex] Load AGENTS.md from all bound environments @anp-oai
- #27670 Make MCP server contributions thread-scoped @jif-oai
- #27732 [code-mode] Reject remote image URLs from output helpers @rka-oai
- #27692 Add executor-owned plugin resolution @jif-oai
- #27863 Extract shared plugin MCP config parsing @jif-oai
- #27703 [codex] restore source-specific import copy @stefanstokic-oai
- #27879 fix: serialize auth environment tests @jif-oai
- #27791 Reject transcript backtrack in side conversations @etraut-openai
- #27075 [ez][codex-rs] Support approvals reviewer in app defaults @zamoshchin-openai
- #27538 Use dependency groups for Python SDK tooling @charliemarsh-oai
- #27783 Persist update dismissal without cache @etraut-openai
- #27814 tui: Allow extra o's in /goal command @btraut-openai
- #27901 Use uv as Python SDK build backend @charliemarsh-oai
- #27720 realtime: add AVAS architecture override @bakks
- #27919 chore: prompt MAv2 @jif-oai
- #27816 sandboxing: migrate cwd inputs to PathUri @anp-oai
- #27890 [codex] expose remote plugin share URL @ericning-o
- #27913 [codex] unify apply patch parsing @pakrym-oai
- #27920 Handle standalone image generation failures as terminal items @won-openai
- #27927 [codex] Add size to internal filesystem metadata @pakrym-oai
- #27504 feat: add secret auth storage configuration @celia-oai
- #27674 [login] revoke existing auth before starting login @cooper-oai
- #27535 feat: add auth-specific encrypted secret namespaces @celia-oai
- #27939 [codex] Add crate API surface review rule @pakrym-oai
- #27926 [codex] Align implicit skill reads with parser @alexsong-oai
- #23254 fix(plugins) rm plugin descriptions @dylan-hurd-oai
- #27830 Support plaintext agent messages @jif-oai
- #27801 Remove TUI realtime voice support @etraut-openai
- #27539 feat: use encrypted local secrets for CLI auth @celia-oai
- #27076 Warn for structured feature toggles @canvrno-oai
- #27541 feat: use encrypted local secrets for MCP OAuth @celia-oai
- #27936 [codex] add roles to realtime append text @agamble-oai
- #27509 [2 of 3] Support long pasted text in TUI goals @etraut-openai
- #27109 Add Guardian catalog diagnostics metadata @won-openai
- #27966 Specify platform support in AGENTS.md @anp-oai
- #27855 [codex] parallelize Windows compression @tamird
- #27499 Promote TUI unified mentions in composer to default mentions feature @canvrno-oai
- #27972 [codex] Let generic test turns inherit their environment @pakrym-oai
- #27856 [codex] package Windows symbols in parallel @tamird
- #27976 [codex] make PathUri::from_abs_path infallible @anp-oai
- #27854 [codex] parallelize Windows package archives @tamird
- #27853 [codex] stage npm packages concurrently @tamird
- #27710 [codex] add latency tracing spans @rphilizaire-openai
- #27510 [3 of 3] Support images in TUI goals @etraut-openai
- #27925 feat(tui): reland token activity command @fcoury-oai
- #27988 [codex] Limit app-based plugin suggestions to remote catalogs @xl-openai
- #27652 [codex] Add auth mode to plugin manager constructor @felixxia-oai
- #27964 [codex] Add hermetic Wine test support @anp-oai
- #27459 [codex] Gate plugin MCP servers by auth route @felixxia-oai
- #27961 feat(app-server): enforce managed remote control disable @apanasenko-oai
- #27937 [codex] Add hermetic Wine exec-server test @anp-oai
- #27996 [codex] Send request-scoped turn state over WebSocket @aibrahim-oai
- #28002 [codex] Send turn state through compact requests @aibrahim-oai


