import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { AnthropicNewsEntry } from "../services/anthropic-news-parser.js";
import {
  parseArticleContent as parseArticleContentImpl,
  parseArticleList as parseArticleListImpl,
} from "../services/anthropic-news-parser.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import { fetchStaticHtml as fetchStaticHtmlImpl } from "../services/html-fetch-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "anthropic-news";
const LIST_URL = "https://www.anthropic.com/news";
const ARTICLE_BASE_URL = "https://www.anthropic.com/news/";
const MAX_INITIAL_ARTICLES = 3;

export interface FetchHtmlAnthropicNewsDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchStaticHtml: (url: string, opts?: HtmlFetchOptions) => Promise<string>;
  readonly parseArticleList: (html: string) => AnthropicNewsEntry[];
  readonly parseArticleContent: (html: string, slug: string) => string | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlAnthropicNewsResult {
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

export async function fetchHtmlAnthropicNews(
  deps: FetchHtmlAnthropicNewsDeps,
): Promise<FetchHtmlAnthropicNewsResult> {
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

  // Phase 2: 記事一覧をパース
  const allArticles = deps.parseArticleList(listHtml);
  if (allArticles.length === 0) {
    logError("Could not parse any articles from Anthropic News HTML");
    return {
      hasChanges: false,
      error: "Could not parse any articles from Anthropic News HTML",
    };
  }

  // Phase 3: 新着記事の特定
  let newArticles: AnthropicNewsEntry[];
  let allSlugsForState: string[];

  if (isFirstRun) {
    newArticles = allArticles.slice(0, MAX_INITIAL_ARTICLES);
    allSlugsForState = allArticles.map((a) => a.slug);
  } else {
    newArticles = allArticles.filter((a) => !knownSlugs.has(a.slug));
    allSlugsForState = [...knownSlugs];
  }

  if (newArticles.length === 0) {
    return { hasChanges: false };
  }

  // Phase 4: 個別記事ページの取得とコンテンツ抽出
  const entries: Array<{
    slug: string;
    title: string;
    date: string;
    category: string;
    contentEn: string;
    fetchedAt: string;
  }> = [];

  for (const article of newArticles) {
    let articleHtml: string;
    try {
      articleHtml = await deps.fetchStaticHtml(`${ARTICLE_BASE_URL}${article.slug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError(`Failed to fetch article ${article.slug}: ${message}`);
      continue;
    }

    const content = deps.parseArticleContent(articleHtml, article.slug);
    if (!content) {
      logError(`Could not parse content for article ${article.slug}, skipping`);
      continue;
    }

    entries.push({
      slug: article.slug,
      title: article.title,
      date: article.date,
      category: article.category,
      contentEn: content,
      fetchedAt: now,
    });
  }

  if (entries.length === 0) {
    logError("Could not extract content for any new articles");
    return {
      hasChanges: false,
      error: "Could not extract content for any new articles",
    };
  }

  // Phase 5: JSON ファイル書き出し
  writeFileSync(
    resolve(deps.htmlCurrentDir, "anthropic-news.json"),
    JSON.stringify(entries, null, 2),
  );

  // Phase 6: state 更新
  const successSlugs = entries.map((e) => e.slug);
  const updatedKnownSlugs = isFirstRun ? allSlugsForState : [...allSlugsForState, ...successSlugs];

  state.sources[SOURCE_NAME] = {
    type: "slug_list",
    hash: "",
    lastCheckedAt: now,
    knownSlugs: updatedKnownSlugs,
  };
  await deps.saveState(state, deps.dataRoot);

  return {
    hasChanges: true,
    newArticles: successSlugs,
  };
}

async function main(): Promise<void> {
  ensureDataDirs();

  const result = await fetchHtmlAnthropicNews({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchStaticHtml: fetchStaticHtmlImpl,
    parseArticleList: parseArticleListImpl,
    parseArticleContent: parseArticleContentImpl,
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
const isMainModule = process.argv[1]?.includes("fetch-html-anthropic-news");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
