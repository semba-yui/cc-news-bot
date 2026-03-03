import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, getChannelsForSource } from "../config/sources.js";
import type { BotProfile, PostResult, SlackBlock } from "../services/slack-service.js";
import { postBlocks as postBlocksImpl } from "../services/slack-service.js";
import type { AntigravityTranslatedContent } from "../services/html-slack-builder.js";
import { buildAntigravityBlocks } from "../services/html-slack-builder.js";

const SOURCE_NAME = "antigravity";

export interface NotifyHtmlAntigravityDeps {
  readonly htmlSummariesDir: string;
  readonly getChannels: (source: string) => string[];
  readonly slackToken: string;
  readonly botProfile?: BotProfile;
  readonly buildBlocks: (content: AntigravityTranslatedContent) => SlackBlock[];
  readonly postBlocks: (
    channel: string,
    blocks: SlackBlock[],
    text: string,
    token: string,
    botProfile?: BotProfile,
  ) => Promise<PostResult>;
}

interface AntigravitySummariesFile {
  version: string;
  improvementsJa: string[];
  fixesJa: string[];
  patchesJa: string[];
}

export async function notifyHtmlAntigravity(deps: NotifyHtmlAntigravityDeps): Promise<void> {
  const filePath = resolve(deps.htmlSummariesDir, "antigravity.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as AntigravitySummariesFile;

  const content: AntigravityTranslatedContent = {
    version: raw.version,
    improvementsJa: raw.improvementsJa,
    fixesJa: raw.fixesJa,
    patchesJa: raw.patchesJa,
  };

  const blocks = deps.buildBlocks(content);
  const fallbackText = `Antigravity ${raw.version} の更新`;
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

  await notifyHtmlAntigravity({
    htmlSummariesDir: DATA_DIR.htmlSummaries,
    getChannels: getChannelsForSource,
    slackToken,
    botProfile: { name: "Antigravity Changelog", emoji: ":google_antigravity:" },
    buildBlocks: buildAntigravityBlocks,
    postBlocks: postBlocksImpl,
  });

  console.log("Antigravity notification complete");
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("notify-html-antigravity");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
