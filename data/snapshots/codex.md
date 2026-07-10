## rust-v0.144.1 (2026-07-09T23:02:40Z)
## Bug Fixes

- Fixed standalone installs failing when GitHub returns compact or reordered release metadata. (#31913)
- Ensured macOS package installs expose the code-mode host alongside the `codex` executable. (#31913)
- Kept code mode working when the companion host binary is unavailable by falling back to the embedded runtime. (#31913)

## Changelog

Full Changelog: https://github.com/openai/codex/compare/rust-v0.144.0...rust-v0.144.1

- #31913 [0.144] Backport installer and code-mode reliability fixes @bolinfest


