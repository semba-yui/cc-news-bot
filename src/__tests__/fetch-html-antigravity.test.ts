import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AntigravityVersionContent } from "../services/antigravity-parser.js";
import type { PlaywrightFetchOptions } from "../services/playwright-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  fetchHtmlAntigravity,
  type FetchHtmlAntigravityDeps,
  type FetchHtmlAntigravityResult,
} from "../scripts/fetch-html-antigravity.js";

// What: Antigravity の HTML 取得スクリプトのテスト
// Why: Playwright 経由での取得・差分検出・JSON 書き出し・初回実行スキップ・
//      エラーハンドリング等のフローが正しく動作することを保証する

interface AntigravityCurrentFile {
  version: string;
  improvementsEn: string[];
  fixesEn: string[];
  patchesEn: string[];
  fetchedAt: string;
}

interface StructuredLogEntry {
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-fetch-html-antigravity");
const HTML_CURRENT_DIR = resolve(TEST_ROOT, "html-current");

const SAMPLE_VERSION_CONTENT: AntigravityVersionContent = {
  version: "1.19.6",
  improvementsEn: ["Improved performance of X", "Better Y handling"],
  fixesEn: ["Fixed crash on Z"],
  patchesEn: [],
};

function makeDeps(overrides: Partial<FetchHtmlAntigravityDeps> = {}): FetchHtmlAntigravityDeps {
  return {
    dataRoot: TEST_ROOT,
    htmlCurrentDir: HTML_CURRENT_DIR,
    fetchHeadlessHtml: vi
      .fn<(url: string, opts?: PlaywrightFetchOptions) => Promise<string>>()
      .mockResolvedValue("<html>mock antigravity changelog</html>"),
    parseLatestVersion: vi.fn<(html: string) => string | null>().mockReturnValue("1.19.6"),
    parseVersionContent: vi
      .fn<(html: string, version: string) => AntigravityVersionContent | null>()
      .mockReturnValue(SAMPLE_VERSION_CONTENT),
    loadState: vi.fn<(root: string) => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {
        antigravity: {
          hash: "",
          lastCheckedAt: "2026-03-01T00:00:00.000Z",
          latestVersion: "1.19.5",
        },
      },
    }),
    saveState: vi.fn<(state: SnapshotState, root: string) => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

describe("fetchHtmlAntigravity", () => {
  beforeEach(() => {
    mkdirSync(HTML_CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("正常系: 新バージョン検出", () => {
    // What: ヘッドレスブラウザ経由で新バージョンが検出される標準フロー
    // Why: JSON ファイル書き出し（3カテゴリ構成維持）・state 更新が正しく行われることを検証する
    it("新バージョン検出時に html-current/antigravity.json を書き出し state を更新する", async () => {
      // Given: 既存バージョンが 1.19.5 で、最新が 1.19.6
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAntigravity(deps);

      // Then: 変更あり
      expect(result).toEqual<FetchHtmlAntigravityResult>({
        hasChanges: true,
        newVersion: "1.19.6",
      });

      // Then: html-current/antigravity.json が正しいフォーマットで書き出される
      const outputFile = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "antigravity.json"), "utf-8"),
      ) as AntigravityCurrentFile;
      expect(outputFile.version).toBe("1.19.6");
      expect(outputFile.improvementsEn).toEqual(["Improved performance of X", "Better Y handling"]);
      expect(outputFile.fixesEn).toEqual(["Fixed crash on Z"]);
      expect(outputFile.patchesEn).toEqual([]);
      expect(outputFile.fetchedAt).toBeDefined();

      // Then: state が更新される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["antigravity"].latestVersion).toBe("1.19.6");
    });
  });

  describe("初回実行: latestVersion なし (Req 1.3)", () => {
    // What: state に latestVersion が存在しない初回実行ケース
    // Why: 初回実行でも通常の新バージョン検出と同じフローで通知することを検証する
    it("hasChanges=true を返し JSON 書き出しと state 更新を行う", async () => {
      // Given: state にソースエントリが存在しない（初回実行）
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {},
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAntigravity(deps);

      // Then: 変更あり（通知される）
      expect(result.hasChanges).toBe(true);
      expect(result.newVersion).toBe("1.19.6");

      // Then: state にバージョンが記録される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["antigravity"].latestVersion).toBe("1.19.6");
    });
  });

  describe("同一バージョン検出", () => {
    // What: 既存バージョンと同じバージョンが検出されるケース
    // Why: 冪等性を保証し、重複通知を防止する
    it("hasChanges=false を返しファイル書き出しをスキップする", async () => {
      // Given: 既存バージョンと同じ 1.19.6 が検出される
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            antigravity: {
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestVersion: "1.19.6",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAntigravity(deps);

      // Then: 変更なし
      expect(result.hasChanges).toBe(false);

      // Then: state の保存は呼ばれない（変更なし）
      expect(deps.saveState).not.toHaveBeenCalled();
    });
  });

  describe("Playwright 取得失敗 (Req 4.5)", () => {
    // What: ヘッドレスブラウザによる HTML 取得が失敗するケース
    // Why: 要件 4.5 に従い、取得失敗時にエラーログ記録・通知スキップすることを検証する
    it("hasChanges=false とエラーメッセージを返す", async () => {
      // Given: Playwright による取得が失敗する
      const deps = makeDeps({
        fetchHeadlessHtml: vi.fn().mockRejectedValue(new Error("Playwright browser launch failed")),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAntigravity(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("parseLatestVersion が null を返す", () => {
    // What: HTML から最新バージョンを抽出できないケース（DOM 構造変更等）
    // Why: パーサ失敗時に安全にエラーを返すことを検証する
    it("hasChanges=false とエラーを返す", async () => {
      // Given: parseLatestVersion が null を返す
      const deps = makeDeps({
        parseLatestVersion: vi.fn().mockReturnValue(null),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAntigravity(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("parseVersionContent が null を返す", () => {
    // What: バージョンは見つかったがコンテンツ抽出に失敗するケース
    // Why: Antigravity にはフォールバックがないため、エラーとして処理されることを検証する
    it("hasChanges=false とエラーを返す", async () => {
      // Given: parseVersionContent が null を返す
      const deps = makeDeps({
        parseVersionContent: vi.fn().mockReturnValue(null),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlAntigravity(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("構造化エラーログ (Req 6.1)", () => {
    // What: エラー発生時のログフォーマット
    // Why: 要件 6.1 のエラーログ形式（ソース名・メッセージ・タイムスタンプ）を検証する
    it("Playwright 取得失敗時に構造化ログを出力する", async () => {
      // Given: Playwright による取得が失敗する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const deps = makeDeps({
        fetchHeadlessHtml: vi.fn().mockRejectedValue(new Error("Browser crashed")),
      });

      // When: 取得スクリプトを実行する
      await fetchHtmlAntigravity(deps);

      // Then: 構造化ログが出力される
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string) as StructuredLogEntry;
        return parsed.source === "antigravity";
      });
      expect(logCall).toBeDefined();
      const logEntry = JSON.parse(logCall![0] as string) as StructuredLogEntry;
      expect(logEntry.level).toBe("error");
      expect(logEntry.source).toBe("antigravity");
      expect(logEntry.message).toContain("Browser crashed");
      expect(logEntry.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe("lastCheckedAt の更新", () => {
    // What: 新バージョン検出時に lastCheckedAt が更新されること
    // Why: 次回実行時の差分検出に正確な最終チェック日時が必要
    it("新バージョン検出時に lastCheckedAt を現在時刻に更新する", async () => {
      // Given: 新バージョンが検出される
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlAntigravity(deps);

      // Then: lastCheckedAt が更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["antigravity"].lastCheckedAt).toBeDefined();
      // ISO 8601 形式であること
      expect(new Date(savedState.sources["antigravity"].lastCheckedAt).toISOString()).toBeTruthy();
    });
  });
});
