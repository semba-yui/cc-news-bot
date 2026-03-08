import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnthropicNewsEntry } from "../services/anthropic-news-parser.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import type { SlugListBasedSourceState, SnapshotState } from "../services/state-service.js";
import {
  fetchHtmlAnthropicNews,
  type FetchHtmlAnthropicNewsDeps,
  type FetchHtmlAnthropicNewsResult,
} from "../scripts/fetch-html-anthropic-news.js";

// What: Anthropic News の HTML 取得・差分検出スクリプトのテスト
// Why: Static HTML 経由での取得・knownSlugs ベースの新着検出・個別記事取得・
//      JSON 書き出し・エラーハンドリング等のフローが正しく動作することを保証する

interface AnthropicNewsCurrentEntry {
  slug: string;
  title: string;
  date: string;
  category: string;
  contentEn: string;
  fetchedAt: string;
}

interface StructuredLogEntry {
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-fetch-html-anthropic-news");
const HTML_CURRENT_DIR = resolve(TEST_ROOT, "html-current");

function makeEntry(slug: string, index: number = 0): AnthropicNewsEntry {
  return {
    slug,
    title: `Article ${slug}`,
    date: `2026-03-0${8 - index}`,
    category: "Research",
  };
}

function makeDeps(overrides: Partial<FetchHtmlAnthropicNewsDeps> = {}): FetchHtmlAnthropicNewsDeps {
  return {
    dataRoot: TEST_ROOT,
    htmlCurrentDir: HTML_CURRENT_DIR,
    fetchStaticHtml: vi
      .fn<(url: string, opts?: HtmlFetchOptions) => Promise<string>>()
      .mockResolvedValue("<html>mock anthropic news</html>"),
    parseArticleList: vi
      .fn<(html: string) => AnthropicNewsEntry[]>()
      .mockReturnValue([
        makeEntry("article-a", 0),
        makeEntry("article-b", 1),
        makeEntry("article-c", 2),
        makeEntry("article-d", 3),
        makeEntry("article-e", 4),
      ]),
    parseArticleContent: vi
      .fn<(html: string, slug: string) => string | null>()
      .mockImplementation((_html: string, slug: string) => `Content of ${slug}`),
    loadState: vi.fn<(root: string) => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {
        "anthropic-news": {
          type: "slug_list",
          hash: "",
          lastCheckedAt: "2026-03-01T00:00:00.000Z",
          knownSlugs: ["article-b", "article-c", "article-d", "article-e"],
        },
      },
    }),
    saveState: vi.fn<(state: SnapshotState, root: string) => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

describe("fetchHtmlAnthropicNews", () => {
  beforeEach(() => {
    mkdirSync(HTML_CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("正常系: 新着記事検出", () => {
    // What: knownSlugs にない slug を持つ記事が新着として検出される
    // Why: slug リストベースの差分検出が正しく動作し、
    //      個別記事取得・JSON 書き出し・state 更新が行われることを検証する
    it("knownSlugs にない slug の記事を新着として検出し JSON を書き出す", async () => {
      // Given: knownSlugs に article-b〜e が登録済み、article-a が新着
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAnthropicNews(deps);

      // Then: 変更あり、新着記事が返される
      expect(result).toEqual<FetchHtmlAnthropicNewsResult>({
        hasChanges: true,
        newArticles: ["article-a"],
      });

      // Then: 個別記事ページが Static HTML で取得される（一覧 + article-a）
      expect(deps.fetchStaticHtml).toHaveBeenCalledTimes(2);

      // Then: html-current/anthropic-news.json が書き出される
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "anthropic-news.json"), "utf-8"),
      ) as AnthropicNewsCurrentEntry[];
      expect(entries).toHaveLength(1);
      expect(entries[0].slug).toBe("article-a");
      expect(entries[0].contentEn).toBe("Content of article-a");
      expect(entries[0].category).toBe("Research");
      expect(entries[0].fetchedAt).toBeDefined();

      // Then: state が更新され article-a が knownSlugs に追加される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      const sourceState = savedState.sources["anthropic-news"] as SlugListBasedSourceState;
      expect(sourceState.type).toBe("slug_list");
      expect(sourceState.knownSlugs).toContain("article-a");
      expect(sourceState.knownSlugs).toContain("article-b");
    });
  });

  describe("正常系: 複数新着記事", () => {
    // What: 複数の新着記事が同時に検出されるケース
    // Why: cron 間に複数記事が公開された場合、全て検出・取得されることを検証する
    it("複数の新着記事を全て取得して JSON に書き出す", async () => {
      // Given: article-a と article-b が新着
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "anthropic-news": {
              type: "slug_list",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              knownSlugs: ["article-c", "article-d", "article-e"],
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAnthropicNews(deps);

      // Then: 2件の新着記事が返される
      expect(result.hasChanges).toBe(true);
      expect(result.newArticles).toEqual(["article-a", "article-b"]);

      // Then: JSON に2件書き出される
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "anthropic-news.json"), "utf-8"),
      ) as AnthropicNewsCurrentEntry[];
      expect(entries).toHaveLength(2);
      expect(entries[0].slug).toBe("article-a");
      expect(entries[1].slug).toBe("article-b");
    });
  });

  describe("初回実行: knownSlugs なし", () => {
    // What: state に anthropic-news エントリが存在しない初回実行ケース
    // Why: 初回実行時は最新3件を通知対象とし、全 slug を knownSlugs に登録することを検証する
    it("最新3件を通知対象とし全 slug を knownSlugs に登録する", async () => {
      // Given: state にソースエントリが存在しない（初回実行）
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {},
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAnthropicNews(deps);

      // Then: 最新3件が通知対象として返される
      expect(result.hasChanges).toBe(true);
      expect(result.newArticles).toEqual(["article-a", "article-b", "article-c"]);

      // Then: 全5件の slug が knownSlugs に登録される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      const sourceState = savedState.sources["anthropic-news"] as SlugListBasedSourceState;
      expect(sourceState.knownSlugs).toHaveLength(5);
      expect(sourceState.knownSlugs).toContain("article-a");
      expect(sourceState.knownSlugs).toContain("article-e");
    });
  });

  describe("変更なし: 全 slug が既知", () => {
    // What: 全ての記事 slug が既に knownSlugs に含まれているケース
    // Why: 冪等性を保証し、重複通知・不要な JSON 書き出しを防止する
    it("hasChanges=false を返しファイル書き出しをスキップする", async () => {
      // Given: 全 slug が knownSlugs に登録済み
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "anthropic-news": {
              type: "slug_list",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              knownSlugs: ["article-a", "article-b", "article-c", "article-d", "article-e"],
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAnthropicNews(deps);

      // Then: 変更なし
      expect(result.hasChanges).toBe(false);

      // Then: state の保存は呼ばれない
      expect(deps.saveState).not.toHaveBeenCalled();

      // Then: 個別記事の取得は行われない（一覧のみ）
      expect(deps.fetchStaticHtml).toHaveBeenCalledTimes(1);
    });
  });

  describe("個別記事取得失敗: 該当記事をスキップ", () => {
    // What: 個別記事ページの取得に失敗するケース
    // Why: 失敗した記事をスキップし、成功した記事は通知対象に含まれ、
    //      失敗した slug は knownSlugs に追加されない（次回リトライ可能）ことを検証する
    it("取得失敗記事をスキップし成功記事のみ通知対象にする", async () => {
      // Given: article-a と article-b が新着、article-a の個別取得が失敗
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "anthropic-news": {
              type: "slug_list",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              knownSlugs: ["article-c", "article-d", "article-e"],
            },
          },
        }),
        parseArticleContent: vi.fn().mockImplementation((_html: string, slug: string) => {
          if (slug === "article-a") return null;
          return `Content of ${slug}`;
        }),
      });

      // When: 取得スクリプトを実行する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await fetchHtmlAnthropicNews(deps);
      consoleSpy.mockRestore();

      // Then: article-b のみ通知対象
      expect(result.hasChanges).toBe(true);
      expect(result.newArticles).toEqual(["article-b"]);

      // Then: article-a の slug は knownSlugs に追加されない
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      const sourceState = savedState.sources["anthropic-news"] as SlugListBasedSourceState;
      expect(sourceState.knownSlugs).not.toContain("article-a");
      expect(sourceState.knownSlugs).toContain("article-b");
    });
  });

  describe("個別記事 fetch 例外: 該当記事をスキップ", () => {
    // What: 個別記事ページの HTTP 取得自体が例外を投げるケース
    // Why: fetch 例外時にも記事スキップが正しく動作し、
    //      失敗した slug は knownSlugs に追加されないことを検証する
    it("fetch 例外の記事をスキップし成功記事のみ通知対象にする", async () => {
      // Given: article-a と article-b が新着、article-a の fetch が例外
      let callCount = 0;
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "anthropic-news": {
              type: "slug_list",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              knownSlugs: ["article-c", "article-d", "article-e"],
            },
          },
        }),
        fetchStaticHtml: vi.fn().mockImplementation((_url: string) => {
          callCount++;
          // 1回目は一覧ページ、2回目は article-a（失敗）、3回目は article-b（成功）
          if (callCount === 1) return Promise.resolve("<html>list</html>");
          if (callCount === 2) return Promise.reject(new Error("Network timeout"));
          return Promise.resolve("<html>article</html>");
        }),
      });

      // When: 取得スクリプトを実行する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await fetchHtmlAnthropicNews(deps);
      consoleSpy.mockRestore();

      // Then: article-b のみ通知対象
      expect(result.hasChanges).toBe(true);
      expect(result.newArticles).toEqual(["article-b"]);

      // Then: article-a の slug は knownSlugs に追加されない
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      const sourceState = savedState.sources["anthropic-news"] as SlugListBasedSourceState;
      expect(sourceState.knownSlugs).not.toContain("article-a");
    });
  });

  describe("一覧ページ取得失敗", () => {
    // What: Static HTML による一覧ページ取得が失敗するケース
    // Why: 取得失敗時にエラーを返し、state を更新しないことを検証する
    it("hasChanges=false とエラーメッセージを返す", async () => {
      // Given: fetchStaticHtml が失敗する
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("HTTP 503 Service Unavailable")),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAnthropicNews(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();

      // Then: state は更新されない
      expect(deps.saveState).not.toHaveBeenCalled();
    });
  });

  describe("parseArticleList が空配列を返す", () => {
    // What: HTML から記事を1つも抽出できないケース（DOM 構造変更等）
    // Why: パーサ失敗時に安全にエラーを返すことを検証する
    it("hasChanges=false とエラーを返す", async () => {
      // Given: parseArticleList が空配列を返す
      const deps = makeDeps({
        parseArticleList: vi.fn().mockReturnValue([]),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAnthropicNews(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("構造化エラーログ", () => {
    // What: エラー発生時のログフォーマット
    // Why: エラーログ形式（ソース名・メッセージ・タイムスタンプ）を検証する
    it("一覧ページ取得失敗時に構造化ログを出力する", async () => {
      // Given: fetchStaticHtml が失敗する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("Connection refused")),
      });

      // When: 取得スクリプトを実行する
      await fetchHtmlAnthropicNews(deps);

      // Then: 構造化ログが出力される
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string) as StructuredLogEntry;
        return parsed.source === "anthropic-news";
      });
      expect(logCall).toBeDefined();
      const logEntry = JSON.parse(logCall![0] as string) as StructuredLogEntry;
      expect(logEntry.level).toBe("error");
      expect(logEntry.source).toBe("anthropic-news");
      expect(logEntry.message).toContain("Connection refused");
      expect(logEntry.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe("lastCheckedAt の更新", () => {
    // What: 新着記事検出時に lastCheckedAt が更新されること
    // Why: 次回実行時の参照に正確な最終チェック日時が必要
    it("新着記事検出時に lastCheckedAt を現在時刻に更新する", async () => {
      // Given: 新着記事が検出される
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlAnthropicNews(deps);

      // Then: lastCheckedAt が更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["anthropic-news"]!.lastCheckedAt).toBeDefined();
      expect(
        new Date(savedState.sources["anthropic-news"]!.lastCheckedAt).toISOString(),
      ).toBeTruthy();
    });
  });
});
