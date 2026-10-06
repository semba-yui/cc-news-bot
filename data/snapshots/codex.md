## rust-v0.160.1 (2026-10-05T18:29:37Z)
## Bug Fixes

- Preserve `SYSTEMROOT`, `TEMP`, and `TMP` when launching remote stdio MCP servers with explicitly configured remote environment variables, allowing Unix hosts to retain the Windows executor's startup environment.

## Changelog

- [#51121](https://github.com/openai/codex/pull/51121): Backport Windows remote MCP environment preservation to 0.160.


