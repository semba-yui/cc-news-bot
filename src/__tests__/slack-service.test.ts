import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  postSummary,
  postThreadReply,
  postThreadReplies,
  postError,
  splitText,
  MAX_MESSAGE_LENGTH,
} from "../services/slack-service.js";

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
