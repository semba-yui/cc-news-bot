import type { SourceConfig } from "./config/sources.js";
import type { DiffResult } from "./services/diff-service.js";
import type { FetchResult } from "./services/fetch-service.js";
import type { PostResult } from "./services/slack-service.js";
import type { SnapshotState } from "./services/state-service.js";

export interface SourceProcessResult {
  source: string;
  hasChanges: boolean;
  notified: boolean;
  error?: string;
}

export interface RunResult {
  processed: SourceProcessResult[];
  hasAnyChanges: boolean;
}

export interface RunDeps {
  sources: SourceConfig[];
  getChannels: (source: string) => string[];
  slackToken: string;
  dataRoot: string;
  snapshotsDir: string;
  diffsDir: string;

  fetchAll: (sources: SourceConfig[]) => Promise<FetchResult[]>;
  loadSnapshot: (source: string, snapshotsDir: string) => Promise<string | null>;
  saveSnapshot: (source: string, content: string, snapshotsDir: string) => Promise<void>;
  detectChanges: (
    source: string,
    currentContent: string,
    previousSnapshot: string | null,
  ) => DiffResult;
  writeDiff: (result: DiffResult, diffsDir: string) => Promise<void>;
  loadState: (dataRoot: string) => Promise<SnapshotState>;
  saveState: (state: SnapshotState, dataRoot: string) => Promise<void>;
  postSummary: (
    channel: string,
    source: string,
    summary: string,
    token: string,
  ) => Promise<PostResult>;
  postThreadReplies: (
    channel: string,
    threadTs: string,
    text: string,
    token: string,
  ) => Promise<PostResult[]>;
  postError: (channel: string, source: string, error: string, token: string) => Promise<PostResult>;
  readSummary: (source: string) => Promise<string | null>;
}

export async function run(deps: RunDeps): Promise<RunResult> {
  const {
    sources,
    getChannels,
    slackToken,
    dataRoot,
    snapshotsDir,
    diffsDir,
    fetchAll,
    loadSnapshot,
    saveSnapshot,
    detectChanges,
    writeDiff,
    loadState,
    saveState,
    postSummary,
    postThreadReplies,
    postError,
    readSummary,
  } = deps;

  const fetchResults = await fetchAll(sources);
  const state = await loadState(dataRoot);
  const now = new Date().toISOString();
  const processed: SourceProcessResult[] = [];
  let hasAnyChanges = false;

  for (const fetchResult of fetchResults) {
    const sourceName = fetchResult.source;

    if (!fetchResult.success) {
      for (const ch of getChannels(sourceName)) {
        await postError(ch, sourceName, fetchResult.error ?? "Unknown error", slackToken);
      }
      processed.push({
        source: sourceName,
        hasChanges: false,
        notified: false,
        error: fetchResult.error,
      });
      continue;
    }

    const previousSnapshot = await loadSnapshot(sourceName, snapshotsDir);
    const diffResult = detectChanges(sourceName, fetchResult.content!, previousSnapshot);

    state.sources[sourceName] = {
      hash: diffResult.newHash,
      lastCheckedAt: now,
    };

    if (!diffResult.hasChanges) {
      if (previousSnapshot === null) {
        await saveSnapshot(sourceName, diffResult.newContent, snapshotsDir);
        hasAnyChanges = true;
      }
      processed.push({ source: sourceName, hasChanges: false, notified: false });
      continue;
    }

    hasAnyChanges = true;
    await writeDiff(diffResult, diffsDir);

    const summary = (await readSummary(sourceName)) ?? diffResult.diffText ?? "";
    let notified = false;
    for (const ch of getChannels(sourceName)) {
      const postResult = await postSummary(ch, sourceName, summary, slackToken);
      if (postResult.success && postResult.ts && diffResult.diffText) {
        await postThreadReplies(ch, postResult.ts, diffResult.diffText, slackToken);
        notified = true;
      }
    }

    await saveSnapshot(sourceName, diffResult.newContent, snapshotsDir);
    processed.push({ source: sourceName, hasChanges: true, notified });
  }

  if (hasAnyChanges) {
    state.lastRunAt = now;
    await saveState(state, dataRoot);
  }

  return { processed, hasAnyChanges };
}
