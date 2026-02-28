import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult } from "../services/slack-service.js";
import { notifySlack, type NotifyDeps } from "../scripts/notify.js";

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify");

function makeDeps(overrides: Partial<NotifyDeps> = {}): NotifyDeps {
  return {
    dataRoot: TEST_ROOT,
    snapshotsDir: resolve(TEST_ROOT, "snapshots"),
    diffsDir: resolve(TEST_ROOT, "diffs"),
    summariesDir: resolve(TEST_ROOT, "summaries"),
    currentDir: resolve(TEST_ROOT, "current"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    postSummary: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    postThreadReplies: vi.fn<() => Promise<PostResult[]>>().mockResolvedValue([{ success: true }]),
    saveSnapshot: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("notifySlack", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "snapshots"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, "diffs"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, "summaries"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, "current"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("要約の投稿", () => {
    it("要約ファイルを読み取り Slack に投稿する", async () => {
      writeFileSync(
        resolve(TEST_ROOT, "run-result.json"),
        JSON.stringify({
          changedSources: ["source-a"],
          firstRunSources: [],
          errors: [],
          hasChanges: true,
        }),
      );
      writeFileSync(resolve(TEST_ROOT, "summaries/source-a.md"), "要約テキスト");
      writeFileSync(resolve(TEST_ROOT, "diffs/source-a.md"), "+added line");
      writeFileSync(resolve(TEST_ROOT, "current/source-a.md"), "new-content-a");

      const deps = makeDeps();
      await notifySlack(deps);

      expect(deps.postSummary).toHaveBeenCalledWith(
        "C_TEST",
        "source-a",
        "要約テキスト",
        "xoxb-test",
      );
    });

    it("要約がない場合は diff テキストにフォールバックする", async () => {
      writeFileSync(
        resolve(TEST_ROOT, "run-result.json"),
        JSON.stringify({
          changedSources: ["source-a"],
          firstRunSources: [],
          errors: [],
          hasChanges: true,
        }),
      );
      // summaries/source-a.md は存在しない
      writeFileSync(resolve(TEST_ROOT, "diffs/source-a.md"), "+diff text");
      writeFileSync(resolve(TEST_ROOT, "current/source-a.md"), "new-content");

      const deps = makeDeps();
      await notifySlack(deps);

      expect(deps.postSummary).toHaveBeenCalledWith(
        "C_TEST",
        "source-a",
        "+diff text",
        "xoxb-test",
      );
    });
  });

  describe("スレッド返信", () => {
    it("投稿成功時に原文 diff をスレッド返信する", async () => {
      writeFileSync(
        resolve(TEST_ROOT, "run-result.json"),
        JSON.stringify({
          changedSources: ["source-a"],
          firstRunSources: [],
          errors: [],
          hasChanges: true,
        }),
      );
      writeFileSync(resolve(TEST_ROOT, "summaries/source-a.md"), "要約");
      writeFileSync(resolve(TEST_ROOT, "diffs/source-a.md"), "+diff content");
      writeFileSync(resolve(TEST_ROOT, "current/source-a.md"), "new");

      const deps = makeDeps();
      await notifySlack(deps);

      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "1234567890.123456",
        "+diff content",
        "xoxb-test",
      );
    });

    it("投稿失敗時はスレッド返信をスキップする", async () => {
      writeFileSync(
        resolve(TEST_ROOT, "run-result.json"),
        JSON.stringify({
          changedSources: ["source-a"],
          firstRunSources: [],
          errors: [],
          hasChanges: true,
        }),
      );
      writeFileSync(resolve(TEST_ROOT, "summaries/source-a.md"), "要約");
      writeFileSync(resolve(TEST_ROOT, "diffs/source-a.md"), "+diff");
      writeFileSync(resolve(TEST_ROOT, "current/source-a.md"), "new");

      const deps = makeDeps({
        postSummary: vi.fn().mockResolvedValue({ success: false, error: "channel_not_found" }),
      });
      await notifySlack(deps);

      expect(deps.postThreadReplies).not.toHaveBeenCalled();
    });
  });

  describe("スナップショット更新", () => {
    it("current の内容でスナップショットを更新する", async () => {
      writeFileSync(
        resolve(TEST_ROOT, "run-result.json"),
        JSON.stringify({
          changedSources: ["source-a"],
          firstRunSources: [],
          errors: [],
          hasChanges: true,
        }),
      );
      writeFileSync(resolve(TEST_ROOT, "summaries/source-a.md"), "要約");
      writeFileSync(resolve(TEST_ROOT, "diffs/source-a.md"), "+diff");
      writeFileSync(resolve(TEST_ROOT, "current/source-a.md"), "updated-content");

      const deps = makeDeps();
      await notifySlack(deps);

      expect(deps.saveSnapshot).toHaveBeenCalledWith(
        "source-a",
        "updated-content",
        deps.snapshotsDir,
      );
    });
  });

  describe("changedSources が空", () => {
    it("何も投稿せず正常終了する", async () => {
      writeFileSync(
        resolve(TEST_ROOT, "run-result.json"),
        JSON.stringify({
          changedSources: [],
          firstRunSources: [],
          errors: [],
          hasChanges: false,
        }),
      );

      const deps = makeDeps();
      await notifySlack(deps);

      expect(deps.postSummary).not.toHaveBeenCalled();
      expect(deps.postThreadReplies).not.toHaveBeenCalled();
      expect(deps.saveSnapshot).not.toHaveBeenCalled();
    });
  });
});
