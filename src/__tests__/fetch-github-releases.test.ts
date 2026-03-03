import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchGitHubReleases, formatReleasesAsText } from "../services/fetch-service.js";

const RELEASES_URL = "https://api.github.com/repos/openai/codex/releases";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeRelease(tag: string, publishedAt: string, body: string, prerelease = false) {
  return { tag_name: tag, published_at: publishedAt, body, prerelease };
}

describe("fetchGitHubReleases", () => {
  it("リリース情報を GitHubReleaseEntry 配列で返す", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([
          makeRelease("v1.1.0", "2026-02-28T12:00:00Z", "- Bug fix"),
          makeRelease("v1.0.0", "2026-02-20T10:00:00Z", "- Initial release"),
        ]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex");
    expect(result).toEqual([
      { tagName: "v1.1.0", publishedAt: "2026-02-28T12:00:00Z", body: "- Bug fix" },
      { tagName: "v1.0.0", publishedAt: "2026-02-20T10:00:00Z", body: "- Initial release" },
    ]);
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
    expect(capturedUrl?.searchParams.get("per_page")).toBe("50");
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

  it("prerelease が true のリリースは除外される", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([
          makeRelease("v1.1.0-rc.1", "2026-02-28T12:00:00Z", "- RC", true),
          makeRelease("v1.0.0", "2026-02-20T10:00:00Z", "- Initial release"),
        ]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex");
    expect(result).toEqual([
      { tagName: "v1.0.0", publishedAt: "2026-02-20T10:00:00Z", body: "- Initial release" },
    ]);
  });

  it("リリースが空の場合は空配列を返す", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex");
    expect(result).toEqual([]);
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

  it("since より古いリリースは除外される", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([
          makeRelease("v1.2.0", "2026-03-01T10:00:00Z", "- New feature"),
          makeRelease("v1.1.0", "2026-02-28T12:00:00Z", "- Bug fix"),
          makeRelease("v1.0.0", "2026-02-20T10:00:00Z", "- Initial release"),
        ]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex", undefined, {
      since: "2026-02-28T12:00:00Z",
    });
    expect(result).toEqual([
      { tagName: "v1.2.0", publishedAt: "2026-03-01T10:00:00Z", body: "- New feature" },
    ]);
  });

  it("since が未指定の場合は全件返す", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([
          makeRelease("v1.1.0", "2026-02-28T12:00:00Z", "- Bug fix"),
          makeRelease("v1.0.0", "2026-02-20T10:00:00Z", "- Initial release"),
        ]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex");
    expect(result).toEqual([
      { tagName: "v1.1.0", publishedAt: "2026-02-28T12:00:00Z", body: "- Bug fix" },
      { tagName: "v1.0.0", publishedAt: "2026-02-20T10:00:00Z", body: "- Initial release" },
    ]);
  });

  it("since より新しいリリースが存在しない場合は空配列を返す", async () => {
    server.use(
      http.get(RELEASES_URL, () => {
        return HttpResponse.json([
          makeRelease("v1.0.0", "2026-02-20T10:00:00Z", "- Initial release"),
        ]);
      }),
    );

    const result = await fetchGitHubReleases("openai", "codex", undefined, {
      since: "2026-02-20T10:00:00Z",
    });
    expect(result).toEqual([]);
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

/**
 * What: GitHubReleaseEntry 配列を Markdown テキストに変換するヘルパーのテスト
 * Why: fetchOne など結合テキストが必要な箇所で正しくフォーマットされることを保証する
 */
describe("formatReleasesAsText", () => {
  it("複数エントリを Markdown 形式で連結する", () => {
    // Given: 2つの GitHubReleaseEntry
    const entries = [
      { tagName: "v1.1.0", publishedAt: "2026-02-28T12:00:00Z", body: "- Bug fix" },
      { tagName: "v1.0.0", publishedAt: "2026-02-20T10:00:00Z", body: "- Initial release" },
    ];

    // When: テキストにフォーマットする
    const result = formatReleasesAsText(entries);

    // Then: ## tag (date)\nbody の形式で \n\n 区切りで連結される
    expect(result).toBe(
      "## v1.1.0 (2026-02-28T12:00:00Z)\n- Bug fix\n\n## v1.0.0 (2026-02-20T10:00:00Z)\n- Initial release",
    );
  });

  it("空配列の場合は空文字列を返す", () => {
    // Given: 空配列
    // When: テキストにフォーマットする
    const result = formatReleasesAsText([]);

    // Then: 空文字列が返る
    expect(result).toBe("");
  });

  it("単一エントリの場合はそのまま返す", () => {
    // Given: 1つの GitHubReleaseEntry
    const entries = [
      { tagName: "v1.0.0", publishedAt: "2026-02-20T10:00:00Z", body: "- Initial release" },
    ];

    // When: テキストにフォーマットする
    const result = formatReleasesAsText(entries);

    // Then: 単一セクションが返る
    expect(result).toBe("## v1.0.0 (2026-02-20T10:00:00Z)\n- Initial release");
  });
});
