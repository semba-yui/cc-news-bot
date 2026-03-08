import { describe, expect, it } from "vitest";
import {
  validateOpenAINewsSummaries,
  validateAnthropicNewsSummaries,
  validateJulesChangelogSummaries,
} from "../services/news-summary-schema.js";

// What: ニュースページプロバイダの翻訳・要約済み JSON のバリデーションスキーマ
// Why: Claude Code Action が生成した JSON の構造・文字数制限を検証し、
//      不正な出力にフィードバックを返すことで LLM のリトライループを実現する

describe("validateOpenAINewsSummaries", () => {
  // What: OpenAI News の翻訳・要約済み JSON のバリデーション
  // Why: slug, title, date, summaryJa(400文字以内), fullTextJa が正しく含まれることを検証する

  it("正しい構造の JSON を受け入れる", () => {
    // Given: 正しい構造のデータ
    const data = [
      {
        slug: "new-model",
        title: "新しいモデル",
        date: "2026-03-08",
        summaryJa: "要約テキスト",
        fullTextJa: "全文テキスト",
      },
    ];

    // When: バリデーションを実行する
    const result = validateOpenAINewsSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  it("summaryJa が 400 文字を超える場合はエラーになる", () => {
    // Given: summaryJa が 401 文字
    const data = [
      {
        slug: "long-summary",
        title: "長い要約",
        date: "2026-03-08",
        summaryJa: "あ".repeat(401),
        fullTextJa: "全文",
      },
    ];

    // When: バリデーションを実行する
    const result = validateOpenAINewsSummaries(data);

    // Then: 失敗し、エラーメッセージに文字数制限の情報が含まれる
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("400");
    }
  });

  it("summaryJa が 400 文字ちょうどの場合は受け入れる", () => {
    // Given: summaryJa がちょうど 400 文字
    const data = [
      {
        slug: "exact-limit",
        title: "ちょうど",
        date: "2026-03-08",
        summaryJa: "あ".repeat(400),
        fullTextJa: "全文",
      },
    ];

    // When: バリデーションを実行する
    const result = validateOpenAINewsSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  it("必須フィールドが欠けている場合はエラーになる", () => {
    // Given: summaryJa が欠けているデータ
    const data = [
      {
        slug: "missing-field",
        title: "タイトル",
        date: "2026-03-08",
        fullTextJa: "全文",
      },
    ];

    // When: バリデーションを実行する
    const result = validateOpenAINewsSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("空配列はエラーになる", () => {
    // Given: 空配列
    const data: unknown[] = [];

    // When: バリデーションを実行する
    const result = validateOpenAINewsSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("複数エントリを受け入れる", () => {
    // Given: 2つのエントリ
    const data = [
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
    ];

    // When: バリデーションを実行する
    const result = validateOpenAINewsSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });
});

describe("validateAnthropicNewsSummaries", () => {
  // What: Anthropic News の翻訳・要約済み JSON のバリデーション
  // Why: OpenAI News と同じ構造だが category フィールドも含まれることを検証する

  it("正しい構造の JSON を受け入れる", () => {
    // Given: 正しい構造のデータ
    const data = [
      {
        slug: "claude-release",
        title: "Claude リリース",
        date: "2026-03-08",
        summaryJa: "要約テキスト",
        fullTextJa: "全文テキスト",
      },
    ];

    // When: バリデーションを実行する
    const result = validateAnthropicNewsSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  it("summaryJa が 400 文字を超える場合はエラーになる", () => {
    // Given: summaryJa が 401 文字
    const data = [
      {
        slug: "long",
        title: "長い",
        date: "2026-03-08",
        summaryJa: "い".repeat(401),
        fullTextJa: "全文",
      },
    ];

    // When: バリデーションを実行する
    const result = validateAnthropicNewsSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });
});

describe("validateJulesChangelogSummaries", () => {
  // What: Jules Changelog の翻訳済み JSON のバリデーション
  // Why: dateSlug ベースで summaryJa なし、fullTextJa のみの構造を検証する

  it("正しい構造の JSON を受け入れる", () => {
    // Given: 正しい構造のデータ
    const data = [
      {
        dateSlug: "2026-03-08",
        title: "New features",
        date: "2026-03-08",
        fullTextJa: "新機能が追加されました。",
      },
    ];

    // When: バリデーションを実行する
    const result = validateJulesChangelogSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  it("長い fullTextJa も受け入れる（スレッド分割で対応するため文字数制限なし）", () => {
    // Given: fullTextJa が非常に長い
    const data = [
      {
        dateSlug: "2026-03-08",
        title: "Long entry",
        date: "2026-03-08",
        fullTextJa: "う".repeat(10000),
      },
    ];

    // When: バリデーションを実行する
    const result = validateJulesChangelogSummaries(data);

    // Then: 成功する（分割は postThreadReplies が担当）
    expect(result.success).toBe(true);
  });

  it("slug フィールドがある場合はエラーになる（dateSlug を使用）", () => {
    // Given: slug がある（dateSlug ではなく）
    const data = [
      {
        slug: "wrong-field",
        title: "Wrong",
        date: "2026-03-08",
        fullTextJa: "テスト",
      },
    ];

    // When: バリデーションを実行する
    const result = validateJulesChangelogSummaries(data);

    // Then: 失敗する（dateSlug が必須）
    expect(result.success).toBe(false);
  });

  it("空配列はエラーになる", () => {
    // Given: 空配列
    const data: unknown[] = [];

    // When: バリデーションを実行する
    const result = validateJulesChangelogSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });
});
