import { describe, expect, it } from "vitest";
import { validateCursorSummary } from "../services/cursor-summary-schema.js";

/**
 * What: Cursor サマリー JSON の Zod バリデーションをテストする
 * Why: Claude が生成した JSON が Slack Block Kit スキーマに準拠していることを保証する
 */

describe("validateCursorSummary", () => {
  it("正常な JSON がバリデーションを通過する", () => {
    // What: 全フィールドが正しい JSON が通過するか
    // Why: 基本的な正常系の動作保証

    // Given: 正しいスキーマの JSON
    const data = {
      version: "2.5",
      fallbackText: "Cursor 2.5 の更新",
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: "テストコンテンツ" } },
        { type: "divider" },
        { type: "image", image_url: "https://example.com/img.png", alt_text: "Cursor 2.5" },
      ],
    };

    // When: バリデーションを実行する
    const result = validateCursorSummary(data);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  it("version が欠損している場合は失敗する", () => {
    // What: version フィールドがない JSON を拒否するか
    // Why: version は Slack 通知の必須情報

    // Given: version がない JSON
    const data = {
      fallbackText: "Cursor の更新",
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Cursor の更新", emoji: true } },
      ],
    };

    // When: バリデーションを実行する
    const result = validateCursorSummary(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("不正なブロックタイプで失敗する", () => {
    // What: 未知のブロックタイプを含む JSON を拒否するか
    // Why: Slack API が受け付けないブロックを事前に検出する

    // Given: 不正な type を持つブロック
    const data = {
      version: "2.5",
      fallbackText: "Cursor 2.5 の更新",
      blocks: [{ type: "unknown_block" }],
    };

    // When: バリデーションを実行する
    const result = validateCursorSummary(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("section.text が 3000 文字超で失敗する", () => {
    // What: Slack Block Kit の文字数制限を超えるテキストを拒否するか
    // Why: Slack API は section.text を 3000 文字に制限している

    // Given: 3001 文字のテキストを持つ section
    const data = {
      version: "2.5",
      fallbackText: "Cursor 2.5 の更新",
      blocks: [{ type: "section", text: { type: "mrkdwn", text: "x".repeat(3001) } }],
    };

    // When: バリデーションを実行する
    const result = validateCursorSummary(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("blocks が空配列で失敗する", () => {
    // What: ブロックが空の JSON を拒否するか
    // Why: 空の通知を Slack に送信するのを防止する

    // Given: blocks が空の JSON
    const data = {
      version: "2.5",
      fallbackText: "Cursor 2.5 の更新",
      blocks: [],
    };

    // When: バリデーションを実行する
    const result = validateCursorSummary(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("失敗時にエラーメッセージを返す", () => {
    // What: 失敗時に詳細なエラー情報を返すか
    // Why: Claude が自己修復するためにエラー内容を読む必要がある

    // Given: 不正な JSON
    const data = { version: 123 };

    // When: バリデーションを実行する
    const result = validateCursorSummary(data);

    // Then: 失敗し、エラーメッセージが存在する
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
