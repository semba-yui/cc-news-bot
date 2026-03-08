import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { OpenAINewsEntry } from "../services/openai-news-parser.js";
import {
  parseArticleContent as parseArticleContentImpl,
  parseArticleList as parseArticleListImpl,
} from "../services/openai-news-parser.js";
import type { PlaywrightFetchOptions } from "../services/playwright-service.js";
import { fetchHeadlessHtml as fetchHeadlessHtmlImpl } from "../services/playwright-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadState as loadStateImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const SOURCE_NAME = "openai-news";
const LIST_URL = "https://openai.com/ja-JP/news/";
const ARTICLE_BASE_URL = "https://openai.com/ja-JP/index/";
const MAX_INITIAL_ARTICLES = 3;

export interface FetchHtmlOpenAINewsDeps {
  readonly dataRoot: string;
  readonly htmlCurrentDir: string;
  readonly fetchHeadlessHtml: (url: string, opts?: PlaywrightFetchOptions) => Promise<string>;
  readonly parseArticleList: (html: string) => OpenAINewsEntry[];
  readonly parseArticleContent: (html: string, slug: string) => string | null;
  readonly loadState: (root: string) => Promise<SnapshotState>;
  readonly saveState: (state: SnapshotState, root: string) => Promise<void>;
}

export interface FetchHtmlOpenAINewsResult {
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

export async function fetchHtmlOpenAINews(
  deps: FetchHtmlOpenAINewsDeps,
): Promise<FetchHtmlOpenAINewsResult> {
  const state = await deps.loadState(deps.dataRoot);
  const now = new Date().toISOString();
  const sourceState = state.sources[SOURCE_NAME];
  const knownSlugs =
    sourceState?.type === "slug_list" ? new Set(sourceState.knownSlugs) : undefined;
  const isFirstRun = knownSlugs === undefined;

  // Phase 1: Playwright 経由で一覧ページを取得
  let listHtml: string;
  try {
    listHtml = await deps.fetchHeadlessHtml(LIST_URL);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`Playwright fetch failed: ${message}`);
    return {
      hasChanges: false,
      error: `Playwright fetch failed: ${message}`,
    };
  }

  // Phase 2: 記事一覧をパース
  const allArticles = deps.parseArticleList(listHtml);
  if (allArticles.length === 0) {
    logError("Could not parse any articles from OpenAI News HTML");
    return {
      hasChanges: false,
      error: "Could not parse any articles from OpenAI News HTML",
    };
  }

  // Phase 3: 新着記事の特定
  let newArticles: OpenAINewsEntry[];
  let allSlugsForState: string[];

  if (isFirstRun) {
    // 初回: 最新3件を通知対象、全 slug を knownSlugs に登録
    newArticles = allArticles.slice(0, MAX_INITIAL_ARTICLES);
    allSlugsForState = allArticles.map((a) => a.slug);
  } else {
    // 以降: knownSlugs にない slug が新着
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
    contentEn: string;
    fetchedAt: string;
  }> = [];

  for (const article of newArticles) {
    let articleHtml: string;
    try {
      articleHtml = await deps.fetchHeadlessHtml(`${ARTICLE_BASE_URL}${article.slug}/`);
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
  writeFileSync(resolve(deps.htmlCurrentDir, "openai-news.json"), JSON.stringify(entries, null, 2));

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

  const result = await fetchHtmlOpenAINews({
    dataRoot: DATA_DIR.root,
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    fetchHeadlessHtml: fetchHeadlessHtmlImpl,
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
const isMainModule = process.argv[1]?.includes("fetch-html-openai-news");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
