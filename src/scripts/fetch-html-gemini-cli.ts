import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { GeminiCliVersionContent } from "../services/gemini-cli-parser.js";
import {
  parseLatestVersion as parseLatestVersionImpl,
  parseVersionContent as parseVersionContentImpl,
} from "../services/gemini-cli-parser.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import { fetchStaticHtml as fetchStaticHtmlImpl } from "../services/html-fetch-service.js";
import { fetchGitHubReleases as fetchGitHubReleasesImpl } from "../services/fetch-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "gemini-cli";
const CHANGELOG_URL = "https://geminicli.com/docs/changelogs/";
const GITHUB_OWNER = "google-gemini";
const GITHUB_REPO = "gemini-cli";

export interface FetchHtmlGeminiCliDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchStaticHtml: (url: string, opts?: HtmlFetchOptions) => Promise<string>;
  readonly fetchGitHubReleases: (owner: string, repo: string, token?: string) => Promise<string>;
  readonly parseLatestVersion: (html: string) => string | null;
  readonly parseVersionContent: (html: string, version: string) => GeminiCliVersionContent | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlGeminiCliResult {
  readonly hasChanges: boolean;
  readonly newVersion?: string;
  readonly mode?: "full" | "fallback";
  readonly error?: string;
}

function logError(message: string): void {
  console.error(
    JSON.stringify({
      level: "error",
      source: SOURCE_NAME,
      message,
      timestamp: new Date().toISOString(),
    }),
  );
}

async function fetchGitHubReleasesText(
  deps: FetchHtmlGeminiCliDeps,
  token?: string,
): Promise<string | null> {
  try {
    return await deps.fetchGitHubReleases(GITHUB_OWNER, GITHUB_REPO, token);
  } catch (err) {
    logError(`GitHub Releases fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function fetchHtmlGeminiCli(
  deps: FetchHtmlGeminiCliDeps,
): Promise<FetchHtmlGeminiCliResult> {
  const state = await deps.loadState(deps.dataRoot);
  const now = new Date().toISOString();
  const existingVersion = state.sources[SOURCE_NAME]?.latestVersion;

  // フェーズ1: geminicli.com からの取得を試行
  let html: string | null = null;
  let htmlFetchError: string | null = null;

  try {
    html = await deps.fetchStaticHtml(CHANGELOG_URL);
  } catch (err) {
    htmlFetchError = err instanceof Error ? err.message : String(err);
    logError(`geminicli.com fetch failed: ${htmlFetchError}`);
  }

  // フェーズ2: バージョン検出
  let latestVersion: string | null = null;

  if (html) {
    latestVersion = deps.parseLatestVersion(html);
  }

  // geminicli.com からバージョン取得できない場合、GitHub Releases からバージョンを抽出
  if (!latestVersion && htmlFetchError) {
    // フォールバックモード: GitHub Releases からバージョンとコンテンツを取得
    const ghText = await fetchGitHubReleasesText(deps);
    if (!ghText) {
      return {
        hasChanges: false,
        error: "Both geminicli.com and GitHub Releases fetch failed",
      };
    }

    // GitHub Releases テキストからバージョンを抽出 (## vX.Y.Z パターン)
    const versionMatch = ghText.match(/## (v\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      return {
        hasChanges: false,
        error: "Could not extract version from GitHub Releases",
      };
    }

    latestVersion = versionMatch[1];

    // 同一バージョンチェック
    if (existingVersion === latestVersion) {
      return { hasChanges: false };
    }

    // 初回実行チェック
    if (existingVersion === undefined) {
      state.sources[SOURCE_NAME] = {
        hash: "",
        lastCheckedAt: now,
        latestVersion,
      };
      await deps.saveState(state, deps.dataRoot);
      return { hasChanges: false };
    }

    // fallback モードで JSON 書き出し
    const outputFile = {
      version: latestVersion,
      rawSummaryEn: null,
      imageUrls: [],
      githubReleasesText: ghText,
      mode: "fallback" as const,
      fetchedAt: now,
    };

    writeFileSync(
      resolve(deps.htmlCurrentDir, "gemini-cli.json"),
      JSON.stringify(outputFile, null, 2),
    );

    state.sources[SOURCE_NAME] = {
      hash: "",
      lastCheckedAt: now,
      latestVersion,
    };
    await deps.saveState(state, deps.dataRoot);

    return {
      hasChanges: true,
      newVersion: latestVersion,
      mode: "fallback",
    };
  }

  // parseLatestVersion が null の場合（DOM 構造変更等）
  if (!latestVersion) {
    logError("Could not parse latest version from geminicli.com HTML");
    return {
      hasChanges: false,
      error: "Could not parse latest version from geminicli.com HTML",
    };
  }

  // 同一バージョンチェック
  if (existingVersion === latestVersion) {
    return { hasChanges: false };
  }

  // 初回実行チェック
  if (existingVersion === undefined) {
    state.sources[SOURCE_NAME] = {
      hash: "",
      lastCheckedAt: now,
      latestVersion,
    };
    await deps.saveState(state, deps.dataRoot);
    return { hasChanges: false };
  }

  // フェーズ3: コンテンツ抽出
  const versionContent = deps.parseVersionContent(html!, latestVersion);

  if (!versionContent) {
    // parseVersionContent が null → geminicli.com のコンテンツは取れないが、
    // GitHub Releases で fallback
    const ghText = await fetchGitHubReleasesText(deps);

    const outputFile = {
      version: latestVersion,
      rawSummaryEn: null,
      imageUrls: [],
      githubReleasesText: ghText,
      mode: "fallback" as const,
      fetchedAt: now,
    };

    writeFileSync(
      resolve(deps.htmlCurrentDir, "gemini-cli.json"),
      JSON.stringify(outputFile, null, 2),
    );

    state.sources[SOURCE_NAME] = {
      hash: "",
      lastCheckedAt: now,
      latestVersion,
    };
    await deps.saveState(state, deps.dataRoot);

    return {
      hasChanges: true,
      newVersion: latestVersion,
      mode: "fallback",
    };
  }

  // フェーズ4: GitHub Releases テキスト取得（失敗時は null）
  const ghText = await fetchGitHubReleasesText(deps);

  // フェーズ5: JSON ファイル書き出し
  const outputFile = {
    version: latestVersion,
    rawSummaryEn: versionContent.rawSummaryEn,
    imageUrls: [...versionContent.imageUrls],
    githubReleasesText: ghText,
    mode: "full" as const,
    fetchedAt: now,
  };

  writeFileSync(
    resolve(deps.htmlCurrentDir, "gemini-cli.json"),
    JSON.stringify(outputFile, null, 2),
  );

  // フェーズ6: state 更新
  state.sources[SOURCE_NAME] = {
    hash: "",
    lastCheckedAt: now,
    latestVersion,
  };
  await deps.saveState(state, deps.dataRoot);

  return {
    hasChanges: true,
    newVersion: latestVersion,
    mode: "full",
  };
}

async function main(): Promise<void> {
  ensureDataDirs();

  const githubToken = process.env.GITHUB_TOKEN;

  const result = await fetchHtmlGeminiCli({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchStaticHtml: fetchStaticHtmlImpl,
    fetchGitHubReleases: (owner, repo, token) =>
      fetchGitHubReleasesImpl(owner, repo, token ?? githubToken),
    parseLatestVersion: parseLatestVersionImpl,
    parseVersionContent: parseVersionContentImpl,
    loadState: loadStateImpl,
    saveState: saveStateImpl,
  });

  // GitHub Actions output
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `has_changes=${result.hasChanges}\n`);
  }

  console.log(`Has changes: ${result.hasChanges}`);
  if (result.newVersion) console.log(`New version: ${result.newVersion}`);
  if (result.mode) console.log(`Mode: ${result.mode}`);
  if (result.error) console.error(`Error: ${result.error}`);
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("fetch-html-gemini-cli");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
