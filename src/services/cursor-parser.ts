import type { AnyNode, Element } from "domhandler";
import * as cheerio from "cheerio";

export interface MuxVideo {
  readonly playbackId: string;
  readonly thumbnailUrl: string;
  readonly hlsUrl: string;
}

export interface CursorVersionContent {
  readonly version: string;
  readonly contentJa: string;
  readonly imageUrls: readonly string[];
  readonly videos: readonly MuxVideo[];
}

const VERSION_PATTERN = /^\d+\.\d+$/;

export function parseLatestVersion(html: string): string | null {
  const $ = cheerio.load(html);

  const labels = $("article span.label").toArray();
  for (const label of labels) {
    const text = $(label).text().trim();
    if (VERSION_PATTERN.test(text)) {
      return text;
    }
  }

  return null;
}

export function parseVersionContent(html: string, version: string): CursorVersionContent | null {
  const $ = cheerio.load(html);

  // Find the article with matching version label
  const targetArticle = findArticleByVersion($, version);
  if (!targetArticle) return null;

  // Extract content from prose block
  const proseBlock = $(targetArticle).find(".prose.prose--block").first();
  if (proseBlock.length === 0) return null;

  const contentJa = convertProseToMarkdown($, proseBlock);
  if (!contentJa.trim()) return null;

  // Extract image URLs
  const imageUrls = extractImageUrls($, proseBlock);

  // Extract Mux videos from RSC data
  const slug = extractArticleSlug($, targetArticle);
  const videos = slug ? extractMuxVideos(html, slug) : [];

  return {
    version,
    contentJa,
    imageUrls,
    videos,
  };
}

function findArticleByVersion($: cheerio.CheerioAPI, version: string): Element | null {
  const articles = $("article").toArray();
  for (const article of articles) {
    const label = $(article).find("span.label").first();
    if (label.length > 0 && label.text().trim() === version) {
      return article;
    }
  }
  return null;
}

function extractArticleSlug($: cheerio.CheerioAPI, article: Element): string | null {
  const link = $(article).find('a[href^="/changelog/"]').first();
  if (link.length === 0) return null;
  const href = link.attr("href") ?? "";
  const match = href.match(/\/changelog\/(.+)$/);
  return match ? match[1] : null;
}

function extractImageUrls($: cheerio.CheerioAPI, proseBlock: cheerio.Cheerio<AnyNode>): string[] {
  const imageUrls: string[] = [];

  proseBlock.find("img").each((_, img) => {
    const src = $(img).attr("src") ?? "";
    const decoded = decodeNextImageUrl(src);
    if (decoded) {
      imageUrls.push(decoded);
    }
  });

  return imageUrls;
}

function decodeNextImageUrl(src: string): string | null {
  // Next.js image proxy URL: /marketing-static/_next/image?url=<encoded>&w=...&q=...
  if (src.includes("/_next/image")) {
    try {
      const url = new URL(src, "https://cursor.com");
      const originalUrl = url.searchParams.get("url");
      return originalUrl ?? null;
    } catch {
      return null;
    }
  }
  // Direct URL
  if (src.startsWith("http")) {
    return src;
  }
  return null;
}

function extractMuxVideos(html: string, articleSlug: string): MuxVideo[] {
  // Search the raw HTML for playbackIds associated with this article
  // RSC data embeds articles as: "article","<slug>",{...playbackId values...}
  const playbackIds = findPlaybackIdsForArticle(html, articleSlug);

  return playbackIds.map((id) => ({
    playbackId: id,
    thumbnailUrl: `https://image.mux.com/${id}/thumbnail.png`,
    hlsUrl: `https://stream.mux.com/${id}.m3u8`,
  }));
}

function findPlaybackIdsForArticle(html: string, slug: string): string[] {
  const playbackIds: string[] = [];

  // Find the section containing "article","<slug>" in the raw HTML
  const articleMarker = `"article","${slug}"`;
  const startIdx = html.indexOf(articleMarker);
  if (startIdx === -1) return [];

  // Find the next "article"," marker or end of script block
  const nextArticleIdx = html.indexOf('"article","', startIdx + articleMarker.length);
  const endIdx = nextArticleIdx === -1 ? html.length : nextArticleIdx;

  const articleSection = html.substring(startIdx, endIdx);

  // Extract all playbackId values from this section
  const playbackPattern = /"playbackId":"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = playbackPattern.exec(articleSection)) !== null) {
    playbackIds.push(match[1]);
  }

  return playbackIds;
}

function convertProseToMarkdown(
  $: cheerio.CheerioAPI,
  proseBlock: cheerio.Cheerio<AnyNode>,
): string {
  const lines: string[] = [];

  proseBlock.children().each((_, child) => {
    if (child.type !== "tag") return;

    const $child = $(child);
    const tagName = child.tagName;

    switch (tagName) {
      case "p": {
        const text = convertInlineToMarkdown($, $child);
        if (text.trim()) lines.push(text.trim());
        break;
      }
      case "h3": {
        const text = extractHeadingText($, $child);
        if (text.trim()) lines.push(`### ${text.trim()}`);
        break;
      }
      case "ul": {
        $child.children("li").each((_, li) => {
          const text = convertInlineToMarkdown($, $(li));
          if (text.trim()) lines.push(`- ${text.trim()}`);
        });
        break;
      }
      case "figure":
      case "div":
        // Skip figures (images/videos are extracted separately) and accordions
        break;
      default:
        break;
    }
  });

  return lines.join("\n");
}

function extractHeadingText($: cheerio.CheerioAPI, $heading: cheerio.Cheerio<AnyNode>): string {
  // Remove anchor link icons
  const clone = $heading.clone();
  clone.find(".anchor-link").remove();
  clone.find(".anchor-icon").remove();
  return clone.text().trim();
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
