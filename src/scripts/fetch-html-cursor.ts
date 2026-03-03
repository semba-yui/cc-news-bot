import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { MuxVideo } from "../services/cursor-article-extractor.js";
import {
  parseAllVersions as parseAllVersionsImpl,
  extractArticleRscPayload as extractArticleRscPayloadImpl,
  extractMuxVideoData as extractMuxVideoDataImpl,
} from "../services/cursor-article-extractor.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import { fetchStaticHtml as fetchStaticHtmlImpl } from "../services/html-fetch-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "cursor";
const CHANGELOG_URL = "https://cursor.com/ja/changelog";
const MAX_INITIAL_VERSIONS = 5;

export interface FetchHtmlCursorDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchStaticHtml: (url: string, opts?: HtmlFetchOptions) => Promise<string>;
  readonly parseAllVersions: (html: string) => string[];
  readonly extractArticleRscPayload: (html: string, version: string) => string | null;
  readonly extractMuxVideoData: (html: string, slug: string) => MuxVideo[];
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlCursorResult {
  readonly hasChanges: boolean;
  readonly newVersions?: string[];
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

  // フェーズ2: 全バージョン検出
  const allVersions = deps.parseAllVersions(html);
  if (allVersions.length === 0) {
    logError("Could not parse any versions from cursor.com HTML");
    return {
      hasChanges: false,
      error: "Could not parse any versions from cursor.com HTML",
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
  const entries: Array<{
    version: string;
    rscPayload: string;
    articleHtml: string;
    muxVideos: Array<{ playbackId: string; thumbnailUrl: string; hlsUrl: string }>;
    fetchedAt: string;
  }> = [];

  for (const version of newVersions) {
    const rscPayload = deps.extractArticleRscPayload(html, version);
    if (!rscPayload) {
      logError(`Could not extract RSC payload for version ${version}, skipping`);
      continue;
    }

    const slug = version.replace(/\./g, "-");
    const muxVideos = deps.extractMuxVideoData(html, slug);

    entries.push({
      version,
      rscPayload,
      articleHtml: "",
      muxVideos: muxVideos.map((v) => ({
        playbackId: v.playbackId,
        thumbnailUrl: v.thumbnailUrl,
        hlsUrl: v.hlsUrl,
      })),
      fetchedAt: now,
    });
  }

  if (entries.length === 0) {
    logError("Could not extract content for any new versions");
    return {
      hasChanges: false,
      error: "Could not extract content for any new versions",
    };
  }

  // フェーズ5: JSON 配列ファイル書き出し
  writeFileSync(resolve(deps.htmlCurrentDir, "cursor.json"), JSON.stringify(entries, null, 2));

  // フェーズ6: state 更新
  state.sources[SOURCE_NAME] = {
    hash: "",
    lastCheckedAt: now,
    latestVersion,
  };
  await deps.saveState(state, deps.dataRoot);

  return {
    hasChanges: true,
    newVersions: entries.map((e) => e.version),
  };
}

async function main(): Promise<void> {
  ensureDataDirs();

  const result = await fetchHtmlCursor({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchStaticHtml: fetchStaticHtmlImpl,
    parseAllVersions: parseAllVersionsImpl,
    extractArticleRscPayload: extractArticleRscPayloadImpl,
    extractMuxVideoData: extractMuxVideoDataImpl,
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
