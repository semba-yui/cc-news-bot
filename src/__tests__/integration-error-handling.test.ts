import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import { detectChanges, writeDiff } from "../services/diff-service.js";
import { loadSnapshot, loadState, saveSnapshot, saveState } from "../services/state-service.js";
import type { PostResult } from "../services/slack-service.js";
import type { FetchResult } from "../services/fetch-service.js";
import { fetchAndDiff } from "../scripts/fetch-and-diff.js";

/**
 * 結合テスト: エラーハンドリングの検証
 *
 * - 取得エラーが Slack に通知されることを確認する
 * - 1 ソースのエラーが他ソースの処理を妨げないことを確認する
 * - エラー通知にソース名とエラー内容が含まれることを確認する
 *
 * fetch と Slack API はモック、diff-service / state-service は実装を使用。
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-integration-error");
const SNAPSHOTS_DIR = resolve(TEST_ROOT, "snapshots");
const DIFFS_DIR = resolve(TEST_ROOT, "diffs");
const CURRENT_DIR = resolve(TEST_ROOT, "current");

const TEST_SOURCES: SourceConfig[] = [
  { name: "source-alpha", type: "raw_markdown", url: "https://example.com/alpha.md" },
  { name: "source-beta", type: "raw_markdown", url: "https://example.com/beta.md" },
  { name: "source-gamma", type: "github_releases", url: "", owner: "test", repo: "gamma" },
];

describe("結合テスト: エラーハンドリング", () => {
  beforeEach(() => {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    mkdirSync(DIFFS_DIR, { recursive: true });
    mkdirSync(CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it("取得エラーが Slack にソース名とエラー内容を含めて通知される", async () => {
    const mockPostError = vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true });

    await fetchAndDiff({
      sources: TEST_SOURCES,
      dataRoot: TEST_ROOT,
      snapshotsDir: SNAPSHOTS_DIR,
      diffsDir: DIFFS_DIR,
      currentDir: CURRENT_DIR,
      getChannels: () => ["C_TEST"],
      slackToken: "xoxb-test",
      fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
        { source: "source-alpha", success: false, error: "HTTP 404 Not Found" },
        { source: "source-beta", success: true, content: "beta content" },
        { source: "source-gamma", success: false, error: "API rate limit exceeded" },
      ]),
      loadSnapshot,
      saveSnapshot,
      detectChanges,
      writeDiff,
      loadState,
      saveState,
      postError: mockPostError,
    });

    // エラーのあった 2 ソースについて postError が呼ばれる
    expect(mockPostError).toHaveBeenCalledTimes(2);

    // source-alpha のエラー通知にソース名とエラー内容が含まれる
    expect(mockPostError).toHaveBeenCalledWith(
      "C_TEST",
      "source-alpha",
      "HTTP 404 Not Found",
      "xoxb-test",
    );

    // source-gamma のエラー通知にソース名とエラー内容が含まれる
    expect(mockPostError).toHaveBeenCalledWith(
      "C_TEST",
      "source-gamma",
      "API rate limit exceeded",
      "xoxb-test",
    );
  });

  it("1 ソースのエラーが他ソースの処理を妨げない", async () => {
    const mockPostError = vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true });

    const result = await fetchAndDiff({
      sources: TEST_SOURCES,
      dataRoot: TEST_ROOT,
      snapshotsDir: SNAPSHOTS_DIR,
      diffsDir: DIFFS_DIR,
      currentDir: CURRENT_DIR,
      getChannels: () => ["C_TEST"],
      slackToken: "xoxb-test",
      fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
        { source: "source-alpha", success: false, error: "Network timeout" },
        { source: "source-beta", success: true, content: "beta content" },
        { source: "source-gamma", success: true, content: "gamma content" },
      ]),
      loadSnapshot,
      saveSnapshot,
      detectChanges,
      writeDiff,
      loadState,
      saveState,
      postError: mockPostError,
    });

    // エラーは source-alpha のみ
    expect(result.errors).toEqual([{ source: "source-alpha", error: "Network timeout" }]);

    // 正常なソースは firstRunSources に記録される（スナップショットなしの初回実行）
    expect(result.firstRunSources).toContain("source-beta");
    expect(result.firstRunSources).toContain("source-gamma");
    // エラーのソースは firstRunSources に含まれない
    expect(result.firstRunSources).not.toContain("source-alpha");

    // 正常なソースのスナップショットが保存される
    expect(existsSync(resolve(SNAPSHOTS_DIR, "source-beta.md"))).toBe(true);
    expect(existsSync(resolve(SNAPSHOTS_DIR, "source-gamma.md"))).toBe(true);
    expect(readFileSync(resolve(SNAPSHOTS_DIR, "source-beta.md"), "utf-8")).toBe("beta content");

    // エラーのソースのスナップショットは作成されない
    expect(existsSync(resolve(SNAPSHOTS_DIR, "source-alpha.md"))).toBe(false);

    // current ディレクトリには正常ソースのファイルのみ
    expect(existsSync(resolve(CURRENT_DIR, "source-beta.md"))).toBe(true);
    expect(existsSync(resolve(CURRENT_DIR, "source-gamma.md"))).toBe(true);
    expect(existsSync(resolve(CURRENT_DIR, "source-alpha.md"))).toBe(false);
  });

  it("state.json にはエラーのないソースのみ記録される", async () => {
    await fetchAndDiff({
      sources: TEST_SOURCES,
      dataRoot: TEST_ROOT,
      snapshotsDir: SNAPSHOTS_DIR,
      diffsDir: DIFFS_DIR,
      currentDir: CURRENT_DIR,
      getChannels: () => ["C_TEST"],
      slackToken: "xoxb-test",
      fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
        { source: "source-alpha", success: false, error: "Connection refused" },
        { source: "source-beta", success: true, content: "beta content" },
        { source: "source-gamma", success: true, content: "gamma content" },
      ]),
      loadSnapshot,
      saveSnapshot,
      detectChanges,
      writeDiff,
      loadState,
      saveState,
      postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
    });

    const state = JSON.parse(readFileSync(resolve(TEST_ROOT, "state.json"), "utf-8"));

    // 正常なソースの状態が記録される
    expect(state.sources["source-beta"]).toBeDefined();
    expect(state.sources["source-beta"].hash).toBeTruthy();
    expect(state.sources["source-gamma"]).toBeDefined();
    expect(state.sources["source-gamma"].hash).toBeTruthy();

    // エラーのソースは state に記録されない
    expect(state.sources["source-alpha"]).toBeUndefined();
  });

  it("run-result.json にエラー情報が記録される", async () => {
    await fetchAndDiff({
      sources: TEST_SOURCES,
      dataRoot: TEST_ROOT,
      snapshotsDir: SNAPSHOTS_DIR,
      diffsDir: DIFFS_DIR,
      currentDir: CURRENT_DIR,
      getChannels: () => ["C_TEST"],
      slackToken: "xoxb-test",
      fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
        { source: "source-alpha", success: false, error: "HTTP 500 Internal Server Error" },
        { source: "source-beta", success: true, content: "beta content" },
        { source: "source-gamma", success: false, error: "DNS resolution failed" },
      ]),
      loadSnapshot,
      saveSnapshot,
      detectChanges,
      writeDiff,
      loadState,
      saveState,
      postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
    });

    const runResult = JSON.parse(readFileSync(resolve(TEST_ROOT, "run-result.json"), "utf-8"));

    expect(runResult.errors).toEqual([
      { source: "source-alpha", error: "HTTP 500 Internal Server Error" },
      { source: "source-gamma", error: "DNS resolution failed" },
    ]);
    expect(runResult.firstRunSources).toEqual(["source-beta"]);
    expect(runResult.hasChanges).toBe(true);
  });

  it("全ソースがエラーの場合でもワークフローはクラッシュしない", async () => {
    const mockPostError = vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true });

    const result = await fetchAndDiff({
      sources: TEST_SOURCES,
      dataRoot: TEST_ROOT,
      snapshotsDir: SNAPSHOTS_DIR,
      diffsDir: DIFFS_DIR,
      currentDir: CURRENT_DIR,
      getChannels: () => ["C_TEST"],
      slackToken: "xoxb-test",
      fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
        { source: "source-alpha", success: false, error: "Error A" },
        { source: "source-beta", success: false, error: "Error B" },
        { source: "source-gamma", success: false, error: "Error C" },
      ]),
      loadSnapshot,
      saveSnapshot,
      detectChanges,
      writeDiff,
      loadState,
      saveState,
      postError: mockPostError,
    });

    expect(result.errors).toHaveLength(3);
    expect(result.changedSources).toEqual([]);
    expect(result.firstRunSources).toEqual([]);
    expect(result.hasChanges).toBe(false);

    // 全ソースについてエラー通知が送られる
    expect(mockPostError).toHaveBeenCalledTimes(3);
  });

  it("Slack エラー通知自体が失敗しても処理が継続する", async () => {
    const mockPostError = vi
      .fn<() => Promise<PostResult>>()
      .mockResolvedValueOnce({ success: false, error: "channel_not_found" })
      .mockResolvedValueOnce({ success: true });

    const result = await fetchAndDiff({
      sources: [TEST_SOURCES[0], TEST_SOURCES[1]],
      dataRoot: TEST_ROOT,
      snapshotsDir: SNAPSHOTS_DIR,
      diffsDir: DIFFS_DIR,
      currentDir: CURRENT_DIR,
      getChannels: () => ["C_TEST"],
      slackToken: "xoxb-test",
      fetchAll: vi.fn<() => Promise<FetchResult[]>>().mockResolvedValue([
        { source: "source-alpha", success: false, error: "Fetch error A" },
        { source: "source-beta", success: false, error: "Fetch error B" },
      ]),
      loadSnapshot,
      saveSnapshot,
      detectChanges,
      writeDiff,
      loadState,
      saveState,
      postError: mockPostError,
    });

    // postError が失敗しても次のソースの処理に進む
    expect(mockPostError).toHaveBeenCalledTimes(2);
    expect(result.errors).toHaveLength(2);
  });
});
