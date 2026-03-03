import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { GeminiCliVersionContent } from "../services/gemini-cli-parser.js";
import {
  parseAllVersions as parseAllVersionsImpl,
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
const MAX_INITIAL_VERSIONS = 5;

export interface FetchHtmlGeminiCliDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchStaticHtml: (url: string, opts?: HtmlFetchOptions) => Promise<string>;
  readonly fetchGitHubReleases: (owner: string, repo: string, token?: string) => Promise<string>;
  readonly parseAllVersions: (html: string) => string[];
  readonly parseVersionContent: (html: string, version: string) => GeminiCliVersionContent | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlGeminiCliResult {
  readonly hasChanges: boolean;
  readonly newVersions?: string[];
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
  let allVersions: string[] = [];

  if (html) {
    allVersions = deps.parseAllVersions(html);
  }

  // geminicli.com からバージョン取得できない場合、GitHub Releases フォールバック
  if (allVersions.length === 0 && htmlFetchError) {
    const ghText = await fetchGitHubReleasesText(deps);
    if (!ghText) {
      return {
        hasChanges: false,
        error: "Both geminicli.com and GitHub Releases fetch failed",
      };
    }

    const versionMatch = ghText.match(/## (v\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      return {
        hasChanges: false,
        error: "Could not extract version from GitHub Releases",
      };
    }

    const latestVersion = versionMatch[1];

    if (existingVersion === latestVersion) {
      return { hasChanges: false };
    }

    // fallback モード: 単一バージョン配列
    const entries = [
      {
        version: latestVersion,
        rawSummaryEn: null,
        imageUrls: [] as string[],
        mode: "fallback" as const,
        fetchedAt: now,
      },
    ];

    writeFileSync(
      resolve(deps.htmlCurrentDir, "gemini-cli.json"),
      JSON.stringify(entries, null, 2),
    );

    // releases テキストを別ファイルに保存
    if (ghText) {
      writeFileSync(resolve(deps.htmlCurrentDir, "gemini-cli-releases.txt"), ghText);
    }

    state.sources[SOURCE_NAME] = {
      hash: "",
      lastCheckedAt: now,
      latestVersion,
    };
    await deps.saveState(state, deps.dataRoot);

    return {
      hasChanges: true,
      newVersions: [latestVersion],
      mode: "fallback",
    };
  }

  // parseAllVersions が空の場合（DOM 構造変更等）
  if (allVersions.length === 0) {
    logError("Could not parse any versions from geminicli.com HTML");
    return {
      hasChanges: false,
      error: "Could not parse any versions from geminicli.com HTML",
    };
  }

  const latestVersion = allVersions[0];

  // 同一バージョンチェック
  if (existingVersion === latestVersion) {
    return { hasChanges: false };
  }

  // フェーズ3: 未通知バージョンの特定
  let newVersions: string[];
  if (!existingVersion) {
    newVersions = allVersions.slice(0, MAX_INITIAL_VERSIONS);
  } else {
    const existingIdx = allVersions.indexOf(existingVersion);
    if (existingIdx === -1) {
      newVersions = [...allVersions];
    } else {
      newVersions = allVersions.slice(0, existingIdx);
    }
  }

  // 古い順に反転
  newVersions.reverse();

  // フェーズ4: 各バージョンのコンテンツ抽出
  const contentResults: Array<{
    version: string;
    content: GeminiCliVersionContent | null;
  }> = [];

  for (const version of newVersions) {
    const content = deps.parseVersionContent(html!, version);
    contentResults.push({ version, content });
  }

  // コンテンツ取得成功分があるかチェック
  const hasAnyContent = contentResults.some((r) => r.content !== null);

  // GitHub Releases テキスト取得（最新バージョンのスレッド返信用）
  const ghText = await fetchGitHubReleasesText(deps);

  if (hasAnyContent) {
    // full モード: コンテンツ取得成功分を配列で書き出し
    const entries = contentResults
      .filter((r) => r.content !== null)
      .map((r) => ({
        version: r.version,
        rawSummaryEn: r.content!.rawSummaryEn,
        imageUrls: [...r.content!.imageUrls],
        mode: "full" as const,
        fetchedAt: now,
      }));

    writeFileSync(
      resolve(deps.htmlCurrentDir, "gemini-cli.json"),
      JSON.stringify(entries, null, 2),
    );

    // releases テキストを別ファイルに保存
    if (ghText) {
      writeFileSync(resolve(deps.htmlCurrentDir, "gemini-cli-releases.txt"), ghText);
    }

    state.sources[SOURCE_NAME] = {
      hash: "",
      lastCheckedAt: now,
      latestVersion,
    };
    await deps.saveState(state, deps.dataRoot);

    return {
      hasChanges: true,
      newVersions: entries.map((e) => e.version),
      mode: "full",
    };
  }

  // 全バージョンのコンテンツ抽出失敗 → GitHub Releases フォールバック
  // 最新バージョンのみ fallback エントリとして書き出し
  const entries = [
    {
      version: latestVersion,
      rawSummaryEn: null,
      imageUrls: [] as string[],
      mode: "fallback" as const,
      fetchedAt: now,
    },
  ];

  writeFileSync(resolve(deps.htmlCurrentDir, "gemini-cli.json"), JSON.stringify(entries, null, 2));

  // releases テキストを別ファイルに保存
  if (ghText) {
    writeFileSync(resolve(deps.htmlCurrentDir, "gemini-cli-releases.txt"), ghText);
  }

  state.sources[SOURCE_NAME] = {
    hash: "",
    lastCheckedAt: now,
    latestVersion,
  };
  await deps.saveState(state, deps.dataRoot);

  return {
    hasChanges: true,
    newVersions: [latestVersion],
    mode: "fallback",
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
    parseAllVersions: parseAllVersionsImpl,
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
  if (result.newVersions) console.log(`New versions: ${result.newVersions.join(", ")}`);
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
