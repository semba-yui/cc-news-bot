import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type DiffResult, detectChanges, splitIntoVersions, writeDiff } from "../services/diff-service.js";

describe("detectChanges", () => {
  it("前回スナップショットが null（初回実行）の場合、hasChanges: false を返す", () => {
    const result = detectChanges("claude-code", "# Changelog\n- v1.0", null);

    expect(result.source).toBe("claude-code");
    expect(result.hasChanges).toBe(false);
    expect(result.newContent).toBe("# Changelog\n- v1.0");
    expect(result.diffText).toBeUndefined();
  });

  it("コンテンツが同一の場合、hasChanges: false を返す", () => {
    const content = "# Changelog\n\n## v1.0.0\n- Initial release";
    const result = detectChanges("codex", content, content);

    expect(result.hasChanges).toBe(false);
    expect(result.oldHash).toBe(result.newHash);
    expect(result.diffText).toBeUndefined();
  });

  it("コンテンツが異なる場合、hasChanges: true を返す", () => {
    const oldContent = "# Changelog\n\n## v1.0.0\n- Initial release";
    const newContent = "# Changelog\n\n## v2.0.0\n- New feature\n\n## v1.0.0\n- Initial release";
    const result = detectChanges("claude-code", newContent, oldContent);

    expect(result.hasChanges).toBe(true);
    expect(result.oldHash).not.toBe(result.newHash);
    expect(result.diffText).toBeDefined();
    expect(result.diffText).toContain("v2.0.0");
  });

  it("同一コンテンツに対して同一ハッシュを返す", () => {
    const content = "# Changelog\n- v1.0";
    const result1 = detectChanges("claude-code", content, "old");
    const result2 = detectChanges("codex", content, "old");

    expect(result1.newHash).toBe(result2.newHash);
  });

  it("異なるコンテンツに対して異なるハッシュを返す", () => {
    const result1 = detectChanges("claude-code", "content A", "old");
    const result2 = detectChanges("claude-code", "content B", "old");

    expect(result1.newHash).not.toBe(result2.newHash);
  });

  it("新バージョンのセクション原文のみを diffText として返す", () => {
    const oldContent = "## v1.0.0\n- Initial release";
    const newContent = "## v2.0.0\n- New feature\n\n## v1.0.0\n- Initial release";
    const result = detectChanges("copilot-cli", newContent, oldContent);

    expect(result.hasChanges).toBe(true);
    expect(result.diffText).toBe("## v2.0.0\n- New feature");
    expect(result.diffText).not.toContain("v1.0.0");
  });

  it("バージョンヘッダーがない場合は現在コンテンツをそのまま返す", () => {
    const oldContent = "line1\nline2\nline3";
    const newContent = "line1\nmodified\nline3";
    const result = detectChanges("copilot-cli", newContent, oldContent);

    expect(result.hasChanges).toBe(true);
    expect(result.diffText).toBe(newContent);
  });

  it("newContent を結果に含める", () => {
    const newContent = "# New Content";
    const result = detectChanges("claude-code", newContent, "# Old");

    expect(result.newContent).toBe(newContent);
  });

  it("前回スナップショットが null の場合でも newHash が設定される", () => {
    const result = detectChanges("claude-code", "content", null);

    expect(result.newHash).toBeTruthy();
    expect(result.oldHash).toBe("");
  });
});

describe("splitIntoVersions", () => {
  it("raw_markdown: ## 行でバージョンを分割する", () => {
    const content = "## 2.1.63\n- Feature A\n\n## 2.1.62\n- Feature B";
    const sections = splitIntoVersions(content, "raw_markdown");

    expect(sections).toHaveLength(2);
    expect(sections[0].version).toBe("2.1.63");
    expect(sections[0].safeVersion).toBe("2.1.63");
    expect(sections[0].content).toBe("## 2.1.63\n- Feature A");
    expect(sections[1].version).toBe("2.1.62");
    expect(sections[1].content).toBe("## 2.1.62\n- Feature B");
  });

  it("raw_markdown: バージョンヘッダーがない場合は空配列を返す", () => {
    const sections = splitIntoVersions("some content without headers", "raw_markdown");
    expect(sections).toHaveLength(0);
  });

  it("github_releases: タイムスタンプ付きの ## 行のみをバージョン境界とする", () => {
    const content = "## v1.1.0 (2026-03-01T10:00:00Z)\n### New Features\n- Feature A";
    const sections = splitIntoVersions(content, "github_releases");

    expect(sections).toHaveLength(1);
    expect(sections[0].version).toBe("v1.1.0");
    expect(sections[0].content).toContain("### New Features");
  });

  it("github_releases: ## New Features のような sub-section は無視する", () => {
    const content = "## v1.0.0 (2026-02-01T00:00:00Z)\n## New Features\n- Feature";
    const sections = splitIntoVersions(content, "github_releases");

    expect(sections).toHaveLength(1);
    expect(sections[0].version).toBe("v1.0.0");
    expect(sections[0].content).toContain("## New Features");
  });

  it("バージョンラベルが日付サフィックスを含む場合、最初のトークンのみを取り出す", () => {
    const content = "## 0.0.420 - 2026-02-27\n- change";
    const sections = splitIntoVersions(content, "raw_markdown");

    expect(sections).toHaveLength(1);
    expect(sections[0].version).toBe("0.0.420");
  });
});

describe("writeDiff", () => {
  const testDiffsDir = resolve(import.meta.dirname, "../../data-test-diff/diffs");

  beforeEach(() => {
    mkdirSync(testDiffsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(resolve(import.meta.dirname, "../../data-test-diff"), { recursive: true, force: true });
  });

  it("差分テキストをファイルに書き出す（バージョンヘッダーあり）", async () => {
    const diffResult: DiffResult = {
      source: "claude-code",
      hasChanges: true,
      oldHash: "old-hash",
      newHash: "new-hash",
      diffText: "## 1.0.0\n+added",
      newContent: "new content",
    };

    await writeDiff(diffResult, testDiffsDir, "raw_markdown");

    const saved = readFileSync(resolve(testDiffsDir, "claude-code-1.0.0.md"), "utf-8");
    expect(saved).toBe("## 1.0.0\n+added");
  });

  it("バージョンヘッダーなしの場合は _unversioned_.md に書き出す", async () => {
    const diffResult: DiffResult = {
      source: "claude-code",
      hasChanges: true,
      oldHash: "old-hash",
      newHash: "new-hash",
      diffText: "+added line without header",
      newContent: "new content",
    };

    await writeDiff(diffResult, testDiffsDir, "raw_markdown");

    const saved = readFileSync(resolve(testDiffsDir, "claude-code-_unversioned_.md"), "utf-8");
    expect(saved).toBe("+added line without header");
  });

  it("hasChanges が false の場合は書き出さない", async () => {
    const diffResult: DiffResult = {
      source: "codex",
      hasChanges: false,
      oldHash: "hash",
      newHash: "hash",
      newContent: "content",
    };

    await writeDiff(diffResult, testDiffsDir, "raw_markdown");

    const exists = (() => {
      try {
        readFileSync(resolve(testDiffsDir, "codex.md"));
        return true;
      } catch {
        return false;
      }
    })();
    expect(exists).toBe(false);
  });
});
