import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import type { DiffResult } from "../services/diff-service.js";
import type { FetchResult } from "../services/fetch-service.js";
import type { PostResult } from "../services/slack-service.js";
import type { SnapshotState } from "../services/state-service.js";
import { run } from "../main.js";

const TEST_DATA_ROOT = resolve(import.meta.dirname, "../../data-test-main");

const SOURCES: SourceConfig[] = [
  { name: "source-a", type: "raw_markdown", url: "https://example.com/a.md" },
  { name: "source-b", type: "raw_markdown", url: "https://example.com/b.md" },
];

function makeTestDeps(overrides: Partial<Parameters<typeof run>[0]> = {}) {
  return {
    sources: SOURCES,
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    dataRoot: TEST_DATA_ROOT,
    snapshotsDir: resolve(TEST_DATA_ROOT, "snapshots"),
    diffsDir: resolve(TEST_DATA_ROOT, "diffs"),
    fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
      { source: "source-a", success: true, content: "content-a" },
      { source: "source-b", success: true, content: "content-b" },
    ]),
    loadSnapshot: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    saveSnapshot: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    detectChanges: vi
      .fn<() => DiffResult>()
      .mockImplementation((source: string, currentContent: string, _prev: string | null) => ({
        source,
        hasChanges: false,
        oldHash: "",
        newHash: "abc",
        newContent: currentContent,
      })),
    writeDiff: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    loadState: vi.fn<() => Promise<SnapshotState>>().mockResolvedValue({
      lastRunAt: "",
      sources: {},
    }),
    saveState: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    postSummary: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    postThreadReplies: vi.fn<() => Promise<PostResult[]>>().mockResolvedValue([{ success: true }]),
    postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
    }),
    readSummary: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    ...overrides,
  };
}

describe("run (メインフロー制御)", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_DATA_ROOT, "snapshots"), { recursive: true });
    mkdirSync(resolve(TEST_DATA_ROOT, "diffs"), { recursive: true });
    mkdirSync(resolve(TEST_DATA_ROOT, "summaries"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DATA_ROOT, { recursive: true, force: true });
  });

  describe("初回実行（スナップショットなし）", () => {
    it("スナップショットを保存し、Slack 通知をスキップする", async () => {
      const deps = makeTestDeps();
      const result = await run(deps);

      // saveSnapshot が各ソースに対して呼ばれる
      expect(deps.saveSnapshot).toHaveBeenCalledTimes(2);
      expect(deps.saveSnapshot).toHaveBeenCalledWith("source-a", "content-a", deps.snapshotsDir);
      expect(deps.saveSnapshot).toHaveBeenCalledWith("source-b", "content-b", deps.snapshotsDir);

      // Slack 通知はスキップ
      expect(deps.postSummary).not.toHaveBeenCalled();
      expect(deps.postThreadReplies).not.toHaveBeenCalled();

      // state が保存される
      expect(deps.saveState).toHaveBeenCalledTimes(1);

      // 結果に反映
      expect(result.processed).toHaveLength(2);
      expect(result.processed.every((p) => !p.notified)).toBe(true);
    });
  });

  describe("差分なし", () => {
    it("要約生成・Slack 通知をスキップし、スナップショットを更新しない", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("content-a"),
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: false,
          oldHash: "same",
          newHash: "same",
          newContent: "content-a",
        }),
      });

      const result = await run(deps);

      expect(deps.postSummary).not.toHaveBeenCalled();
      expect(deps.saveSnapshot).not.toHaveBeenCalled();
      expect(result.processed.every((p) => !p.hasChanges)).toBe(true);
    });
  });

  describe("差分あり", () => {
    it("diff 書き出し → Slack 通知 → スナップショット更新を行う", async () => {
      const diffResult: DiffResult = {
        source: "source-a",
        hasChanges: true,
        oldHash: "old",
        newHash: "new",
        diffText: "+added line",
        newContent: "new-content-a",
      };

      const deps = makeTestDeps({
        loadSnapshot: vi
          .fn()
          .mockResolvedValueOnce("old-content-a")
          .mockResolvedValueOnce("old-content-b"),
        detectChanges: vi.fn().mockReturnValueOnce(diffResult).mockReturnValueOnce({
          source: "source-b",
          hasChanges: false,
          oldHash: "same",
          newHash: "same",
          newContent: "content-b",
        }),
        readSummary: vi.fn().mockResolvedValueOnce("要約テキスト"),
      });

      const result = await run(deps);

      // diff ファイル書き出し
      expect(deps.writeDiff).toHaveBeenCalledWith(diffResult, deps.diffsDir);

      // Slack 通知（source-a のみ）
      expect(deps.postSummary).toHaveBeenCalledTimes(1);
      expect(deps.postSummary).toHaveBeenCalledWith(
        "C_TEST",
        "source-a",
        "要約テキスト",
        "xoxb-test",
      );

      // スレッド返信（原文 diff）
      expect(deps.postThreadReplies).toHaveBeenCalledTimes(1);
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "1234567890.123456",
        "+added line",
        "xoxb-test",
      );

      // 差分があったソースのみスナップショット更新
      expect(deps.saveSnapshot).toHaveBeenCalledTimes(1);
      expect(deps.saveSnapshot).toHaveBeenCalledWith(
        "source-a",
        "new-content-a",
        deps.snapshotsDir,
      );

      // state が保存される
      expect(deps.saveState).toHaveBeenCalledTimes(1);

      // 結果
      const sourceA = result.processed.find((p) => p.source === "source-a")!;
      expect(sourceA.hasChanges).toBe(true);
      expect(sourceA.notified).toBe(true);

      const sourceB = result.processed.find((p) => p.source === "source-b")!;
      expect(sourceB.hasChanges).toBe(false);
      expect(sourceB.notified).toBe(false);
    });

    it("要約ファイルがない場合は diff テキストを要約として使う", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("old"),
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: true,
          oldHash: "old",
          newHash: "new",
          diffText: "+diff text",
          newContent: "new-content",
        }),
        readSummary: vi.fn().mockResolvedValue(null),
      });

      await run(deps);

      expect(deps.postSummary).toHaveBeenCalledWith(
        "C_TEST",
        "source-a",
        "+diff text",
        "xoxb-test",
      );
    });
  });

  describe("エラーハンドリング", () => {
    it("取得失敗したソースは Slack にエラー通知し、他ソースの処理を継続する", async () => {
      const deps = makeTestDeps({
        fetchAll: vi.fn().mockResolvedValue([
          { source: "source-a", success: false, error: "Network error" },
          { source: "source-b", success: true, content: "content-b" },
        ]),
      });

      const result = await run(deps);

      // source-a のエラー通知
      expect(deps.postError).toHaveBeenCalledTimes(1);
      expect(deps.postError).toHaveBeenCalledWith(
        "C_TEST",
        "source-a",
        "Network error",
        "xoxb-test",
      );

      // source-b は正常処理（初回なのでスナップショット保存のみ）
      expect(deps.detectChanges).toHaveBeenCalledTimes(1);
      expect(deps.saveSnapshot).toHaveBeenCalledTimes(1);

      // 結果にエラー情報が含まれる
      const sourceA = result.processed.find((p) => p.source === "source-a")!;
      expect(sourceA.error).toBe("Network error");

      const sourceB = result.processed.find((p) => p.source === "source-b")!;
      expect(sourceB.error).toBeUndefined();
    });

    it("Slack 投稿失敗時はログに記録し、処理を継続する", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("old"),
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: true,
          oldHash: "old",
          newHash: "new",
          diffText: "+diff",
          newContent: "new",
        }),
        readSummary: vi.fn().mockResolvedValue("要約"),
        postSummary: vi.fn().mockResolvedValue({
          success: false,
          error: "channel_not_found",
        }),
      });

      // エラーで止まらず正常終了する
      const result = await run(deps);
      expect(result.processed).toHaveLength(2);

      // スナップショット更新は行われる（Slack 投稿失敗でもデータは更新する）
      expect(deps.saveSnapshot).toHaveBeenCalled();
    });
  });

  describe("state.json の更新", () => {
    it("処理完了後に lastRunAt とソースごとのハッシュ・日時を記録する", async () => {
      const deps = makeTestDeps({
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: false,
          oldHash: "",
          newHash: "hash-a",
          newContent: "content-a",
        }),
      });

      await run(deps);

      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = deps.saveState.mock.calls[0][0] as SnapshotState;
      expect(savedState.lastRunAt).toBeTruthy();
      expect(savedState.sources["source-a"]).toBeDefined();
      expect(savedState.sources["source-a"].hash).toBe("hash-a");
      expect(savedState.sources["source-a"].lastCheckedAt).toBeTruthy();
    });

    it("全ソースで差分なし（初回でもない）の場合は saveState を呼ばない", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("existing-content"),
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: false,
          oldHash: "same",
          newHash: "same",
          newContent: "existing-content",
        }),
      });

      await run(deps);

      expect(deps.saveState).not.toHaveBeenCalled();
    });

    it("差分ありのソースがある場合は全ソースの情報を state に記録する", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("old"),
        detectChanges: vi
          .fn()
          .mockReturnValueOnce({
            source: "source-a",
            hasChanges: true,
            oldHash: "old-a",
            newHash: "new-a",
            diffText: "+diff",
            newContent: "new-content-a",
          })
          .mockReturnValueOnce({
            source: "source-b",
            hasChanges: false,
            oldHash: "same-b",
            newHash: "same-b",
            newContent: "content-b",
          }),
        readSummary: vi.fn().mockResolvedValue("要約"),
      });

      await run(deps);

      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = deps.saveState.mock.calls[0][0] as SnapshotState;
      expect(savedState.sources["source-a"].hash).toBe("new-a");
      expect(savedState.sources["source-b"].hash).toBe("same-b");
    });
  });

  describe("hasAnyChanges フラグ", () => {
    it("差分があったソースがある場合は true を返す", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("old"),
        detectChanges: vi
          .fn()
          .mockReturnValueOnce({
            source: "source-a",
            hasChanges: true,
            oldHash: "old",
            newHash: "new",
            diffText: "+diff",
            newContent: "new",
          })
          .mockReturnValueOnce({
            source: "source-b",
            hasChanges: false,
            oldHash: "same",
            newHash: "same",
            newContent: "content",
          }),
        readSummary: vi.fn().mockResolvedValue("要約"),
      });

      const result = await run(deps);
      expect(result.hasAnyChanges).toBe(true);
    });

    it("初回実行（スナップショット保存）の場合は true を返す", async () => {
      const deps = makeTestDeps();
      const result = await run(deps);
      expect(result.hasAnyChanges).toBe(true);
    });

    it("全ソースで差分なし（初回でもない）の場合は false を返す", async () => {
      const deps = makeTestDeps({
        loadSnapshot: vi.fn().mockResolvedValue("existing"),
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: false,
          oldHash: "same",
          newHash: "same",
          newContent: "existing",
        }),
      });

      const result = await run(deps);
      expect(result.hasAnyChanges).toBe(false);
    });
  });
});
