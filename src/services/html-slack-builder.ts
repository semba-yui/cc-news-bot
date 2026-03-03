import type { SlackBlock } from "./slack-service.js";
import type { CursorVersionContent } from "./cursor-parser.js";

export interface GeminiCliTranslatedContent {
  readonly version: string;
  readonly summaryJa: string;
  readonly imageUrls: readonly string[];
  readonly githubReleasesText?: string;
}

export interface AntigravityTranslatedContent {
  readonly version: string;
  readonly improvementsJa: readonly string[];
  readonly fixesJa: readonly string[];
  readonly patchesJa: readonly string[];
}

function markdownToMrkdwn(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const converted = line.startsWith("- ") ? `• ${line.slice(2)}` : line;
      return converted.replace(/\*\*(.+?)\*\*/g, "*$1*");
    })
    .join("\n");
}

function makeImageBlock(url: string, altText: string): SlackBlock {
  return {
    type: "image" as const,
    image_url: url,
    alt_text: altText,
  };
}

export function buildGeminiCliBlocks(content: GeminiCliTranslatedContent): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `Gemini CLI ${content.version} の更新`.slice(0, 150),
      emoji: true,
    },
  });

  const mrkdwnText = markdownToMrkdwn(content.summaryJa);
  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: mrkdwnText },
  });

  for (const url of content.imageUrls) {
    blocks.push(makeImageBlock(url, `Gemini CLI ${content.version}`));
  }

  return blocks;
}

export function buildCursorBlocks(content: CursorVersionContent): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `Cursor ${content.version} の更新`.slice(0, 150),
      emoji: true,
    },
  });

  const mrkdwnText = markdownToMrkdwn(content.contentJa);
  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: mrkdwnText },
  });

  for (const url of content.imageUrls) {
    blocks.push(makeImageBlock(url, `Cursor ${content.version}`));
  }

  for (const video of content.videos) {
    blocks.push(makeImageBlock(video.thumbnailUrl, `Cursor ${content.version} 動画`));
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎬 <${video.hlsUrl}|動画を再生>`,
      },
    });
  }

  return blocks;
}

function buildCategorySection(title: string, items: readonly string[]): SlackBlock[] {
  if (items.length === 0) return [];

  const body = items.map((item) => `• ${item}`).join("\n");
  return [
    {
      type: "section" as const,
      text: { type: "mrkdwn" as const, text: `*${title}*\n${body}` },
    },
  ];
}

export function buildAntigravityBlocks(content: AntigravityTranslatedContent): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `Antigravity ${content.version} の更新`.slice(0, 150),
      emoji: true,
    },
  });

  const categories: Array<{ title: string; items: readonly string[] }> = [
    { title: "Improvements", items: content.improvementsJa },
    { title: "Fixes", items: content.fixesJa },
    { title: "Patches", items: content.patchesJa },
  ];

  const nonEmptyCategories = categories.filter((c) => c.items.length > 0);

  for (let i = 0; i < nonEmptyCategories.length; i++) {
    if (i > 0) {
      blocks.push({ type: "divider" });
    }
    blocks.push(...buildCategorySection(nonEmptyCategories[i].title, nonEmptyCategories[i].items));
  }

  return blocks;
}
