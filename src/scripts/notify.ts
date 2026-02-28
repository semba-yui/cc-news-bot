import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, getChannelsForSource } from "../config/sources.js";
import type { PostResult } from "../services/slack-service.js";
import {
  postSummary as postSummaryImpl,
  postThreadReplies as postThreadRepliesImpl,
} from "../services/slack-service.js";
import { readFileSafe, saveSnapshot as saveSnapshotImpl } from "../services/state-service.js";
import type { RunResultData } from "./fetch-and-diff.js";

export interface NotifyDeps {
  dataRoot: string;
  snapshotsDir: string;
  diffsDir: string;
  summariesDir: string;
  currentDir: string;
  getChannels: (source: string) => string[];
  slackToken: string;

  postSummary: (ch: string, src: string, summary: string, token: string) => Promise<PostResult>;
  postThreadReplies: (ch: string, ts: string, text: string, token: string) => Promise<PostResult[]>;
  saveSnapshot: (source: string, content: string, dir: string) => Promise<void>;
}

export async function notifySlack(deps: NotifyDeps): Promise<void> {
  const {
    dataRoot,
    snapshotsDir,
    diffsDir,
    summariesDir,
    currentDir,
    getChannels,
    slackToken,
    postSummary,
    postThreadReplies,
    saveSnapshot,
  } = deps;

  const runResult = JSON.parse(
    readFileSync(resolve(dataRoot, "run-result.json"), "utf-8"),
  ) as RunResultData;

  for (const source of runResult.changedSources) {
    const diffText = readFileSafe(resolve(diffsDir, `${source}.md`)) ?? "";
    const summary = readFileSafe(resolve(summariesDir, `${source}.md`)) ?? diffText;

    for (const ch of getChannels(source)) {
      const result = await postSummary(ch, source, summary, slackToken);

      if (result.success && result.ts && diffText) {
        await postThreadReplies(ch, result.ts, diffText, slackToken);
      }
    }

    // current のコンテンツでスナップショットを更新
    const currentContent = readFileSync(resolve(currentDir, `${source}.md`), "utf-8");
    await saveSnapshot(source, currentContent, snapshotsDir);
  }
}

async function main(): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN environment variable is required");
  }

  await notifySlack({
    dataRoot: DATA_DIR.root,
    snapshotsDir: DATA_DIR.snapshots,
    diffsDir: DATA_DIR.diffs,
    summariesDir: DATA_DIR.summaries,
    currentDir: DATA_DIR.current,
    getChannels: getChannelsForSource,
    slackToken,
    postSummary: postSummaryImpl,
    postThreadReplies: postThreadRepliesImpl,
    saveSnapshot: saveSnapshotImpl,
  });

  console.log("Notification complete");
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("notify");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
