import { describe, expect, it } from "vitest";
import {
  buildGeminiCliBlocks,
  buildAntigravityBlocks,
  buildOpenAINewsBlocks,
  buildAnthropicNewsBlocks,
} from "../services/html-slack-builder.js";
import type {
  GeminiCliTranslatedContent,
  AntigravityTranslatedContent,
  TranslatedArticle,
} from "../services/html-slack-builder.js";
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

describe("buildOpenAINewsBlocks", () => {
  // What: OpenAI News の翻訳・要約済み記事から Slack Block Kit メッセージを生成する
  // Why: Header（ソース名 + タイトル）→ Section（日付）→ Section（要約文）構造の
  //      親メッセージブロックが正しく構築されることを保証する

  const baseArticle: TranslatedArticle = {
    slug: "new-model-release",
    title: "新しいモデルのリリース",
    date: "2026-03-08",
    summaryJa:
      "OpenAI は新しいモデルをリリースしました。\n- 性能が大幅に向上\n- **コスト削減**を実現",
    fullTextJa: "本文の全文テキスト...",
  };

  it("header ブロックにソース名とタイトルが含まれる", () => {
    // Given: OpenAI News の翻訳済み記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: header にソース名とタイトルが含まれる
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("OpenAI");
    expect(header?.type === "header" && header.text.text).toContain("新しいモデルのリリース");
  });

  it("日付が section ブロックに含まれる", () => {
    // Given: 日付付きの記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: section ブロックに日付が含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("2026-03-08");
  });

  it("要約テキストが section ブロックに含まれる", () => {
    // Given: 要約付きの記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: section ブロックに要約テキストが含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("OpenAI は新しいモデルをリリースしました");
  });

  it("image ブロックが含まれない", () => {
    // Given: OpenAI News の記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: image ブロックが存在しない
    const imageBlocks = blocks.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(0);
  });

  it("Markdown を Slack mrkdwn に変換する", () => {
    // Given: Markdown 記法を含む要約
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: - が • に、**bold** が *bold* に変換される
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("• 性能が大幅に向上");
    expect(allText).toContain("*コスト削減*");
    expect(allText).not.toContain("**コスト削減**");
  });

  it("header テキストが150文字で切り詰められる", () => {
    // Given: 非常に長いタイトルの記事
    const article: TranslatedArticle = {
      ...baseArticle,
      title: "あ".repeat(200),
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: header テキストが150文字以内
    const header = blocks.find(
      (b): b is Extract<SlackBlock, { type: "header" }> => b.type === "header",
    );
    expect(header).toBeDefined();
    expect(header!.text.text.length).toBeLessThanOrEqual(150);
  });

  it("要約テキストが3000文字で切り詰められる", () => {
    // Given: 非常に長い要約テキストの記事
    const article: TranslatedArticle = {
      ...baseArticle,
      summaryJa: "あ".repeat(4000),
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: section テキストが3000文字以内
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    for (const section of sections) {
      expect(section.text.text.length).toBeLessThanOrEqual(3000);
    }
  });

  it("記事 URL の context ブロックが含まれる", () => {
    // What: OpenAI News のブロック末尾に記事リンクの context ブロックが生成される
    // Why: チームメンバーが元記事にすぐアクセスできるようにするため

    // Given: slug 付きの OpenAI News 記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildOpenAINewsBlocks(article);

    // Then: 末尾のブロックが context 型で、記事 URL リンクを含む
    const lastBlock = blocks[blocks.length - 1];
    expect(lastBlock.type).toBe("context");
    const contextBlock = lastBlock as { type: "context"; elements: Array<{ type: string; text: string }> };
    expect(contextBlock.elements).toHaveLength(1);
    expect(contextBlock.elements[0].type).toBe("mrkdwn");
    expect(contextBlock.elements[0].text).toContain(
      "<https://openai.com/ja-JP/index/new-model-release/|記事を読む>",
    );
  });
});

describe("buildAnthropicNewsBlocks", () => {
  // What: Anthropic News の翻訳・要約済み記事から Slack Block Kit メッセージを生成する
  // Why: OpenAI News と同じ構造（要約 + スレッド全文パターン）の
  //      親メッセージブロックが正しく構築されることを保証する

  const baseArticle: TranslatedArticle = {
    slug: "claude-4-release",
    title: "Claude 4 Release",
    titleJa: "Claude 4 リリース",
    date: "2026-03-07",
    summaryJa:
      "Anthropic は Claude 4 をリリースしました。\n- 推論能力が向上\n- **マルチモーダル**対応を強化",
    fullTextJa: "本文の全文テキスト...",
  };

  it("header ブロックに titleJa が使われる", () => {
    // Given: titleJa を持つ Anthropic News の翻訳済み記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: header に titleJa（日本語タイトル）が含まれる
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("Anthropic");
    expect(header?.type === "header" && header.text.text).toContain("Claude 4 リリース");
    expect(header?.type === "header" && header.text.text).not.toContain("Claude 4 Release");
  });

  it("titleJa がない場合は title にフォールバックする", () => {
    // Given: titleJa を持たない記事
    const article: TranslatedArticle = {
      slug: "claude-4-release",
      title: "Claude 4 Release",
      date: "2026-03-07",
      summaryJa: "要約",
      fullTextJa: "全文",
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: header に title（英語）がフォールバックとして含まれる
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("Claude 4 Release");
  });

  it("日付が section ブロックに含まれる", () => {
    // Given: 日付付きの記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: section ブロックに日付が含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("2026-03-07");
  });

  it("要約テキストが section ブロックに含まれる", () => {
    // Given: 要約付きの記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: section ブロックに要約テキストが含まれる
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("Anthropic は Claude 4 をリリースしました");
  });

  it("image ブロックが含まれない", () => {
    // Given: Anthropic News の記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: image ブロックが存在しない
    const imageBlocks = blocks.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(0);
  });

  it("Markdown を Slack mrkdwn に変換する", () => {
    // Given: Markdown 記法を含む要約
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: - が • に、**bold** が *bold* に変換される
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    const allText = sections.map((s) => s.text.text).join("\n");
    expect(allText).toContain("• 推論能力が向上");
    expect(allText).toContain("*マルチモーダル*");
    expect(allText).not.toContain("**マルチモーダル**");
  });

  it("header テキストが150文字で切り詰められる", () => {
    // Given: 非常に長いタイトルの記事
    const article: TranslatedArticle = {
      ...baseArticle,
      title: "い".repeat(200),
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: header テキストが150文字以内
    const header = blocks.find(
      (b): b is Extract<SlackBlock, { type: "header" }> => b.type === "header",
    );
    expect(header).toBeDefined();
    expect(header!.text.text.length).toBeLessThanOrEqual(150);
  });

  it("要約テキストが3000文字で切り詰められる", () => {
    // Given: 非常に長い要約テキストの記事
    const article: TranslatedArticle = {
      ...baseArticle,
      summaryJa: "い".repeat(4000),
    };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: section テキストが3000文字以内
    const sections = blocks.filter(
      (b): b is Extract<SlackBlock, { type: "section" }> => b.type === "section",
    );
    for (const section of sections) {
      expect(section.text.text.length).toBeLessThanOrEqual(3000);
    }
  });

  it("記事 URL の context ブロックが含まれる", () => {
    // What: Anthropic News のブロック末尾に記事リンクの context ブロックが生成される
    // Why: チームメンバーが元記事にすぐアクセスできるようにするため

    // Given: slug 付きの Anthropic News 記事
    const article = { ...baseArticle };

    // When: Block Kit メッセージを生成する
    const blocks = buildAnthropicNewsBlocks(article);

    // Then: 末尾のブロックが context 型で、記事 URL リンクを含む
    const lastBlock = blocks[blocks.length - 1];
    expect(lastBlock.type).toBe("context");
    const contextBlock = lastBlock as { type: "context"; elements: Array<{ type: string; text: string }> };
    expect(contextBlock.elements).toHaveLength(1);
    expect(contextBlock.elements[0].type).toBe("mrkdwn");
    expect(contextBlock.elements[0].text).toContain(
      "<https://www.anthropic.com/news/claude-4-release|記事を読む>",
    );
  });
});
