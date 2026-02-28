import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchGitHubReleases } from "../services/fetch-service.js";

const RELEASES_URL = "https://api.github.com/repos/openai/codex/releases";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeRelease(tag: string, publishedAt: string, body: string) {
  return { tag_name: tag, published_at: publishedAt, body };
}

describe("fetchGitHubReleases", () => {
  it("リリース情報を Markdown 形式で連結して返す", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([
          makeRelease("v1.1.0", "2026-02-28T12:00:00Z", "- Bug fix"),
          makeRelease("v1.0.0", "2026-02-20T10:00:00Z", "- Initial release"),
        ]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex");
    expect(result).toBe(
      "## v1.1.0 (2026-02-28T12:00:00Z)\n- Bug fix\n\n## v1.0.0 (2026-02-20T10:00:00Z)\n- Initial release",
    );
  });

  it("per_page=10 でリクエストする", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(RELEASES_URL, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );

    await fetchGitHubReleases("openai", "codex");
    expect(capturedUrl?.searchParams.get("per_page")).toBe("10");
  });

  it("GITHUB_TOKEN が指定された場合 Authorization ヘッダーを送信する", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(RELEASES_URL, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json([]);
      }),
    );

    await fetchGitHubReleases("openai", "codex", "ghp_test123");
    expect(capturedAuth).toBe("Bearer ghp_test123");
  });

  it("GITHUB_TOKEN が未指定の場合 Authorization ヘッダーを送信しない", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(RELEASES_URL, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json([]);
      }),
    );

    await fetchGitHubReleases("openai", "codex");
    expect(capturedAuth).toBeNull();
  });

  it("リリースが空の場合は空文字列を返す", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex");
    expect(result).toBe("");
  });

  it("HTTP エラー (404) の場合はエラーをスローする", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    await expect(fetchGitHubReleases("openai", "codex")).rejects.toThrow("404");
  });

  it("HTTP エラー (403 レート制限) の場合はエラーをスローする", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return new HttpResponse(null, { status: 403 });
      }),
    );

    await expect(fetchGitHubReleases("openai", "codex")).rejects.toThrow("403");
  });

  it("ネットワークエラーの場合はエラーをスローする", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.error();
      }),
    );

    await expect(fetchGitHubReleases("openai", "codex")).rejects.toThrow();
  });

  it("タイムアウトでリクエストが中断される", async () => {
    server.use(
      http.get(RELEASES_URL, async () => {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        return HttpResponse.json([]);
      }),
    );

    await expect(
      fetchGitHubReleases("openai", "codex", undefined, { timeoutMs: 100 }),
    ).rejects.toThrow();
  }, 10_000);
});
