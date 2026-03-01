import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { DATA_DIR, getBotProfileForSource, getChannelsForSource } from "../config/sources.js";
import type { BotProfile, PostOptions, PostResult } from "../services/slack-service.js";
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
  listDiffFiles: (diffsDir: string, source: string) => string[];

  postSummary: (ch: string, src: string, version: string, summary: string, token: string, botProfile?: BotProfile) => Promise<PostResult>;
  postThreadReplies: (ch: string, ts: string, text: string, token: string, options?: PostOptions) => Promise<PostResult[]>;
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
    listDiffFiles,
    postSummary,
    postThreadReplies,
    saveSnapshot,
  } = deps;

  const runResult = JSON.parse(
    readFileSync(resolve(dataRoot, "run-result.json"), "utf-8"),
  ) as RunResultData;

  for (const source of runResult.changedSources) {
    const diffFiles = listDiffFiles(diffsDir, source).sort();

    for (const diffFilePath of diffFiles) {
      const version = basename(diffFilePath, ".md").slice(source.length + 1);
      const diffText = readFileSafe(diffFilePath) ?? "";
      const summary = readFileSafe(resolve(summariesDir, `${source}-${version}.md`)) ?? diffText;

      const botProfile = getBotProfileForSource(source);
      await Promise.all(
        getChannels(source).map(async (ch) => {
          const result = await postSummary(ch, source, version, summary, slackToken, botProfile);
          if (result.success && result.ts && diffText) {
            await postThreadReplies(ch, result.ts, diffText, slackToken, { botProfile });
          }
        }),
      );
    }

    // current のコンテンツでスナップショットを更新（バージョンごとではなくソース単位）
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
    listDiffFiles: (dir, src) =>
      readdirSync(dir)
        .filter((f) => f.startsWith(`${src}-`) && f.endsWith(".md"))
        .sort()
        .map((f) => resolve(dir, f)),
    postSummary: (ch, src, version, summary, token, botProfile) =>
      postSummaryImpl(ch, src, version, summary, token, botProfile),
    postThreadReplies: (ch, ts, text, token, options) =>
      postThreadRepliesImpl(ch, ts, text, token, options),
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
