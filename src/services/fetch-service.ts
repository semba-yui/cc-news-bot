import type { SourceConfig } from "../config/sources.js";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchOptions {
  timeoutMs?: number;
  since?: string; // ISO 8601: これより新しいリリースのみ返す（github_releases 用）
}

export interface FetchAllOptions {
  githubToken?: string;
  sourceStates?: Record<string, { latestReleasedAt?: string } | undefined>; // per-source since フィルタ用
}

export interface FetchResult {
  source: string;
  success: boolean;
  content?: string;
  error?: string;
  latestReleasedAt?: string; // github_releases: 取得した最新 stable リリースの published_at
}

export async function fetchRawMarkdown(url: string, options?: FetchOptions): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export interface GitHubReleaseEntry {
  readonly tagName: string;
  readonly publishedAt: string;
  readonly body: string;
}

export function formatReleasesAsText(entries: GitHubReleaseEntry[]): string {
  return entries.map((e) => `## ${e.tagName} (${e.publishedAt})\n${e.body}`).join("\n\n");
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  body: string;
  prerelease: boolean;
}

export async function fetchGitHubReleases(
  owner: string,
  repo: string,
  token?: string,
  options?: FetchOptions,
): Promise<GitHubReleaseEntry[]> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch releases for ${owner}/${repo}: ${response.status} ${response.statusText}`,
    );
  }

  const releases = (await response.json()) as GitHubRelease[];

  return releases
    .filter((r) => !r.prerelease && (!options?.since || r.published_at > options.since))
    .map((r) => ({ tagName: r.tag_name, publishedAt: r.published_at, body: r.body }));
}

async function fetchOne(source: SourceConfig, options?: FetchAllOptions): Promise<FetchResult> {
  try {
    let content: string;
    if (source.type === "github_releases") {
      const since = options?.sourceStates?.[source.name]?.latestReleasedAt;
      const entries = await fetchGitHubReleases(source.owner, source.repo, options?.githubToken, {
        since,
      });
      content = formatReleasesAsText(entries);
      const latestReleasedAt = entries.length > 0 ? entries[0].publishedAt : undefined;
      return { source: source.name, success: true, content, latestReleasedAt };
    } else {
      content = await fetchRawMarkdown(source.url);
    }
    return { source: source.name, success: true, content };
  } catch (err) {
    return {
      source: source.name,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchAll(
  sources: SourceConfig[],
  options?: FetchAllOptions,
): Promise<FetchResult[]> {
  return Promise.all(sources.map((s) => fetchOne(s, options)));
}
