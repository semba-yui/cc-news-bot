import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SourceConfig } from "../config/sources.js";
import { DATA_DIR, SOURCES } from "../config/sources.js";
import { ensureDataDirs } from "../config/init-dirs.js";
import type { DiffResult } from "../services/diff-service.js";
import {
  detectChanges as detectChangesImpl,
  writeDiff as writeDiffImpl,
} from "../services/diff-service.js";
import { fetchAll as fetchAllImpl } from "../services/fetch-service.js";
import type { FetchResult } from "../services/fetch-service.js";
import type { PostResult } from "../services/slack-service.js";
import { postError as postErrorImpl } from "../services/slack-service.js";
import type { SnapshotState } from "../services/state-service.js";
import {
  loadSnapshot as loadSnapshotImpl,
  loadState as loadStateImpl,
  saveSnapshot as saveSnapshotImpl,
  saveState as saveStateImpl,
} from "../services/state-service.js";

const CHANNEL = "C0AHQ59G8HJ";

export interface RunResultData {
  changedSources: string[];
  firstRunSources: string[];
  errors: Array<{ source: string; error: string }>;
  hasChanges: boolean;
}

export interface FetchAndDiffDeps {
  sources: SourceConfig[];
  dataRoot: string;
  snapshotsDir: string;
  diffsDir: string;
  currentDir: string;
  channel: string;
  slackToken?: string;

  fetchAll: (sources: SourceConfig[]) => Promise<FetchResult[]>;
  loadSnapshot: (source: string, dir: string) => Promise<string | null>;
  saveSnapshot: (source: string, content: string, dir: string) => Promise<void>;
  detectChanges: (source: string, current: string, prev: string | null) => DiffResult;
  writeDiff: (result: DiffResult, dir: string) => Promise<void>;
  loadState: (root: string) => Promise<SnapshotState>;
  saveState: (state: SnapshotState, root: string) => Promise<void>;
  postError: (ch: string, src: string, err: string, token: string) => Promise<PostResult>;
}

export async function fetchAndDiff(deps: FetchAndDiffDeps): Promise<RunResultData> {
  const {
    sources,
    dataRoot,
    snapshotsDir,
    diffsDir,
    currentDir,
    channel,
    slackToken,
    fetchAll,
    loadSnapshot,
    saveSnapshot,
    detectChanges,
    writeDiff,
    loadState,
    saveState,
    postError,
  } = deps;

  const fetchResults = await fetchAll(sources);
  const state = await loadState(dataRoot);
  const now = new Date().toISOString();

  const changedSources: string[] = [];
  const firstRunSources: string[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  for (const fetchResult of fetchResults) {
    const sourceName = fetchResult.source;

    if (!fetchResult.success) {
      errors.push({ source: sourceName, error: fetchResult.error ?? "Unknown error" });
      if (slackToken) {
        await postError(channel, sourceName, fetchResult.error ?? "Unknown error", slackToken);
      }
      continue;
    }

    const content = fetchResult.content!;

    // current ディレクトリにコンテンツを書き出す
    writeFileSync(resolve(currentDir, `${sourceName}.md`), content);

    const previousSnapshot = await loadSnapshot(sourceName, snapshotsDir);
    const diffResult = detectChanges(sourceName, content, previousSnapshot);

    state.sources[sourceName] = {
      hash: diffResult.newHash,
      lastCheckedAt: now,
    };

    if (previousSnapshot === null) {
      // 初回実行: スナップショットを保存
      firstRunSources.push(sourceName);
      await saveSnapshot(sourceName, diffResult.newContent, snapshotsDir);
    } else if (diffResult.hasChanges) {
      // 差分あり: diff ファイルを書き出す（スナップショットは notify で更新）
      changedSources.push(sourceName);
      await writeDiff(diffResult, diffsDir);
    }
  }

  const hasChanges = changedSources.length > 0 || firstRunSources.length > 0;

  state.lastRunAt = now;
  await saveState(state, dataRoot);

  const runResult: RunResultData = {
    changedSources,
    firstRunSources,
    errors,
    hasChanges,
  };

  writeFileSync(resolve(dataRoot, "run-result.json"), JSON.stringify(runResult, null, 2));

  return runResult;
}

async function main(): Promise<void> {
  ensureDataDirs();

  const githubToken = process.env.GITHUB_TOKEN;
  const slackToken = process.env.SLACK_BOT_TOKEN;

  const result = await fetchAndDiff({
    sources: SOURCES,
    dataRoot: DATA_DIR.root,
    snapshotsDir: DATA_DIR.snapshots,
    diffsDir: DATA_DIR.diffs,
    currentDir: DATA_DIR.current,
    channel: CHANNEL,
    slackToken,
    fetchAll: (sources) => fetchAllImpl(sources, { githubToken }),
    loadSnapshot: loadSnapshotImpl,
    saveSnapshot: saveSnapshotImpl,
    detectChanges: detectChangesImpl,
    writeDiff: writeDiffImpl,
    loadState: loadStateImpl,
    saveState: saveStateImpl,
    postError: postErrorImpl,
  });

  // GitHub Actions output
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `has_changes=${result.hasChanges}\n`);
  }

  console.log(`Changes detected: ${result.hasChanges}`);
  console.log(`Changed sources: ${result.changedSources.join(", ") || "none"}`);
  console.log(`First run sources: ${result.firstRunSources.join(", ") || "none"}`);
  console.log(`Errors: ${result.errors.length}`);
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("fetch-and-diff");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
