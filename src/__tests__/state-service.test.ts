import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type SnapshotState,
  loadSnapshot,
  loadState,
  migrateSourceState,
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

    // Then: マイグレーションにより type: "hash" が付与される
    expect(state).toEqual({
      lastRunAt: "",
      sources: {
        "claude-code": {
          type: "hash",
          hash: "sha256-abc123",
          lastCheckedAt: "2026-02-28T12:00:00Z",
        },
        codex: {
          type: "hash",
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
      type: "hash",
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
          type: "hash",
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
      type: "hash",
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
          type: "hash",
          hash: "sha256-new",
          lastCheckedAt: "2026-02-28T12:00:00Z",
        },
      },
    };
    await saveState(newState, testDataRoot);

    // Then: 上書きされる
    const loaded = await loadState(testDataRoot);
    expect(loaded.sources.codex!.hash).toBe("sha256-new");
  });

  it("書き出し後にソースごとのファイルが存在する", async () => {
    await saveState(
      {
        lastRunAt: "",
        sources: { test: { type: "hash", hash: "h", lastCheckedAt: "2026-01-01T00:00:00Z" } },
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
          type: "version",
          hash: "",
          lastCheckedAt: "2026-03-02T06:00:00Z",
          latestVersion: "v0.31.0",
        },
      },
    };

    await saveState(state, testDataRoot);
    const loaded = await loadState(testDataRoot);
    const geminiState = loaded.sources["gemini-cli"];
    expect(geminiState?.type).toBe("version");
    if (geminiState?.type === "version") {
      expect(geminiState.latestVersion).toBe("v0.31.0");
    }
  });

  it("knownSlugs フィールドを含む slug_list 型状態を保存・復元できる", async () => {
    // What: SlugListBasedSourceState の保存・復元が正しく動作することを検証する
    // Why: ニュースページプロバイダの差分検出に knownSlugs が必要
    const state: SnapshotState = {
      lastRunAt: "2026-03-08T00:00:00Z",
      sources: {
        "openai-news": {
          type: "slug_list",
          hash: "",
          lastCheckedAt: "2026-03-08T00:00:00Z",
          knownSlugs: ["article-1", "article-2", "article-3"],
        },
      },
    };

    // When: 保存して復元する
    await saveState(state, testDataRoot);
    const loaded = await loadState(testDataRoot);

    // Then: slug_list 型として復元され、knownSlugs が保持されている
    const openaiState = loaded.sources["openai-news"];
    expect(openaiState?.type).toBe("slug_list");
    if (openaiState?.type === "slug_list") {
      expect(openaiState.knownSlugs).toEqual(["article-1", "article-2", "article-3"]);
    }
  });
});

describe("migrateSourceState", () => {
  // What: type フィールドを持たない既存状態ファイルのマイグレーションを検証する
  // Why: 既存の状態ファイルには type フィールドがないため、
  //      フィールドの存在チェックで適切な型に振り分ける必要がある

  it("hash のみの状態を hash 型に振り分ける", () => {
    // Given: type フィールドなし、hash と lastCheckedAt のみ
    const raw = { hash: "sha256-abc", lastCheckedAt: "2026-01-01T00:00:00Z" };

    // When
    const result = migrateSourceState(raw);

    // Then
    expect(result.type).toBe("hash");
    expect(result).toEqual({
      type: "hash",
      hash: "sha256-abc",
      lastCheckedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("latestReleasedAt を持つ状態を hash 型に振り分ける", () => {
    // Given: github_releases 用の latestReleasedAt フィールドを持つ
    const raw = {
      hash: "sha256-abc",
      lastCheckedAt: "2026-01-01T00:00:00Z",
      latestReleasedAt: "2026-01-01T00:00:00Z",
    };

    // When
    const result = migrateSourceState(raw);

    // Then
    expect(result.type).toBe("hash");
    if (result.type === "hash") {
      expect(result.latestReleasedAt).toBe("2026-01-01T00:00:00Z");
    }
  });

  it("latestVersion を持つ状態を version 型に振り分ける", () => {
    // Given: html_scraping / html_headless 用の latestVersion フィールドを持つ
    const raw = {
      hash: "",
      lastCheckedAt: "2026-03-07T06:05:49.726Z",
      latestVersion: "1.20.4",
    };

    // When
    const result = migrateSourceState(raw);

    // Then
    expect(result.type).toBe("version");
    if (result.type === "version") {
      expect(result.latestVersion).toBe("1.20.4");
    }
  });

  it("latestDate と latestSlug を持つ状態を date_slug 型に振り分ける", () => {
    // Given: Cursor 用の latestDate + latestSlug フィールドを持つ
    const raw = {
      hash: "",
      lastCheckedAt: "2026-03-06T06:20:46.363Z",
      latestDate: "2026-03-05T00:00:00.000Z",
      latestSlug: "03-05-26",
    };

    // When
    const result = migrateSourceState(raw);

    // Then
    expect(result.type).toBe("date_slug");
    if (result.type === "date_slug") {
      expect(result.latestDate).toBe("2026-03-05T00:00:00.000Z");
      expect(result.latestSlug).toBe("03-05-26");
    }
  });

  it("knownSlugs を持つ状態を slug_list 型に振り分ける", () => {
    // Given: ニュースページプロバイダ用の knownSlugs フィールドを持つ
    const raw = {
      hash: "",
      lastCheckedAt: "2026-03-08T00:00:00Z",
      knownSlugs: ["slug-1", "slug-2"],
    };

    // When
    const result = migrateSourceState(raw);

    // Then
    expect(result.type).toBe("slug_list");
    if (result.type === "slug_list") {
      expect(result.knownSlugs).toEqual(["slug-1", "slug-2"]);
    }
  });

  it("既に type フィールドを持つ状態はそのまま返す", () => {
    // Given: type フィールドが既に設定されている
    const raw = {
      type: "version",
      hash: "",
      lastCheckedAt: "2026-03-07T00:00:00Z",
      latestVersion: "v1.0.0",
    };

    // When
    const result = migrateSourceState(raw);

    // Then: そのまま返す
    expect(result).toEqual(raw);
  });

  it("loadState で type なしの既存状態ファイルを読み込むとマイグレーションされる", async () => {
    // Given: type フィールドなしの既存状態ファイル
    const testStateDir = resolve(testDataRoot, "state");
    mkdirSync(testStateDir, { recursive: true });
    writeFileSync(
      resolve(testStateDir, "antigravity.json"),
      JSON.stringify({
        hash: "",
        lastCheckedAt: "2026-03-07T06:05:49.726Z",
        latestVersion: "1.20.4",
      }),
    );

    // When
    const state = await loadState(testDataRoot);

    // Then: version 型にマイグレーションされている
    const antigravityState = state.sources.antigravity;
    expect(antigravityState?.type).toBe("version");

    // Cleanup
    rmSync(testDataRoot, { recursive: true, force: true });
  });
});
