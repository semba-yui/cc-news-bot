import { readFileSync, readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";

export interface SourceState {
  hash: string;
  lastCheckedAt: string; // ISO 8601
  latestReleasedAt?: string; // ISO 8601、github_releases ソース用
  latestVersion?: string; // html_scraping / html_headless ソース用
}

export interface SnapshotState {
  lastRunAt: string; // ISO 8601
  sources: Record<string, SourceState>;
}

const EMPTY_STATE: SnapshotState = { lastRunAt: "", sources: {} };
export function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function snapshotPath(source: string, snapshotsDir: string): string {
  return resolve(snapshotsDir, `${source}.md`);
}

function stateDir(dataRoot: string): string {
  return resolve(dataRoot, "state");
}

export async function loadSnapshot(
  source: string,
  snapshotsDir: string = DATA_DIR.snapshots,
): Promise<string | null> {
  try {
    return await readFile(snapshotPath(source, snapshotsDir), "utf-8");
  } catch {
    return null;
  }
}

export async function saveSnapshot(
  source: string,
  content: string,
  snapshotsDir: string = DATA_DIR.snapshots,
): Promise<void> {
  await writeFile(snapshotPath(source, snapshotsDir), content);
}

export async function loadState(dataRoot: string = DATA_DIR.root): Promise<SnapshotState> {
  const dir = stateDir(dataRoot);

  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      return { ...EMPTY_STATE, sources: {} };
    }

    const sources: Record<string, SourceState> = {};

    for (const file of files) {
      const raw = await readFile(resolve(dir, file), "utf-8");
      const sourceName = file.replace(/\.json$/, "");
      sources[sourceName] = JSON.parse(raw) as SourceState;
    }

    return { lastRunAt: "", sources };
  } catch {
    return { ...EMPTY_STATE, sources: {} };
  }
}

export async function saveState(
  state: SnapshotState,
  dataRoot: string = DATA_DIR.root,
): Promise<void> {
  const dir = stateDir(dataRoot);

  for (const [source, sourceState] of Object.entries(state.sources)) {
    await writeFile(resolve(dir, `${source}.json`), JSON.stringify(sourceState, null, 2));
  }
}
