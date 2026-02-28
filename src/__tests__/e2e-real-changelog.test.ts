import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import { detectChanges, writeDiff } from "../services/diff-service.js";
import { fetchAll } from "../services/fetch-service.js";
import type { PostResult } from "../services/slack-service.js";
import { loadSnapshot, loadState, saveSnapshot, saveState } from "../services/state-service.js";
import type { SnapshotState } from "../services/state-service.js";
import { fetchAndDiff } from "../scripts/fetch-and-diff.js";

/**
 * E2E スモークテスト: 実データによるフルパイプライン検証
 *
 * 実行方法: RUN_REAL_E2E=1 npx vitest run src/__tests__/e2e-real-changelog.test.ts
 * GitHub Token: GITHUB_TOKEN 環境変数を設定するとレート制限が緩和される
 */

const SKIP = !process.env.RUN_REAL_E2E;

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-e2e");
const SNAPSHOTS_DIR = resolve(TEST_ROOT, "snapshots");
const DIFFS_DIR = resolve(TEST_ROOT, "diffs");
const CURRENT_DIR = resolve(TEST_ROOT, "current");

// copilot-cli は別テストで検証（存在しない可能性があるため）
const REAL_SOURCES: SourceConfig[] = [
  {
    name: "claude-code",
    type: "raw_markdown",
    url: "https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md",
  },
  {
    name: "codex",
    type: "github_releases",
    url: "https://api.github.com/repos/openai/codex/releases",
    owner: "openai",
    repo: "codex",
  },
];

function makeFetchAndDiffDeps(overrides: Record<string, unknown> = {}) {
  return {
    sources: REAL_SOURCES,
    dataRoot: TEST_ROOT,
    snapshotsDir: SNAPSHOTS_DIR,
    diffsDir: DIFFS_DIR,
    currentDir: CURRENT_DIR,
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-fake",
    fetchAll: (sources: SourceConfig[]) =>
      fetchAll(sources, { githubToken: process.env.GITHUB_TOKEN }),
    loadSnapshot,
    saveSnapshot,
    detectChanges,
    writeDiff,
    loadState,
    saveState,
    postError: vi.fn<() => Promise<PostResult>>().mockResolvedValue({ success: true }),
    ...overrides,
  };
}

describe.skipIf(SKIP)("E2E: 実データによる fetchAndDiff パイプライン", () => {
  beforeEach(() => {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    mkdirSync(DIFFS_DIR, { recursive: true });
    mkdirSync(CURRENT_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it("初回実行: 実 changelog を fetch しスナップショットを保存する", async () => {
    const deps = makeFetchAndDiffDeps();
    const result = await fetchAndDiff(deps);

    const successCount = result.firstRunSources.length;
    const errorCount = result.errors.length;

    // 全ソースが処理される（成功 or エラー）
    expect(successCount + errorCount).toBe(REAL_SOURCES.length);
    // 少なくとも 1 つは成功する
    expect(successCount).toBeGreaterThanOrEqual(1);

    // 成功したソースのスナップショットが保存されている
    for (const source of result.firstRunSources) {
      const snapshotFile = resolve(SNAPSHOTS_DIR, `${source}.md`);
      expect(existsSync(snapshotFile)).toBe(true);
      const content = readFileSync(snapshotFile, "utf-8");
      expect(content.length).toBeGreaterThan(0);
    }

    // state.json が生成されている
    expect(existsSync(resolve(TEST_ROOT, "state.json"))).toBe(true);
    const state = JSON.parse(
      readFileSync(resolve(TEST_ROOT, "state.json"), "utf-8"),
    ) as SnapshotState;
    expect(state.lastRunAt).toBeTruthy();

    // 成功したソースの state エントリがある
    for (const source of result.firstRunSources) {
      expect(state.sources[source]).toBeDefined();
      expect(state.sources[source].hash).toMatch(/^[a-f0-9]{64}$/);
    }

    // run-result.json が生成されている
    expect(existsSync(resolve(TEST_ROOT, "run-result.json"))).toBe(true);

    // postError は成功ソースに対しては呼ばれない
    const postErrorCalls = (deps.postError as ReturnType<typeof vi.fn>).mock.calls;
    const errorSources = postErrorCalls.map((c) => c[1] as string);
    for (const source of result.firstRunSources) {
      expect(errorSources).not.toContain(source);
    }
  }, 30_000);

  it("2 回目実行（同一データ）: 差分が検出されない", async () => {
    // 1 回目: スナップショット保存
    const deps1 = makeFetchAndDiffDeps();
    const result1 = await fetchAndDiff(deps1);
    expect(result1.firstRunSources.length).toBeGreaterThanOrEqual(1);

    // 2 回目: 同じデータで再実行
    const deps2 = makeFetchAndDiffDeps();
    const result2 = await fetchAndDiff(deps2);

    // 初回ソースは空（スナップショットが既に存在）
    expect(result2.firstRunSources).toEqual([]);
    // 差分も検出されない（秒単位で changelog は変わらない）
    expect(result2.changedSources).toEqual([]);
    expect(result2.hasChanges).toBe(false);

    // diff ファイルが生成されていない
    for (const source of REAL_SOURCES) {
      expect(existsSync(resolve(DIFFS_DIR, `${source.name}.md`))).toBe(false);
    }
  }, 60_000);

  it("2 回目実行（スナップショット改変）: 差分が検出される", async () => {
    // 1 回目: スナップショット保存
    const deps1 = makeFetchAndDiffDeps();
    const result1 = await fetchAndDiff(deps1);

    // claude-code が成功した場合のみ検証
    if (!result1.firstRunSources.includes("claude-code")) {
      console.warn("claude-code の取得に失敗したためスキップ");
      return;
    }

    // スナップショットを手動で改変
    const snapshotPath = resolve(SNAPSHOTS_DIR, "claude-code.md");
    const original = readFileSync(snapshotPath, "utf-8");
    writeFileSync(snapshotPath, original + "\n<!-- test modification -->");

    // 2 回目: 改変されたスナップショットと比較
    const deps2 = makeFetchAndDiffDeps();
    const result2 = await fetchAndDiff(deps2);

    expect(result2.changedSources).toContain("claude-code");
    expect(result2.hasChanges).toBe(true);

    // diff ファイルが生成されている
    const diffFile = resolve(DIFFS_DIR, "claude-code.md");
    expect(existsSync(diffFile)).toBe(true);
    const diffText = readFileSync(diffFile, "utf-8");
    expect(diffText.length).toBeGreaterThan(0);
  }, 30_000);

  it("到達不能ソースが混在しても正常ソースは処理される", async () => {
    const sourcesWithBad: SourceConfig[] = [
      ...REAL_SOURCES,
      {
        name: "nonexistent",
        type: "raw_markdown",
        url: "https://raw.githubusercontent.com/nonexistent-org-12345/nonexistent-repo/main/CHANGELOG.md",
      },
    ];

    const deps = makeFetchAndDiffDeps({ sources: sourcesWithBad });
    const result = await fetchAndDiff(deps);

    // nonexistent はエラーになる
    expect(result.errors.some((e) => e.source === "nonexistent")).toBe(true);

    // 正常ソースは処理されている
    const allProcessed = [...result.firstRunSources, ...result.errors.map((e) => e.source)];
    expect(allProcessed.length).toBe(sourcesWithBad.length);

    // 少なくとも 1 つの正常ソースが成功
    expect(result.firstRunSources.length).toBeGreaterThanOrEqual(1);

    // postError が nonexistent に対して呼ばれている
    expect(deps.postError).toHaveBeenCalledWith(
      "C_TEST",
      "nonexistent",
      expect.any(String),
      "xoxb-fake",
    );
  }, 30_000);

  it("copilot-cli: 成功/404 いずれでもクラッシュしない", async () => {
    const copilotSource: SourceConfig[] = [
      {
        name: "copilot-cli",
        type: "raw_markdown",
        url: "https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md",
      },
    ];

    const deps = makeFetchAndDiffDeps({ sources: copilotSource });
    const result = await fetchAndDiff(deps);

    // 成功 or エラーのいずれかに分類される
    const processed = result.firstRunSources.length + result.errors.length;
    expect(processed).toBe(1);

    if (result.firstRunSources.includes("copilot-cli")) {
      // 成功: スナップショットが保存されている
      expect(existsSync(resolve(SNAPSHOTS_DIR, "copilot-cli.md"))).toBe(true);
    } else {
      // エラー: エラー情報が記述的である
      const err = result.errors.find((e) => e.source === "copilot-cli");
      expect(err).toBeDefined();
      expect(err!.error.length).toBeGreaterThan(0);
    }
  }, 30_000);
});
