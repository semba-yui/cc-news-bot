import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import type { DiffResult } from "../services/diff-service.js";
import type { FetchResult } from "../services/fetch-service.js";
import type { PostResult } from "../services/slack-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  fetchAndDiff,
  type FetchAndDiffDeps,
  type RunResultData,
} from "../scripts/fetch-and-diff.js";

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-fad");

const SOURCES: SourceConfig[] = [
  { name: "source-a", type: "raw_markdown", url: "https://example.com/a.md" },
  { name: "source-b", type: "raw_markdown", url: "https://example.com/b.md" },
];

function makeDeps(overrides: Partial<FetchAndDiffDeps> = {}): FetchAndDiffDeps {
  return {
    sources: SOURCES,
    dataRoot: TEST_ROOT,
    snapshotsDir: resolve(TEST_ROOT, "snapshots"),
    diffsDir: resolve(TEST_ROOT, "diffs"),
    currentDir: resolve(TEST_ROOT, "current"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
      { source: "source-a", success: true, content: "content-a" },
      { source: "source-b", success: true, content: "content-b" },
    ]),
    loadSnapshot: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    saveSnapshot: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    detectChanges: vi
      .fn<() => DiffResult>()
      .mockImplementation((source: string, currentContent: string) => ({
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
    postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
    ...overrides,
  };
}

describe("fetchAndDiff", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "snapshots"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, "diffs"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, "current"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("初回実行（スナップショットなし）", () => {
    it("スナップショットを保存し firstRunSources に記録する", async () => {
      const deps = makeDeps();
      const result = await fetchAndDiff(deps);

      expect(result.firstRunSources).toEqual(["source-a", "source-b"]);
      expect(result.changedSources).toEqual([]);
      expect(result.hasChanges).toBe(true);

      expect(deps.saveSnapshot).toHaveBeenCalledTimes(2);
      expect(deps.saveSnapshot).toHaveBeenCalledWith("source-a", "content-a", deps.snapshotsDir);
      expect(deps.saveSnapshot).toHaveBeenCalledWith("source-b", "content-b", deps.snapshotsDir);
    });

    it("current ディレクトリにコンテンツを書き出す", async () => {
      const deps = makeDeps();
      await fetchAndDiff(deps);

      const currentA = readFileSync(resolve(TEST_ROOT, "current/source-a.md"), "utf-8");
      expect(currentA).toBe("content-a");
      const currentB = readFileSync(resolve(TEST_ROOT, "current/source-b.md"), "utf-8");
      expect(currentB).toBe("content-b");
    });
  });

  describe("差分検出", () => {
    it("差分があるソースを changedSources に記録し diff を書き出す", async () => {
      const diffResult: DiffResult = {
        source: "source-a",
        hasChanges: true,
        oldHash: "old",
        newHash: "new",
        diffText: "+added line",
        newContent: "new-content-a",
      };

      const deps = makeDeps({
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
      });

      const result = await fetchAndDiff(deps);

      expect(result.changedSources).toEqual(["source-a"]);
      expect(result.hasChanges).toBe(true);
      expect(deps.writeDiff).toHaveBeenCalledWith(diffResult, deps.diffsDir);
      // 差分ありの場合、snapshot は保存しない（notify で更新する）
      expect(deps.saveSnapshot).not.toHaveBeenCalled();
    });

    it("全ソースで差分なし（初回でもない）の場合は hasChanges が false", async () => {
      const deps = makeDeps({
        loadSnapshot: vi.fn().mockResolvedValue("existing"),
        detectChanges: vi.fn().mockReturnValue({
          source: "source-a",
          hasChanges: false,
          oldHash: "same",
          newHash: "same",
          newContent: "existing",
        }),
      });

      const result = await fetchAndDiff(deps);

      expect(result.hasChanges).toBe(false);
      expect(result.changedSources).toEqual([]);
      expect(result.firstRunSources).toEqual([]);
    });
  });

  describe("エラーハンドリング", () => {
    it("取得失敗したソースを errors に記録し Slack にエラー通知する", async () => {
      const deps = makeDeps({
        fetchAll: vi.fn().mockResolvedValue([
          { source: "source-a", success: false, error: "Network error" },
          { source: "source-b", success: true, content: "content-b" },
        ]),
      });

      const result = await fetchAndDiff(deps);

      expect(result.errors).toEqual([{ source: "source-a", error: "Network error" }]);
      expect(deps.postError).toHaveBeenCalledWith(
        "C_TEST",
        "source-a",
        "Network error",
        "xoxb-test",
      );
      // source-b は正常処理
      expect(deps.detectChanges).toHaveBeenCalledTimes(1);
    });

    it("slackToken がない場合は postError をスキップする", async () => {
      const deps = makeDeps({
        slackToken: undefined,
        fetchAll: vi
          .fn()
          .mockResolvedValue([{ source: "source-a", success: false, error: "Network error" }]),
      });

      const result = await fetchAndDiff(deps);

      expect(result.errors).toHaveLength(1);
      expect(deps.postError).not.toHaveBeenCalled();
    });
  });

  describe("run-result.json", () => {
    it("dataRoot に run-result.json を書き出す", async () => {
      const deps = makeDeps();
      await fetchAndDiff(deps);

      const runResult = JSON.parse(
        readFileSync(resolve(TEST_ROOT, "run-result.json"), "utf-8"),
      ) as RunResultData;

      expect(runResult.firstRunSources).toEqual(["source-a", "source-b"]);
      expect(runResult.changedSources).toEqual([]);
      expect(runResult.hasChanges).toBe(true);
      expect(runResult.errors).toEqual([]);
    });
  });

  describe("state の更新", () => {
    it("全ソースのハッシュと日時を state に記録して保存する", async () => {
      const deps = makeDeps();
      await fetchAndDiff(deps);

      expect(deps.saveState).toHaveBeenCalledTimes(1);
      const savedState = (deps.saveState as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as SnapshotState;
      expect(savedState.lastRunAt).toBeTruthy();
      expect(savedState.sources["source-a"]).toBeDefined();
      expect(savedState.sources["source-b"]).toBeDefined();
    });
  });
});
