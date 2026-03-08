import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiCliVersionContent } from "../services/gemini-cli-parser.js";
import type { GitHubReleaseEntry } from "../services/fetch-service.js";
import type { HtmlFetchOptions } from "../services/html-fetch-service.js";
import type { SnapshotState, VersionBasedSourceState } from "../services/state-service.js";
import {
  fetchHtmlGeminiCli,
  type FetchHtmlGeminiCliDeps,
  type FetchHtmlGeminiCliResult,
} from "../scripts/fetch-html-gemini-cli.js";

// What: Gemini CLI の HTML 取得スクリプトのテスト
// Why: geminicli.com + GitHub Releases の2ソース統合取得、複数バージョン差分検出、
//      フォールバック動作、JSON 配列書き出し等のフローが正しく動作することを保証する

interface GeminiCliCurrentEntry {
  version: string;
  rawSummaryEn: string | null;
  imageUrls: string[];
  mode: "full" | "fallback";
  fetchedAt: string;
}

interface StructuredLogEntry {
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-fetch-html-gemini-cli");
const HTML_CURRENT_DIR = resolve(TEST_ROOT, "html-current");

function makeVersionContent(version: string): GeminiCliVersionContent {
  return {
    version,
    rawSummaryEn: `- Features for ${version}`,
    imageUrls: [],
  };
}

function makeDeps(overrides: Partial<FetchHtmlGeminiCliDeps> = {}): FetchHtmlGeminiCliDeps {
  return {
    dataRoot: TEST_ROOT,
    htmlCurrentDir: HTML_CURRENT_DIR,
    fetchStaticHtml: vi
      .fn<(url: string, opts?: HtmlFetchOptions) => Promise<string>>()
      .mockResolvedValue("<html>mock changelog</html>"),
    fetchGitHubReleases: vi
      .fn<(owner: string, repo: string, token?: string) => Promise<GitHubReleaseEntry[]>>()
      .mockResolvedValue([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Release notes" },
      ]),
    parseAllVersions: vi
      .fn<(html: string) => string[]>()
      .mockReturnValue(["v0.31.0", "v0.30.0", "v0.29.0"]),
    parseVersionContent: vi
      .fn<(html: string, version: string) => GeminiCliVersionContent | null>()
      .mockImplementation((_html: string, version: string) => makeVersionContent(version)),
    loadState: vi.fn<(root: string) => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {
        "gemini-cli": {
          type: "version",
          hash: "",
          lastCheckedAt: "2026-03-01T00:00:00.000Z",
          latestVersion: "v0.30.0",
        },
      },
    }),
    saveState: vi.fn<(state: SnapshotState, root: string) => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

describe("fetchHtmlGeminiCli", () => {
  beforeEach(() => {
    mkdirSync(HTML_CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("フルモード: 単一新バージョン検出", () => {
    // What: geminicli.com と GitHub Releases の両方から取得成功するフルモード動作
    // Why: 標準フローで正しく配列 JSON 書き出し・state 更新が行われることを検証する
    it("新バージョン検出時に html-current/gemini-cli.json を配列で書き出す", async () => {
      // Given: 既存バージョンが v0.30.0 で、最新が v0.31.0
      const deps = makeDeps();

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更ありで full モード
      expect(result).toEqual<FetchHtmlGeminiCliResult>({
        hasChanges: true,
        newVersions: ["v0.31.0"],
        mode: "full",
      });

      // Then: html-current/gemini-cli.json が配列形式で書き出される（githubReleasesText なし）
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli.json"), "utf-8"),
      ) as GeminiCliCurrentEntry[];
      expect(entries).toHaveLength(1);
      expect(entries[0].version).toBe("v0.31.0");
      expect(entries[0].rawSummaryEn).toBe("- Features for v0.31.0");
      expect(entries[0].mode).toBe("full");
      // githubReleasesText はエントリに含まれない
      expect("githubReleasesText" in entries[0]).toBe(false);

      // Then: releases データが JSON ファイルに書き出される
      const releasesEntries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli-releases.json"), "utf-8"),
      ) as GitHubReleaseEntry[];
      expect(releasesEntries).toEqual([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Release notes" },
      ]);

      // Then: state が更新される
      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect((savedState.sources["gemini-cli"] as VersionBasedSourceState).latestVersion).toBe(
        "v0.31.0",
      );
    });
  });

  describe("フルモード: 複数バージョン未通知", () => {
    // What: cron 間に複数バージョンがリリースされたケース
    // Why: 中間バージョンも含め全て古い順で配列に含まれることを検証する
    it("複数の未通知バージョンを全て古い順で配列書き出しする", async () => {
      // Given: 既存バージョンが v0.29.0、ページには [v0.31.0, v0.30.0, v0.29.0]
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "gemini-cli": {
              type: "version",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestVersion: "v0.29.0",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 2件の新バージョンが古い順で返される
      expect(result.hasChanges).toBe(true);
      expect(result.newVersions).toEqual(["v0.30.0", "v0.31.0"]);

      // Then: JSON 配列が古い順で書き出される
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli.json"), "utf-8"),
      ) as GeminiCliCurrentEntry[];
      expect(entries).toHaveLength(2);
      expect(entries[0].version).toBe("v0.30.0");
      expect(entries[1].version).toBe("v0.31.0");

      // Then: エントリに githubReleasesText は含まれない
      expect("githubReleasesText" in entries[0]).toBe(false);
      expect("githubReleasesText" in entries[1]).toBe(false);

      // Then: releases データが JSON ファイルに書き出される
      const releasesEntries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli-releases.json"), "utf-8"),
      ) as GitHubReleaseEntry[];
      expect(releasesEntries).toEqual([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Release notes" },
      ]);
    });
  });

  describe("フルモード: GitHub Releases 取得失敗", () => {
    // What: geminicli.com は成功するが GitHub Releases が失敗するケース
    // Why: githubReleasesText を null にして通知側で親スレッドのみ投稿とするため
    it("githubReleasesText を null として JSON を書き出す", async () => {
      // Given: GitHub Releases の取得が失敗する
      const deps = makeDeps({
        fetchGitHubReleases: vi.fn().mockRejectedValue(new Error("GitHub API error")),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更ありで full モード
      expect(result.hasChanges).toBe(true);
      expect(result.mode).toBe("full");

      // Then: エントリに githubReleasesText は含まれない
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli.json"), "utf-8"),
      ) as GeminiCliCurrentEntry[];
      for (const entry of entries) {
        expect("githubReleasesText" in entry).toBe(false);
      }

      // Then: releases ファイルは存在しない
      expect(existsSync(resolve(HTML_CURRENT_DIR, "gemini-cli-releases.json"))).toBe(false);
    });
  });

  describe("フォールバックモード: geminicli.com 取得失敗", () => {
    // What: geminicli.com が利用不可で GitHub Releases のみで通知するフォールバック
    // Why: フォールバック動作では単一バージョンのみ配列に含まれることを検証する
    it("GitHub Releases のみで fallback モードとして単一バージョン配列を書き出す", async () => {
      // Given: geminicli.com の取得が失敗し、GitHub Releases にバージョンが含まれる
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("geminicli.com unavailable")),
        fetchGitHubReleases: vi
          .fn()
          .mockResolvedValue([
            { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Release notes" },
          ]),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更ありで fallback モード
      expect(result).toEqual<FetchHtmlGeminiCliResult>({
        hasChanges: true,
        newVersions: ["v0.31.0"],
        mode: "fallback",
      });

      // Then: 配列に1件の fallback エントリが含まれる（githubReleasesText なし）
      const entries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli.json"), "utf-8"),
      ) as GeminiCliCurrentEntry[];
      expect(entries).toHaveLength(1);
      expect(entries[0].mode).toBe("fallback");
      expect(entries[0].rawSummaryEn).toBeNull();
      expect(entries[0].imageUrls).toEqual([]);
      expect("githubReleasesText" in entries[0]).toBe(false);

      // Then: releases データが JSON ファイルに書き出される
      const releasesEntries = JSON.parse(
        readFileSync(resolve(HTML_CURRENT_DIR, "gemini-cli-releases.json"), "utf-8"),
      ) as GitHubReleaseEntry[];
      expect(releasesEntries).toEqual([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Release notes" },
      ]);
    });
  });

  describe("エラー: 両ソース取得失敗", () => {
    // What: geminicli.com と GitHub Releases の両方が失敗するケース
    // Why: 全取得失敗時に安全にエラーを返し、通知をスキップすることを保証する
    it("hasChanges=false とエラーメッセージを返す", async () => {
      // Given: 両方の取得が失敗する
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("geminicli.com unavailable")),
        fetchGitHubReleases: vi.fn().mockRejectedValue(new Error("GitHub API error")),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("初回実行: latestVersion なし", () => {
    // What: state に latestVersion が存在しない初回実行ケース
    // Why: 初回実行時は最新5件まで取得することを検証する
    it("最新5件まで取得し古い順で配列書き出しする", async () => {
      // Given: state にソースエントリが存在しない（初回実行）
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {},
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更あり（ページ上の3件全て、5件未満なので全部）
      expect(result.hasChanges).toBe(true);
      expect(result.newVersions).toEqual(["v0.29.0", "v0.30.0", "v0.31.0"]);
    });
  });

  describe("同一バージョン検出", () => {
    // What: 既存バージョンと同じバージョンが検出されるケース
    // Why: 冪等性を保証し、重複通知を防止する
    it("hasChanges=false を返しファイル書き出しをスキップする", async () => {
      // Given: 既存バージョンと同じ v0.31.0 が検出される
      const deps = makeDeps({
        loadState: vi.fn().mockResolvedValue({
          lastRunAt: "",
          sources: {
            "gemini-cli": {
              type: "version",
              hash: "",
              lastCheckedAt: "2026-03-01T00:00:00.000Z",
              latestVersion: "v0.31.0",
            },
          },
        }),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更なし
      expect(result.hasChanges).toBe(false);
      expect(deps.saveState).not.toHaveBeenCalled();
    });
  });

  describe("parseAllVersions が空配列を返す", () => {
    // What: HTML からバージョンを抽出できないケース（DOM 構造変更等）
    // Why: パーサ失敗時に安全にエラーを返すことを検証する
    it("hasChanges=false とエラーを返す", async () => {
      // Given: parseAllVersions が空配列を返す
      const deps = makeDeps({
        parseAllVersions: vi.fn().mockReturnValue([]),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: 変更なしでエラー
      expect(result.hasChanges).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("parseVersionContent が null を返す", () => {
    // What: バージョンは見つかったがコンテンツ抽出に失敗するケース
    // Why: GitHub Releases でフォールバックし、配列の各エントリに反映されることを検証する
    it("GitHub Releases のみで fallback モードとして処理する", async () => {
      // Given: parseVersionContent が null を返す
      const deps = makeDeps({
        parseVersionContent: vi.fn().mockReturnValue(null),
      });

      // When: 取得スクリプトを実行する
      const result = await fetchHtmlGeminiCli(deps);

      // Then: fallback モードで変更あり
      expect(result.hasChanges).toBe(true);
      expect(result.mode).toBe("fallback");
    });
  });

  describe("構造化エラーログ", () => {
    // What: エラー発生時のログフォーマット
    // Why: エラーログ形式（ソース名・メッセージ・タイムスタンプ）を検証する
    it("geminicli.com 取得失敗時に構造化ログを出力する", async () => {
      // Given: geminicli.com の取得が失敗する
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const deps = makeDeps({
        fetchStaticHtml: vi.fn().mockRejectedValue(new Error("Connection timeout")),
      });

      // When: 取得スクリプトを実行する
      await fetchHtmlGeminiCli(deps);

      // Then: 構造化ログが出力される
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find((call) => {
        const parsed = JSON.parse(call[0] as string) as StructuredLogEntry;
        return parsed.source === "gemini-cli";
      });
      expect(logCall).toBeDefined();
      const logEntry = JSON.parse(logCall![0] as string) as StructuredLogEntry;
      expect(logEntry.level).toBe("error");
      expect(logEntry.source).toBe("gemini-cli");
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
      await fetchHtmlGeminiCli(deps);

      // Then: lastCheckedAt が更新される
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.sources["gemini-cli"]!.lastCheckedAt).toBeDefined();
      expect(new Date(savedState.sources["gemini-cli"]!.lastCheckedAt).toISOString()).toBeTruthy();
    });
  });
});
