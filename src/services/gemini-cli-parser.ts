import type { AnyNode, Element } from "domhandler";
import * as cheerio from "cheerio";

export interface GeminiCliVersionContent {
  readonly version: string;
  readonly rawSummaryEn: string;
  readonly imageUrls: readonly string[];
}

const VERSION_TEXT_PATTERN = /(v\d+\.\d+\.\d+)/;
const VERSION_ID_PREFIX = "announcements-v";

export function parseLatestVersion(html: string): string | null {
  const $ = cheerio.load(html);
  const firstH2 = $("h2[id]")
    .toArray()
    .find((el) => ($(el).attr("id") ?? "").startsWith(VERSION_ID_PREFIX));

  if (!firstH2) return null;

  const text = $(firstH2).text();
  const match = text.match(VERSION_TEXT_PATTERN);
  return match ? match[1] : null;
}

export function parseVersionContent(html: string, version: string): GeminiCliVersionContent | null {
  const $ = cheerio.load(html);

  const targetH2 = $("h2[id]")
    .toArray()
    .find((el) => $(el).text().includes(version));

  if (!targetH2) return null;

  const wrapper = $(targetH2).closest(".sl-heading-wrapper");
  const siblings: cheerio.Cheerio<AnyNode>[] = [];
  let current = wrapper.length > 0 ? wrapper.next() : $(targetH2).parent().next();

  while (current.length > 0) {
    if (current.find("h2[id]").length > 0 || current.is(".sl-heading-wrapper.level-h2")) {
      break;
    }
    siblings.push(current);
    current = current.next();
  }

  const imageUrls: string[] = [];
  const markdownLines: string[] = [];

  for (const $el of siblings) {
    $el.find("img").each((_, img) => {
      const src = $(img).attr("src");
      if (src) imageUrls.push(src);
    });

    if ($el.is("ul")) {
      $el.children("li").each((_, li) => {
        const text = convertLiToMarkdown($, $(li));
        markdownLines.push(`- ${text}`);
      });
    } else if ($el.is("p")) {
      const text = convertInlineToMarkdown($, $el);
      if (text.trim()) markdownLines.push(text.trim());
    }
  }

  if (markdownLines.length === 0) return null;

  return {
    version,
    rawSummaryEn: markdownLines.join("\n"),
    imageUrls,
  };
}

function convertInlineTag($: cheerio.CheerioAPI, node: Element): string {
  const $node = $(node);
  switch (node.tagName) {
    case "strong":
      return `**${$node.text()}**`;
    case "a":
      return `[${$node.text()}](${$node.attr("href") ?? ""})`;
    case "code":
      return `\`${$node.text()}\``;
    default:
      return $node.text();
  }
}

function convertLiToMarkdown($: cheerio.CheerioAPI, $li: cheerio.Cheerio<AnyNode>): string {
  const parts: string[] = [];

  $li.contents().each((_, node) => {
    if (node.type === "text") {
      parts.push($(node).text());
    } else if (node.type === "tag") {
      if (node.tagName === "p") {
        parts.push(convertInlineToMarkdown($, $(node)));
      } else if (node.tagName === "ul") {
        $(node)
          .children("li")
          .each((_, subLi) => {
            parts.push(`\n  - ${convertLiToMarkdown($, $(subLi))}`);
          });
      } else {
        parts.push(convertInlineTag($, node));
      }
    }
  });

  return parts.join("").trim();
}

function convertInlineToMarkdown($: cheerio.CheerioAPI, $el: cheerio.Cheerio<AnyNode>): string {
  const parts: string[] = [];

  $el.contents().each((_, node) => {
    if (node.type === "text") {
      parts.push($(node).text());
    } else if (node.type === "tag") {
      parts.push(convertInlineTag($, node));
    }
  });

  return parts.join("");
}
