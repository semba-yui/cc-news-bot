import * as cheerio from "cheerio";

export interface MuxVideo {
  readonly playbackId: string;
  readonly thumbnailUrl: string;
  readonly hlsUrl: string;
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

/**
 * Find the position of an article marker in RSC data.
 * Handles both unescaped (`["$","article","slug"`) and
 * escaped (`[\"$\",\"article\",\"slug\"`) quoting styles.
 */
function findArticleMarker(
  html: string,
  slug: string,
  fromIndex = 0,
): { index: number; escaped: boolean } | null {
  const unescaped = `["$","article","${slug}"`;
  const escaped = `[\\"$\\",\\"article\\",\\"${slug}\\"`;

  const ui = html.indexOf(unescaped, fromIndex);
  const ei = html.indexOf(escaped, fromIndex);

  if (ui === -1 && ei === -1) return null;
  if (ui === -1) return { index: ei, escaped: true };
  if (ei === -1) return { index: ui, escaped: false };
  return ui <= ei ? { index: ui, escaped: false } : { index: ei, escaped: true };
}

/**
 * Find the next article boundary marker (any slug) after a given offset.
 */
function findNextArticleBoundary(html: string, fromIndex: number, escaped: boolean): number {
  const pattern = escaped ? `[\\"$\\",\\"article\\",\\"` : `["$","article","`;
  const idx = html.indexOf(pattern, fromIndex);
  return idx === -1 ? html.length : idx;
}

export function extractArticleRscPayload(html: string, version: string): string | null {
  const slug = version.replace(/\./g, "-");

  const match = findArticleMarker(html, slug);
  if (!match) return null;

  const endIdx = findNextArticleBoundary(html, match.index + slug.length + 20, match.escaped);

  const section = html.substring(match.index, endIdx);
  return section.length > 0 ? section : null;
}

export function extractMuxVideoData(html: string, slug: string): MuxVideo[] {
  const playbackIds = findPlaybackIdsForArticle(html, slug);

  return playbackIds.map((id) => ({
    playbackId: id,
    thumbnailUrl: `https://image.mux.com/${id}/thumbnail.png`,
    hlsUrl: `https://stream.mux.com/${id}.m3u8`,
  }));
}

function findPlaybackIdsForArticle(html: string, slug: string): string[] {
  const playbackIds: string[] = [];

  const match = findArticleMarker(html, slug);
  if (!match) return [];

  const endIdx = findNextArticleBoundary(html, match.index + slug.length + 20, match.escaped);

  const articleSection = html.substring(match.index, endIdx);

  // Match both escaped (\"playbackId\":\"...\") and unescaped ("playbackId":"...")
  const playbackPattern = /\\?"playbackId\\?"\\?:\\?"([^"\\]+)\\?"/g;
  let m: RegExpExecArray | null;
  while ((m = playbackPattern.exec(articleSection)) !== null) {
    playbackIds.push(m[1]);
  }

  return playbackIds;
}
