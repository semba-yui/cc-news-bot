import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubReleaseEntry } from "../services/fetch-service.js";
import type { PostResult, SlackBlock } from "../services/slack-service.js";
import {
  notifyHtmlGeminiCli,
  type NotifyHtmlGeminiCliDeps,
} from "../scripts/notify-html-gemini-cli.js";

/**
 * What: Gemini CLI の通知スクリプトのテスト
 * Why: 翻訳済みコンテンツの JSON 配列ファイルを正しく読み取り、
 *      各バージョンを古い順に Slack Block Kit メッセージとして親スレッド・返信スレッドに
 *      投稿できることを保証する
 */

const TEST_ROOT = resolve(import.meta.dirname, "../../data-test-notify-gemini-cli");

const MOCK_BLOCKS: SlackBlock[] = [
  { type: "header", text: { type: "plain_text", text: "Gemini CLI v0.31.0 の更新", emoji: true } },
  { type: "section", text: { type: "mrkdwn", text: "テスト要約" } },
];

function makeDeps(overrides: Partial<NotifyHtmlGeminiCliDeps> = {}): NotifyHtmlGeminiCliDeps {
  return {
    htmlSummariesDir: resolve(TEST_ROOT, "html-summaries"),
    htmlCurrentDir: resolve(TEST_ROOT, "html-current"),
    getChannels: () => ["C_TEST"],
    slackToken: "xoxb-test",
    botProfile: { name: "Gemini CLI Changelog", emoji: ":gemini:" },
    buildBlocks: vi.fn().mockReturnValue(MOCK_BLOCKS),
    postBlocks: vi.fn<() => Promise<PostResult>>().mockResolvedValue({
      success: true,
      ts: "1234567890.123456",
    }),
    postThreadReplies: vi.fn<() => Promise<PostResult[]>>().mockResolvedValue([{ success: true }]),
    ...overrides,
  };
}

function writeSummaryFile(
  data: Array<{
    version: string;
    summaryJa: string;
    imageUrls: string[];
  }>,
): void {
  writeFileSync(
    resolve(TEST_ROOT, "html-summaries", "gemini-cli.json"),
    JSON.stringify(data, null, 2),
  );
}

function writeReleasesFile(entries: GitHubReleaseEntry[]): void {
  mkdirSync(resolve(TEST_ROOT, "html-current"), { recursive: true });
  writeFileSync(
    resolve(TEST_ROOT, "html-current", "gemini-cli-releases.json"),
    JSON.stringify(entries, null, 2),
  );
}

describe("notifyHtmlGeminiCli", () => {
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
          version: "v0.31.0",
          summaryJa: "テスト要約",
          imageUrls: ["https://example.com/img.png"],
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: buildBlocks に正しいコンテンツが渡される
      expect(deps.buildBlocks).toHaveBeenCalledWith({
        version: "v0.31.0",
        summaryJa: "テスト要約",
        imageUrls: ["https://example.com/img.png"],
      });

      // Then: Slack にブロックが投稿される
      expect(deps.postBlocks).toHaveBeenCalledWith(
        "C_TEST",
        MOCK_BLOCKS,
        "Gemini CLI v0.31.0 の更新",
        "xoxb-test",
        { name: "Gemini CLI Changelog", emoji: ":gemini:" },
      );
    });

    it("複数チャンネルに投稿する", async () => {
      // Given: 複数チャンネルが設定されている
      writeSummaryFile([
        {
          version: "v0.31.0",
          summaryJa: "テスト要約",
          imageUrls: [],
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_TEST_1", "C_TEST_2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

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
          version: "v0.30.0",
          summaryJa: "要約A",
          imageUrls: [],
        },
        {
          version: "v0.31.0",
          summaryJa: "要約B",
          imageUrls: ["https://example.com/img.png"],
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: buildBlocks が2回呼ばれる（各バージョン1回ずつ）
      expect(deps.buildBlocks).toHaveBeenCalledTimes(2);
      expect(deps.buildBlocks).toHaveBeenNthCalledWith(1, {
        version: "v0.30.0",
        summaryJa: "要約A",
        imageUrls: [],
      });
      expect(deps.buildBlocks).toHaveBeenNthCalledWith(2, {
        version: "v0.31.0",
        summaryJa: "要約B",
        imageUrls: ["https://example.com/img.png"],
      });

      // Then: postBlocks が2回呼ばれる（古い順）
      expect(deps.postBlocks).toHaveBeenCalledTimes(2);
      expect(deps.postBlocks).toHaveBeenNthCalledWith(
        1,
        "C_TEST",
        MOCK_BLOCKS,
        "Gemini CLI v0.30.0 の更新",
        "xoxb-test",
        { name: "Gemini CLI Changelog", emoji: ":gemini:" },
      );
      expect(deps.postBlocks).toHaveBeenNthCalledWith(
        2,
        "C_TEST",
        MOCK_BLOCKS,
        "Gemini CLI v0.31.0 の更新",
        "xoxb-test",
        { name: "Gemini CLI Changelog", emoji: ":gemini:" },
      );
    });

    it("複数バージョン × 複数チャンネルに投稿する", async () => {
      // Given: 2バージョン × 2チャンネル
      writeSummaryFile([
        {
          version: "v0.30.0",
          summaryJa: "要約A",
          imageUrls: [],
        },
        {
          version: "v0.31.0",
          summaryJa: "要約B",
          imageUrls: [],
        },
      ]);

      const deps = makeDeps({
        getChannels: () => ["C_TEST_1", "C_TEST_2"],
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: 2バージョン × 2チャンネル = 4回投稿
      expect(deps.postBlocks).toHaveBeenCalledTimes(4);
    });
  });

  describe("返信スレッドへの投稿", () => {
    // What: githubReleasesText が存在するバージョンのみスレッド返信が投稿されること
    // Why: GitHub Releases テキストはスレッド返信として詳細を提供する
    it("releases ファイルが存在する場合、対応するバージョンのスレッドに詳細を投稿する", async () => {
      // Given: 翻訳済みコンテンツ（単一バージョン）と releases ファイルが存在する
      writeSummaryFile([
        {
          version: "v0.31.0",
          summaryJa: "テスト要約",
          imageUrls: [],
        },
      ]);
      writeReleasesFile([
        {
          tagName: "v0.31.0",
          publishedAt: "2026-03-01T10:00:00Z",
          body: "- New feature\n- Bug fix",
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: 親スレッドに続いて返信スレッドが投稿される
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "1234567890.123456",
        "## v0.31.0 (2026-03-01T10:00:00Z)\n- New feature\n- Bug fix",
        "xoxb-test",
        { botProfile: { name: "Gemini CLI Changelog", emoji: ":gemini:" } },
      );
    });

    it("releases ファイルが存在しない場合、返信スレッドをスキップする", async () => {
      // Given: 翻訳済みコンテンツのみ存在し、releases ファイルなし
      writeSummaryFile([
        {
          version: "v0.31.0",
          summaryJa: "テスト要約",
          imageUrls: [],
        },
      ]);

      const deps = makeDeps();

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: 返信スレッドは投稿されない
      expect(deps.postThreadReplies).not.toHaveBeenCalled();
    });

    it("複数バージョンで releases ファイルがある場合、各バージョンの親スレッドに対応する release notes を投稿する", async () => {
      // What: 複数バージョンそれぞれの親スレッドに、対応するバージョンの release notes をスレッド返信
      // Why: 各親スレッドに関連する情報だけを返信として投稿し、ユーザーがバージョンごとに詳細を確認できるようにする

      // Given: 2バージョンと、両バージョンの release notes を含む releases ファイルが存在する
      writeSummaryFile([
        {
          version: "v0.30.0",
          summaryJa: "要約A",
          imageUrls: [],
        },
        {
          version: "v0.31.0",
          summaryJa: "要約B",
          imageUrls: [],
        },
      ]);
      writeReleasesFile([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Feature B" },
        { tagName: "v0.30.0", publishedAt: "2026-02-15T08:00:00Z", body: "- Feature A" },
      ]);

      // postBlocks の ts をバージョンごとに区別するためにモックを設定
      let callCount = 0;
      const deps = makeDeps({
        postBlocks: vi.fn<() => Promise<PostResult>>().mockImplementation(() => {
          callCount++;
          return Promise.resolve({ success: true, ts: `ts-${callCount}` });
        }),
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: postThreadReplies は2回呼ばれる（各バージョン1回ずつ）
      expect(deps.postThreadReplies).toHaveBeenCalledTimes(2);
      // v0.30.0 の親スレッド (ts-1) に v0.30.0 の release notes
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "ts-1",
        "## v0.30.0 (2026-02-15T08:00:00Z)\n- Feature A",
        "xoxb-test",
        { botProfile: { name: "Gemini CLI Changelog", emoji: ":gemini:" } },
      );
      // v0.31.0 の親スレッド (ts-2) に v0.31.0 の release notes
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "ts-2",
        "## v0.31.0 (2026-03-01T10:00:00Z)\n- Feature B",
        "xoxb-test",
        { botProfile: { name: "Gemini CLI Changelog", emoji: ":gemini:" } },
      );
    });

    it("複数バージョンのうち、一部のみ releases にマッチする場合、マッチしたバージョンのみスレッド返信する", async () => {
      // What: releases テキストに一部バージョンのみ存在する場合の動作
      // Why: release notes がないバージョンには不要なスレッド返信を投稿しないことを保証する

      // Given: 2バージョンのうち v0.31.0 のみ releases テキストに存在する
      writeSummaryFile([
        {
          version: "v0.30.0",
          summaryJa: "要約A",
          imageUrls: [],
        },
        {
          version: "v0.31.0",
          summaryJa: "要約B",
          imageUrls: [],
        },
      ]);
      writeReleasesFile([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Feature B" },
      ]);

      let callCount = 0;
      const deps = makeDeps({
        postBlocks: vi.fn<() => Promise<PostResult>>().mockImplementation(() => {
          callCount++;
          return Promise.resolve({ success: true, ts: `ts-${callCount}` });
        }),
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: postThreadReplies は1回だけ呼ばれる（v0.31.0 のみ）
      expect(deps.postThreadReplies).toHaveBeenCalledTimes(1);
      expect(deps.postThreadReplies).toHaveBeenCalledWith(
        "C_TEST",
        "ts-2",
        "## v0.31.0 (2026-03-01T10:00:00Z)\n- Feature B",
        "xoxb-test",
        { botProfile: { name: "Gemini CLI Changelog", emoji: ":gemini:" } },
      );
    });

    it("親スレッド投稿失敗時は返信スレッドをスキップする", async () => {
      // Given: releases ファイルが存在するが、親スレッド投稿が失敗する
      writeSummaryFile([
        {
          version: "v0.31.0",
          summaryJa: "テスト要約",
          imageUrls: [],
        },
      ]);
      writeReleasesFile([
        { tagName: "v0.31.0", publishedAt: "2026-03-01T10:00:00Z", body: "- Details" },
      ]);

      const deps = makeDeps({
        postBlocks: vi.fn().mockResolvedValue({ success: false, error: "channel_not_found" }),
      });

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

      // Then: 返信スレッドは投稿されない
      expect(deps.postThreadReplies).not.toHaveBeenCalled();
    });
  });

  describe("botProfile なし", () => {
    it("botProfile が未設定の場合でも正常に投稿できる", async () => {
      // Given: botProfile が未設定
      writeSummaryFile([
        {
          version: "v0.31.0",
          summaryJa: "テスト要約",
          imageUrls: [],
        },
      ]);

      const deps = makeDeps({ botProfile: undefined });

      // When: 通知スクリプトを実行する
      await notifyHtmlGeminiCli(deps);

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
