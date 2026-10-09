## rust-v0.162.1 (2026-10-09T19:44:51Z)
## Bug Fixes

- Fixed a TUI crash when asynchronous questions contain multiple lines, preserving line breaks and complete hyperlink destinations. (#51866)
- Fixed startup failures caused by differences between a running background server's feature settings and CLI defaults. Compatibility checks now apply only to explicit command-line feature overrides. (#52648)

Full Changelog: https://github.com/openai/codex/compare/rust-v0.162.0...rust-v0.162.1


