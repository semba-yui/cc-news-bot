import type { SourceConfig } from "../config/sources.js";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchOptions {
  timeoutMs?: number;
}

export interface FetchAllOptions {
  githubToken?: string;
}

export interface FetchResult {
  source: string;
  success: boolean;
  content?: string;
  error?: string;
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
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`;

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
    .filter((r) => !r.prerelease)
    .map((r) => `## ${r.tag_name} (${r.published_at})\n${r.body}`)
    .join("\n\n");
}

async function fetchOne(source: SourceConfig, options?: FetchAllOptions): Promise<FetchResult> {
  try {
    let content: string;
    if (source.type === "github_releases") {
      content = await fetchGitHubReleases(source.owner!, source.repo!, options?.githubToken);
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
