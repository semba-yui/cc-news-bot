import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { AntigravityVersionContent } from "../services/antigravity-parser.js";
import {
  parseAllVersions as parseAllVersionsImpl,
  parseVersionContent as parseVersionContentImpl,
} from "../services/antigravity-parser.js";
import type { PlaywrightFetchOptions } from "../services/playwright-service.js";
import { fetchHeadlessHtml as fetchHeadlessHtmlImpl } from "../services/playwright-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "antigravity";
const CHANGELOG_URL = "https://antigravity.google/changelog";
const MAX_INITIAL_VERSIONS = 5;

export interface FetchHtmlAntigravityDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchHeadlessHtml: (url: string, opts?: PlaywrightFetchOptions) => Promise<string>;
  readonly parseAllVersions: (html: string) => string[];
  readonly parseVersionContent: (html: string, version: string) => AntigravityVersionContent | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlAntigravityResult {
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

export async function fetchHtmlAntigravity(
  deps: FetchHtmlAntigravityDeps,
): Promise<FetchHtmlAntigravityResult> {
  const state = await deps.loadState(deps.dataRoot);
  const now = new Date().toISOString();
  const existingVersion = state.sources[SOURCE_NAME]?.latestVersion;

  // フェーズ1: Playwright 経由で changelog ページを取得
  let html: string;
  try {
    html = await deps.fetchHeadlessHtml(CHANGELOG_URL);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`Playwright fetch failed: ${message}`);
    return {
      hasChanges: false,
      error: `Playwright fetch failed: ${message}`,
    };
  }

  // フェーズ2: 全バージョン検出
  const allVersions = deps.parseAllVersions(html);
  if (allVersions.length === 0) {
    logError("Could not parse any versions from antigravity HTML");
    return {
      hasChanges: false,
      error: "Could not parse any versions from antigravity HTML",
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
    // 初回実行: 最新5件まで
    newVersions = allVersions.slice(0, MAX_INITIAL_VERSIONS);
  } else {
    const existingIdx = allVersions.indexOf(existingVersion);
    if (existingIdx === -1) {
      // 既存バージョンがページにない → 全バージョンを取得
      newVersions = [...allVersions];
    } else {
      // existingVersion の手前まで
      newVersions = allVersions.slice(0, existingIdx);
    }
  }

  // 古い順に反転
  newVersions.reverse();

  // フェーズ4: 各バージョンのコンテンツ抽出
  const entries: Array<{
    version: string;
    improvementsEn: string[];
    fixesEn: string[];
    patchesEn: string[];
    fetchedAt: string;
  }> = [];

  for (const version of newVersions) {
    const content = deps.parseVersionContent(html, version);
    if (!content) {
      logError(`Could not parse content for version ${version}, skipping`);
      continue;
    }
    entries.push({
      version,
      improvementsEn: [...content.improvementsEn],
      fixesEn: [...content.fixesEn],
      patchesEn: [...content.patchesEn],
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
  writeFileSync(resolve(deps.htmlCurrentDir, "antigravity.json"), JSON.stringify(entries, null, 2));

  // フェーズ6: state 更新（最新バージョンで）
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

  const result = await fetchHtmlAntigravity({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchHeadlessHtml: fetchHeadlessHtmlImpl,
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
  if (result.error) console.error(`Error: ${result.error}`);
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("fetch-html-antigravity");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
