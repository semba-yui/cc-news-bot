const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";
const DEFAULT_DELAY_MS = 1_000;
export const MAX_MESSAGE_LENGTH = 3_500;

export interface PostResult {
  success: boolean;
  ts?: string;
  error?: string;
}

export interface PostOptions {
  delayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  summary: string,
  token: string,
): Promise<PostResult> {
  return callPostMessage(
    {
      channel,
      text: `*${source}* の changelog が更新されました\n\n${summary}`,
      mrkdwn: true,
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

  return callPostMessage(
    {
      channel,
      thread_ts: threadTs,
      text,
      mrkdwn: true,
    },
    token,
  );
}

export async function postError(
  channel: string,
  source: string,
  error: string,
  token: string,
): Promise<PostResult> {
  return callPostMessage(
    {
      channel,
      text: `:warning: *${source}* の changelog 取得でエラーが発生しました\n\n${error}`,
      mrkdwn: true,
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
