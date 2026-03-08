import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import {
  notifyHtmlOpenAINews,
  type NotifyHtmlOpenAINewsDeps,
} from "../scripts/notify-html-openai-news.js";

// What: OpenAI News の Slack 通知スクリプトのテスト
// Why: 翻訳・要約済み JSON を読み込み、記事ごとに親メッセージ（要約）+
//      スレッド返信（全文）を Slack に投稿するフローが正しく動作することを保証する

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-openai-news");

const MOCK_BLOCKS: SlackBlock[] = [
  { type: "header", text: { type: "plain_text", text: "OpenAI News: テスト記事", emoji: true } },
  { type: "section", text: { type: "mrkdwn", text: "📅 2026-03-08" } },
  { type: "section", text: { type: "mrkdwn", text: "テスト要約" } },
];

interface SummaryEntry {
  slug: string;
  title: string;
  date: string;
  summaryJa: string;
  fullTextJa: string;
}

function makeDeps(overrides: Partial<NotifyHtmlOpenAINewsDeps> = {}): NotifyHtmlOpenAINewsDeps {
  return {
    htmlSummariesDir: resolve(TEST_ROOT, "html-summaries"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "OpenAI News", emoji: ":openai:" },
    buildBlocks: vi.fn().mockReturnValue(MOCK_BLOCKS),
    postBlocks: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    postThreadReplies: vi.fn<() => Promise<PostResult[]>>().mockResolvedValue([{ success: true }]),
    ...overrides,
  };
}

function writeSummaryFile(data: SummaryEntry[]): void {
  writeFileSync(
    resolve(TEST_ROOT, "html-summaries", "openai-news.json"),
    JSON.stringify(data, null, 2),
  );
}

describe("notifyHtmlOpenAINews", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "html-summaries"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("単一記事の投稿", () => {
    // What: 1つの翻訳済み記事を Slack に投稿する標準フロー
    // Why: 親メッセージに要約、スレッド返信に全文が正しく投稿されることを検証する
    it("親メッセージに要約を Block Kit で投稿し、スレッド返信に全文を投稿する", async () => {
      // Given: 翻訳・要約済み JSON に1記事が存在する
      writeSummaryFile([
        {
          slug: "new-model",
          title: "新しいモデル",
          date: "2026-03-08",
          summaryJa: "テスト要約テキスト",
          fullTextJa: "全文テキスト...",
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlOpenAINews(deps);

      // Then: buildBlocks に正しい記事データが渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        slug: "new-model",
        title: "新しいモデル",
        date: "2026-03-08",
        summaryJa: "テスト要約テキスト",
        fullTextJa: "全文テキスト...",
      });

      // Then: 親メッセージが Slack に投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        MOCK_BLOCKS,
        "OpenAI News: 新しいモデル",
        "xoxb-test",
        { name: "OpenAI News", emoji: ":openai:" },
      );

      // Then: スレッド返信に全文が投稿される
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "1234567890.123456",
        "全文テキスト...",
        "xoxb-test",
        { botProfile: { name: "OpenAI News", emoji: ":openai:" } },
      );
    });
  });

  describe("複数記事の投稿", () => {
    // What: 複数の翻訳済み記事を記事ごとに独立メッセージとして投稿する
    // Why: 各記事が独立した親メッセージ + スレッド返信ペアとして投稿されることを検証する
    it("各記事ごとに独立した親メッセージ + スレッド返信を投稿する", async () => {
      // Given: 2つの記事が存在する
      writeSummaryFile([
        {
          slug: "article-1",
          title: "記事1",
          date: "2026-03-07",
          summaryJa: "要約1",
          fullTextJa: "全文1",
        },
        {
          slug: "article-2",
          title: "記事2",
          date: "2026-03-08",
          summaryJa: "要約2",
          fullTextJa: "全文2",
        },
      ]);

      let callCount = 0;
      const deps = makeDeps({
        postBlocks: vi.fn<() => Promise<PostResult>>().mockImplementation(() => {
          callCount++;
          return Promise.resolve({ success: true, ts: `ts-${callCount}` });
        }),
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlOpenAINews(deps);

      // Then: buildBlocks が2回呼ばれる
      expect(deps.buildBlocks).toHaveBeenCalledTimes(2);

      // Then: postBlocks が2回呼ばれる（各記事1回ずつ）
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);

      // Then: postThreadReplies が2回呼ばれる（各記事の全文）
      expect(deps.postThreadReplies).toHaveBeenCalledTimes(2);
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "ts-1",
        "全文1",
        "xoxb-test",
        expect.any(Object),
      );
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "ts-2",
        "全文2",
        "xoxb-test",
        expect.any(Object),
      );
    });
  });

  describe("複数チャンネルへの投稿", () => {
    // What: 複数の Slack チャンネルに記事を投稿する
    // Why: 全ての設定チャンネルに通知が配信されることを検証する
    it("全チャンネルに親メッセージ + スレッド返信を投稿する", async () => {
      // Given: 2つのチャンネルが設定されている
      writeSummaryFile([
        {
          slug: "article-1",
          title: "記事1",
          date: "2026-03-08",
          summaryJa: "要約",
          fullTextJa: "全文",
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_CH1", "C_CH2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlOpenAINews(deps);

      // Then: 各チャンネルに投稿される
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_CH1",
        expect.any(Array),
        expect.any(String),
        "xoxb-test",
        expect.any(Object),
      );
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_CH2",
        expect.any(Array),
        expect.any(String),
        "xoxb-test",
        expect.any(Object),
      );
    });
  });

  describe("親メッセージ投稿失敗時", () => {
    // What: 親メッセージの投稿が失敗した場合のスレッド返信の動作
    // Why: 親メッセージ失敗時にスレッド返信をスキップし、エラーが伝播しないことを検証する
    it("スレッド返信をスキップする", async () => {
      // Given: postBlocks が失敗する
      writeSummaryFile([
        {
          slug: "article-1",
          title: "記事1",
          date: "2026-03-08",
          summaryJa: "要約",
          fullTextJa: "全文",
        },
      ]);

      const deps = makeDeps({
        postBlocks: vi.fn().mockResolvedValue({ success: false, error: "channel_not_found" }),
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlOpenAINews(deps);

      // Then: スレッド返信は投稿されない
      expect(deps.postThreadReplies).not.toHaveBeenCalled();
    });
  });

  describe("スレッド返信の3000文字自動分割", () => {
    // What: fullTextJa が長文の場合、postThreadReplies が分割を担当すること
    // Why: Slack の3000文字制限を postThreadReplies（slack-service）が自動分割するため、
    //      notify スクリプトは fullTextJa をそのまま渡すだけでよいことを検証する
    it("fullTextJa をそのまま postThreadReplies に渡す", async () => {
      // Given: 長い fullTextJa を持つ記事
      const longText = "あ".repeat(5000);
      writeSummaryFile([
        {
          slug: "long-article",
          title: "長い記事",
          date: "2026-03-08",
          summaryJa: "要約",
          fullTextJa: longText,
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlOpenAINews(deps);

      // Then: fullTextJa がそのまま postThreadReplies に渡される（分割は slack-service が担当）
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "1234567890.123456",
        longText,
        "xoxb-test",
        expect.any(Object),
      );
    });
  });

  describe("botProfile なし", () => {
    // What: botProfile が未設定の場合の動作
    // Why: botProfile はオプショナルであり、未設定でも正常に動作することを検証する
    it("botProfile が未設定でも正常に投稿できる", async () => {
      // Given: botProfile が未設定
      writeSummaryFile([
        {
          slug: "article-1",
          title: "記事1",
          date: "2026-03-08",
          summaryJa: "要約",
          fullTextJa: "全文",
        },
      ]);

      const deps = makeDeps({ botProfile: undefined });

      // When: 通知スクリプトを実行する
      await notifyHtmlOpenAINews(deps);

      // Then: botProfile undefined で投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        expect.any(Array),
        expect.any(String),
        "xoxb-test",
        undefined,
      );

      // Then: スレッド返信にも botProfile undefined が渡される
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        expect.any(String),
        expect.any(String),
        "xoxb-test",
        { botProfile: undefined },
      );
    });
  });
});
