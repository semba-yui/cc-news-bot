import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, getChannelsForSource } from "../config/sources.js";
import type { BotProfile, PostResult, SlackBlock } from "../services/slack-service.js";
import { postBlocks as postBlocksImpl } from "../services/slack-service.js";
import type { CursorVersionContent } from "../services/cursor-parser.js";
import { buildCursorBlocks } from "../services/html-slack-builder.js";

const SOURCE_NAME = "cursor";

export interface NotifyHtmlCursorDeps {
  readonly htmlCurrentDir: string;
  readonly getChannels: (source: string) => string[];
  readonly slackToken: string;
  readonly botProfile?: BotProfile;
  readonly buildBlocks: (content: CursorVersionContent) => SlackBlock[];
  readonly postBlocks: (
    channel: string,
    blocks: SlackBlock[],
    text: string,
    token: string,
    botProfile?: BotProfile,
  ) => Promise<PostResult>;
}

interface CursorCurrentFile {
  version: string;
  contentJa: string;
  imageUrls: string[];
  videos: Array<{
    playbackId: string;
    thumbnailUrl: string;
    hlsUrl: string;
  }>;
  fetchedAt: string;
}

export async function notifyHtmlCursor(deps: NotifyHtmlCursorDeps): Promise<void> {
  const filePath = resolve(deps.htmlCurrentDir, "cursor.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as CursorCurrentFile;

  const content: CursorVersionContent = {
    version: raw.version,
    contentJa: raw.contentJa,
    imageUrls: raw.imageUrls,
    videos: raw.videos,
  };

  const blocks = deps.buildBlocks(content);
  const fallbackText = `Cursor ${raw.version} の更新`;
  const channels = deps.getChannels(SOURCE_NAME);

  await Promise.all(
    channels.map(async (channel) => {
      await deps.postBlocks(channel, blocks, fallbackText, deps.slackToken, deps.botProfile);
    }),
  );
}

async function main(): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN environment variable is required");
  }

  await notifyHtmlCursor({
    htmlCurrentDir: DATA_DIR.htmlCurrent,
    getChannels: getChannelsForSource,
    slackToken,
    botProfile: { name: "Cursor Changelog", emoji: ":cursor:" },
    buildBlocks: buildCursorBlocks,
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
