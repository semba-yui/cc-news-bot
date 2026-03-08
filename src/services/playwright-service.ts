import { chromium } from "playwright";
import { chromium as chromiumExtra } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface PlaywrightFetchOptions {
  readonly timeoutMs?: number;
  readonly waitUntil?: "load" | "networkidle";
  readonly stealth?: boolean;
  readonly waitForSelector?: string;
}

export async function fetchHeadlessHtml(
  url: string,
  options?: PlaywrightFetchOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const waitUntil = options?.waitUntil ?? "networkidle";
  const useStealth = options?.stealth ?? false;

  const launcher = useStealth ? chromiumExtra.use(StealthPlugin()) : chromium;
  const browser = await launcher.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil, timeout: timeoutMs });
    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: timeoutMs });
    }
    return await page.content();
  } finally {
    await browser.close();
  }
}
