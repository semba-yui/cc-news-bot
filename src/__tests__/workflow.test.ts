import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WORKFLOW_PATH = resolve(
  import.meta.dirname,
  "../../.github/workflows/changelog-notifier.yml",
);

function loadWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, "utf-8");
}

describe("changelog-notifier ワークフロー", () => {
  describe("トリガー設定", () => {
    it("3 時間ごとの cron スケジュールが設定されている", () => {
      const content = loadWorkflow();
      expect(content).toContain('cron: "0 */3 * * *"');
    });

    it("workflow_dispatch が設定されている", () => {
      const content = loadWorkflow();
      expect(content).toContain("workflow_dispatch:");
    });
  });

  describe("concurrency 制御", () => {
    it("changelog-notifier グループが設定されている", () => {
      const content = loadWorkflow();
      expect(content).toContain("group: changelog-notifier");
    });

    it("cancel-in-progress が false に設定されている", () => {
      const content = loadWorkflow();
      expect(content).toContain("cancel-in-progress: false");
    });
  });

  describe("シークレット参照", () => {
    it("SLACK_BOT_TOKEN を secrets から参照している", () => {
      const content = loadWorkflow();
      expect(content).toContain("${{ secrets.SLACK_BOT_TOKEN }}");
    });

    it("CLAUDE_CODE_OAUTH_TOKEN を secrets から参照している", () => {
      const content = loadWorkflow();
      expect(content).toContain("${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}");
    });

    it("GITHUB_TOKEN を secrets から参照している", () => {
      const content = loadWorkflow();
      expect(content).toContain("${{ secrets.GITHUB_TOKEN }}");
    });

    it("トークンがハードコードされていない", () => {
      const content = loadWorkflow();
      expect(content).not.toMatch(/xoxb-[a-zA-Z0-9-]+/);
      expect(content).not.toMatch(/sk-ant-/);
      expect(content).not.toMatch(/ghp_[a-zA-Z0-9]+/);
    });
  });

  describe("ステップ構成", () => {
    it("fetch-diff ステップが存在する", () => {
      const content = loadWorkflow();
      expect(content).toContain("id: fetch-diff");
      expect(content).toContain("fetch-and-diff.ts");
    });

    it("Claude Code Action ステップが差分検出時のみ実行される", () => {
      const content = loadWorkflow();
      expect(content).toContain("anthropics/claude-code-action@v1");
      expect(content).toContain("steps.fetch-diff.outputs.has_changes == 'true'");
    });

    it("Claude Code Action が claude_code_oauth_token を使用している", () => {
      const content = loadWorkflow();
      expect(content).toContain("claude_code_oauth_token:");
    });

    it("Claude Code Action の allowed_tools が設定されている", () => {
      const content = loadWorkflow();
      expect(content).toContain("allowed_tools:");
    });

    it("Slack 通知ステップが差分検出時のみ実行される", () => {
      const content = loadWorkflow();
      expect(content).toContain("notify.ts");
    });

    it("コミット＆プッシュステップが差分検出時のみ実行される", () => {
      const content = loadWorkflow();
      expect(content).toContain("git commit");
      expect(content).toContain("git push");
    });
  });
});
