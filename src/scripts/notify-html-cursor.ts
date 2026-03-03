import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, getChannelsForSource } from "../config/sources.js";
import type { BotProfile, PostResult, SlackBlock } from "../services/slack-service.js";
import { postBlocks as postBlocksImpl } from "../services/slack-service.js";

const SOURCE_NAME = "cursor";

export interface NotifyHtmlCursorDeps {
  readonly htmlSummariesDir: string;
  readonly getChannels: (source: string) => string[];
  readonly slackToken: string;
  readonly botProfile?: BotProfile;
  readonly postBlocks: (
    channel: string,
    blocks: SlackBlock[],
    text: string,
    token: string,
    botProfile?: BotProfile,
  ) => Promise<PostResult>;
}

interface CursorSummariesEntry {
  version: string;
  blocks: SlackBlock[];
  fallbackText: string;
}

export async function notifyHtmlCursor(deps: NotifyHtmlCursorDeps): Promise<void> {
  const filePath = resolve(deps.htmlSummariesDir, "cursor.json");
  const entries = JSON.parse(readFileSync(filePath, "utf-8")) as CursorSummariesEntry[];
  const channels = deps.getChannels(SOURCE_NAME);

  for (const entry of entries) {
    await Promise.all(
      channels.map(async (channel) => {
        await deps.postBlocks(
          channel,
          entry.blocks,
          entry.fallbackText,
          deps.slackToken,
          deps.botProfile,
        );
      }),
    );
  }
}

async function main(): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN environment variable is required");
  }

  await notifyHtmlCursor({
    htmlSummariesDir: DATA_DIR.htmlSummaries,
    getChannels: getChannelsForSource,
    slackToken,
    botProfile: { name: "Cursor Changelog", emoji: ":cursor:" },
    postBlocks: postBlocksImpl,
  });

  console.log("Cursor notification complete");
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("notify-html-cursor");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
