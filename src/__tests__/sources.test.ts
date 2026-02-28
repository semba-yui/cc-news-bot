import { describe, expect, it } from "vitest";
import { DATA_DIR, SOURCES } from "../config/sources.js";

describe("SOURCES", () => {
  it("3つの監視対象ソースが定義されている", () => {
    expect(SOURCES).toHaveLength(3);
  });

  it("claude-code ソースが raw_markdown タイプで定義されている", () => {
    const claudeCode = SOURCES.find((s) => s.name === "claude-code");
    expect(claudeCode).toBeDefined();
    expect(claudeCode!.type).toBe("raw_markdown");
    expect(claudeCode!.url).toBe(
      "https://raw.githubusercontent.com/anthropics/claude-code/refs/heads/main/CHANGELOG.md",
    );
  });

  it("codex ソースが github_releases タイプで定義されている", () => {
    const codex = SOURCES.find((s) => s.name === "codex");
    expect(codex).toBeDefined();
    expect(codex!.type).toBe("github_releases");
    expect(codex!.owner).toBe("openai");
    expect(codex!.repo).toBe("codex");
  });

  it("copilot-cli ソースが raw_markdown タイプで定義されている", () => {
    const copilotCli = SOURCES.find((s) => s.name === "copilot-cli");
    expect(copilotCli).toBeDefined();
    expect(copilotCli!.type).toBe("raw_markdown");
    expect(copilotCli!.url).toBe(
      "https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md",
    );
  });

  it("各ソースに name が設定されている", () => {
    for (const source of SOURCES) {
      expect(source.name).toBeTruthy();
    }
  });
});

describe("DATA_DIR", () => {
  it("data ディレクトリのパス定数が定義されている", () => {
    expect(DATA_DIR).toBeDefined();
    expect(DATA_DIR.root).toContain("data");
    expect(DATA_DIR.snapshots).toContain("snapshots");
    expect(DATA_DIR.diffs).toContain("diffs");
    expect(DATA_DIR.summaries).toContain("summaries");
    expect(DATA_DIR.current).toContain("current");
  });
});
