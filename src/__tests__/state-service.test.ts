import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type SnapshotState,
  loadSnapshot,
  loadState,
  saveSnapshot,
  saveState,
} from "../services/state-service.js";

const testDataRoot = resolve(import.meta.dirname, "../../data-test-state");
const testSnapshotsDir = resolve(testDataRoot, "snapshots");

describe("loadSnapshot", () => {
  beforeEach(() => {
    mkdirSync(testSnapshotsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("存在するスナップショットファイルの内容を返す", async () => {
    const content = "# Changelog\n\n## v1.0.0\n- Initial release";
    writeFileSync(resolve(testSnapshotsDir, "claude-code.md"), content);

    const result = await loadSnapshot("claude-code", testSnapshotsDir);
    expect(result).toBe(content);
  });

  it("スナップショットファイルが存在しない場合は null を返す", async () => {
    const result = await loadSnapshot("claude-code", testSnapshotsDir);
    expect(result).toBeNull();
  });

  it("ソース名に対応するファイルパスを正しく解決する", async () => {
    const content = "# Copilot CLI Changelog";
    writeFileSync(resolve(testSnapshotsDir, "copilot-cli.md"), content);

    const result = await loadSnapshot("copilot-cli", testSnapshotsDir);
    expect(result).toBe(content);
  });
});

describe("saveSnapshot", () => {
  beforeEach(() => {
    mkdirSync(testSnapshotsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("スナップショットをファイルに書き出す", async () => {
    const content = "# Changelog\n\n## v2.0.0\n- New feature";
    await saveSnapshot("claude-code", content, testSnapshotsDir);

    const saved = readFileSync(resolve(testSnapshotsDir, "claude-code.md"), "utf-8");
    expect(saved).toBe(content);
  });

  it("既存のスナップショットを上書きする", async () => {
    const oldContent = "# Old";
    const newContent = "# New";
    writeFileSync(resolve(testSnapshotsDir, "codex.md"), oldContent);

    await saveSnapshot("codex", newContent, testSnapshotsDir);

    const saved = readFileSync(resolve(testSnapshotsDir, "codex.md"), "utf-8");
    expect(saved).toBe(newContent);
  });

  it("書き出し後にファイルが存在する", async () => {
    await saveSnapshot("copilot-cli", "content", testSnapshotsDir);
    expect(existsSync(resolve(testSnapshotsDir, "copilot-cli.md"))).toBe(true);
  });
});

describe("loadState", () => {
  const testStateDir = resolve(testDataRoot, "state");

  beforeEach(() => {
    mkdirSync(testStateDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("state ディレクトリが空の場合は空の初期状態を返す", async () => {
    const state = await loadState(testDataRoot);
    expect(state).toEqual({
      lastRunAt: "",
      sources: {},
    });
  });

  it("ソースごとのファイルを集約して読み込む", async () => {
    // Given: 各ソースの JSON ファイルがある
    writeFileSync(
      resolve(testStateDir, "claude-code.json"),
      JSON.stringify({ hash: "sha256-abc123", lastCheckedAt: "2026-02-28T12:00:00Z" }),
    );
    writeFileSync(
      resolve(testStateDir, "codex.json"),
      JSON.stringify({ hash: "sha256-def456", lastCheckedAt: "2026-02-28T11:00:00Z" }),
    );

    // When
    const state = await loadState(testDataRoot);

    // Then
    expect(state).toEqual({
      lastRunAt: "",
      sources: {
        "claude-code": {
          hash: "sha256-abc123",
          lastCheckedAt: "2026-02-28T12:00:00Z",
        },
        codex: {
          hash: "sha256-def456",
          lastCheckedAt: "2026-02-28T11:00:00Z",
        },
      },
    });
  });

  it("sources フィールドにソースごとの hash と lastCheckedAt が含まれる", async () => {
    writeFileSync(
      resolve(testStateDir, "copilot-cli.json"),
      JSON.stringify({ hash: "sha256-ghi789", lastCheckedAt: "2026-02-28T15:00:00Z" }),
    );

    const state = await loadState(testDataRoot);
    expect(state.sources["copilot-cli"]).toEqual({
      hash: "sha256-ghi789",
      lastCheckedAt: "2026-02-28T15:00:00Z",
    });
  });
});

describe("saveState", () => {
  const testStateDir = resolve(testDataRoot, "state");

  beforeEach(() => {
    mkdirSync(testStateDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("ソースごとのファイルを書き出す", async () => {
    // Given
    const state: SnapshotState = {
      lastRunAt: "2026-02-28T12:00:00Z",
      sources: {
        "claude-code": {
          hash: "sha256-abc123",
          lastCheckedAt: "2026-02-28T12:00:00Z",
        },
      },
    };

    // When
    await saveState(state, testDataRoot);

    // Then: ソースごとの JSON ファイルが保存される
    const sourceState = JSON.parse(
      readFileSync(resolve(testStateDir, "claude-code.json"), "utf-8"),
    ) as { hash: string; lastCheckedAt: string };
    expect(sourceState).toEqual({
      hash: "sha256-abc123",
      lastCheckedAt: "2026-02-28T12:00:00Z",
    });
  });

  it("既存のソースファイルを上書きする", async () => {
    // Given: 古いソースファイルが存在する
    writeFileSync(
      resolve(testStateDir, "codex.json"),
      JSON.stringify({ hash: "sha256-old", lastCheckedAt: "2026-02-28T09:00:00Z" }),
    );

    // When
    const newState: SnapshotState = {
      lastRunAt: "2026-02-28T12:00:00Z",
      sources: {
        codex: {
          hash: "sha256-new",
          lastCheckedAt: "2026-02-28T12:00:00Z",
        },
      },
    };
    await saveState(newState, testDataRoot);

    // Then: 上書きされる
    const loaded = await loadState(testDataRoot);
    expect(loaded.sources.codex.hash).toBe("sha256-new");
  });

  it("書き出し後にソースごとのファイルが存在する", async () => {
    await saveState(
      {
        lastRunAt: "",
        sources: { test: { hash: "h", lastCheckedAt: "2026-01-01T00:00:00Z" } },
      },
      testDataRoot,
    );
    expect(existsSync(resolve(testStateDir, "test.json"))).toBe(true);
  });

  it("latestVersion フィールドを含む状態を保存・復元できる", async () => {
    const state: SnapshotState = {
      lastRunAt: "2026-03-02T06:00:00Z",
      sources: {
        "gemini-cli": {
          hash: "",
          lastCheckedAt: "2026-03-02T06:00:00Z",
          latestVersion: "v0.31.0",
        },
      },
    };

    await saveState(state, testDataRoot);
    const loaded = await loadState(testDataRoot);
    expect(loaded.sources["gemini-cli"]?.latestVersion).toBe("v0.31.0");
  });
});
