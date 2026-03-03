import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import { notifyHtmlCursor, type NotifyHtmlCursorDeps } from "../scripts/notify-html-cursor.js";

/**
 * What: Cursor の通知スクリプトのテスト
 * Why: Claude Code Action が生成した pre-built Block Kit JSON 配列を正しく読み取り、
 *      各バージョンを古い順に Slack に投稿できることを保証する
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-cursor");

const MOCK_BLOCKS: SlackBlock[] = [
  { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
  { type: "section", text: { type: "mrkdwn", text: "テストコンテンツ" } },
];

function makeDeps(overrides: Partial<NotifyHtmlCursorDeps> = {}): NotifyHtmlCursorDeps {
  return {
    htmlSummariesDir: resolve(TEST_ROOT, "html-summaries"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "Cursor Changelog", emoji: ":cursor:" },
    postBlocks: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    ...overrides,
  };
}

function writeSummariesFile(
  data: Array<{
    version: string;
    blocks: SlackBlock[];
    fallbackText: string;
  }>,
): void {
  writeFileSync(resolve(TEST_ROOT, "html-summaries", "cursor.json"), JSON.stringify(data, null, 2));
}

describe("notifyHtmlCursor", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "html-summaries"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("単一バージョンの投稿", () => {
    // What: 配列に1つのバージョンが含まれる場合の標準フロー
    // Why: 配列形式でも単一バージョンの投稿が正しく動作することを検証する
    it("Claude が生成した Block Kit JSON を読み取り Slack に投稿する", async () => {
      // Given: pre-built blocks を含む JSON 配列ファイルが存在する（1エントリ）
      writeSummariesFile([
        {
          version: "2.5",
          blocks: MOCK_BLOCKS,
          fallbackText: "Cursor 2.5 の更新",
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

      // Then: Slack に blocks がそのまま投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        MOCK_BLOCKS,
        "Cursor 2.5 の更新",
        "xoxb-test",
        { name: "Cursor Changelog", emoji: ":cursor:" },
      );
    });

    it("divider や image を含む blocks も正常に投稿できる", async () => {
      // What: 多様なブロックタイプを含む blocks を正しく転送できるか
      // Why: Claude が生成するブロックには header/section/divider/image が含まれる

      // Given: 多様なブロックタイプを含む JSON
      const richBlocks: SlackBlock[] = [
        { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: "メインコンテンツ" } },
        { type: "divider" },
        {
          type: "image",
          image_url: "https://example.com/img.png",
          alt_text: "Cursor 2.5",
        },
      ];

      writeSummariesFile([
        {
          version: "2.5",
          blocks: richBlocks,
          fallbackText: "Cursor 2.5 の更新",
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

      // Then: 全ブロックがそのまま投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        richBlocks,
        "Cursor 2.5 の更新",
        "xoxb-test",
        expect.any(Object),
      );
    });

    it("複数チャンネルに投稿する", async () => {
      // Given: 複数チャンネルが設定されている
      writeSummariesFile([
        {
          version: "2.5",
          blocks: MOCK_BLOCKS,
          fallbackText: "Cursor 2.5 の更新",
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_TEST_1", "C_TEST_2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

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
      const blocks24: SlackBlock[] = [
        { type: "header", text: { type: "plain_text", text: "Cursor 2.4 の更新", emoji: true } },
      ];
      const blocks25: SlackBlock[] = [
        { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
      ];

      writeSummariesFile([
        { version: "2.4", blocks: blocks24, fallbackText: "Cursor 2.4 の更新" },
        { version: "2.5", blocks: blocks25, fallbackText: "Cursor 2.5 の更新" },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

      // Then: postBlocks が2回呼ばれる（古い順）
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);
      expect(deps.postBlocks).toHaveBeenNthCalledWith(
        1,
        "C_TEST",
        blocks24,
        "Cursor 2.4 の更新",
        "xoxb-test",
        { name: "Cursor Changelog", emoji: ":cursor:" },
      );
      expect(deps.postBlocks).toHaveBeenNthCalledWith(
        2,
        "C_TEST",
        blocks25,
        "Cursor 2.5 の更新",
        "xoxb-test",
        { name: "Cursor Changelog", emoji: ":cursor:" },
      );
    });

    it("複数バージョン × 複数チャンネルに投稿する", async () => {
      // Given: 2バージョン × 2チャンネル
      writeSummariesFile([
        { version: "2.4", blocks: MOCK_BLOCKS, fallbackText: "Cursor 2.4 の更新" },
        { version: "2.5", blocks: MOCK_BLOCKS, fallbackText: "Cursor 2.5 の更新" },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_TEST_1", "C_TEST_2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

      // Then: 2バージョン × 2チャンネル = 4回投稿
      expect(deps.postBlocks).toHaveBeenCalledTimes(4);
    });
  });

  describe("botProfile なし", () => {
    it("botProfile が未設定の場合でも正常に投稿できる", async () => {
      // Given: botProfile が未設定
      writeSummariesFile([
        {
          version: "2.5",
          blocks: MOCK_BLOCKS,
          fallbackText: "Cursor 2.5 の更新",
        },
      ]);

      const deps = makeDeps({ botProfile: undefined });

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

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
