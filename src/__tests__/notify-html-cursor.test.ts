import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import { notifyHtmlCursor, type NotifyHtmlCursorDeps } from "../scripts/notify-html-cursor.js";

/**
 * What: Cursor の通知スクリプトのテスト
 * Why: 取得済みコンテンツ（翻訳不要）の JSON ファイルを正しく読み取り、
 *      画像・動画を含む Block Kit メッセージとして Slack に単一スレッドで投稿できることを保証する
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-cursor");

const MOCK_BLOCKS: SlackBlock[] = [
  { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
  { type: "section", text: { type: "mrkdwn", text: "テストコンテンツ" } },
];

function makeDeps(overrides: Partial<NotifyHtmlCursorDeps> = {}): NotifyHtmlCursorDeps {
  return {
    htmlCurrentDir: resolve(TEST_ROOT, "html-current"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "Cursor Changelog", emoji: ":cursor:" },
    buildBlocks: vi.fn().mockReturnValue(MOCK_BLOCKS),
    postBlocks: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    ...overrides,
  };
}

function writeCurrentFile(data: {
  version: string;
  contentJa: string;
  imageUrls: string[];
  videos: Array<{
    playbackId: string;
    thumbnailUrl: string;
    hlsUrl: string;
  }>;
  fetchedAt: string;
}): void {
  writeFileSync(resolve(TEST_ROOT, "html-current", "cursor.json"), JSON.stringify(data, null, 2));
}

describe("notifyHtmlCursor", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "html-current"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("単一スレッドへの投稿", () => {
    it("取得済みコンテンツを読み取り、Block Kit メッセージを Slack に投稿する", async () => {
      // Given: 取得済みコンテンツの JSON ファイルが存在する（画像・動画あり）
      writeCurrentFile({
        version: "2.5",
        contentJa: "テストコンテンツ",
        imageUrls: ["https://example.com/img.png"],
        videos: [
          {
            playbackId: "abc123",
            thumbnailUrl: "https://image.mux.com/abc123/thumbnail.png",
            hlsUrl: "https://stream.mux.com/abc123.m3u8",
          },
        ],
        fetchedAt: "2026-03-02T06:00:00.000Z",
      });

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

      // Then: buildBlocks に CursorVersionContent 形式のコンテンツが渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        version: "2.5",
        contentJa: "テストコンテンツ",
        imageUrls: ["https://example.com/img.png"],
        videos: [
          {
            playbackId: "abc123",
            thumbnailUrl: "https://image.mux.com/abc123/thumbnail.png",
            hlsUrl: "https://stream.mux.com/abc123.m3u8",
          },
        ],
      });

      // Then: Slack にブロックが投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        MOCK_BLOCKS,
        "Cursor 2.5 の更新",
        "xoxb-test",
        { name: "Cursor Changelog", emoji: ":cursor:" },
      );
    });

    it("画像・動画なしのコンテンツでも正常に投稿できる", async () => {
      // Given: 画像・動画が空のコンテンツ
      writeCurrentFile({
        version: "2.4",
        contentJa: "テキストのみの更新",
        imageUrls: [],
        videos: [],
        fetchedAt: "2026-03-01T06:00:00.000Z",
      });

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlCursor(deps);

      // Then: buildBlocks に空配列の imageUrls と videos が渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        version: "2.4",
        contentJa: "テキストのみの更新",
        imageUrls: [],
        videos: [],
      });

      // Then: Slack に投稿される
      expect(deps.postBlocks).toHaveBeenCalledTimes(1);
    });

    it("複数チャンネルに投稿する", async () => {
      // Given: 複数チャンネルが設定されている
      writeCurrentFile({
        version: "2.5",
        contentJa: "テストコンテンツ",
        imageUrls: [],
        videos: [],
        fetchedAt: "2026-03-02T06:00:00.000Z",
      });

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

  describe("botProfile なし", () => {
    it("botProfile が未設定の場合でも正常に投稿できる", async () => {
      // Given: botProfile が未設定
      writeCurrentFile({
        version: "2.5",
        contentJa: "テストコンテンツ",
        imageUrls: [],
        videos: [],
        fetchedAt: "2026-03-02T06:00:00.000Z",
      });

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
