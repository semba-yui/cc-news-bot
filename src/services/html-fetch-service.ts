const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; cc-news-bot/1.0; +https://github.com/semba-yui/cc-news-bot)";

export interface HtmlFetchOptions {
  readonly timeoutMs?: number;
  readonly userAgent?: string;
}

export async function fetchStaticHtml(url: string, options?: HtmlFetchOptions): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
