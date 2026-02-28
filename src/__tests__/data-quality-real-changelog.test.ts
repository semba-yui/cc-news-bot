import { describe, expect, it } from "vitest";
import { fetchGitHubReleases, fetchRawMarkdown } from "../services/fetch-service.js";
import { detectChanges } from "../services/diff-service.js";
import { MAX_MESSAGE_LENGTH, splitText } from "../services/slack-service.js";

/**
 * データ品質テスト: 実データの構造・サイズ・diff 可能性を検証
 *
 * 実行方法: RUN_REAL_E2E=1 npx vitest run src/__tests__/data-quality-real-changelog.test.ts
 */

const SKIP = !process.env.RUN_REAL_E2E;

const CLAUDE_CODE_URL =
  "https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md";
const COPILOT_CLI_URL = "https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md";

describe.skipIf(SKIP)("データ品質: Claude Code CHANGELOG.md", () => {
  let content: string;

  it("取得コンテンツが非空で Markdown 構造を持つ", async () => {
    content = await fetchRawMarkdown(CLAUDE_CODE_URL);
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/^#/);
    expect(content).toContain("##");
  }, 30_000);

  it("サイズが妥当な範囲内（1KB 以上 5MB 未満）", async () => {
    if (!content) content = await fetchRawMarkdown(CLAUDE_CODE_URL);
    expect(content.length).toBeGreaterThan(1_000);
    expect(content.length).toBeLessThan(5 * 1024 * 1024);
  }, 30_000);

  it("detectChanges で diff 可能", async () => {
    if (!content) content = await fetchRawMarkdown(CLAUDE_CODE_URL);
    const modified = "## v999.0.0\n- Test entry\n\n" + content;
    const result = detectChanges("claude-code", modified, content);
    expect(result.hasChanges).toBe(true);
    expect(result.diffText).toBeDefined();
    expect(result.diffText!.length).toBeGreaterThan(0);
  }, 30_000);

  it("SHA-256 ハッシュが安定している", async () => {
    if (!content) content = await fetchRawMarkdown(CLAUDE_CODE_URL);
    const r1 = detectChanges("claude-code", content, null);
    const r2 = detectChanges("claude-code", content, null);
    expect(r1.newHash).toBe(r2.newHash);
    expect(r1.newHash).toMatch(/^[a-f0-9]{64}$/);
  }, 30_000);

  it("diff 出力が Slack メッセージ分割可能", async () => {
    if (!content) content = await fetchRawMarkdown(CLAUDE_CODE_URL);
    const modified = "## v999.0.0\n- Test entry\n\n" + content;
    const result = detectChanges("claude-code", modified, content);
    const chunks = splitText(result.diffText!);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    }
  }, 30_000);
});

describe.skipIf(SKIP)("データ品質: OpenAI Codex GitHub Releases", () => {
  it("リリース情報を取得でき Markdown 構造を持つ", async () => {
    const content = await fetchGitHubReleases("openai", "codex", process.env.GITHUB_TOKEN);
    // リリースが 0 件の場合は空文字列
    if (content.length === 0) {
      console.warn("Codex にリリースが存在しません（空文字列）");
      return;
    }
    expect(content).toContain("##");
    expect(content.length).toBeGreaterThan(10);
  }, 30_000);

  it("取得データが detectChanges で diff 可能", async () => {
    const content = await fetchGitHubReleases("openai", "codex", process.env.GITHUB_TOKEN);
    if (content.length === 0) return;
    const modified = "## v999.0.0 (2026-01-01T00:00:00Z)\nFake release\n\n" + content;
    const result = detectChanges("codex", modified, content);
    expect(result.hasChanges).toBe(true);
    expect(result.diffText).toBeDefined();
  }, 30_000);
});

describe.skipIf(SKIP)("データ品質: copilot-cli changelog（存在しない可能性あり）", () => {
  it("取得時にクラッシュしない（成功/404 いずれも許容）", async () => {
    try {
      const content = await fetchRawMarkdown(COPILOT_CLI_URL);
      // 成功した場合: 非空の文字列であること
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
    } catch (err) {
      // 失敗した場合: エラーメッセージが記述的であること
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBeTruthy();
    }
  }, 30_000);

  it("取得成功時は diff 可能で分割可能", async () => {
    let content: string;
    try {
      content = await fetchRawMarkdown(COPILOT_CLI_URL);
    } catch {
      // 取得失敗時はスキップ
      return;
    }
    const modified = "## Test\n- entry\n\n" + content;
    const result = detectChanges("copilot-cli", modified, content);
    expect(result.hasChanges).toBe(true);
    const chunks = splitText(result.diffText!);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    }
  }, 30_000);
});
