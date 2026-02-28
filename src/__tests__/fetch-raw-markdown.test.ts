import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchRawMarkdown } from "../services/fetch-service.js";

const TEST_URL = "https://raw.githubusercontent.com/example/repo/main/CHANGELOG.md";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchRawMarkdown", () => {
  it("指定 URL から Markdown テキストを取得して返す", async () => {
    const markdown = "# Changelog\n\n## v1.0.0\n- Initial release";
    server.use(
      http.get(TEST_URL, () => {
        return HttpResponse.text(markdown);
      }),
    );

    const result = await fetchRawMarkdown(TEST_URL);
    expect(result).toBe(markdown);
  });

  it("HTTP エラー (404) の場合はエラーをスローする", async () => {
    server.use(
      http.get(TEST_URL, () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    await expect(fetchRawMarkdown(TEST_URL)).rejects.toThrow("404");
  });

  it("HTTP エラー (500) の場合はエラーをスローする", async () => {
    server.use(
      http.get(TEST_URL, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    await expect(fetchRawMarkdown(TEST_URL)).rejects.toThrow("500");
  });

  it("ネットワークエラーの場合はエラーをスローする", async () => {
    server.use(
      http.get(TEST_URL, () => {
        return HttpResponse.error();
      }),
    );

    await expect(fetchRawMarkdown(TEST_URL)).rejects.toThrow();
  });

  it("30 秒のタイムアウトでリクエストが中断される", async () => {
    server.use(
      http.get(TEST_URL, async () => {
        // タイムアウトより長く待機させる
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        return HttpResponse.text("too late");
      }),
    );

    await expect(fetchRawMarkdown(TEST_URL, { timeoutMs: 100 })).rejects.toThrow();
  }, 10_000);
});
