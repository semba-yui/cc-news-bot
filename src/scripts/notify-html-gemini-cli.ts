import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, getChannelsForSource } from "../config/sources.js";
import type { BotProfile, PostOptions, PostResult, SlackBlock } from "../services/slack-service.js";
import {
  postBlocks as postBlocksImpl,
  postThreadReplies as postThreadRepliesImpl,
} from "../services/slack-service.js";
import type { GeminiCliTranslatedContent } from "../services/html-slack-builder.js";
import { buildGeminiCliBlocks } from "../services/html-slack-builder.js";

const SOURCE_NAME = "gemini-cli";

export interface NotifyHtmlGeminiCliDeps {
  readonly htmlSummariesDir: string;
  readonly getChannels: (source: string) => string[];
  readonly slackToken: string;
  readonly botProfile?: BotProfile;
  readonly buildBlocks: (content: GeminiCliTranslatedContent) => SlackBlock[];
  readonly postBlocks: (
    channel: string,
    blocks: SlackBlock[],
    text: string,
    token: string,
    botProfile?: BotProfile,
  ) => Promise<PostResult>;
  readonly postThreadReplies: (
    channel: string,
    threadTs: string,
    text: string,
    token: string,
    options?: PostOptions,
  ) => Promise<PostResult[]>;
}

interface GeminiCliSummariesFile {
  version: string;
  summaryJa: string;
  imageUrls: string[];
  githubReleasesText: string | null;
}

export async function notifyHtmlGeminiCli(deps: NotifyHtmlGeminiCliDeps): Promise<void> {
  const filePath = resolve(deps.htmlSummariesDir, "gemini-cli.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as GeminiCliSummariesFile;

  const content: GeminiCliTranslatedContent = {
    version: raw.version,
    summaryJa: raw.summaryJa,
    imageUrls: raw.imageUrls,
    ...(raw.githubReleasesText != null ? { githubReleasesText: raw.githubReleasesText } : {}),
  };

  const blocks = deps.buildBlocks(content);
  const fallbackText = `Gemini CLI ${raw.version} の更新`;
  const channels = deps.getChannels(SOURCE_NAME);

  await Promise.all(
    channels.map(async (channel) => {
      const result = await deps.postBlocks(
        channel,
        blocks,
        fallbackText,
        deps.slackToken,
        deps.botProfile,
      );

      if (result.success && result.ts && raw.githubReleasesText) {
        await deps.postThreadReplies(channel, result.ts, raw.githubReleasesText, deps.slackToken, {
          botProfile: deps.botProfile,
        });
      }
    }),
  );
}

async function main(): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN environment variable is required");
  }

  await notifyHtmlGeminiCli({
    htmlSummariesDir: DATA_DIR.htmlSummaries,
    getChannels: getChannelsForSource,
    slackToken,
    botProfile: { name: "Gemini CLI Changelog", emoji: ":gemini_cli:" },
    buildBlocks: buildGeminiCliBlocks,
    postBlocks: postBlocksImpl,
    postThreadReplies: postThreadRepliesImpl,
  });

  console.log("Gemini CLI notification complete");
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("notify-html-gemini-cli");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
