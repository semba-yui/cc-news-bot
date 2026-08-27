## rust-v0.150.1 (2026-08-27T01:56:54Z)
## Bug Fixes
- Remote compaction now counts retained images toward its token budget by default, trimming older images as needed. (#41003)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.150.0...rust-v0.150.1

- #41003 Backport retained-image compaction budgeting to 0.150 @rhan-oai


