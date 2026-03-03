import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { CursorEntry, MuxVideo } from "../services/cursor-article-extractor.js";
import {
  parseAllEntries as parseAllEntriesImpl,
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
  readonly parseAllEntries: (html: string) => CursorEntry[];
  readonly extractArticleRscPayload: (html: string, slug: string) => string | null;
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
  const sourceState = state.sources[SOURCE_NAME];

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

  // フェーズ2: 全エントリ検出（date 降順）
  const allEntries = deps.parseAllEntries(html);
  if (allEntries.length === 0) {
    logError("Could not parse any entries from cursor.com HTML");
    return {
      hasChanges: false,
      error: "Could not parse any entries from cursor.com HTML",
    };
  }

  // フェーズ3: カットオフ date/slug の決定
  let cutoffDate: string | undefined;
  let cutoffSlug: string | undefined;

  if (sourceState?.latestDate) {
    cutoffDate = sourceState.latestDate;
    cutoffSlug = sourceState.latestSlug;
  } else if (sourceState?.latestVersion) {
    // マイグレーション: latestVersion → latestDate/latestSlug
    const matched = allEntries.find((e) => e.version === sourceState.latestVersion);
    if (matched) {
      cutoffDate = matched.date;
      cutoffSlug = matched.slug;
    }
  }

  // フェーズ4: 未通知エントリの特定
  let newEntries: CursorEntry[];
  if (!cutoffDate) {
    // 初回実行: 最新 MAX_INITIAL_VERSIONS 件
    newEntries = allEntries.slice(0, MAX_INITIAL_VERSIONS);
  } else {
    newEntries = [];
    for (const entry of allEntries) {
      if (entry.date > cutoffDate) {
        // date が新しい → 新規
        newEntries.push(entry);
      } else if (entry.date === cutoffDate && entry.slug !== cutoffSlug) {
        // 同一日付の別エントリ → 新規
        newEntries.push(entry);
      }
      // entry.date === cutoffDate && entry.slug === cutoffSlug → 境界（既知）
      // entry.date < cutoffDate → 既知
    }
  }

  if (newEntries.length === 0) {
    return { hasChanges: false };
  }

  // 古い順に反転
  newEntries.reverse();

  // フェーズ5: 各エントリのコンテンツ抽出
  const entries: Array<{
    version: string;
    title: string;
    rscPayload: string;
    articleHtml: string;
    muxVideos: Array<{ playbackId: string; thumbnailUrl: string; hlsUrl: string }>;
    fetchedAt: string;
  }> = [];

  for (const entry of newEntries) {
    const rscPayload = deps.extractArticleRscPayload(html, entry.slug);
    if (!rscPayload) {
      logError(`Could not extract RSC payload for entry ${entry.slug}, skipping`);
      continue;
    }

    const muxVideos = deps.extractMuxVideoData(html, entry.slug);

    entries.push({
      version: entry.version,
      title: entry.title,
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
    logError("Could not extract content for any new entries");
    return {
      hasChanges: false,
      error: "Could not extract content for any new entries",
    };
  }

  // フェーズ6: JSON 配列ファイル書き出し
  writeFileSync(resolve(deps.htmlCurrentDir, "cursor.json"), JSON.stringify(entries, null, 2));

  // フェーズ7: state 更新（最新エントリの date/slug を保存）
  const latestEntry = allEntries[0];
  state.sources[SOURCE_NAME] = {
    hash: "",
    lastCheckedAt: now,
    latestDate: latestEntry.date,
    latestSlug: latestEntry.slug,
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
    parseAllEntries: parseAllEntriesImpl,
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
