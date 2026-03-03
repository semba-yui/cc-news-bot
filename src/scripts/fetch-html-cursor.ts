import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { CursorVersionContent } from "../services/cursor-parser.js";
import {
  parseLatestVersion as parseLatestVersionImpl,
  parseVersionContent as parseVersionContentImpl,
} from "../services/cursor-parser.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import { fetchStaticHtml as fetchStaticHtmlImpl } from "../services/html-fetch-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "cursor";
const CHANGELOG_URL = "https://cursor.com/ja/changelog";

export interface FetchHtmlCursorDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchStaticHtml: (url: string, opts?: HtmlFetchOptions) => Promise<string>;
  readonly parseLatestVersion: (html: string) => string | null;
  readonly parseVersionContent: (html: string, version: string) => CursorVersionContent | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlCursorResult {
  readonly hasChanges: boolean;
  readonly newVersion?: string;
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

export async function fetchHtmlCursor(deps: FetchHtmlCursorDeps): Promise<FetchHtmlCursorResult> {
  const state = await deps.loadState(deps.dataRoot);
  const now = new Date().toISOString();
  const existingVersion = state.sources[SOURCE_NAME]?.latestVersion;

  // フェーズ1: cursor.com/ja/changelog からの取得
  let html: string;
  try {
    html = await deps.fetchStaticHtml(CHANGELOG_URL);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`cursor.com fetch failed: ${message}`);
    return {
      hasChanges: false,
      error: `cursor.com fetch failed: ${message}`,
    };
  }

  // フェーズ2: バージョン検出
  const latestVersion = deps.parseLatestVersion(html);
  if (!latestVersion) {
    logError("Could not parse latest version from cursor.com HTML");
    return {
      hasChanges: false,
      error: "Could not parse latest version from cursor.com HTML",
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
  const versionContent = deps.parseVersionContent(html, latestVersion);
  if (!versionContent) {
    logError(`Could not parse content for version ${latestVersion}`);
    return {
      hasChanges: false,
      error: `Could not parse content for version ${latestVersion}`,
    };
  }

  // フェーズ4: JSON ファイル書き出し
  const outputFile = {
    version: latestVersion,
    contentJa: versionContent.contentJa,
    imageUrls: [...versionContent.imageUrls],
    videos: versionContent.videos.map((v) => ({
      playbackId: v.playbackId,
      thumbnailUrl: v.thumbnailUrl,
      hlsUrl: v.hlsUrl,
    })),
    fetchedAt: now,
  };

  writeFileSync(resolve(deps.htmlCurrentDir, "cursor.json"), JSON.stringify(outputFile, null, 2));

  // フェーズ5: state 更新
  state.sources[SOURCE_NAME] = {
    hash: "",
    lastCheckedAt: now,
    latestVersion,
  };
  await deps.saveState(state, deps.dataRoot);

  return {
    hasChanges: true,
    newVersion: latestVersion,
  };
}

async function main(): Promise<void> {
  ensureDataDirs();

  const result = await fetchHtmlCursor({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchStaticHtml: fetchStaticHtmlImpl,
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
  if (result.error) console.error(`Error: ${result.error}`);
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("fetch-html-cursor");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
