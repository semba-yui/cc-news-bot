import { describe, expect, it } from "vitest";
import { validateCursorSummaries } from "../services/cursor-summary-schema.js";

/**
 * What: Cursor サマリー JSON 配列の Zod バリデーションをテストする
 * Why: Claude が生成した JSON 配列が Slack Block Kit スキーマに準拠していることを保証する
 */

describe("validateCursorSummaries", () => {
  it("正常な JSON 配列がバリデーションを通過する", () => {
    // What: 正しい形式の配列が通過するか
    // Why: 基本的な正常系の動作保証

    // Given: 正しいスキーマの JSON 配列
    const data = [
      {
        version: "2.5",
        fallbackText: "Cursor 2.5 の更新",
        blocks: [
          { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
          { type: "section", text: { type: "mrkdwn", text: "テストコンテンツ" } },
          { type: "divider" },
          { type: "image", image_url: "https://example.com/img.png", alt_text: "Cursor 2.5" },
        ],
      },
    ];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
  });

  it("複数エントリの配列がバリデーションを通過する", () => {
    // What: 複数バージョンを含む配列が通過するか
    // Why: 複数バージョン同時通知に対応するため

    // Given: 2エントリの配列
    const data = [
      {
        version: "2.4",
        fallbackText: "Cursor 2.4 の更新",
        blocks: [
          { type: "header", text: { type: "plain_text", text: "Cursor 2.4 の更新", emoji: true } },
        ],
      },
      {
        version: "2.5",
        fallbackText: "Cursor 2.5 の更新",
        blocks: [
          { type: "header", text: { type: "plain_text", text: "Cursor 2.5 の更新", emoji: true } },
        ],
      },
    ];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 成功する
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("空配列で失敗する", () => {
    // What: 空配列を拒否するか
    // Why: 空の通知配列を許可しない

    // Given: 空配列
    const data: unknown[] = [];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("version が欠損している場合は失敗する", () => {
    // What: version フィールドがない要素を含む配列を拒否するか
    // Why: version は Slack 通知の必須情報

    // Given: version がないエントリ
    const data = [
      {
        fallbackText: "Cursor の更新",
        blocks: [
          { type: "header", text: { type: "plain_text", text: "Cursor の更新", emoji: true } },
        ],
      },
    ];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("不正なブロックタイプで失敗する", () => {
    // What: 未知のブロックタイプを含む要素を拒否するか
    // Why: Slack API が受け付けないブロックを事前に検出する

    // Given: 不正な type を持つブロック
    const data = [
      {
        version: "2.5",
        fallbackText: "Cursor 2.5 の更新",
        blocks: [{ type: "unknown_block" }],
      },
    ];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("section.text が 3000 文字超で失敗する", () => {
    // What: Slack Block Kit の文字数制限を超えるテキストを拒否するか
    // Why: Slack API は section.text を 3000 文字に制限している

    // Given: 3001 文字のテキストを持つ section
    const data = [
      {
        version: "2.5",
        fallbackText: "Cursor 2.5 の更新",
        blocks: [{ type: "section", text: { type: "mrkdwn", text: "x".repeat(3001) } }],
      },
    ];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("blocks が空配列のエントリで失敗する", () => {
    // What: ブロックが空のエントリを含む配列を拒否するか
    // Why: 空の通知を Slack に送信するのを防止する

    // Given: blocks が空のエントリ
    const data = [
      {
        version: "2.5",
        fallbackText: "Cursor 2.5 の更新",
        blocks: [],
      },
    ];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 失敗する
    expect(result.success).toBe(false);
  });

  it("失敗時にエラーメッセージを返す", () => {
    // What: 失敗時に詳細なエラー情報を返すか
    // Why: Claude が自己修復するためにエラー内容を読む必要がある

    // Given: 不正なデータ
    const data = [{ version: 123 }];

    // When: バリデーションを実行する
    const result = validateCursorSummaries(data);

    // Then: 失敗し、エラーメッセージが存在する
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
