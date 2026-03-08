import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import {
  notifyHtmlJulesChangelog,
  type NotifyHtmlJulesChangelogDeps,
} from "../scripts/notify-html-jules-changelog.js";

// What: Jules Changelog の Slack 通知スクリプトのテスト
// Why: 翻訳済み JSON を読み込み、記事ごとに親メッセージのみで通知を完結するフローが
//      正しく動作することを保証する（スレッド返信なし、fullTextJa を親メッセージに含める）

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-jules-changelog");

const MOCK_BLOCKS: SlackBlock[] = [
  {
    type: "header",
    text: { type: "plain_text", text: "Jules Changelog: テストエントリ", emoji: true },
  },
  { type: "section", text: { type: "mrkdwn", text: "📅 2026-03-08" } },
  { type: "section", text: { type: "mrkdwn", text: "翻訳済み本文" } },
];

interface SummaryEntry {
  dateSlug: string;
  title: string;
  date: string;
  fullTextJa: string;
}

function makeDeps(
  overrides: Partial<NotifyHtmlJulesChangelogDeps> = {},
): NotifyHtmlJulesChangelogDeps {
  return {
    htmlSummariesDir: resolve(TEST_ROOT, "html-summaries"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "Jules Changelog", emoji: ":jules:" },
    buildBlocks: vi.fn().mockReturnValue(MOCK_BLOCKS),
    postBlocks: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    ...overrides,
  };
}

function writeSummaryFile(data: SummaryEntry[]): void {
  writeFileSync(
    resolve(TEST_ROOT, "html-summaries", "jules-changelog.json"),
    JSON.stringify(data, null, 2),
  );
}

describe("notifyHtmlJulesChangelog", () => {
  beforeEach(() => {
    mkdirSync(resolve(TEST_ROOT, "html-summaries"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  describe("単一エントリの投稿", () => {
    // What: 1つの翻訳済みエントリを Slack に親メッセージのみで投稿する
    // Why: Jules Changelog は記事が短いため要約不要、fullTextJa を親メッセージに含めて
    //      スレッド返信なしで通知が完結することを検証する
    it("親メッセージのみで通知を完結する（スレッド返信なし）", async () => {
      // Given: 翻訳済み JSON に1エントリが存在する
      writeSummaryFile([
        {
          dateSlug: "2026-03-08",
          title: "New features",
          date: "2026-03-08",
          fullTextJa: "新機能が追加されました。",
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlJulesChangelog(deps);

      // Then: buildBlocks に正しいエントリデータが渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        dateSlug: "2026-03-08",
        title: "New features",
        date: "2026-03-08",
        fullTextJa: "新機能が追加されました。",
      });

      // Then: 親メッセージが Slack に投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        MOCK_BLOCKS,
        "Jules Changelog: New features",
        "xoxb-test",
        { name: "Jules Changelog", emoji: ":jules:" },
      );
    });
  });

  describe("複数エントリの投稿", () => {
    // What: 複数の翻訳済みエントリを記事ごとに独立メッセージとして投稿する
    // Why: 各エントリが独立した親メッセージとして投稿されることを検証する
    it("各エントリごとに独立した親メッセージを投稿する", async () => {
      // Given: 2つのエントリが存在する
      writeSummaryFile([
        {
          dateSlug: "2026-03-08",
          title: "Entry 1",
          date: "2026-03-08",
          fullTextJa: "本文1",
        },
        {
          dateSlug: "2026-03-05",
          title: "Entry 2",
          date: "2026-03-05",
          fullTextJa: "本文2",
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlJulesChangelog(deps);

      // Then: buildBlocks が2回呼ばれる
      expect(deps.buildBlocks).toHaveBeenCalledTimes(2);

      // Then: postBlocks が2回呼ばれる（各エントリ1回ずつ）
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);
    });
  });

  describe("複数チャンネルへの投稿", () => {
    // What: 複数の Slack チャンネルにエントリを投稿する
    // Why: 全ての設定チャンネルに通知が配信されることを検証する
    it("全チャンネルに親メッセージを投稿する", async () => {
      // Given: 2つのチャンネルが設定されている
      writeSummaryFile([
        {
          dateSlug: "2026-03-08",
          title: "Entry 1",
          date: "2026-03-08",
          fullTextJa: "本文",
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_CH1", "C_CH2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlJulesChangelog(deps);

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

  describe("Deps に postThreadReplies がない", () => {
    // What: Jules Changelog の Deps インターフェースにスレッド返信メソッドが含まれないこと
    // Why: 設計上スレッド返信なしであることを型レベルで保証する
    it("NotifyHtmlJulesChangelogDeps に postThreadReplies プロパティが存在しない", () => {
      // Given: Jules Changelog の Deps
      const deps = makeDeps();

      // Then: postThreadReplies プロパティが存在しない
      expect("postThreadReplies" in deps).toBe(false);
    });
  });

  describe("botProfile なし", () => {
    // What: botProfile が未設定の場合の動作
    // Why: botProfile はオプショナルであり、未設定でも正常に動作することを検証する
    it("botProfile が未設定でも正常に投稿できる", async () => {
      // Given: botProfile が未設定
      writeSummaryFile([
        {
          dateSlug: "2026-03-08",
          title: "Entry 1",
          date: "2026-03-08",
          fullTextJa: "本文",
        },
      ]);

      const deps = makeDeps({ botProfile: undefined });

      // When: 通知スクリプトを実行する
      await notifyHtmlJulesChangelog(deps);

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
