import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CursorEntry, MuxVideo } from "../services/cursor-article-extractor.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import type { DateSlugBasedSourceState, SnapshotState } from "../services/state-service.js";
import {
  fetchHtmlCursor,
  type FetchHtmlCursorDeps,
  type FetchHtmlCursorResult,
} from "../scripts/fetch-html-cursor.js";

// What: Cursor の HTML 取得スクリプトのテスト
// Why: cursor.com/ja/changelog からの取得・date ベース差分検出・JSON 配列書き出し・
//      エラーハンドリング等のフローが正しく動作することを保証する

interface CursorCurrentEntry {
  version: string;
  title: string;
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

// date 降順のサンプルエントリ
const SAMPLE_ENTRIES: CursorEntry[] = [
  {
    slug: "02-26-26",
    date: "2026-02-26T00:00:00.000Z",
    title: "Bugbot Autofix",
    version: "02-26-26",
  },
  {
    slug: "02-24-26",
    date: "2026-02-24T00:00:00.000Z",
    title: "Cloud Agents",
    version: "02-24-26",
  },
  { slug: "2-5", date: "2026-02-17T00:00:00.000Z", title: "プラグイン", version: "2.5" },
];

function makeDeps(overrides: Partial<FetchHtmlCursorDeps> = {}): FetchHtmlCursorDeps {
  return {
    dataRoot: TEST_ROOT,
    htmlCurrentDir: HTML_CURRENT_DIR,
    fetchStaticHtml: vi
      .fn<(url: string, opts?: HtmlFetchOptions) => Promise<string>>()
      .mockResolvedValue("<html>mock cursor changelog</html>"),
    parseAllEntries: vi.fn<(html: string) => CursorEntry[]>().mockReturnValue(SAMPLE_ENTRIES),
    extractArticleRscPayload: vi
      .fn<(html: string, slug: string) => string | null>()
      .mockReturnValue(SAMPLE_RSC_PAYLOAD),
    extractMuxVideoData: vi
      .fn<(html: string, slug: string) => MuxVideo[]>()
      .mockReturnValue(SAMPLE_MUX_VIDEOS),
    loadState: vi.fn<(root: string) => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {
        cursor: {
          type: "date_slug",
          hash: "",
          lastCheckedAt: "2026-03-01T00:00:00.000Z",
          latestDate: "2026-02-17T00:00:00.000Z",
          latestSlug: "2-5",
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

  describe("正常系: date 比較で新エントリを検出", () => {
    // What: date が既存より新しいエントリを新規として検出する
    // Why: slug + date ベースの差分検出が正しく動作することを検証する
    it("新エントリ検出時に html-current/cursor.json を配列で書き出し state を更新する", async () => {
      // Given: latestDate が 2026-02-17 (2.5)、ページには3件（02-26-26, 02-24-26, 2-5）
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 2件の新エントリが検出される（02-24-26 と 02-26-26）
      expect(result).toEqual<FetchHtmlCursorResult>({
        hasChanges: true,
        newVersions: ["02-24-26", "02-26-26"],
      });

      // Then: html-current/cursor.json が配列形式で書き出される
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "cursor.json"), "utf-8"),
      ) as CursorCurrentEntry[];
      expect(entries).toHaveLength(2);
      expect(entries[0].version).toBe("02-24-26");
      expect(entries[0].title).toBe("Cloud Agents");
      expect(entries[1].version).toBe("02-26-26");
      expect(entries[1].title).toBe("Bugbot Autofix");

      // Then: state に latestDate と latestSlug が保存される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect((savedState.sources["cursor"] as DateSlugBasedSourceState).latestDate).toBe(
        "2026-02-26T00:00:00.000Z",
      );
      expect((savedState.sources["cursor"] as DateSlugBasedSourceState).latestSlug).toBe(
        "02-26-26",
      );
    });

    it("extractArticleRscPayload に slug が直接渡される", async () => {
      // What: entry.slug をそのまま extractArticleRscPayload に渡すか
      // Why: slug 変換が不要になったことを検証する

      // Given: 新エントリ検出
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlCursor(deps);

      // Then: extractArticleRscPayload に slug が直接渡される
      expect(deps.extractArticleRscPayload).toHaveBeenCalledWith(expect.any(String), "02-24-26");
      expect(deps.extractArticleRscPayload).toHaveBeenCalledWith(expect.any(String), "02-26-26");
    });

    it("extractMuxVideoData に slug が直接渡される", async () => {
      // What: entry.slug をそのまま extractMuxVideoData に渡すか

      // Given: 新エントリ検出
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlCursor(deps);

      // Then: extractMuxVideoData に slug が直接渡される
      expect(deps.extractMuxVideoData).toHaveBeenCalledWith(expect.any(String), "02-24-26");
      expect(deps.extractMuxVideoData).toHaveBeenCalledWith(expect.any(String), "02-26-26");
    });
  });

  describe("同一 latestDate + latestSlug で hasChanges=false", () => {
    // What: 既存の latestDate/latestSlug と最新エントリが一致する場合
    // Why: 冪等性を保証し、重複通知を防止する
    it("hasChanges=false を返しファイル書き出しをスキップする", async () => {
      // Given: latestDate/latestSlug が最新エントリと一致する
      const deps = makeDeps({
        parseAllEntries: vi
          .fn()
          .mockReturnValue([
            { slug: "2-5", date: "2026-02-17T00:00:00.000Z", title: "プラグイン", version: "2.5" },
          ]),
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            cursor: {
              type: "date_slug",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestDate: "2026-02-17T00:00:00.000Z",
              latestSlug: "2-5",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 変更なし
      expect(result.hasChanges).toBe(false);

      // Then: state の保存は呼ばれない
      expect(deps.saveState).not.toHaveBeenCalled();
    });
  });

  describe("同一日付の別 slug エントリを新規判定", () => {
    // What: 同じ日付だが異なる slug のエントリを新規として検出するか
    // Why: 同一日付に複数エントリが公開されるケースへの対応
    it("同一日付の別 slug エントリを新規として検出する", async () => {
      // Given: latestDate=2026-02-17, latestSlug=2-5 で、同一日付の別エントリがある
      const deps = makeDeps({
        parseAllEntries: vi.fn().mockReturnValue([
          {
            slug: "hotfix-feb-17-2026",
            date: "2026-02-17T00:00:00.000Z",
            title: "Hotfix",
            version: "hotfix-feb-17-2026",
          },
          { slug: "2-5", date: "2026-02-17T00:00:00.000Z", title: "プラグイン", version: "2.5" },
        ]),
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            cursor: {
              type: "date_slug",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestDate: "2026-02-17T00:00:00.000Z",
              latestSlug: "2-5",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 同一日付の別 slug が新規として検出される
      expect(result.hasChanges).toBe(true);
      expect(result.newVersions).toEqual(["hotfix-feb-17-2026"]);
    });
  });

  describe("正常系: 複数新エントリを古い順で出力", () => {
    // What: cron 間に複数エントリがリリースされたケース
    // Why: 中間エントリを見逃さず、全て古い順で配列に含まれることを検証する
    it("複数の新エントリを古い順で配列書き出しする", async () => {
      // Given: latestDate が 2026-02-12 で、3件の新エントリがある
      const deps = makeDeps({
        parseAllEntries: vi.fn().mockReturnValue([
          {
            slug: "02-26-26",
            date: "2026-02-26T00:00:00.000Z",
            title: "Bugbot",
            version: "02-26-26",
          },
          {
            slug: "02-24-26",
            date: "2026-02-24T00:00:00.000Z",
            title: "Cloud",
            version: "02-24-26",
          },
          { slug: "2-5", date: "2026-02-17T00:00:00.000Z", title: "プラグイン", version: "2.5" },
          {
            slug: "02-12-26",
            date: "2026-02-12T00:00:00.000Z",
            title: "長時間稼働",
            version: "02-12-26",
          },
        ]),
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            cursor: {
              type: "date_slug",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestDate: "2026-02-12T00:00:00.000Z",
              latestSlug: "02-12-26",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 3件の新エントリが古い順で返される
      expect(result.hasChanges).toBe(true);
      expect(result.newVersions).toEqual(["2.5", "02-24-26", "02-26-26"]);
    });
  });

  describe("初回実行: state なし", () => {
    // What: state に latestDate が存在しない初回実行ケース
    // Why: 初回実行時は最新3件まで取得することを検証する
    it("最新3件まで取得し古い順で配列書き出しする", async () => {
      // Given: state にソースエントリが存在しない（初回実行）
      const deps = makeDeps({
        parseAllEntries: vi.fn().mockReturnValue([
          { slug: "e7", date: "2026-03-07T00:00:00.000Z", title: "E7", version: "e7" },
          { slug: "e6", date: "2026-03-06T00:00:00.000Z", title: "E6", version: "e6" },
          { slug: "e5", date: "2026-03-05T00:00:00.000Z", title: "E5", version: "e5" },
          { slug: "e4", date: "2026-03-04T00:00:00.000Z", title: "E4", version: "e4" },
          { slug: "e3", date: "2026-03-03T00:00:00.000Z", title: "E3", version: "e3" },
          { slug: "e2", date: "2026-03-02T00:00:00.000Z", title: "E2", version: "e2" },
          { slug: "e1", date: "2026-03-01T00:00:00.000Z", title: "E1", version: "e1" },
        ]),
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {},
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 最新3件が古い順で返される
      expect(result.hasChanges).toBe(true);
      expect(result.newVersions).toEqual(["e5", "e6", "e7"]);

      // Then: state は最新エントリの date/slug で更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect((savedState.sources["cursor"] as DateSlugBasedSourceState).latestDate).toBe(
        "2026-03-07T00:00:00.000Z",
      );
      expect((savedState.sources["cursor"] as DateSlugBasedSourceState).latestSlug).toBe("e7");
    });
  });

  describe("マイグレーション: latestVersion → latestDate/latestSlug", () => {
    // What: 旧 state に latestVersion のみある場合のマイグレーション
    // Why: 既存環境で latestDate が未設定の場合、latestVersion から移行する
    it("latestVersion がある場合、一致エントリの date/slug をカットオフに使用する", async () => {
      // Given: latestDate なし、latestVersion="2.5" で、エントリに "2.5" (slug: "2-5") がある
      const deps = makeDeps({
        parseAllEntries: vi.fn().mockReturnValue([
          {
            slug: "02-26-26",
            date: "2026-02-26T00:00:00.000Z",
            title: "Bugbot",
            version: "02-26-26",
          },
          { slug: "2-5", date: "2026-02-17T00:00:00.000Z", title: "プラグイン", version: "2.5" },
          {
            slug: "02-12-26",
            date: "2026-02-12T00:00:00.000Z",
            title: "長時間稼働",
            version: "02-12-26",
          },
        ]),
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            cursor: {
              type: "version",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestVersion: "2.5",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 2.5 より新しいエントリのみ検出される
      expect(result.hasChanges).toBe(true);
      expect(result.newVersions).toEqual(["02-26-26"]);

      // Then: state が latestDate/latestSlug 形式に移行される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect((savedState.sources["cursor"] as DateSlugBasedSourceState).latestDate).toBe(
        "2026-02-26T00:00:00.000Z",
      );
      expect((savedState.sources["cursor"] as DateSlugBasedSourceState).latestSlug).toBe(
        "02-26-26",
      );
    });
  });

  describe("HTML 取得失敗", () => {
    // What: cursor.com からの HTML 取得が失敗するケース
    // Why: 取得失敗時にエラーログ記録・通知スキップすることを検証する
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

  describe("parseAllEntries が空配列を返す", () => {
    // What: HTML からエントリを抽出できないケース（DOM 構造変更等）
    // Why: パーサ失敗時に安全にエラーを返すことを検証する
    it("hasChanges=false とエラーを返す", async () => {
      // Given: parseAllEntries が空配列を返す
      const deps = makeDeps({
        parseAllEntries: vi.fn().mockReturnValue([]),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlCursor(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("extractArticleRscPayload が null を返す", () => {
    // What: エントリは見つかったが RSC ペイロード抽出に失敗するケース
    // Why: RSC データが見つからない場合にスキップされることを検証する
    it("該当エントリをスキップし、全て失敗ならエラーを返す", async () => {
      // Given: extractArticleRscPayload が全て null を返す
      const deps = makeDeps({
        extractArticleRscPayload: vi.fn().mockReturnValue(null),
      });

      // When: 取得スクリプトを実行する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await fetchHtmlCursor(deps);
      consoleSpy.mockRestore();

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("構造化エラーログ", () => {
    // What: エラー発生時のログフォーマット
    // Why: エラーログ形式（ソース名・メッセージ・タイムスタンプ）を検証する
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
    // What: 新エントリ検出時に lastCheckedAt が更新されること
    // Why: 次回実行時の差分検出に正確な最終チェック日時が必要
    it("新エントリ検出時に lastCheckedAt を現在時刻に更新する", async () => {
      // Given: 新エントリが検出される
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      await fetchHtmlCursor(deps);

      // Then: lastCheckedAt が更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["cursor"]!.lastCheckedAt).toBeDefined();
      expect(new Date(savedState.sources["cursor"]!.lastCheckedAt).toISOString()).toBeTruthy();
    });
  });
});
