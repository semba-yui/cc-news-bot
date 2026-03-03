import type { AnyNode } from "domhandler";
import * as cheerio from "cheerio";

export interface AntigravityVersionContent {
  readonly version: string;
  readonly improvementsEn: readonly string[];
  readonly fixesEn: readonly string[];
  readonly patchesEn: readonly string[];
}

const VERSION_PATTERN = /^(\d+\.\d+\.\d+)/;

export function parseLatestVersion(html: string): string | null {
  const $ = cheerio.load(html);

  const versionDivs = $("div.version p.body").toArray();
  for (const el of versionDivs) {
    const text = $(el).text().trim();
    const match = text.match(VERSION_PATTERN);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function parseVersionContent(
  html: string,
  version: string,
): AntigravityVersionContent | null {
  const $ = cheerio.load(html);

  const versionDiv = findVersionDiv($, version);
  if (!versionDiv) return null;

  const descriptionDiv = $(versionDiv).next("div.description");
  if (descriptionDiv.length === 0) return null;

  const improvementsEn = extractCategoryItems($, descriptionDiv, "Improvements");
  const fixesEn = extractCategoryItems($, descriptionDiv, "Fixes");
  const patchesEn = extractCategoryItems($, descriptionDiv, "Patches");

  return {
    version,
    improvementsEn,
    fixesEn,
    patchesEn,
  };
}

function findVersionDiv($: cheerio.CheerioAPI, version: string): cheerio.Cheerio<AnyNode> | null {
  const versionDivs = $("div.version").toArray();

  for (const div of versionDivs) {
    const text = $(div).find("p.body").first().text().trim();
    if (text.startsWith(version)) {
      return $(div);
    }
  }

  return null;
}

function extractCategoryItems(
  $: cheerio.CheerioAPI,
  descriptionDiv: cheerio.Cheerio<AnyNode>,
  category: string,
): string[] {
  const items: string[] = [];

  descriptionDiv.find("details").each((_, details) => {
    const summary = $(details).find("summary").first().text().trim();
    if (summary.startsWith(category)) {
      $(details)
        .find("li")
        .each((_, li) => {
          const text = $(li).text().trim();
          if (text) {
            items.push(text);
          }
        });
    }
  });

  return items;
}
