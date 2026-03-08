import { resolve } from "node:path";
import type { BotProfile } from "../services/slack-service.js";

export interface RawMarkdownSourceConfig {
  readonly name: string;
  readonly type: "raw_markdown";
  readonly url: string;
  readonly owner?: string;
  readonly repo?: string;
  readonly botName: string;
  readonly botEmoji: string;
}

export interface GitHubReleasesSourceConfig {
  readonly name: string;
  readonly type: "github_releases";
  readonly url: string;
  readonly owner: string;
  readonly repo: string;
  readonly botName: string;
  readonly botEmoji: string;
}

export interface HtmlScrapingSourceConfig {
  readonly name: string;
  readonly type: "html_scraping";
  readonly url: string;
  readonly botName: string;
  readonly botEmoji: string;
}

export interface HtmlHeadlessSourceConfig {
  readonly name: string;
  readonly type: "html_headless";
  readonly url: string;
  readonly botName: string;
  readonly botEmoji: string;
}

export type SourceConfig =
  | RawMarkdownSourceConfig
  | GitHubReleasesSourceConfig
  | HtmlScrapingSourceConfig
  | HtmlHeadlessSourceConfig;

export const SOURCES: SourceConfig[] = [
  {
    name: "claude-code",
    type: "raw_markdown",
    url: "https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md",
    botName: "Claude Code Changelog",
    botEmoji: ":claude:",
  },
  {
    name: "codex",
    type: "github_releases",
    url: "https://api.github.com/repos/openai/codex/releases",
    owner: "openai",
    repo: "codex",
    botName: "Codex Releases",
    botEmoji: ":openai-chatgpt:",
  },
  {
    name: "copilot-cli",
    type: "raw_markdown",
    url: "https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md",
    botName: "Copilot CLI Changelog",
    botEmoji: ":github:",
  },
];

export function getBotProfileForSource(name: string): BotProfile | undefined {
  const source = SOURCES.find((s) => s.name === name);
  if (!source) return undefined;
  return { name: source.botName, emoji: source.botEmoji };
}

export function getChannelsForSource(sourceName: string): string[] {
  const envKey = `SLACK_CHANNEL_ID_${sourceName.toUpperCase().replace(/-/g, "_")}`;
  const sourceChannel = process.env[envKey] !== "" ? process.env[envKey] : undefined;
  const raw = sourceChannel ?? process.env.SLACK_CHANNEL_ID ?? "";
  return raw
    .split(",")
    .map((ch) => ch.trim())
    .filter(Boolean);
}

export const HTML_SOURCE_URLS = {
  "openai-news": {
    listUrl: "https://openai.com/ja-JP/news/",
    articleBaseUrl: "https://openai.com/ja-JP/index/",
  },
  "anthropic-news": {
    listUrl: "https://www.anthropic.com/news",
    articleBaseUrl: "https://www.anthropic.com/news/",
  },
  "jules-changelog": {
    listUrl: "https://jules.google/docs/changelog/",
  },
} as const;

const DATA_ROOT = resolve(import.meta.dirname, "../../data");

export const DATA_DIR = {
  root: DATA_ROOT,
  snapshots: resolve(DATA_ROOT, "snapshots"),
  diffs: resolve(DATA_ROOT, "diffs"),
  summaries: resolve(DATA_ROOT, "summaries"),
  current: resolve(DATA_ROOT, "current"),
  htmlCurrent: resolve(DATA_ROOT, "html-current"),
  htmlSummaries: resolve(DATA_ROOT, "html-summaries"),
} as const;
