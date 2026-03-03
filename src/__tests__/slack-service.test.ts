import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  postSummary,
  postThreadReply,
  postThreadReplies,
  postError,
  postBlocks,
  splitText,
  summaryToBlocks,
  MAX_MESSAGE_LENGTH,
} from "../services/slack-service.js";
import type { SlackBlock, BotProfile } from "../services/slack-service.js";

const SLACK_API = "https://slack.com/api/chat.postMessage";
const TOKEN = "xoxb-test-token";
const CHANNEL = "C0AHQ59G8HJ";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("postSummary", () => {
  it("チャンネルに要約メッセージを投稿し、ts を返す", async () => {
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.channel).toBe(CHANNEL);
        expect(body.text).toContain("テスト要約");
        expect(body.mrkdwn).toBe(true);
        return HttpResponse.json({ ok: true, ts: "1234567890.123456" });
      }),
    );

    const result = await postSummary(CHANNEL, "claude-code", "1.0.0", "テスト要約", TOKEN);
    expect(result.success).toBe(true);
    expect(result.ts).toBe("1234567890.123456");
  });

  it("メッセージテキストにソース名を含む", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postSummary(CHANNEL, "codex", "1.0.0", "要約テキスト", TOKEN);
    expect(capturedBody.text).toContain("codex");
  });

  it("Slack API がエラーを返した場合、success: false とエラー内容を返す", async () => {
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.json({ ok: false, error: "channel_not_found" });
      }),
    );

    const result = await postSummary(CHANNEL, "claude-code", "1.0.0", "要約", TOKEN);
    expect(result.success).toBe(false);
    expect(result.error).toContain("channel_not_found");
  });

  it("ネットワークエラーの場合、success: false を返す", async () => {
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.error();
      }),
    );

    const result = await postSummary(CHANNEL, "claude-code", "1.0.0", "要約", TOKEN);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("Authorization ヘッダーに Bearer トークンを設定する", async () => {
    let authHeader = "";
    server.use(
      http.post(SLACK_API, ({ request }) => {
        authHeader = request.headers.get("Authorization") ?? "";
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postSummary(CHANNEL, "claude-code", "1.0.0", "要約", TOKEN);
    expect(authHeader).toBe(`Bearer ${TOKEN}`);
  });

  it("botProfile を渡した場合、username と icon_emoji がペイロードに含まれる", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postSummary(CHANNEL, "claude-code", "1.0.0", "要約", TOKEN, {
      name: "Claude Code Changelog",
      emoji: ":claude:",
    });
    expect(capturedBody.username).toBe("Claude Code Changelog");
    expect(capturedBody.icon_emoji).toBe(":claude:");
  });

  it("botProfile を渡さない場合、username と icon_emoji がペイロードに含まれない", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postSummary(CHANNEL, "claude-code", "1.0.0", "要約", TOKEN);
    expect(capturedBody.username).toBeUndefined();
    expect(capturedBody.icon_emoji).toBeUndefined();
  });
});

describe("postThreadReply", () => {
  it("指定スレッドに返信を投稿する", async () => {
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.channel).toBe(CHANNEL);
        expect(body.thread_ts).toBe("1234567890.123456");
        expect(body.text).toBe("原文テキスト");
        return HttpResponse.json({ ok: true, ts: "1234567890.654321" });
      }),
    );

    const result = await postThreadReply(CHANNEL, "1234567890.123456", "原文テキスト", TOKEN);
    expect(result.success).toBe(true);
    expect(result.ts).toBe("1234567890.654321");
  });

  it("Slack API がエラーを返した場合、success: false を返す", async () => {
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.json({ ok: false, error: "invalid_auth" });
      }),
    );

    const result = await postThreadReply(CHANNEL, "1234567890.123456", "テキスト", TOKEN);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid_auth");
  });

  it("mrkdwn フォーマットが有効である", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postThreadReply(CHANNEL, "1234567890.123456", "テキスト", TOKEN);
    expect(capturedBody.mrkdwn).toBe(true);
  });

  it("投稿間に 1 秒以上のウェイトを挿入する", async () => {
    // sleep 関数をスパイして呼び出しを確認
    const sleepSpy = vi.spyOn(globalThis, "setTimeout");

    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    const start = Date.now();
    await postThreadReply(CHANNEL, "1234567890.123456", "テキスト1", TOKEN, { delayMs: 50 });
    const elapsed = Date.now() - start;

    // テスト時は短いディレイで代替（デフォルトは 1000ms）
    expect(elapsed).toBeGreaterThanOrEqual(40);

    sleepSpy.mockRestore();
  });
});

describe("splitText", () => {
  it("閾値以下のテキストはそのまま 1 要素の配列で返す", () => {
    const text = "短いテキスト";
    const result = splitText(text);
    expect(result).toEqual([text]);
  });

  it("閾値を超えるテキストを分割する", () => {
    const text = "a".repeat(MAX_MESSAGE_LENGTH + 100);
    const result = splitText(text);
    expect(result.length).toBe(2);
    expect(result[0].length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    expect(result[0] + result[1]).toBe(text);
  });

  it("分割後の各チャンクが閾値以下である", () => {
    const text = "x".repeat(MAX_MESSAGE_LENGTH * 3 + 500);
    const result = splitText(text);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    }
  });

  it("結合すると元のテキストと一致する", () => {
    const text = "abcdefg".repeat(1000);
    const result = splitText(text);
    expect(result.join("")).toBe(text);
  });

  it("空文字列は 1 要素の配列で返す", () => {
    const result = splitText("");
    expect(result).toEqual([""]);
  });

  it("閾値ちょうどのテキストは分割しない", () => {
    const text = "z".repeat(MAX_MESSAGE_LENGTH);
    const result = splitText(text);
    expect(result).toEqual([text]);
  });
});

describe("postThreadReplies", () => {
  it("短いテキストは 1 回の投稿で完了する", async () => {
    let callCount = 0;
    server.use(
      http.post(SLACK_API, () => {
        callCount++;
        return HttpResponse.json({ ok: true, ts: `ts-${callCount}` });
      }),
    );

    const results = await postThreadReplies(CHANNEL, "1234567890.123456", "短いテキスト", TOKEN, {
      delayMs: 0,
    });
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(callCount).toBe(1);
  });

  it("閾値を超えるテキストは複数回に分割して投稿する", async () => {
    let callCount = 0;
    server.use(
      http.post(SLACK_API, () => {
        callCount++;
        return HttpResponse.json({ ok: true, ts: `ts-${callCount}` });
      }),
    );

    const longText = "a".repeat(MAX_MESSAGE_LENGTH + 100);
    const results = await postThreadReplies(CHANNEL, "1234567890.123456", longText, TOKEN, {
      delayMs: 0,
    });
    expect(results.length).toBe(2);
    expect(callCount).toBe(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("途中の投稿が失敗しても残りの分割を投稿し続ける", async () => {
    let callCount = 0;
    server.use(
      http.post(SLACK_API, () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json({ ok: false, error: "rate_limited" });
        }
        return HttpResponse.json({ ok: true, ts: `ts-${callCount}` });
      }),
    );

    const longText = "b".repeat(MAX_MESSAGE_LENGTH * 2 + 100);
    const results = await postThreadReplies(CHANNEL, "1234567890.123456", longText, TOKEN, {
      delayMs: 0,
    });
    expect(results.length).toBe(3);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
    expect(results[2].success).toBe(true);
  });
});

describe("summaryToBlocks", () => {
  const SAMPLE_SUMMARY = `## ひとこと
- 自動更新がバイナリまで対象に

## 変更内容

### 新規追加
- #入力で GitHub Issue 参照機能を追加

### 修正
- 502 エラーを自動リトライ

## 用語解説
- 自動更新: ツールが起動時に新しいバージョンを取得する機能`;

  it("header ブロックに source と version が含まれる", () => {
    const blocks = summaryToBlocks("claude-code", "1.0.0", SAMPLE_SUMMARY);
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.type === "header" && header.text.text).toContain("claude-code");
    expect(header?.type === "header" && header.text.text).toContain("1.0.0");
  });

  it("ひとこと セクションに 💬 絵文字が付く", () => {
    const blocks = summaryToBlocks("src", "1.0", SAMPLE_SUMMARY);
    const section = blocks.find((b) => b.type === "section" && b.text.text.includes("💬"));
    expect(section).toBeDefined();
  });

  it("存在しないカテゴリのブロックは生成しない", () => {
    const blocks = summaryToBlocks("src", "1.0", "## ひとこと\n- only this");
    const blockTexts = blocks.filter((b) => b.type === "section").map((b) => b.text.text);
    expect(blockTexts.some((t) => t.includes("🆕"))).toBe(false);
    expect(blockTexts.some((t) => t.includes("🔧"))).toBe(false);
  });

  it("divider が ひとこと とカテゴリ群の間に挿入される", () => {
    const blocks = summaryToBlocks("src", "1.0", SAMPLE_SUMMARY);
    const hitokotoIdx = blocks.findIndex((b) => b.type === "section" && b.text.text.includes("💬"));
    const dividerIdx = blocks.findIndex((b) => b.type === "divider");
    expect(dividerIdx).toBeGreaterThan(hitokotoIdx);
  });

  it("- xxx を • xxx に変換する", () => {
    const blocks = summaryToBlocks("src", "1.0", "## ひとこと\n- テスト行");
    const section = blocks.find(
      (b): b is Extract<typeof b, { type: "section" }> =>
        b.type === "section" && b.text.text.includes("ひとこと"),
    );
    expect(section?.text.text).toContain("• テスト行");
    expect(section?.text.text).not.toContain("- テスト行");
  });

  it("空の summary でも header ブロックが生成される", () => {
    const blocks = summaryToBlocks("src", "1.0", "");
    expect(blocks.some((b) => b.type === "header")).toBe(true);
  });

  it("**bold** を Slack mrkdwn の *bold* に変換する", () => {
    const blocks = summaryToBlocks("src", "1.0", "## 用語解説\n- **用語**: 解説テキスト");
    const section = blocks.find(
      (b): b is Extract<typeof b, { type: "section" }> =>
        b.type === "section" && b.text.text.includes("用語解説"),
    );
    expect(section?.text.text).toContain("*用語*");
    expect(section?.text.text).not.toContain("**用語**");
  });

  it("section text が 3000 文字を超えない", () => {
    const longLines = Array.from({ length: 100 }, (_, i) => `- ${"x".repeat(50)} ${i}`).join("\n");
    const summary = `## 新規追加\n${longLines}`;
    const blocks = summaryToBlocks("src", "1.0", summary);
    for (const block of blocks) {
      if (block.type === "section") {
        expect(block.text.text.length).toBeLessThanOrEqual(3000);
      }
    }
  });
});

describe("postSummary (Block Kit)", () => {
  it("blocks フィールドが付与される", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postSummary(CHANNEL, "claude-code", "1.0.0", "## ひとこと\n- テスト", TOKEN);
    expect(capturedBody.blocks).toBeDefined();
    expect(Array.isArray(capturedBody.blocks)).toBe(true);
  });

  it("空の summary でもフォールバックして投稿できる", async () => {
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    const result = await postSummary(CHANNEL, "claude-code", "1.0.0", "", TOKEN);
    expect(result.success).toBe(true);
  });
});

describe("postThreadReply (Block Kit)", () => {
  it("blocks フィールドが付与される", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postThreadReply(CHANNEL, "1234567890.123456", "## 1.0.0\n- Fixed bug", TOKEN, {
      delayMs: 0,
    });
    expect(capturedBody.blocks).toBeDefined();
    expect(Array.isArray(capturedBody.blocks)).toBe(true);
  });
});

describe("SlackBlock ImageBlock 型", () => {
  // What: ImageBlock 型が SlackBlock Union に含まれることを検証する
  // Why: HTML プロバイダの画像・GIF を Slack に投稿するために image ブロック型が必要

  it("image ブロックを SlackBlock 型として扱える", () => {
    // Given: image タイプの SlackBlock を定義
    const imageBlock: SlackBlock = {
      type: "image",
      image_url: "https://example.com/image.png",
      alt_text: "テスト画像",
    };

    // Then: 型チェックが通り、プロパティにアクセスできる
    expect(imageBlock.type).toBe("image");
  });

  it("title 付きの image ブロックを SlackBlock 型として扱える", () => {
    // Given: title フィールド付きの image ブロックを定義
    const imageBlock: SlackBlock = {
      type: "image",
      image_url: "https://example.com/image.png",
      alt_text: "テスト画像",
      title: { type: "plain_text", text: "画像タイトル" },
    };

    // Then: 型チェックが通る
    expect(imageBlock.type).toBe("image");
  });
});

describe("postBlocks", () => {
  // What: 事前ビルド済みの Block Kit ブロック配列を Slack に投稿する関数を検証する
  // Why: HTML プロバイダは独自の Block Kit メッセージビルダーを持ち、
  //      ビルド済み blocks を受け取って投稿する汎用関数が必要

  it("ビルド済みブロック配列を Slack に投稿し、ts を返す", async () => {
    // Given: Slack API が成功レスポンスを返す
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.111111" });
      }),
    );

    // Given: ビルド済みの blocks 配列
    const blocks: SlackBlock[] = [
      { type: "header", text: { type: "plain_text", text: "テスト", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: "本文テキスト" } },
      {
        type: "image",
        image_url: "https://example.com/image.png",
        alt_text: "テスト画像",
      },
    ];

    // When: postBlocks を呼び出す
    const result = await postBlocks(CHANNEL, blocks, "フォールバックテキスト", TOKEN);

    // Then: 成功レスポンスが返る
    expect(result.success).toBe(true);
    expect(result.ts).toBe("1234567890.111111");

    // Then: blocks がペイロードに含まれる
    expect(capturedBody.blocks).toEqual(blocks);
    expect(capturedBody.channel).toBe(CHANNEL);
    expect(capturedBody.text).toBe("フォールバックテキスト");
  });

  it("botProfile を渡した場合、username と icon_emoji がペイロードに含まれる", async () => {
    // Given: Slack API が成功レスポンスを返す
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.222222" });
      }),
    );

    const blocks: SlackBlock[] = [{ type: "section", text: { type: "mrkdwn", text: "テスト" } }];

    const botProfile: BotProfile = { name: "Gemini CLI Bot", emoji: ":gemini:" };

    // When: botProfile 付きで postBlocks を呼び出す
    await postBlocks(CHANNEL, blocks, "テキスト", TOKEN, botProfile);

    // Then: bot profile のフィールドが含まれる
    expect(capturedBody.username).toBe("Gemini CLI Bot");
    expect(capturedBody.icon_emoji).toBe(":gemini:");
  });

  it("botProfile を渡さない場合、username と icon_emoji がペイロードに含まれない", async () => {
    // Given: Slack API が成功レスポンスを返す
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.333333" });
      }),
    );

    const blocks: SlackBlock[] = [{ type: "section", text: { type: "mrkdwn", text: "テスト" } }];

    // When: botProfile なしで postBlocks を呼び出す
    await postBlocks(CHANNEL, blocks, "テキスト", TOKEN);

    // Then: bot profile のフィールドが含まれない
    expect(capturedBody.username).toBeUndefined();
    expect(capturedBody.icon_emoji).toBeUndefined();
  });

  it("Slack API がエラーを返した場合、success: false とエラー内容を返す", async () => {
    // Given: Slack API がエラーを返す
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.json({ ok: false, error: "channel_not_found" });
      }),
    );

    const blocks: SlackBlock[] = [{ type: "section", text: { type: "mrkdwn", text: "テスト" } }];

    // When: postBlocks を呼び出す
    const result = await postBlocks(CHANNEL, blocks, "テキスト", TOKEN);

    // Then: エラーが返る
    expect(result.success).toBe(false);
    expect(result.error).toContain("channel_not_found");
  });

  it("ネットワークエラーの場合、success: false を返す", async () => {
    // Given: ネットワークエラーが発生する
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.error();
      }),
    );

    const blocks: SlackBlock[] = [{ type: "section", text: { type: "mrkdwn", text: "テスト" } }];

    // When: postBlocks を呼び出す
    const result = await postBlocks(CHANNEL, blocks, "テキスト", TOKEN);

    // Then: エラーが返る
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("postError", () => {
  it("ソース名とエラー内容を含むメッセージを投稿する", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    const result = await postError(CHANNEL, "claude-code", "HTTP 404 Not Found", TOKEN);
    expect(result.success).toBe(true);
    expect(capturedBody.text).toContain("claude-code");
    expect(capturedBody.text).toContain("HTTP 404 Not Found");
  });

  it("mrkdwn フォーマットが有効である", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(SLACK_API, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, ts: "1234567890.000000" });
      }),
    );

    await postError(CHANNEL, "codex", "エラー", TOKEN);
    expect(capturedBody.mrkdwn).toBe(true);
  });

  it("Slack 投稿が失敗した場合、success: false を返す（処理は継続可能）", async () => {
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.json({ ok: false, error: "invalid_auth" });
      }),
    );

    const result = await postError(CHANNEL, "copilot-cli", "timeout", TOKEN);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid_auth");
  });

  it("ネットワークエラーの場合、success: false を返す（処理は継続可能）", async () => {
    server.use(
      http.post(SLACK_API, () => {
        return HttpResponse.error();
      }),
    );

    const result = await postError(CHANNEL, "claude-code", "network error", TOKEN);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
