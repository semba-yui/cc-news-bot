import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchStaticHtml } from "../services/html-fetch-service.js";

const TEST_URL = "https://example.com/changelog";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchStaticHtml", () => {
  it("指定 URL から HTML テキストを取得して返す", async () => {
    const html = "<html><body><h1>Changelog</h1></body></html>";
    server.use(
      http.get(TEST_URL, () => {
        return HttpResponse.html(html);
      }),
    );

    const result = await fetchStaticHtml(TEST_URL);
    expect(result).toBe(html);
  });

  it("User-Agent ヘッダーがデフォルトで設定される", async () => {
    let capturedUserAgent: string | null = null;
    server.use(
      http.get(TEST_URL, ({ request }) => {
        capturedUserAgent = request.headers.get("User-Agent");
        return HttpResponse.html("<html></html>");
      }),
    );

    await fetchStaticHtml(TEST_URL);
    expect(capturedUserAgent).toContain("Mozilla/5.0");
  });

  it("カスタム User-Agent を指定できる", async () => {
    let capturedUserAgent: string | null = null;
    server.use(
      http.get(TEST_URL, ({ request }) => {
        capturedUserAgent = request.headers.get("User-Agent");
        return HttpResponse.html("<html></html>");
      }),
    );

    await fetchStaticHtml(TEST_URL, { userAgent: "CustomBot/1.0" });
    expect(capturedUserAgent).toBe("CustomBot/1.0");
  });

  it("HTTP エラー (404) の場合はエラーをスローする", async () => {
    server.use(
      http.get(TEST_URL, () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    await expect(fetchStaticHtml(TEST_URL)).rejects.toThrow("404");
  });

  it("HTTP エラー (500) の場合はエラーをスローする", async () => {
    server.use(
      http.get(TEST_URL, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    await expect(fetchStaticHtml(TEST_URL)).rejects.toThrow("500");
  });

  it("ネットワークエラーの場合はエラーをスローする", async () => {
    server.use(
      http.get(TEST_URL, () => {
        return HttpResponse.error();
      }),
    );

    await expect(fetchStaticHtml(TEST_URL)).rejects.toThrow();
  });

  it("タイムアウトでリクエストが中断される", async () => {
    server.use(
      http.get(TEST_URL, async () => {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        return HttpResponse.html("too late");
      }),
    );

    await expect(fetchStaticHtml(TEST_URL, { timeoutMs: 100 })).rejects.toThrow();
  }, 10_000);
});
