import { resolve } from "node:path";

export interface SourceConfig {
  name: string;
  type: "raw_markdown" | "github_releases";
  url: string;
  owner?: string;
  repo?: string;
}

export const SOURCES: SourceConfig[] = [
  {
    name: "claude-code",
    type: "raw_markdown",
    url: "https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md",
  },
  {
    name: "codex",
    type: "github_releases",
    url: "https://api.github.com/repos/openai/codex/releases",
    owner: "openai",
    repo: "codex",
  },
  {
    name: "copilot-cli",
    type: "raw_markdown",
    url: "https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md",
  },
];

const DATA_ROOT = resolve(import.meta.dirname, "../../data");

export const DATA_DIR = {
  root: DATA_ROOT,
  snapshots: resolve(DATA_ROOT, "snapshots"),
  diffs: resolve(DATA_ROOT, "diffs"),
  summaries: resolve(DATA_ROOT, "summaries"),
  current: resolve(DATA_ROOT, "current"),
} as const;
