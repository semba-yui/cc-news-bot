import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import {
  notifyHtmlAntigravity,
  type NotifyHtmlAntigravityDeps,
} from "../scripts/notify-html-antigravity.js";

/**
 * What: Antigravity の通知スクリプトのテスト
 * Why: 翻訳済みコンテンツの JSON 配列ファイルを正しく読み取り、
 *      各バージョンの Improvements・Fixes・Patches の構成を維持した Block Kit メッセージとして
 *      Slack に古い順で投稿できることを保証する
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-antigravity");

const MOCK_BLOCKS: SlackBlock[] = [
  {
    type: "header",
    text: { type: "plain_text", text: "Antigravity 1.19.6 の更新", emoji: true },
  },
  { type: "section", text: { type: "mrkdwn", text: "*Improvements*\n• 改善項目1" } },
];

function makeDeps(overrides: Partial<NotifyHtmlAntigravityDeps> = {}): NotifyHtmlAntigravityDeps {
  return {
    htmlSummariesDir: resolve(TEST_ROOT, "html-summaries"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "Antigravity Changelog", emoji: ":antigravity:" },
    buildBlocks: vi.fn().mockReturnValue(MOCK_BLOCKS),
    postBlocks: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    ...overrides,
  };
}

function writeSummaryFile(
  data: Array<{
    version: string;
    improvementsJa: string[];
    fixesJa: string[];
    patchesJa: string[];
  }>,
): void {
  writeFileSync(
    resolve(TEST_ROOT, "html-summaries", "antigravity.json"),
    JSON.stringify(data, null, 2),
  );
}

describe("notifyHtmlAntigravity", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "html-summaries"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("単一バージョンの投稿", () => {
    // What: 配列に1つのバージョンが含まれる場合の標準フロー
    // Why: 配列形式でも単一バージョンの投稿が正しく動作することを検証する
    it("翻訳済みコンテンツを読み取り、Block Kit メッセージを Slack に投稿する", async () => {
      // Given: 翻訳済みコンテンツの JSON 配列ファイルが存在する（1エントリ）
      writeSummaryFile([
        {
          version: "1.19.6",
          improvementsJa: ["改善項目1", "改善項目2"],
          fixesJa: ["修正項目1"],
          patchesJa: ["パッチ項目1"],
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlAntigravity(deps);

      // Then: buildBlocks に AntigravityTranslatedContent 形式のコンテンツが渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        version: "1.19.6",
        improvementsJa: ["改善項目1", "改善項目2"],
        fixesJa: ["修正項目1"],
        patchesJa: ["パッチ項目1"],
      });

      // Then: Slack にブロックが投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        MOCK_BLOCKS,
        "Antigravity 1.19.6 の更新",
        "xoxb-test",
        { name: "Antigravity Changelog", emoji: ":antigravity:" },
      );
    });

    it("空カテゴリがあっても正常に投稿できる", async () => {
      // Given: 一部カテゴリが空の翻訳済みコンテンツ
      writeSummaryFile([
        {
          version: "1.19.5",
          improvementsJa: ["改善項目1"],
          fixesJa: [],
          patchesJa: [],
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlAntigravity(deps);

      // Then: buildBlocks に空配列を含むコンテンツが渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        version: "1.19.5",
        improvementsJa: ["改善項目1"],
        fixesJa: [],
        patchesJa: [],
      });

      // Then: Slack に投稿される
      expect(deps.postBlocks).toHaveBeenCalledTimes(1);
    });

    it("複数チャンネルに投稿する", async () => {
      // Given: 複数チャンネルが設定されている
      writeSummaryFile([
        {
          version: "1.19.6",
          improvementsJa: ["改善項目1"],
          fixesJa: [],
          patchesJa: [],
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_TEST_1", "C_TEST_2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlAntigravity(deps);

      // Then: 各チャンネルに投稿される
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST_1",
        expect.any(Array),
        expect.any(String),
        "xoxb-test",
        expect.any(Object),
      );
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST_2",
        expect.any(Array),
        expect.any(String),
        "xoxb-test",
        expect.any(Object),
      );
    });
  });

  describe("複数バージョンの投稿", () => {
    // What: 配列に複数バージョンが含まれる場合のフロー
    // Why: 複数バージョンが古い順（配列順）で各チャンネルに投稿されることを検証する
    it("複数バージョンを配列順に Slack に投稿する", async () => {
      // Given: 2つのバージョンを含む配列（古い順）
      writeSummaryFile([
        {
          version: "1.19.5",
          improvementsJa: ["改善A"],
          fixesJa: [],
          patchesJa: [],
        },
        {
          version: "1.19.6",
          improvementsJa: ["改善B"],
          fixesJa: ["修正B"],
          patchesJa: [],
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlAntigravity(deps);

      // Then: buildBlocks が2回呼ばれる（各バージョン1回ずつ）
      expect(deps.buildBlocks).toHaveBeenCalledTimes(2);
      expect(deps.buildBlocks).toHaveBeenNthCalledWith(1, {
        version: "1.19.5",
        improvementsJa: ["改善A"],
        fixesJa: [],
        patchesJa: [],
      });
      expect(deps.buildBlocks).toHaveBeenNthCalledWith(2, {
        version: "1.19.6",
        improvementsJa: ["改善B"],
        fixesJa: ["修正B"],
        patchesJa: [],
      });

      // Then: postBlocks が2回呼ばれる（古い順）
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);
      expect(deps.postBlocks).toHaveBeenNthCalledWith(
        1,
        "C_TEST",
        MOCK_BLOCKS,
        "Antigravity 1.19.5 の更新",
        "xoxb-test",
        { name: "Antigravity Changelog", emoji: ":antigravity:" },
      );
      expect(deps.postBlocks).toHaveBeenNthCalledWith(
        2,
        "C_TEST",
        MOCK_BLOCKS,
        "Antigravity 1.19.6 の更新",
        "xoxb-test",
        { name: "Antigravity Changelog", emoji: ":antigravity:" },
      );
    });

    it("複数バージョン × 複数チャンネルに投稿する", async () => {
      // Given: 2バージョン × 2チャンネル
      writeSummaryFile([
        {
          version: "1.19.5",
          improvementsJa: ["改善A"],
          fixesJa: [],
          patchesJa: [],
        },
        {
          version: "1.19.6",
          improvementsJa: ["改善B"],
          fixesJa: [],
          patchesJa: [],
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_TEST_1", "C_TEST_2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlAntigravity(deps);

      // Then: 2バージョン × 2チャンネル = 4回投稿
      expect(deps.postBlocks).toHaveBeenCalledTimes(4);
    });
  });

  describe("botProfile なし", () => {
    it("botProfile が未設定の場合でも正常に投稿できる", async () => {
      // Given: botProfile が未設定
      writeSummaryFile([
        {
          version: "1.19.6",
          improvementsJa: ["改善項目1"],
          fixesJa: [],
          patchesJa: [],
        },
      ]);

      const deps = makeDeps({ botProfile: undefined });

      // When: 通知スクリプトを実行する
      await notifyHtmlAntigravity(deps);

      // Then: botProfile undefined で投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        expect.any(Array),
        expect.any(String),
        "xoxb-test",
        undefined,
      );
    });
  });
});
