import * as cheerio from "cheerio";

export interface AnthropicNewsEntry {
  readonly slug: string;
  readonly title: string;
  readonly date: string; // ISO 8601 (YYYY-MM-DD)
  readonly category: string;
}

const SLUG_PATTERN = /^\/news\/([^/]+)$/;

const MONTH_MAP: Record<string, string | undefined> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function parseDateText(text: string): string {
  // "Mar 6, 2026" → "2026-03-06"
  const match = text.trim().match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (match === null) return "";
  const month = MONTH_MAP[match[1]];
  if (month === undefined) return "";
  const day = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

export function parseArticleList(html: string): AnthropicNewsEntry[] {
  if (html === "") return [];

  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const entries: AnthropicNewsEntry[] = [];

  $('a[href^="/news/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";

    const slugMatch = href.match(SLUG_PATTERN);
    if (slugMatch === null) return;

    // Dedup by href (FeaturedGrid / PublicationList duplication)
    if (seen.has(href)) return;
    seen.add(href);

    const slug = slugMatch[1];
    const time = $(el).find("time");
    const dateText = time.first().text().trim();
    const date = parseDateText(dateText);

    // Category: first span with category-like text
    const category = $(el).find("span").first().text().trim();

    // Title: h2, h4, or span with title-related class
    const title =
      $(el).find("h2, h4").first().text().trim() ||
      $(el)
        .find("span")
        .filter((_, s) => {
          const cls = $(s).attr("class") ?? "";
          return cls.includes("title");
        })
        .first()
        .text()
        .trim();

    if (slug && title) {
      entries.push({ slug, title, date, category });
    }
  });

  // Sort by date descending
  entries.sort((a, b) => {
    if (a.date === "" && b.date === "") return 0;
    if (a.date === "") return 1;
    if (b.date === "") return -1;
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
