import * as cheerio from "cheerio";

export interface OpenAINewsEntry {
  readonly slug: string;
  readonly title: string;
  readonly date: string; // ISO 8601 or empty string
  readonly category: string;
}

const SLUG_PATTERN = /\/index\/([^/]+)\//;

export function parseArticleList(html: string): OpenAINewsEntry[] {
  if (html === "") return [];

  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const entries: OpenAINewsEntry[] = [];

  $('a[href*="/index/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";

    // Skip non-article links (e.g., /research/index/)
    const slugMatch = href.match(SLUG_PATTERN);
    if (slugMatch === null) return;

    // Dedup by href (mobile/desktop DOM duplication)
    if (seen.has(href)) return;
    seen.add(href);

    const slug = slugMatch[1];
    const titleDiv = $(el).find("div[class*='mb-2xs']");
    const title = titleDiv.text().trim();
    const time = $(el).find("time");
    const date = time.attr("datetime") ?? "";
    const category = $(el).find("p > span").first().text().trim();

    if (slug && title) {
      entries.push({ slug, title, date, category });
    }
  });

  // Sort by date descending (entries with no date go to the end)
  entries.sort((a, b) => {
    if (a.date === "" && b.date === "") return 0;
    if (a.date === "") return 1;
    if (b.date === "") return 1;
    return b.date.localeCompare(a.date);
  });

  return entries;
}

export function parseArticleContent(html: string, _slug: string): string | null {
  if (html === "") return null;

  const $ = cheerio.load(html);
  const article = $("article").first();
  if (article.length === 0) return null;

  const paragraphs: string[] = [];

  article.find("p, h2, h3, ul, ol").each((_, el) => {
    const tag = $(el).prop("tagName")?.toLowerCase();
    const text = $(el).text().trim();
    if (text === "") return;

    if (tag === "h2") {
      paragraphs.push(`## ${text}`);
    } else if (tag === "h3") {
      paragraphs.push(`### ${text}`);
    } else if (tag === "ul" || tag === "ol") {
      $(el)
        .children("li")
        .each((_, li) => {
          paragraphs.push(`- ${$(li).text().trim()}`);
        });
    } else {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length === 0) return null;

  return paragraphs.join("\n\n");
}
