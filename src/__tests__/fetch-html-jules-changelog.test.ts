import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import type { JulesChangelogEntry } from "../services/jules-changelog-parser.js";
import type { SlugListBasedSourceState, SnapshotState } from "../services/state-service.js";
import {
  fetchHtmlJulesChangelog,
  type FetchHtmlJulesChangelogDeps,
  type FetchHtmlJulesChangelogResult,
} from "../scripts/fetch-html-jules-changelog.js";

// What: Jules Changelog の HTML 取得・差分検出スクリプトのテスト
// Why: Static HTML 経由での取得・knownSlugs（dateSlug）ベースの新着検出・
//      JSON 書き出し・エラーハンドリング等のフローが正しく動作することを保証する
//      Jules は一覧ページに全コンテンツが展開済みのため、個別記事ページアクセスは不要

interface JulesChangelogCurrentEntry {
  dateSlug: string;
  title: string;
  date: string;
  contentHtml: string;
  fetchedAt: string;
}

interface StructuredLogEntry {
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-fetch-html-jules-changelog");
const HTML_CURRENT_DIR = resolve(TEST_ROOT, "html-current");

function makeEntry(dateSlug: string, index: number = 0): JulesChangelogEntry {
  return {
    dateSlug,
    title: `Entry ${dateSlug}`,
    date: `2026-03-0${8 - index}`,
    contentEn: `Content of ${dateSlug}`,
    contentHtml: `<p>Content of ${dateSlug}</p>`,
  };
}

function makeDeps(
  overrides: Partial<FetchHtmlJulesChangelogDeps> = {},
): FetchHtmlJulesChangelogDeps {
  return {
    dataRoot: TEST_ROOT,
    htmlCurrentDir: HTML_CURRENT_DIR,
    fetchStaticHtml: vi
      .fn<(url: string, opts?: HtmlFetchOptions) => Promise<string>>()
      .mockResolvedValue("<html>mock jules changelog</html>"),
    parseArticleList: vi
      .fn<(html: string) => JulesChangelogEntry[]>()
      .mockReturnValue([
        makeEntry("2026-03-08", 0),
        makeEntry("2026-03-05", 1),
        makeEntry("2026-02-28", 2),
        makeEntry("2026-02-19", 3),
        makeEntry("2026-01-26-1", 4),
      ]),
    loadState: vi.fn<(root: string) => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {
        "jules-changelog": {
          type: "slug_list",
          hash: "",
          lastCheckedAt: "2026-03-01T00:00:00.000Z",
          knownSlugs: ["2026-03-05", "2026-02-28", "2026-02-19", "2026-01-26-1"],
        },
      },
    }),
    saveState: vi.fn<(state: SnapshotState, root: string) => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

describe("fetchHtmlJulesChangelog", () => {
  beforeEach(() => {
    mkdirSync(HTML_CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("正常系: 新着記事検出", () => {
    // What: knownSlugs にない dateSlug を持つ記事が新着として検出される
    // Why: dateSlug リストベースの差分検出が正しく動作し、
    //      JSON 書き出し・state 更新が行われることを検証する
    it("knownSlugs にない dateSlug の記事を新着として検出し JSON を書き出す", async () => {
      // Given: knownSlugs に既存4件が登録済み、2026-03-08 が新着
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlJulesChangelog(deps);

      // Then: 変更あり、新着記事が返される
      expect(result).toEqual<FetchHtmlJulesChangelogResult>({
        hasChanges: true,
        newArticles: ["2026-03-08"],
      });

      // Then: 個別記事ページの取得は行われない（一覧ページのみ）
      expect(deps.fetchStaticHtml).toHaveBeenCalledTimes(1);

      // Then: html-current/jules-changelog.json が書き出される
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "jules-changelog.json"), "utf-8"),
      ) as JulesChangelogCurrentEntry[];
      expect(entries).toHaveLength(1);
      expect(entries[0].dateSlug).toBe("2026-03-08");
      expect(entries[0].contentHtml).toBe("<p>Content of 2026-03-08</p>");
      expect(entries[0].fetchedAt).toBeDefined();

      // Then: state が更新され 2026-03-08 が knownSlugs に追加される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      const sourceState = savedState.sources["jules-changelog"] as SlugListBasedSourceState;
      expect(sourceState.type).toBe("slug_list");
      expect(sourceState.knownSlugs).toContain("2026-03-08");
      expect(sourceState.knownSlugs).toContain("2026-03-05");
    });
  });

  describe("正常系: 複数新着記事", () => {
    // What: 複数の新着記事が同時に検出されるケース
    // Why: cron 間に複数記事が公開された場合、全て検出されることを検証する
    it("複数の新着記事を全て JSON に書き出す", async () => {
      // Given: 2026-03-08 と 2026-03-05 が新着
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "jules-changelog": {
              type: "slug_list",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              knownSlugs: ["2026-02-28", "2026-02-19", "2026-01-26-1"],
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlJulesChangelog(deps);

      // Then: 2件の新着記事が返される
      expect(result.hasChanges).toBe(true);
      expect(result.newArticles).toEqual(["2026-03-08", "2026-03-05"]);

      // Then: JSON に2件書き出される
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "jules-changelog.json"), "utf-8"),
      ) as JulesChangelogCurrentEntry[];
      expect(entries).toHaveLength(2);
      expect(entries[0].dateSlug).toBe("2026-03-08");
      expect(entries[1].dateSlug).toBe("2026-03-05");
    });
  });

  describe("初回実行: knownSlugs なし", () => {
    // What: state に jules-changelog エントリが存在しない初回実行ケース
    // Why: 初回実行時は最新3件を通知対象とし、全 dateSlug を knownSlugs に登録することを検証する
    it("最新3件を通知対象とし全 dateSlug を knownSlugs に登録する", async () => {
      // Given: state にソースエントリが存在しない（初回実行）
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {},
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlJulesChangelog(deps);

      // Then: 最新3件が通知対象として返される
      expect(result.hasChanges).toBe(true);
      expect(result.newArticles).toEqual(["2026-03-08", "2026-03-05", "2026-02-28"]);

      // Then: 全5件の dateSlug が knownSlugs に登録される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      const sourceState = savedState.sources["jules-changelog"] as SlugListBasedSourceState;
      expect(sourceState.knownSlugs).toHaveLength(5);
      expect(sourceState.knownSlugs).toContain("2026-03-08");
      expect(sourceState.knownSlugs).toContain("2026-01-26-1");
    });
  });

  describe("変更なし: 全 dateSlug が既知", () => {
    // What: 全ての記事 dateSlug が既に knownSlugs に含まれているケース
    // Why: 冪等性を保証し、重複通知・不要な JSON 書き出しを防止する
    it("hasChanges=false を返しファイル書き出しをスキップする", async () => {
      // Given: 全 dateSlug が knownSlugs に登録済み
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "jules-changelog": {
              type: "slug_list",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              knownSlugs: ["2026-03-08", "2026-03-05", "2026-02-28", "2026-02-19", "2026-01-26-1"],
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlJulesChangelog(deps);

      // Then: 変更なし
      expect(result.hasChanges).toBe(false);

      // Then: state の保存は呼ばれない
      expect(deps.saveState).not.toHaveBeenCalled();
    });
  });

  describe("個別記事ページアクセスなし", () => {
    // What: Jules Changelog は一覧ページに全コンテンツが展開済みであること
    // Why: 個別記事ページへのアクセスが不要であることを明示的に検証する
    it("fetchStaticHtml は一覧ページの1回のみ呼ばれる", async () => {
      // Given: 新着記事がある
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlJulesChangelog(deps);

      // Then: fetchStaticHtml は一覧ページ取得の1回のみ
      expect(deps.fetchStaticHtml).toHaveBeenCalledTimes(1);
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
      const result = await fetchHtmlJulesChangelog(deps);

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
      const result = await fetchHtmlJulesChangelog(deps);

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
      await fetchHtmlJulesChangelog(deps);

      // Then: 構造化ログが出力される
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string) as StructuredLogEntry;
        return parsed.source === "jules-changelog";
      });
      expect(logCall).toBeDefined();
      const logEntry = JSON.parse(logCall![0] as string) as StructuredLogEntry;
      expect(logEntry.level).toBe("error");
      expect(logEntry.source).toBe("jules-changelog");
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
      await fetchHtmlJulesChangelog(deps);

      // Then: lastCheckedAt が更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["jules-changelog"]!.lastCheckedAt).toBeDefined();
      expect(
        new Date(savedState.sources["jules-changelog"]!.lastCheckedAt).toISOString(),
      ).toBeTruthy();
    });
  });
});
