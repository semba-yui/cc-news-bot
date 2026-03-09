import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, getChannelsForSource } from "../config/sources.js";
import type { TranslatedArticle } from "../services/html-slack-builder.js";
import { buildOpenAINewsBlocks } from "../services/html-slack-builder.js";
import type { BotProfile, PostOptions, PostResult, SlackBlock } from "../services/slack-service.js";
import {
  postBlocks as postBlocksImpl,
  postThreadReplies as postThreadRepliesImpl,
} from "../services/slack-service.js";

const SOURCE_NAME = "openai-news";

export interface NotifyHtmlOpenAINewsDeps {
  readonly htmlSummariesDir: string;
  readonly getChannels: (source: string) => string[];
  readonly slackToken: string;
  readonly botProfile?: BotProfile;
  readonly buildBlocks: (article: TranslatedArticle) => SlackBlock[];
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

export async function notifyHtmlOpenAINews(deps: NotifyHtmlOpenAINewsDeps): Promise<void> {
  const filePath = resolve(deps.htmlSummariesDir, "openai-news.json");
  const entries = JSON.parse(readFileSync(filePath, "utf-8")) as TranslatedArticle[];
  const channels = deps.getChannels(SOURCE_NAME);

  for (const entry of entries) {
    const blocks = deps.buildBlocks(entry);
    const fallbackText = `OpenAI News: ${entry.title}`;

    await Promise.all(
      channels.map(async (channel) => {
        const result = await deps.postBlocks(
          channel,
          blocks,
          fallbackText,
          deps.slackToken,
          deps.botProfile,
        );

        if (result.success && result.ts) {
          await deps.postThreadReplies(channel, result.ts, entry.fullTextJa, deps.slackToken, {
            botProfile: deps.botProfile,
          });
        }
      }),
    );
  }
}

async function main(): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN environment variable is required");
  }

  await notifyHtmlOpenAINews({
    htmlSummariesDir: DATA_DIR.htmlSummaries,
    getChannels: getChannelsForSource,
    slackToken,
    botProfile: { name: "OpenAI News", emoji: ":openai-chatgpt-white:" },
    buildBlocks: buildOpenAINewsBlocks,
    postBlocks: postBlocksImpl,
    postThreadReplies: postThreadRepliesImpl,
  });

  console.log("OpenAI News notification complete");
}

// CLI entry point
const isMainModule = process.argv[1]?.includes("notify-html-openai-news");
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
