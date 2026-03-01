const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
const DEFAULT_DELAY_MS = 1_000;
export const MAX_MESSAGE_LENGTH = 3_000;
const MAX_BLOCK_TEXT_LENGTH = 3_000;

export type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "divider" };

export interface BotProfile {
  name: string;
  emoji: string;
}

export interface PostResult {
  success: boolean;
  ts?: string;
  error?: string;
}

export interface PostOptions {
  delayMs?: number;
  botProfile?: BotProfile;
}

const CATEGORY_EMOJI: Record<string, string> = {
  ひとこと: "💬",
  破壊的変更: "⚠️",
  セキュリティ: "🔒",
  新規追加: "🆕",
  修正: "🔧",
  改善: "✨",
  パフォーマンス: "⚡",
  削除: "🗑️",
  非推奨: "⏸️",
  その他: "📦",
  用語解説: "📖",
};

const CATEGORY_ORDER = [
  "破壊的変更",
  "セキュリティ",
  "新規追加",
  "修正",
  "改善",
  "パフォーマンス",
  "削除",
  "非推奨",
  "その他",
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function botProfileFields(botProfile?: BotProfile): Record<string, string> {
  if (!botProfile) return {};
  return { username: botProfile.name, icon_emoji: botProfile.emoji };
}

interface ParsedSection {
  heading: string;
  lines: string[];
}

function parseSummaryMarkdown(summary: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of summary.split("\n")) {
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);

    if (h2Match ?? h3Match) {
      if (current) sections.push(current);
      const heading = (h2Match?.[1] ?? h3Match?.[1] ?? "").trim();
      current = { heading, lines: [] };
    } else if (current && line.trim()) {
      current.lines.push(line);
    }
  }

  if (current) sections.push(current);
  return sections;
}

function markdownToMrkdwn(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "*$1*");
}

function formatSectionText(heading: string, lines: string[]): string {
  const emoji = CATEGORY_EMOJI[heading] ?? "•";
  const body = lines
    .map((line) => {
      const converted = line.startsWith("- ") ? `• ${line.slice(2)}` : line;
      return markdownToMrkdwn(converted);
    })
    .join("\n");
  return `${emoji} *${heading}*\n${body}`;
}

function splitBlockText(text: string): string[] {
  if (text.length <= MAX_BLOCK_TEXT_LENGTH) return [text];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    if (offset + MAX_BLOCK_TEXT_LENGTH >= text.length) {
      chunks.push(text.slice(offset));
      break;
    }
    const slice = text.slice(offset, offset + MAX_BLOCK_TEXT_LENGTH);
    const lastNewline = slice.lastIndexOf("\n");
    if (lastNewline > 0) {
      chunks.push(slice.slice(0, lastNewline));
      offset += lastNewline + 1;
    } else {
      chunks.push(slice);
      offset += MAX_BLOCK_TEXT_LENGTH;
    }
  }
  return chunks;
}

function diffTextToBlocks(text: string): SlackBlock[] {
  const converted = text
    .split("\n")
    .map((line) => {
      if (/^## /.test(line)) return `*${line.slice(3).trim()}*`;
      const converted = line.startsWith("- ") ? `• ${line.slice(2)}` : line;
      return markdownToMrkdwn(converted);
    })
    .join("\n");
  return splitBlockText(converted).map((chunk) => ({
    type: "section" as const,
    text: { type: "mrkdwn" as const, text: chunk },
  }));
}

export function summaryToBlocks(source: string, version: string, summary: string): SlackBlock[] {
  const sections = parseSummaryMarkdown(summary);
  const blocks: SlackBlock[] = [];

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `${source} ${version} の更新`.slice(0, 150), emoji: true },
  });

  const hitokoto = sections.find((s) => s.heading === "ひとこと");
  if (hitokoto && hitokoto.lines.length > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: formatSectionText("ひとこと", hitokoto.lines) },
    });
    blocks.push({ type: "divider" });
  }

  let hasCategories = false;
  for (const category of CATEGORY_ORDER) {
    const section = sections.find((s) => s.heading === category);
    if (!section || section.lines.length === 0) continue;
    hasCategories = true;
    for (const chunk of splitBlockText(formatSectionText(category, section.lines))) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk } });
    }
  }

  const glossary = sections.find((s) => s.heading === "用語解説");
  if (glossary && glossary.lines.length > 0) {
    if (hasCategories) blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: formatSectionText("用語解説", glossary.lines) },
    });
  }

  return blocks;
}

async function callPostMessage(body: Record<string, unknown>, token: string): Promise<PostResult> {
  try {
    const response = await fetch(SLACK_POST_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };

    if (!data.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, ts: data.ts };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function postSummary(
  channel: string,
  source: string,
  version: string,
  summary: string,
  token: string,
  botProfile?: BotProfile,
): Promise<PostResult> {
  const blocks = (() => {
    try {
      const result = summaryToBlocks(source, version, summary);
      return result.length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  })();

  return callPostMessage(
    {
      channel,
      text: `*${source}* \`${version}\` の更新\n\n${summary}`,
      mrkdwn: true,
      ...(blocks ? { blocks } : {}),
      ...botProfileFields(botProfile),
    },
    token,
  );
}

export async function postThreadReply(
  channel: string,
  threadTs: string,
  text: string,
  token: string,
  options?: PostOptions,
): Promise<PostResult> {
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  await sleep(delayMs);

  const blocks = (() => {
    try {
      const result = diffTextToBlocks(text);
      return result.length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  })();

  return callPostMessage(
    {
      channel,
      thread_ts: threadTs,
      text,
      mrkdwn: true,
      ...(blocks ? { blocks } : {}),
      ...botProfileFields(options?.botProfile),
    },
    token,
  );
}

export async function postError(
  channel: string,
  source: string,
  error: string,
  token: string,
  botProfile?: BotProfile,
): Promise<PostResult> {
  return callPostMessage(
    {
      channel,
      text: `:warning: *${source}* の changelog 取得でエラーが発生しました\n\n${error}`,
      mrkdwn: true,
      ...botProfileFields(botProfile),
    },
    token,
  );
}

export function splitText(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    if (offset + MAX_MESSAGE_LENGTH >= text.length) {
      chunks.push(text.slice(offset));
      break;
    }
    const slice = text.slice(offset, offset + MAX_MESSAGE_LENGTH);
    const lastNewline = slice.lastIndexOf("\n");
    if (lastNewline > 0) {
      chunks.push(slice.slice(0, lastNewline));
      offset += lastNewline + 1;
    } else {
      chunks.push(slice);
      offset += MAX_MESSAGE_LENGTH;
    }
  }
  return chunks;
}

export async function postThreadReplies(
  channel: string,
  threadTs: string,
  text: string,
  token: string,
  options?: PostOptions,
): Promise<PostResult[]> {
  const chunks = splitText(text);
  const results: PostResult[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const opts = i === 0 ? { ...options, delayMs: 0 } : options;
    const result = await postThreadReply(channel, threadTs, chunks[i], token, opts);
    results.push(result);
  }
  return results;
}
