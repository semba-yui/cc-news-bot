import { readFileSync, readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";

interface SourceStateBase {
  lastCheckedAt: string; // ISO 8601
}

export interface HashBasedSourceState extends SourceStateBase {
  type: "hash";
  hash: string;
  latestReleasedAt?: string; // github_releases 用
}

export interface VersionBasedSourceState extends SourceStateBase {
  type: "version";
  hash: string;
  latestVersion: string;
}

export interface DateSlugBasedSourceState extends SourceStateBase {
  type: "date_slug";
  hash: string;
  latestDate: string;
  latestSlug: string;
}

export interface SlugListBasedSourceState extends SourceStateBase {
  type: "slug_list";
  hash: string;
  knownSlugs: string[];
}

export type SourceState =
  | HashBasedSourceState
  | VersionBasedSourceState
  | DateSlugBasedSourceState
  | SlugListBasedSourceState;

export interface SnapshotState {
  lastRunAt: string; // ISO 8601
  sources: Record<string, SourceState | undefined>;
}

export function migrateSourceState(raw: Record<string, unknown>): SourceState {
  if (raw.type) {
    return raw as unknown as SourceState;
  }
  if (Array.isArray(raw.knownSlugs)) {
    return { ...raw, type: "slug_list" } as unknown as SlugListBasedSourceState;
  }
  if (typeof raw.latestDate === "string" && typeof raw.latestSlug === "string") {
    return { ...raw, type: "date_slug" } as unknown as DateSlugBasedSourceState;
  }
  if (typeof raw.latestVersion === "string") {
    return { ...raw, type: "version" } as unknown as VersionBasedSourceState;
  }
  return { ...raw, type: "hash" } as unknown as HashBasedSourceState;
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
      sources[sourceName] = migrateSourceState(JSON.parse(raw) as Record<string, unknown>);
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
