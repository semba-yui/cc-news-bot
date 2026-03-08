import type { AnyNode } from "domhandler";
import * as cheerio from "cheerio";

export interface JulesChangelogEntry {
  readonly dateSlug: string; // URL path from sidebar (e.g., "2026-02-19", "2026-01-26-1")
  readonly title: string;
  readonly date: string; // ISO 8601 (YYYY-MM-DD)
  readonly contentEn: string; // HTML→Markdown converted
}

const DATESLUG_PATTERN = /^\/docs\/changelog\/(.+)$/;

const MONTH_MAP: Record<string, string | undefined> = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

function parseDateText(text: string): string {
  // "February 19, 2026" → "2026-02-19"
  const match = text.trim().match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (match === null) return "";
  const month = MONTH_MAP[match[1]];
  if (month === undefined) return "";
  const day = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function extractMarkdown($: cheerio.CheerioAPI, article: cheerio.Cheerio<AnyNode>): string {
  const parts: string[] = [];

  // Process content elements after header
  article.children().each((_, el) => {
    const node = $(el);
    const tag = $(el).prop("tagName")?.toLowerCase();

    // Skip header (title + date already extracted separately)
    if (tag === "header") return;
    // Skip video/img elements
    if (tag === "video" || tag === "img") return;

    if (tag === "p") {
      // Skip paragraphs that only contain images
      if (node.find("img").length > 0 && node.text().trim() === "") return;
      const text = node.text().trim();
      if (text !== "") parts.push(text);
    } else if (tag === "div" && node.hasClass("sl-heading-wrapper")) {
      // Heading wrappers contain h3/h4
      const h3 = node.find("h3");
      const h4 = node.find("h4");
      if (h3.length > 0) {
        parts.push(`### ${h3.first().text().trim()}`);
      } else if (h4.length > 0) {
        parts.push(`#### ${h4.first().text().trim()}`);
      }
    } else if (tag === "ul") {
      node.children("li").each((_, li) => {
        parts.push(`- ${$(li).text().trim()}`);
      });
    } else if (tag === "ol") {
      node.children("li").each((idx, li) => {
        parts.push(`${idx + 1}. ${$(li).text().trim()}`);
      });
    } else if (tag === "h3") {
      parts.push(`### ${node.text().trim()}`);
    } else if (tag === "h4") {
      parts.push(`#### ${node.text().trim()}`);
    }
  });

  return parts.join("\n\n");
}

export function parseArticleList(html: string): JulesChangelogEntry[] {
  if (html === "") return [];

  const $ = cheerio.load(html);

  // Build title → dateSlug mapping from sidebar links
  const titleToDateSlug = new Map<string, string>();
  $('a[href^="/docs/changelog/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const slugMatch = href.match(DATESLUG_PATTERN);
    if (slugMatch === null) return;
    const title = $(el).find(".changelog-title").text().trim() || $(el).text().trim();
    if (title) {
      titleToDateSlug.set(title, slugMatch[1]);
    }
  });

  const entries: JulesChangelogEntry[] = [];

  $("article.changelog-entry").each((_, el) => {
    const article = $(el);
    const title = article.find("header h2").first().text().trim();
    const dateText = article.find("header span.date").first().text().trim();
    const date = parseDateText(dateText);

    // Look up dateSlug from sidebar mapping
    const dateSlug = titleToDateSlug.get(title) ?? "";

    if (!title || !dateSlug) return;

    const contentEn = extractMarkdown($, article);

    entries.push({ dateSlug, title, date, contentEn });
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
