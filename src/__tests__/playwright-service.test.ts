import { afterEach, describe, expect, it, vi } from "vitest";

// Playwright のモック
const mockContent = vi.fn<() => Promise<string>>();
const mockGoto = vi.fn<() => Promise<void>>();
const _mockClose = vi.fn<() => Promise<void>>();
const mockNewPage = vi.fn(() => ({
  goto: mockGoto,
  content: mockContent,
}));
const mockBrowserClose = vi.fn<() => Promise<void>>();
const mockLaunch = vi.fn(() => ({
  newPage: mockNewPage,
  close: mockBrowserClose,
}));

vi.mock("playwright", () => ({
  chromium: {
    launch: mockLaunch,
  },
}));

// モック後にインポート
const { fetchHeadlessHtml } = await import("../services/playwright-service.js");

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchHeadlessHtml", () => {
  it("Playwright で JS レンダリング後の HTML を取得して返す", async () => {
    const html = "<html><body><div>Rendered Content</div></body></html>";
    mockContent.mockResolvedValue(html);

    const result = await fetchHeadlessHtml("https://example.com/changelog");

    expect(result).toBe(html);
    expect(mockLaunch).toHaveBeenCalledOnce();
    expect(mockNewPage).toHaveBeenCalledOnce();
    expect(mockGoto).toHaveBeenCalledWith("https://example.com/changelog", {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    expect(mockBrowserClose).toHaveBeenCalledOnce();
  });

  it("waitUntil オプションをカスタマイズできる", async () => {
    mockContent.mockResolvedValue("<html></html>");

    await fetchHeadlessHtml("https://example.com", { waitUntil: "load" });

    expect(mockGoto).toHaveBeenCalledWith("https://example.com", {
      waitUntil: "load",
      timeout: 30_000,
    });
  });

  it("タイムアウトをカスタマイズできる", async () => {
    mockContent.mockResolvedValue("<html></html>");

    await fetchHeadlessHtml("https://example.com", { timeoutMs: 60_000 });

    expect(mockGoto).toHaveBeenCalledWith("https://example.com", {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
  });

  it("ナビゲーション失敗時にエラーをスローし、ブラウザを閉じる", async () => {
    mockGoto.mockRejectedValue(new Error("Navigation timeout exceeded"));

    await expect(fetchHeadlessHtml("https://example.com")).rejects.toThrow(
      "Navigation timeout exceeded",
    );
    expect(mockBrowserClose).toHaveBeenCalledOnce();
  });

  it("ブラウザ起動失敗時にエラーをスローする", async () => {
    mockLaunch.mockRejectedValueOnce(new Error("Browser launch failed"));

    await expect(fetchHeadlessHtml("https://example.com")).rejects.toThrow("Browser launch failed");
  });
});
