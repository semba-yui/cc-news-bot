import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";

export interface SourceState {
  hash: string;
  lastCheckedAt: string; // ISO 8601
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

function statePath(dataRoot: string): string {
  return resolve(dataRoot, "state.json");
}

export async function loadSnapshot(
  source: string,
  snapshotsDir: string = DATA_DIR.snapshots,
): Promise<string | null> {
  return readFileSafe(snapshotPath(source, snapshotsDir));
}

export async function saveSnapshot(
  source: string,
  content: string,
  snapshotsDir: string = DATA_DIR.snapshots,
): Promise<void> {
  writeFileSync(snapshotPath(source, snapshotsDir), content);
}

export async function loadState(dataRoot: string = DATA_DIR.root): Promise<SnapshotState> {
  try {
    const raw = readFileSync(statePath(dataRoot), "utf-8");
    return JSON.parse(raw) as SnapshotState;
  } catch {
    return { ...EMPTY_STATE, sources: {} };
  }
}

export async function saveState(
  state: SnapshotState,
  dataRoot: string = DATA_DIR.root,
): Promise<void> {
  writeFileSync(statePath(dataRoot), JSON.stringify(state, null, 2));
}
