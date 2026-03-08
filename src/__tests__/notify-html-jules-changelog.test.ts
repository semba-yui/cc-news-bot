import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import {
  notifyHtmlJulesChangelog,
  type NotifyHtmlJulesChangelogDeps,
} from "../scripts/notify-html-jules-changelog.js";

// What: Jules Changelog の Slack 通知スクリプトのテスト
// Why: Claude が生成した pre-built Block Kit JSON を読み込み、
//      記事ごとに親メッセージのみで Slack に直接投稿するフローが正しく動作することを保証する

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-jules-changelog");

const MOCK_BLOCKS: SlackBlock[] = [
  {
    type: "header",
    text: { type: "plain_text", text: "Jules Changelog: テストエントリ", emoji: true },
  },
  { type: "section", text: { type: "mrkdwn", text: "📅 2026-03-08" } },
  { type: "section", text: { type: "mrkdwn", text: "新機能が追加されました。" } },
];

interface SummaryEntry {
  dateSlug: string;
  title: string;
  date: string;
  fallbackText: string;
  blocks: SlackBlock[];
}

function makeDeps(
  overrides: Partial<NotifyHtmlJulesChangelogDeps> = {},
): NotifyHtmlJulesChangelogDeps {
  return {
    htmlSummariesDir: resolve(TEST_ROOT, "html-summaries"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "Jules Changelog", emoji: ":jules:" },
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
    // What: 1つの pre-built Block Kit エントリを Slack に投稿する
    // Why: Claude が生成した blocks と fallbackText がそのまま postBlocks に渡されることを検証する
    it("pre-built blocks を直接 Slack に投稿する", async () => {
      // Given: Block Kit JSON に1エントリが存在する
      writeSummaryFile([
        {
          dateSlug: "2026-03-08",
          title: "New features",
          date: "2026-03-08",
          fallbackText: "Jules Changelog: New features",
          blocks: MOCK_BLOCKS,
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlJulesChangelog(deps);

      // Then: postBlocks に pre-built blocks と fallbackText が直接渡される
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
    // What: 複数の Block Kit エントリを記事ごとに独立メッセージとして投稿する
    // Why: 各エントリが独立した親メッセージとして投稿されることを検証する
    it("各エントリごとに独立した親メッセージを投稿する", async () => {
      // Given: 2つのエントリが存在する
      writeSummaryFile([
        {
          dateSlug: "2026-03-08",
          title: "Entry 1",
          date: "2026-03-08",
          fallbackText: "Jules Changelog: Entry 1",
          blocks: MOCK_BLOCKS,
        },
        {
          dateSlug: "2026-03-05",
          title: "Entry 2",
          date: "2026-03-05",
          fallbackText: "Jules Changelog: Entry 2",
          blocks: MOCK_BLOCKS,
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlJulesChangelog(deps);

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
          fallbackText: "Jules Changelog: Entry 1",
          blocks: MOCK_BLOCKS,
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

  describe("Deps に buildBlocks がない", () => {
    // What: Jules Changelog の Deps インターフェースに buildBlocks メソッドが含まれないこと
    // Why: pre-built blocks パターンではビルダー関数が不要であることを型レベルで保証する
    it("NotifyHtmlJulesChangelogDeps に buildBlocks プロパティが存在しない", () => {
      // Given: Jules Changelog の Deps
      const deps = makeDeps();

      // Then: buildBlocks プロパティが存在しない
      expect("buildBlocks" in deps).toBe(false);
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
          fallbackText: "Jules Changelog: Entry 1",
          blocks: MOCK_BLOCKS,
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
