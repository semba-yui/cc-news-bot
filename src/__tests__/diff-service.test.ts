import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type DiffResult, detectChanges, writeDiff } from "../services/diff-service.js";

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

  it("diff テキストが unified diff 形式（行単位）である", () => {
    const oldContent = "line1\nline2\nline3";
    const newContent = "line1\nmodified\nline3";
    const result = detectChanges("copilot-cli", newContent, oldContent);

    expect(result.hasChanges).toBe(true);
    expect(result.diffText).toContain("-line2");
    expect(result.diffText).toContain("+modified");
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

describe("writeDiff", () => {
  const testDiffsDir = resolve(import.meta.dirname, "../../data-test-diff/diffs");

  beforeEach(() => {
    mkdirSync(testDiffsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(resolve(import.meta.dirname, "../../data-test-diff"), { recursive: true, force: true });
  });

  it("差分テキストをファイルに書き出す", async () => {
    const diffResult: DiffResult = {
      source: "claude-code",
      hasChanges: true,
      oldHash: "old-hash",
      newHash: "new-hash",
      diffText: "--- old\n+++ new\n-removed\n+added",
      newContent: "new content",
    };

    await writeDiff(diffResult, testDiffsDir);

    const saved = readFileSync(resolve(testDiffsDir, "claude-code.md"), "utf-8");
    expect(saved).toBe(diffResult.diffText);
  });

  it("hasChanges が false の場合は書き出さない", async () => {
    const diffResult: DiffResult = {
      source: "codex",
      hasChanges: false,
      oldHash: "hash",
      newHash: "hash",
      newContent: "content",
    };

    await writeDiff(diffResult, testDiffsDir);

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
