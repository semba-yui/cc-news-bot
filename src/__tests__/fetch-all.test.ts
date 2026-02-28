import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { SourceConfig } from "../config/sources.js";
import { fetchAll } from "../services/fetch-service.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const RAW_URL_A = "https://raw.example.com/a/CHANGELOG.md";
const RAW_URL_B = "https://raw.example.com/b/changelog.md";
const RELEASES_URL = "https://api.github.com/repos/test-org/test-repo/releases";

const sources: SourceConfig[] = [
  { name: "source-a", type: "raw_markdown", url: RAW_URL_A },
  {
    name: "source-b",
    type: "github_releases",
    url: RELEASES_URL,
    owner: "test-org",
    repo: "test-repo",
  },
  { name: "source-c", type: "raw_markdown", url: RAW_URL_B },
];

describe("fetchAll", () => {
  it("全ソースを取得し FetchResult 配列を返す", async () => {
    server.use(
      http.get(RAW_URL_A, () => HttpResponse.text("# Changelog A")),
      http.get(RELEASES_URL, () =>
        HttpResponse.json([
          {
            tag_name: "v1.0.0",
            published_at: "2026-01-01T00:00:00Z",
            body: "Release notes",
          },
        ]),
      ),
      http.get(RAW_URL_B, () => HttpResponse.text("# Changelog B")),
    );

    const results = await fetchAll(sources);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      source: "source-a",
      success: true,
      content: "# Changelog A",
    });
    expect(results[1]).toEqual({
      source: "source-b",
      success: true,
      content: "## v1.0.0 (2026-01-01T00:00:00Z)\nRelease notes",
      latestReleasedAt: "2026-01-01T00:00:00Z",
    });
    expect(results[2]).toEqual({
      source: "source-c",
      success: true,
      content: "# Changelog B",
    });
  });

  it("1 つのソースが失敗しても他のソースは成功する", async () => {
    server.use(
      http.get(RAW_URL_A, () => HttpResponse.text("# Changelog A")),
      http.get(RELEASES_URL, () => new HttpResponse(null, { status: 500 })),
      http.get(RAW_URL_B, () => HttpResponse.text("# Changelog B")),
    );

    const results = await fetchAll(sources);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      source: "source-a",
      success: true,
      content: "# Changelog A",
    });
    expect(results[1].source).toBe("source-b");
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBeDefined();
    expect(results[2]).toEqual({
      source: "source-c",
      success: true,
      content: "# Changelog B",
    });
  });

  it("全ソースが失敗してもエラーをスローしない", async () => {
    server.use(
      http.get(RAW_URL_A, () => new HttpResponse(null, { status: 404 })),
      http.get(RELEASES_URL, () => new HttpResponse(null, { status: 403 })),
      http.get(RAW_URL_B, () => new HttpResponse(null, { status: 500 })),
    );

    const results = await fetchAll(sources);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }
  });

  it("失敗した FetchResult にソース名とエラー内容が含まれる", async () => {
    server.use(
      http.get(RAW_URL_A, () => new HttpResponse(null, { status: 404 })),
      http.get(RELEASES_URL, () => HttpResponse.json([])),
      http.get(RAW_URL_B, () => HttpResponse.text("ok")),
    );

    const results = await fetchAll(sources);
    const failed = results.find((r) => !r.success);

    expect(failed).toBeDefined();
    expect(failed!.source).toBe("source-a");
    expect(failed!.error).toContain("404");
  });

  it("GITHUB_TOKEN を github_releases ソースに渡す", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(RAW_URL_A, () => HttpResponse.text("ok")),
      http.get(RELEASES_URL, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json([]);
      }),
      http.get(RAW_URL_B, () => HttpResponse.text("ok")),
    );

    await fetchAll(sources, { githubToken: "ghp_abc123" });
    expect(capturedAuth).toBe("Bearer ghp_abc123");
  });

  it("空のソース配列に対して空の結果を返す", async () => {
    const results = await fetchAll([]);
    expect(results).toEqual([]);
  });
});
