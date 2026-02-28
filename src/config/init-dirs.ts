import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR } from "./sources.js";

const SUBDIRS = ["snapshots", "diffs", "summaries", "current"] as const;

export function ensureDataDirs(root: string = DATA_DIR.root): void {
  for (const subdir of SUBDIRS) {
    mkdirSync(resolve(root, subdir), { recursive: true });
  }
}
