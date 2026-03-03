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

export function extractArticleRscPayload(html: string, version: string): string | null {
  // Derive slug from version: "2.5" → "2-5"
  const slug = version.replace(/\./g, "-");

  // Find the RSC line containing ["$","article","<slug>",...]
  const articleMarker = `["$","article","${slug}"`;
  const startIdx = html.indexOf(articleMarker);
  if (startIdx === -1) return null;

  // Find the next article marker or end of script
  const nextArticleIdx = html.indexOf('["$","article","', startIdx + articleMarker.length);
  const endIdx = nextArticleIdx === -1 ? html.length : nextArticleIdx;

  const section = html.substring(startIdx, endIdx);
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

  const articleMarker = `"article","${slug}"`;
  const startIdx = html.indexOf(articleMarker);
  if (startIdx === -1) return [];

  const nextArticleIdx = html.indexOf('"article","', startIdx + articleMarker.length);
  const endIdx = nextArticleIdx === -1 ? html.length : nextArticleIdx;

  const articleSection = html.substring(startIdx, endIdx);

  const playbackPattern = /"playbackId":"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = playbackPattern.exec(articleSection)) !== null) {
    playbackIds.push(match[1]);
  }

  return playbackIds;
}
