import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import { detectChanges, writeDiff } from "../services/diff-service.js";
import { loadSnapshot, loadState, saveSnapshot, saveState } from "../services/state-service.js";
import type { PostResult } from "../services/slack-service.js";
import { fetchAndDiff } from "../scripts/fetch-and-diff.js";
import type { FetchResult } from "../services/fetch-service.js";

/**
 * 結合テスト: 初回実行シナリオ
 *
 * スナップショットが存在しない状態で実行し、以下を検証する:
 * - スナップショット保存のみ行われること
 * - Slack 通知がスキップされること
 * - state.json が正しく生成されること
 *
 * fetch と Slack は外部依存のためモックし、
 * diff-service, state-service はファイルシステム上の実装を使用する。
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-integration-first-run");
const SNAPSHOTS_DIR = resolve(TEST_ROOT, "snapshots");
const DIFFS_DIR = resolve(TEST_ROOT, "diffs");
const CURRENT_DIR = resolve(TEST_ROOT, "current");

const TEST_SOURCES: SourceConfig[] = [
  { name: "source-alpha", type: "raw_markdown", url: "https://example.com/alpha.md" },
  { name: "source-beta", type: "raw_markdown", url: "https://example.com/beta.md" },
  { name: "source-gamma", type: "github_releases", url: "", owner: "test", repo: "gamma" },
];

const FAKE_CONTENTS: Record<string, string> = {
  "source-alpha": "# Alpha Changelog\n\n## v1.0.0\n- Initial release",
  "source-beta": "# Beta Changelog\n\n## v2.0.0\n- Feature update\n- Bug fix",
  "source-gamma": "## v0.1.0 (2026-02-28T00:00:00Z)\nFirst release body",
};

describe("結合テスト: 初回実行シナリオ", () => {
  beforeEach(() => {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    mkdirSync(DIFFS_DIR, { recursive: true });
    mkdirSync(CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it("スナップショットが存在しない状態で実行するとスナップショットが保存される", async () => {
    const mockPostError = vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true });

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
          content: FAKE_CONTENTS[s.name],
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

    // 全ソースが firstRunSources に記録される
    expect(result.firstRunSources).toEqual(["source-alpha", "source-beta", "source-gamma"]);
    // changedSources は空
    expect(result.changedSources).toEqual([]);
    // エラーなし
    expect(result.errors).toEqual([]);
    // hasChanges は true（初回スナップショット保存のため）
    expect(result.hasChanges).toBe(true);

    // 各ソースのスナップショットファイルが実際に作成されている
    for (const source of TEST_SOURCES) {
      const snapshotFile = resolve(SNAPSHOTS_DIR, `${source.name}.md`);
      expect(existsSync(snapshotFile)).toBe(true);
      const content = readFileSync(snapshotFile, "utf-8");
      expect(content).toBe(FAKE_CONTENTS[source.name]);
    }
  });

  it("初回実行時に Slack 通知（postError）が呼ばれない", async () => {
    const mockPostError = vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true });

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
          content: FAKE_CONTENTS[s.name],
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

    // 初回実行時は Slack への通知は行われない
    expect(mockPostError).not.toHaveBeenCalled();
  });

  it("初回実行時に diff ファイルが生成されない", async () => {
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
          content: FAKE_CONTENTS[s.name],
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

    // diff ファイルは作成されない
    for (const source of TEST_SOURCES) {
      const diffFile = resolve(DIFFS_DIR, `${source.name}.md`);
      expect(existsSync(diffFile)).toBe(false);
    }
  });

  it("state.json が正しく生成される", async () => {
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
          content: FAKE_CONTENTS[s.name],
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

    // state.json が存在する
    const stateFile = resolve(TEST_ROOT, "state.json");
    expect(existsSync(stateFile)).toBe(true);

    const state = JSON.parse(readFileSync(stateFile, "utf-8"));

    // lastRunAt が実行時刻以降
    expect(new Date(state.lastRunAt).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeRun).getTime(),
    );

    // 全ソースのエントリが存在する
    for (const source of TEST_SOURCES) {
      expect(state.sources[source.name]).toBeDefined();
      // hash が空でない
      expect(state.sources[source.name].hash).toBeTruthy();
      // lastCheckedAt が ISO 8601 形式で設定されている
      expect(new Date(state.sources[source.name].lastCheckedAt).toISOString()).toBe(
        state.sources[source.name].lastCheckedAt,
      );
    }
  });

  it("run-result.json が正しく出力される", async () => {
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
          content: FAKE_CONTENTS[s.name],
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

    const runResultFile = resolve(TEST_ROOT, "run-result.json");
    expect(existsSync(runResultFile)).toBe(true);

    const runResult = JSON.parse(readFileSync(runResultFile, "utf-8"));
    expect(runResult.firstRunSources).toEqual(["source-alpha", "source-beta", "source-gamma"]);
    expect(runResult.changedSources).toEqual([]);
    expect(runResult.errors).toEqual([]);
    expect(runResult.hasChanges).toBe(true);
  });

  it("current ディレクトリに取得コンテンツが書き出される", async () => {
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
          content: FAKE_CONTENTS[s.name],
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

    for (const source of TEST_SOURCES) {
      const currentFile = resolve(CURRENT_DIR, `${source.name}.md`);
      expect(existsSync(currentFile)).toBe(true);
      expect(readFileSync(currentFile, "utf-8")).toBe(FAKE_CONTENTS[source.name]);
    }
  });
});
