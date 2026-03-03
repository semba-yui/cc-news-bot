import { chromium } from "playwright";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface PlaywrightFetchOptions {
  readonly timeoutMs?: number;
  readonly waitUntil?: "load" | "networkidle";
}

export async function fetchHeadlessHtml(
  url: string,
  options?: PlaywrightFetchOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const waitUntil = options?.waitUntil ?? "networkidle";

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil, timeout: timeoutMs });
    return await page.content();
  } finally {
    await browser.close();
  }
}
