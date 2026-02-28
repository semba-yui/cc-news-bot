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
  beforeEach(() => {
    mkdirSync(testDataRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("state.json が存在しない場合は空の初期状態を返す", async () => {
    const state = await loadState(testDataRoot);
    expect(state).toEqual({
      lastRunAt: "",
      sources: {},
    });
  });

  it("state.json を正しく読み込む", async () => {
    const expected: SnapshotState = {
      lastRunAt: "2026-02-28T12:00:00Z",
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
    };
    writeFileSync(resolve(testDataRoot, "state.json"), JSON.stringify(expected));

    const state = await loadState(testDataRoot);
    expect(state).toEqual(expected);
  });

  it("sources フィールドにソースごとの hash と lastCheckedAt が含まれる", async () => {
    const data: SnapshotState = {
      lastRunAt: "2026-02-28T15:00:00Z",
      sources: {
        "copilot-cli": {
          hash: "sha256-ghi789",
          lastCheckedAt: "2026-02-28T15:00:00Z",
        },
      },
    };
    writeFileSync(resolve(testDataRoot, "state.json"), JSON.stringify(data));

    const state = await loadState(testDataRoot);
    expect(state.sources["copilot-cli"]).toEqual({
      hash: "sha256-ghi789",
      lastCheckedAt: "2026-02-28T15:00:00Z",
    });
  });
});

describe("saveState", () => {
  beforeEach(() => {
    mkdirSync(testDataRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("state.json にメタデータを書き出す", async () => {
    const state: SnapshotState = {
      lastRunAt: "2026-02-28T12:00:00Z",
      sources: {
        "claude-code": {
          hash: "sha256-abc123",
          lastCheckedAt: "2026-02-28T12:00:00Z",
        },
      },
    };

    await saveState(state, testDataRoot);

    const saved = JSON.parse(readFileSync(resolve(testDataRoot, "state.json"), "utf-8"));
    expect(saved).toEqual(state);
  });

  it("既存の state.json を上書きする", async () => {
    const oldState: SnapshotState = {
      lastRunAt: "2026-02-28T09:00:00Z",
      sources: {},
    };
    writeFileSync(resolve(testDataRoot, "state.json"), JSON.stringify(oldState));

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

    const saved = JSON.parse(readFileSync(resolve(testDataRoot, "state.json"), "utf-8"));
    expect(saved).toEqual(newState);
  });

  it("lastRunAt が ISO 8601 形式で保存される", async () => {
    const state: SnapshotState = {
      lastRunAt: "2026-02-28T15:30:00Z",
      sources: {},
    };

    await saveState(state, testDataRoot);

    const saved = JSON.parse(readFileSync(resolve(testDataRoot, "state.json"), "utf-8"));
    expect(saved.lastRunAt).toBe("2026-02-28T15:30:00Z");
  });

  it("書き出し後に state.json ファイルが存在する", async () => {
    await saveState({ lastRunAt: "", sources: {} }, testDataRoot);
    expect(existsSync(resolve(testDataRoot, "state.json"))).toBe(true);
  });
});
