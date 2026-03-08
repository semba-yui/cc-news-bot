import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import { fetchStaticHtml as fetchStaticHtmlImpl } from "../services/html-fetch-service.js";
import type { JulesChangelogEntry } from "../services/jules-changelog-parser.js";
import { parseArticleList as parseArticleListImpl } from "../services/jules-changelog-parser.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "jules-changelog";
const LIST_URL = "https://jules.google/docs/changelog/";
const MAX_INITIAL_ARTICLES = 3;

export interface FetchHtmlJulesChangelogDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchStaticHtml: (url: string, opts?: HtmlFetchOptions) => Promise<string>;
  readonly parseArticleList: (html: string) => JulesChangelogEntry[];
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlJulesChangelogResult {
  readonly hasChanges: boolean;
  readonly newArticles?: string[];
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

export async function fetchHtmlJulesChangelog(
  deps: FetchHtmlJulesChangelogDeps,
): Promise<FetchHtmlJulesChangelogResult> {
  const state = await deps.loadState(deps.dataRoot);
  const now = new Date().toISOString();
  const sourceState = state.sources[SOURCE_NAME];
  const knownSlugs =
    sourceState?.type === "slug_list" ? new Set(sourceState.knownSlugs) : undefined;
  const isFirstRun = knownSlugs === undefined;

  // Phase 1: Static HTML で一覧ページを取得
  let listHtml: string;
  try {
    listHtml = await deps.fetchStaticHtml(LIST_URL);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`Static HTML fetch failed: ${message}`);
    return {
      hasChanges: false,
      error: `Static HTML fetch failed: ${message}`,
    };
  }

  // Phase 2: 記事一覧をパース（コンテンツも含まれる）
  const allArticles = deps.parseArticleList(listHtml);
  if (allArticles.length === 0) {
    logError("Could not parse any articles from Jules Changelog HTML");
    return {
      hasChanges: false,
      error: "Could not parse any articles from Jules Changelog HTML",
    };
  }

  // Phase 3: 新着記事の特定
  let newArticles: JulesChangelogEntry[];
  let allSlugsForState: string[];

  if (isFirstRun) {
    newArticles = allArticles.slice(0, MAX_INITIAL_ARTICLES);
    allSlugsForState = allArticles.map((a) => a.dateSlug);
  } else {
    newArticles = allArticles.filter((a) => !knownSlugs.has(a.dateSlug));
    allSlugsForState = [...knownSlugs];
  }

  if (newArticles.length === 0) {
    return { hasChanges: false };
  }

  // Phase 4: エントリ構築（個別記事ページアクセス不要 — 一覧ページにコンテンツ展開済み）
  const entries = newArticles.map((article) => ({
    dateSlug: article.dateSlug,
    title: article.title,
    date: article.date,
    contentEn: article.contentEn,
    fetchedAt: now,
  }));

  // Phase 5: JSON ファイル書き出し
  writeFileSync(
    resolve(deps.htmlCurrentDir, "jules-changelog.json"),
    JSON.stringify(entries, null, 2),
  );

  // Phase 6: state 更新
  const newSlugs = entries.map((e) => e.dateSlug);
  const updatedKnownSlugs = isFirstRun ? allSlugsForState : [...allSlugsForState, ...newSlugs];

  state.sources[SOURCE_NAME] = {
    type: "slug_list",
    hash: "",
    lastCheckedAt: now,
    knownSlugs: updatedKnownSlugs,
  };
  await deps.saveState(state, deps.dataRoot);

  return {
    hasChanges: true,
    newArticles: newSlugs,
  };
}

async function main(): Promise<void> {
  ensureDataDirs();

  const result = await fetchHtmlJulesChangelog({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchStaticHtml: fetchStaticHtmlImpl,
    parseArticleList: parseArticleListImpl,
    loadState: loadStateImpl,
    saveState: saveStateImpl,
  });

  // GitHub Actions output
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `has_changes=${result.hasChanges}\n`);
  }

  console.log(`Has changes: ${result.hasChanges}`);
  if (result.newArticles) console.log(`New articles: ${result.newArticles.join(", ")}`);
  if (result.error) console.error(`Error: ${result.error}`);
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("fetch-html-jules-changelog");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
