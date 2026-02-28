import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DATA_DIR } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";

const testDataRoot = resolve(import.meta.dirname, "../../data-test");

describe("ensureDataDirs", () => {
  beforeEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(testDataRoot, { recursive: true, force: true });
  });

  it("data 配下の全サブディレクトリを作成する", () => {
    ensureDataDirs(testDataRoot);

    expect(existsSync(resolve(testDataRoot, "snapshots"))).toBe(true);
    expect(existsSync(resolve(testDataRoot, "diffs"))).toBe(true);
    expect(existsSync(resolve(testDataRoot, "summaries"))).toBe(true);
    expect(existsSync(resolve(testDataRoot, "current"))).toBe(true);
  });

  it("既にディレクトリが存在する場合もエラーにならない", () => {
    ensureDataDirs(testDataRoot);
    expect(() => ensureDataDirs(testDataRoot)).not.toThrow();
  });

  it("引数なしで DATA_DIR.root を使用して作成する", () => {
    ensureDataDirs();

    expect(existsSync(DATA_DIR.snapshots)).toBe(true);
    expect(existsSync(DATA_DIR.diffs)).toBe(true);
    expect(existsSync(DATA_DIR.summaries)).toBe(true);
    expect(existsSync(DATA_DIR.current)).toBe(true);
  });
});
