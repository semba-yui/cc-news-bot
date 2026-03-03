import { describe, expect, it } from "vitest";
import {
  buildGeminiCliBlocks,
  buildCursorBlocks,
  buildAntigravityBlocks,
} from "../services/html-slack-builder.js";
import type {
  GeminiCliTranslatedContent,
  AntigravityTranslatedContent,
} from "../services/html-slack-builder.js";
import type { CursorVersionContent } from "../services/cursor-parser.js";
import type { SlackBlock } from "../services/slack-service.js";

describe("buildGeminiCliBlocks", () => {
  // What: Gemini CLI の翻訳済みコンテンツから Slack Block Kit メッセージを生成する
  // Why: Gemini CLI の更新通知を構造化された形式で Slack 親スレッドに投稿するため

  const baseContent: GeminiCliTranslatedContent = {
    version: "v0.31.0",
    summaryJa: "新しい機能が追加されました。\n- MCP サーバーのサポート\n- パフォーマンス改善",
    imageUrls: ["https://i.imgur.com/example1.png", "https://i.imgur.com/example2.gif"],
  };

  it("header ブロックにソース名とバージョンが含まれる", () => {
    // Given: Gemini CLI の翻訳済みコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: 最初のブロックが header で、ソース名とバージョンが含まれる
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("Gemini CLI");
    expect(header?.type === "header" && header.text.text).toContain("v0.31.0");
  });

  it("翻訳済み要約テキストが section ブロックに含まれる", () => {
    // Given: 要約テキスト付きのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: section ブロックに要約テキストが含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("新しい機能が追加されました");
  });

  it("画像 URL が image ブロックとして含まれる", () => {
    // Given: 画像 URL 付きのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: 各画像 URL に対応する image ブロックが生成される
    const imageBlocks = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "image" }> => b.type === "image",
    );
    expect(imageBlocks).toHaveLength(2);
    expect(imageBlocks[0].image_url).toBe("https://i.imgur.com/example1.png");
    expect(imageBlocks[1].image_url).toBe("https://i.imgur.com/example2.gif");
  });

  it("画像 URL が空の場合は image ブロックを生成しない", () => {
    // Given: 画像なしのコンテンツ
    const content: GeminiCliTranslatedContent = {
      ...baseContent,
      imageUrls: [],
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: image ブロックが存在しない
    const imageBlocks = blocks.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(0);
  });

  it("image ブロックに alt_text が設定される", () => {
    // Given: 画像付きコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: 各 image ブロックに alt_text が設定されている
    const imageBlocks = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "image" }> => b.type === "image",
    );
    for (const block of imageBlocks) {
      expect(block.alt_text).toBeDefined();
      expect(block.alt_text.length).toBeGreaterThan(0);
    }
  });

  it("Markdown の - を Slack の • に変換する", () => {
    // Given: ハイフンリスト付きの要約
    const content: GeminiCliTranslatedContent = {
      ...baseContent,
      summaryJa: "- 項目1\n- 項目2",
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: • に変換される
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("• 項目1");
    expect(allText).not.toContain("- 項目1");
  });

  it("Markdown の **bold** を Slack mrkdwn の *bold* に変換する", () => {
    // Given: bold テキスト付きの要約
    const content: GeminiCliTranslatedContent = {
      ...baseContent,
      summaryJa: "**重要な変更**: 新機能",
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildGeminiCliBlocks(content);

    // Then: *bold* に変換される
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("*重要な変更*");
    expect(allText).not.toContain("**重要な変更**");
  });
});

describe("buildCursorBlocks", () => {
  // What: Cursor のコンテンツから Slack Block Kit メッセージを生成する
  // Why: Cursor の更新通知を画像・動画付きの構造化形式で Slack に投稿するため

  const baseContent: CursorVersionContent = {
    version: "2.5",
    contentJa:
      "### バグ修正\n改善されたエディタ体験。\n- コード補完の精度向上\n- パフォーマンス改善",
    imageUrls: ["https://cursor.com/images/feature.png"],
    videos: [
      {
        playbackId: "abc123def456",
        thumbnailUrl: "https://image.mux.com/abc123def456/thumbnail.png",
        hlsUrl: "https://stream.mux.com/abc123def456.m3u8",
      },
    ],
  };

  it("header ブロックにソース名とバージョンが含まれる", () => {
    // Given: Cursor のコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: header にソース名とバージョンが含まれる
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("Cursor");
    expect(header?.type === "header" && header.text.text).toContain("2.5");
  });

  it("日本語コンテンツが section ブロックに含まれる", () => {
    // Given: 日本語コンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: section ブロックにコンテンツが含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("改善されたエディタ体験");
  });

  it("画像 URL が image ブロックとして含まれる", () => {
    // Given: 画像 URL 付きのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: image ブロックが生成される
    const imageBlocks = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "image" }> => b.type === "image",
    );
    const imageUrls = imageBlocks.map((b) => b.image_url);
    expect(imageUrls).toContain("https://cursor.com/images/feature.png");
  });

  it("Mux 動画のサムネイルが image ブロックとして含まれる", () => {
    // Given: Mux 動画付きのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: Mux サムネイルの image ブロックが生成される
    const imageBlocks = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "image" }> => b.type === "image",
    );
    const imageUrls = imageBlocks.map((b) => b.image_url);
    expect(imageUrls).toContain("https://image.mux.com/abc123def456/thumbnail.png");
  });

  it("Mux 動画の HLS リンクがテキストに含まれる", () => {
    // Given: Mux 動画付きのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: HLS リンクがどこかの section に含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("https://stream.mux.com/abc123def456.m3u8");
  });

  it("動画がない場合は動画関連のブロックを生成しない", () => {
    // Given: 動画なしのコンテンツ
    const content: CursorVersionContent = {
      ...baseContent,
      videos: [],
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: Mux 関連のブロックが含まれない
    const imageBlocks = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "image" }> => b.type === "image",
    );
    const muxImages = imageBlocks.filter((b) => b.image_url.includes("image.mux.com"));
    expect(muxImages).toHaveLength(0);
  });

  it("画像も動画もない場合はテキストブロックのみ生成する", () => {
    // Given: メディアなしのコンテンツ
    const content: CursorVersionContent = {
      ...baseContent,
      imageUrls: [],
      videos: [],
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: header と section のみ
    const imageBlocks = blocks.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(0);
    expect(blocks.some((b) => b.type === "header")).toBe(true);
    expect(blocks.some((b) => b.type === "section")).toBe(true);
  });

  it("Markdown の - を Slack の • に変換する", () => {
    // Given: ハイフンリスト付きの日本語コンテンツ
    const content: CursorVersionContent = {
      ...baseContent,
      contentJa: "- 機能A\n- 機能B",
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildCursorBlocks(content);

    // Then: • に変換される
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("• 機能A");
  });
});

describe("buildAntigravityBlocks", () => {
  // What: Antigravity の翻訳済みコンテンツから Slack Block Kit メッセージを生成する
  // Why: Improvements・Fixes・Patches の3カテゴリ構成を維持した通知を Slack に投稿するため

  const baseContent: AntigravityTranslatedContent = {
    version: "1.19.6",
    improvementsJa: ["エディタのパフォーマンス改善", "新しいキーボードショートカット"],
    fixesJa: ["クラッシュバグを修正", "メモリリークを修正"],
    patchesJa: ["依存ライブラリの更新"],
  };

  it("header ブロックにソース名とバージョンが含まれる", () => {
    // Given: Antigravity の翻訳済みコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: header にソース名とバージョンが含まれる
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("Antigravity");
    expect(header?.type === "header" && header.text.text).toContain("1.19.6");
  });

  it("Improvements セクションが含まれる", () => {
    // Given: Improvements 項目ありのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: Improvements セクションが section ブロックに含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("Improvements");
    expect(allText).toContain("エディタのパフォーマンス改善");
    expect(allText).toContain("新しいキーボードショートカット");
  });

  it("Fixes セクションが含まれる", () => {
    // Given: Fixes 項目ありのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: Fixes セクションが含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("Fixes");
    expect(allText).toContain("クラッシュバグを修正");
  });

  it("Patches セクションが含まれる", () => {
    // Given: Patches 項目ありのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: Patches セクションが含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("Patches");
    expect(allText).toContain("依存ライブラリの更新");
  });

  it("空のカテゴリはセクションを生成しない", () => {
    // Given: Fixes が空のコンテンツ
    const content: AntigravityTranslatedContent = {
      ...baseContent,
      fixesJa: [],
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: Fixes セクションが含まれない（ただし Improvements と Patches は含まれる）
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).not.toContain("Fixes");
    expect(allText).toContain("Improvements");
    expect(allText).toContain("Patches");
  });

  it("全カテゴリが空の場合でも header ブロックは生成される", () => {
    // Given: 全カテゴリ空のコンテンツ
    const content: AntigravityTranslatedContent = {
      version: "1.19.6",
      improvementsJa: [],
      fixesJa: [],
      patchesJa: [],
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: header ブロックだけは生成される
    expect(blocks.some((b) => b.type === "header")).toBe(true);
  });

  it("3カテゴリの間に divider が挿入される", () => {
    // Given: 全カテゴリに項目がある
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: カテゴリ間に divider がある
    const dividers = blocks.filter((b) => b.type === "divider");
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  it("各カテゴリの項目が • 付きリストとして表示される", () => {
    // Given: 複数項目ありのコンテンツ
    const content = { ...baseContent };

    // When: Block Kit メッセージを生成する
    const blocks = buildAntigravityBlocks(content);

    // Then: 項目が • 付きで表示される
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("• エディタのパフォーマンス改善");
    expect(allText).toContain("• クラッシュバグを修正");
    expect(allText).toContain("• 依存ライブラリの更新");
  });
});
