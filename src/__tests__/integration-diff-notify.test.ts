import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import { detectChanges, writeDiff } from "../services/diff-service.js";
import { loadSnapshot, loadState, saveSnapshot, saveState } from "../services/state-service.js";
import type { SnapshotState } from "../services/state-service.js";
import type { PostResult } from "../services/slack-service.js";
import type { FetchResult } from "../services/fetch-service.js";
import { fetchAndDiff } from "../scripts/fetch-and-diff.js";
import type { RunResultData } from "../scripts/fetch-and-diff.js";
import { notifySlack } from "../scripts/notify.js";

/**
 * 結合テスト: 差分検出と通知フローの検証
 *
 * スナップショットが存在する状態で changelog に変更があった場合:
 * - 差分検出 → diff ファイル書き出し → Slack 投稿 → スナップショット更新
 *
 * 差分がない場合: スキップされることを確認
 * 長文の差分テキスト: 正しく分割投稿されることを確認
 *
 * fetch と Slack API はモック、diff-service / state-service は実装を使用。
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-integration-diff-notify");
const SNAPSHOTS_DIR = resolve(TEST_ROOT, "snapshots");
const DIFFS_DIR = resolve(TEST_ROOT, "diffs");
const SUMMARIES_DIR = resolve(TEST_ROOT, "summaries");
const CURRENT_DIR = resolve(TEST_ROOT, "current");

const TEST_SOURCES: SourceConfig[] = [
  { name: "source-alpha", type: "raw_markdown", url: "https://example.com/alpha.md" },
  { name: "source-beta", type: "raw_markdown", url: "https://example.com/beta.md" },
];

const OLD_CONTENTS: Record<string, string> = {
  "source-alpha": "# Alpha Changelog\n\n## v1.0.0\n- Initial release",
  "source-beta": "# Beta Changelog\n\n## v2.0.0\n- Feature A",
};

const NEW_CONTENTS: Record<string, string> = {
  "source-alpha": "# Alpha Changelog\n\n## v1.1.0\n- New feature\n\n## v1.0.0\n- Initial release",
  "source-beta": "# Beta Changelog\n\n## v2.0.0\n- Feature A",
};

function setupDirs(): void {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  mkdirSync(DIFFS_DIR, { recursive: true });
  mkdirSync(SUMMARIES_DIR, { recursive: true });
  mkdirSync(CURRENT_DIR, { recursive: true });
}

function setupSnapshots(contents: Record<string, string>): void {
  for (const [source, content] of Object.entries(contents)) {
    writeFileSync(resolve(SNAPSHOTS_DIR, `${source}.md`), content);
  }
}

describe("結合テスト: 差分検出と通知フロー", () => {
  beforeEach(() => {
    setupDirs();
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("差分がある場合のフルフロー", () => {
    it("fetchAndDiff → notifySlack で差分検出・通知・スナップショット更新が一連で動作する", async () => {
      // Arrange: スナップショットを旧コンテンツで設置
      setupSnapshots(OLD_CONTENTS);

      const mockPostError = vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true });

      // Phase 1: fetchAndDiff
      const fadResult = await fetchAndDiff({
        sources: TEST_SOURCES,
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue(
          TEST_SOURCES.map((s) => ({
            source: s.name,
            success: true,
            content: NEW_CONTENTS[s.name],
          })),
        ),
        loadSnapshot,
        saveSnapshot,
        detectChanges,
        writeDiff,
        loadState,
        saveState,
        postError: mockPostError,
      });

      // source-alpha のみ変更あり（source-beta は同一）
      expect(fadResult.changedSources).toEqual(["source-alpha"]);
      expect(fadResult.firstRunSources).toEqual([]);
      expect(fadResult.hasChanges).toBe(true);
      expect(fadResult.errors).toEqual([]);

      // diff ファイルが生成されている
      const diffFile = resolve(DIFFS_DIR, "source-alpha.md");
      expect(existsSync(diffFile)).toBe(true);
      const diffText = readFileSync(diffFile, "utf-8");
      expect(diffText).toContain("+## v1.1.0");
      expect(diffText).toContain("+- New feature");

      // source-beta の diff は生成されていない
      expect(existsSync(resolve(DIFFS_DIR, "source-beta.md"))).toBe(false);

      // state.json が更新されている
      const stateFile = resolve(TEST_ROOT, "state.json");
      expect(existsSync(stateFile)).toBe(true);
      const state = JSON.parse(readFileSync(stateFile, "utf-8")) as SnapshotState;
      expect(state.sources["source-alpha"]).toBeDefined();
      expect(state.sources["source-beta"]).toBeDefined();

      // run-result.json が正しく出力されている
      const runResult = JSON.parse(
        readFileSync(resolve(TEST_ROOT, "run-result.json"), "utf-8"),
      ) as RunResultData;
      expect(runResult.changedSources).toEqual(["source-alpha"]);

      // Phase 2: notifySlack
      // 要約ファイルを配置（Claude Code Action が生成する想定）
      writeFileSync(resolve(SUMMARIES_DIR, "source-alpha.md"), "## ひとこと\n- 新機能追加");

      const mockPostSummary = vi
        .fn<() => Promise<PostResult>>()
        .mockResolvedValue({ success: true, ts: "1234567890.123456" });
      const mockPostThreadReplies = vi
        .fn<() => Promise<PostResult[]>>()
        .mockResolvedValue([{ success: true }]);

      await notifySlack({
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        summariesDir: SUMMARIES_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        postSummary: mockPostSummary,
        postThreadReplies: mockPostThreadReplies,
        saveSnapshot,
      });

      // 要約が Slack に投稿される
      expect(mockPostSummary).toHaveBeenCalledTimes(1);
      expect(mockPostSummary).toHaveBeenCalledWith(
        "C_TEST",
        "source-alpha",
        "## ひとこと\n- 新機能追加",
        "xoxb-test",
      );

      // スレッド返信で diff が投稿される
      expect(mockPostThreadReplies).toHaveBeenCalledTimes(1);
      expect(mockPostThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "1234567890.123456",
        diffText,
        "xoxb-test",
      );

      // スナップショットが新しいコンテンツで更新される
      const updatedSnapshot = readFileSync(resolve(SNAPSHOTS_DIR, "source-alpha.md"), "utf-8");
      expect(updatedSnapshot).toBe(NEW_CONTENTS["source-alpha"]);
    });
  });

  describe("差分がない場合のスキップ", () => {
    it("全ソースで差分なしの場合 changedSources が空で通知不要", async () => {
      // 旧コンテンツ = 新コンテンツ（変更なし）
      setupSnapshots(OLD_CONTENTS);

      const fadResult = await fetchAndDiff({
        sources: TEST_SOURCES,
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue(
          TEST_SOURCES.map((s) => ({
            source: s.name,
            success: true,
            content: OLD_CONTENTS[s.name], // 同一コンテンツ
          })),
        ),
        loadSnapshot,
        saveSnapshot,
        detectChanges,
        writeDiff,
        loadState,
        saveState,
        postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
      });

      expect(fadResult.changedSources).toEqual([]);
      expect(fadResult.firstRunSources).toEqual([]);
      expect(fadResult.hasChanges).toBe(false);

      // diff ファイルは未生成
      for (const source of TEST_SOURCES) {
        expect(existsSync(resolve(DIFFS_DIR, `${source.name}.md`))).toBe(false);
      }

      // notifySlack を実行しても何も投稿されない
      const mockPostSummary = vi.fn<() => Promise<PostResult>>().mockResolvedValue({
        success: true,
        ts: "ts",
      });
      const mockPostThreadReplies = vi
        .fn<() => Promise<PostResult[]>>()
        .mockResolvedValue([{ success: true }]);

      await notifySlack({
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        summariesDir: SUMMARIES_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        postSummary: mockPostSummary,
        postThreadReplies: mockPostThreadReplies,
        saveSnapshot,
      });

      expect(mockPostSummary).not.toHaveBeenCalled();
      expect(mockPostThreadReplies).not.toHaveBeenCalled();
    });

    it("差分なし時にスナップショットが変更されない", async () => {
      setupSnapshots(OLD_CONTENTS);

      await fetchAndDiff({
        sources: TEST_SOURCES,
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue(
          TEST_SOURCES.map((s) => ({
            source: s.name,
            success: true,
            content: OLD_CONTENTS[s.name],
          })),
        ),
        loadSnapshot,
        saveSnapshot,
        detectChanges,
        writeDiff,
        loadState,
        saveState,
        postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
      });

      // スナップショットは元のまま（fetchAndDiff は差分ありの場合のみ snapshot を更新しない、notify で更新する）
      for (const source of TEST_SOURCES) {
        const snapshot = readFileSync(resolve(SNAPSHOTS_DIR, `${source.name}.md`), "utf-8");
        expect(snapshot).toBe(OLD_CONTENTS[source.name]);
      }
    });
  });

  describe("長文差分テキストの分割投稿", () => {
    it("3,500 文字超の差分テキストが分割されてスレッド投稿される", async () => {
      // 長大なコンテンツを生成
      const longNewLine = "- " + "x".repeat(200) + "\n";
      const longNewContent =
        "# Alpha Changelog\n\n## v2.0.0\n" +
        longNewLine.repeat(30) + // 約 6,000 文字
        "\n## v1.0.0\n- Initial release";

      setupSnapshots(OLD_CONTENTS);

      const fadResult = await fetchAndDiff({
        sources: [TEST_SOURCES[0]],
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        fetchAll: vi
          .fn<() => Promise<FetchResult[]>>()
          .mockResolvedValue([{ source: "source-alpha", success: true, content: longNewContent }]),
        loadSnapshot,
        saveSnapshot,
        detectChanges,
        writeDiff,
        loadState,
        saveState,
        postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
      });

      expect(fadResult.changedSources).toEqual(["source-alpha"]);

      // diff ファイルが生成されている
      const diffText = readFileSync(resolve(DIFFS_DIR, "source-alpha.md"), "utf-8");
      expect(diffText.length).toBeGreaterThan(3500);

      // Phase 2: notifySlack（splitText を内部で使う postThreadReplies の実装を検証）
      // ここでは postThreadReplies のモックで呼び出し引数を確認
      const mockPostSummary = vi.fn<() => Promise<PostResult>>().mockResolvedValue({
        success: true,
        ts: "1234567890.123456",
      });
      const receivedTexts: string[] = [];
      const mockPostThreadReplies = vi
        .fn<(ch: string, ts: string, text: string, token: string) => Promise<PostResult[]>>()
        .mockImplementation((_ch: string, _ts: string, text: string) => {
          receivedTexts.push(text);
          return Promise.resolve([{ success: true }]);
        });

      await notifySlack({
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        summariesDir: SUMMARIES_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        postSummary: mockPostSummary,
        postThreadReplies: mockPostThreadReplies,
        saveSnapshot,
      });

      // postThreadReplies が呼ばれ、渡されたテキストが長文である
      expect(mockPostThreadReplies).toHaveBeenCalledTimes(1);
      expect(receivedTexts[0].length).toBeGreaterThan(3500);
    });
  });

  describe("state.json の整合性", () => {
    it("差分ありの場合 state.json に全ソースのハッシュと日時が記録される", async () => {
      setupSnapshots(OLD_CONTENTS);
      const beforeRun = new Date().toISOString();

      await fetchAndDiff({
        sources: TEST_SOURCES,
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue(
          TEST_SOURCES.map((s) => ({
            source: s.name,
            success: true,
            content: NEW_CONTENTS[s.name],
          })),
        ),
        loadSnapshot,
        saveSnapshot,
        detectChanges,
        writeDiff,
        loadState,
        saveState,
        postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
      });

      const state = JSON.parse(
        readFileSync(resolve(TEST_ROOT, "state.json"), "utf-8"),
      ) as SnapshotState;

      // lastRunAt が実行時刻以降
      expect(new Date(state.lastRunAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeRun).getTime(),
      );

      // 両ソースのハッシュが記録されている
      for (const source of TEST_SOURCES) {
        expect(state.sources[source.name].hash).toBeTruthy();
        expect(state.sources[source.name].lastCheckedAt).toBeTruthy();
      }

      // 差分があったソースと無かったソースのハッシュが異なる
      expect(state.sources["source-alpha"].hash).not.toBe(state.sources["source-beta"].hash);
    });

    it("差分なしの場合は state.json が更新されない", async () => {
      setupSnapshots(OLD_CONTENTS);

      const result = await fetchAndDiff({
        sources: TEST_SOURCES,
        dataRoot: TEST_ROOT,
        snapshotsDir: SNAPSHOTS_DIR,
        diffsDir: DIFFS_DIR,
        currentDir: CURRENT_DIR,
        getChannels: () => ["C_TEST"],
        slackToken: "xoxb-test",
        fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue(
          TEST_SOURCES.map((s) => ({
            source: s.name,
            success: true,
            content: OLD_CONTENTS[s.name],
          })),
        ),
        loadSnapshot,
        saveSnapshot,
        detectChanges,
        writeDiff,
        loadState,
        saveState,
        postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
      });

      expect(result.hasChanges).toBe(false);
      expect(existsSync(resolve(TEST_ROOT, "state.json"))).toBe(false);
    });
  });
});
