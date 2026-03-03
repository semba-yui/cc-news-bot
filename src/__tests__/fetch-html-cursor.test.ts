import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MuxVideo } from "../services/cursor-article-extractor.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  fetchHtmlCursor,
  type FetchHtmlCursorDeps,
  type FetchHtmlCursorResult,
} from "../scripts/fetch-html-cursor.js";

// What: Cursor の HTML 取得スクリプトのテスト
// Why: cursor.com/ja/changelog からの取得・差分検出・JSON 書き出し・
//      エラーハンドリング等のフローが正しく動作することを保証する

interface CursorCurrentFile {
  version: string;
  rscPayload: string;
  articleHtml: string;
  muxVideos: Array<{
    playbackId: string;
    thumbnailUrl: string;
    hlsUrl: string;
  }>;
  fetchedAt: string;
}

interface StructuredLogEntry {
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-fetch-html-cursor");
const HTML_CURRENT_DIR = resolve(TEST_ROOT, "html-current");

const SAMPLE_RSC_PAYLOAD = '["$","article","2-5",{"children":"sample RSC data"}]';
const SAMPLE_MUX_VIDEOS: MuxVideo[] = [
  {
    playbackId: "abc123",
    thumbnailUrl: "https://image.mux.com/abc123/thumbnail.png",
    hlsUrl: "https://stream.mux.com/abc123.m3u8",
  },
];

function makeDeps(overrides: Partial<FetchHtmlCursorDeps> = {}): FetchHtmlCursorDeps {
  return {
    dataRoot: TEST_ROOT,
    htmlCurrentDir: HTML_CURRENT_DIR,
    fetchStaticHtml: vi
      .fn<(url: string, opts?: HtmlFetchOptions) => Promise<string>>()
      .mockResolvedValue("<html>mock cursor changelog</html>"),
    parseLatestVersion: vi.fn<(html: string) => string | null>().mockReturnValue("2.5"),
    extractArticleRscPayload: vi
      .fn<(html: string, version: string) => string | null>()
      .mockReturnValue(SAMPLE_RSC_PAYLOAD),
    extractMuxVideoData: vi
      .fn<(html: string, slug: string) => MuxVideo[]>()
      .mockReturnValue(SAMPLE_MUX_VIDEOS),
    loadState: vi.fn<(root: string) => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {
        cursor: {
          hash: "",
          lastCheckedAt: "2026-03-01T00:00:00.000Z",
          latestVersion: "2.4",
        },
      },
    }),
    saveState: vi.fn<(state: SnapshotState, root: string) => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

describe("fetchHtmlCursor", () => {
  beforeEach(() => {
    mkdirSync(HTML_CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("正常系: 新バージョン検出", () => {
    // What: cursor.com/ja/changelog から新バージョンが検出される標準フロー
    // Why: JSON ファイル書き出し・state 更新が正しく行われることを検証する
    it("新バージョン検出時に html-current/cursor.json を書き出し state を更新する", async () => {
      // Given: 既存バージョンが 2.4 で、最新が 2.5
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 変更あり
      expect(result).toEqual<FetchHtmlCursorResult>({
        hasChanges: true,
        newVersion: "2.5",
      });

      // Then: html-current/cursor.json が新フォーマットで書き出される
      const outputFile = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "cursor.json"), "utf-8"),
      ) as CursorCurrentFile;
      expect(outputFile.version).toBe("2.5");
      expect(outputFile.rscPayload).toBe(SAMPLE_RSC_PAYLOAD);
      expect(outputFile.articleHtml).toBe("");
      expect(outputFile.muxVideos).toEqual([
        {
          playbackId: "abc123",
          thumbnailUrl: "https://image.mux.com/abc123/thumbnail.png",
          hlsUrl: "https://stream.mux.com/abc123.m3u8",
        },
      ]);
      expect(outputFile.fetchedAt).toBeDefined();

      // Then: state が更新される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["cursor"].latestVersion).toBe("2.5");
    });

    it("extractMuxVideoData にバージョンから変換した slug が渡される", async () => {
      // What: version "2.5" から slug "2-5" に変換して extractMuxVideoData を呼ぶか
      // Why: Mux 動画抽出のための slug 変換ロジックの正確性を検証する

      // Given: 新バージョン検出
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlCursor(deps);

      // Then: extractMuxVideoData に slug "2-5" が渡される
      expect(deps.extractMuxVideoData).toHaveBeenCalledWith(expect.any(String), "2-5");
    });
  });

  describe("初回実行: latestVersion なし", () => {
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
      const result = await fetchHtmlCursor(deps);

      // Then: 変更あり（通知される）
      expect(result.hasChanges).toBe(true);
      expect(result.newVersion).toBe("2.5");

      // Then: state にバージョンが記録される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["cursor"].latestVersion).toBe("2.5");
    });
  });

  describe("同一バージョン検出", () => {
    // What: 既存バージョンと同じバージョンが検出されるケース
    // Why: 冪等性を保証し、重複通知を防止する
    it("hasChanges=false を返しファイル書き出しをスキップする", async () => {
      // Given: 既存バージョンと同じ 2.5 が検出される
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            cursor: {
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestVersion: "2.5",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 変更なし
      expect(result.hasChanges).toBe(false);

      // Then: state の保存は呼ばれない（変更なし）
      expect(deps.saveState).not.toHaveBeenCalled();
    });
  });

  describe("HTML 取得失敗 (Req 3.5)", () => {
    // What: cursor.com からの HTML 取得が失敗するケース
    // Why: 要件 3.5 に従い、取得失敗時にエラーログ記録・通知スキップすることを検証する
    it("hasChanges=false とエラーメッセージを返す", async () => {
      // Given: HTML の取得が失敗する
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("cursor.com unavailable")),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

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
      const result = await fetchHtmlCursor(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("extractArticleRscPayload が null を返す", () => {
    // What: バージョンは見つかったが RSC ペイロード抽出に失敗するケース
    // Why: RSC データが見つからない場合にエラーとして処理されることを検証する
    it("hasChanges=false とエラーを返す", async () => {
      // Given: extractArticleRscPayload が null を返す
      const deps = makeDeps({
        extractArticleRscPayload: vi.fn().mockReturnValue(null),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toContain("RSC payload");
    });
  });

  describe("構造化エラーログ (Req 6.1)", () => {
    // What: エラー発生時のログフォーマット
    // Why: 要件 6.1 のエラーログ形式（ソース名・メッセージ・タイムスタンプ）を検証する
    it("HTML 取得失敗時に構造化ログを出力する", async () => {
      // Given: HTML の取得が失敗する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("Connection timeout")),
      });

      // When: 取得スクリプトを実行する
      await fetchHtmlCursor(deps);

      // Then: 構造化ログが出力される
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string) as StructuredLogEntry;
        return parsed.source === "cursor";
      });
      expect(logCall).toBeDefined();
      const logEntry = JSON.parse(logCall![0] as string) as StructuredLogEntry;
      expect(logEntry.level).toBe("error");
      expect(logEntry.source).toBe("cursor");
      expect(logEntry.message).toContain("Connection timeout");
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
      await fetchHtmlCursor(deps);

      // Then: lastCheckedAt が更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["cursor"].lastCheckedAt).toBeDefined();
      // ISO 8601 形式であること
      expect(new Date(savedState.sources["cursor"].lastCheckedAt).toISOString()).toBeTruthy();
    });
  });
});
