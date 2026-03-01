import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DATA_DIR } from "../config/sources.js";

export interface DiffResult {
  source: string;
  hasChanges: boolean;
  oldHash: string;
  newHash: string;
  diffText?: string;
  newContent: string;
}

export interface VersionSection {
  version: string;     // "2.1.63", "rust-v0.106.0", "0.0.420"
  safeVersion: string; // ファイル名に安全な文字列
  content: string;     // ヘッダー行を含む全セクション内容
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * 旧スナップショットの最初のバージョンヘッダーを基準に、
 * 現在コンテンツから新たに追加されたセクションを抽出する。
 * バージョンヘッダーが見つからない場合は現在コンテンツをそのまま返す。
 */
function extractNewSections(currentContent: string, previousSnapshot: string): string {
  const firstOldHeader = previousSnapshot.split("\n").find((line) => line.startsWith("## "));
  if (!firstOldHeader) {
    return currentContent;
  }
  const cutIndex = currentContent.indexOf(firstOldHeader);
  if (cutIndex === -1) {
    return currentContent;
  }
  return currentContent.slice(0, cutIndex).trimEnd();
}

function extractVersionLabel(headerLine: string): string {
  // "## 2.1.63"                            → "2.1.63"
  // "## 0.0.420 - 2026-02-27"              → "0.0.420"
  // "## rust-v0.106.0 (2026-02-26T...Z)"   → "rust-v0.106.0"
  const rest = headerLine.replace(/^## /, "");
  return rest.split(/[ (]/)[0];
}

function toSafeVersion(version: string): string {
  return version.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function isVersionHeader(
  line: string,
  sourceType: "raw_markdown" | "github_releases",
): boolean {
  if (sourceType === "github_releases") {
    return /^## .+ \(\d{4}-\d{2}-\d{2}T[^)]+Z\)$/.test(line);
  }
  return /^## \S/.test(line);
}

/**
 * 新バージョンセクションをバージョンごとに分割する。
 * raw_markdown: 全ての ## 行をバージョン境界とする。
 * github_releases: ISO 8601 タイムスタンプ付きの ## 行のみをバージョン境界とする
 *   （## New Features などの sub-section は無視）。
 */
export function splitIntoVersions(
  content: string,
  sourceType: "raw_markdown" | "github_releases",
): VersionSection[] {
  const lines = content.split("\n");
  const sections: VersionSection[] = [];
  let currentHeaderLine: string | null = null;
  let currentLines: string[] = [];

  const flush = (): void => {
    if (currentHeaderLine === null) return;
    const version = extractVersionLabel(currentHeaderLine);
    const safeVersion = toSafeVersion(version);
    sections.push({
      version,
      safeVersion,
      content: currentLines.join("\n").trimEnd(),
    });
  };

  for (const line of lines) {
    if (isVersionHeader(line, sourceType)) {
      flush();
      currentHeaderLine = line;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

export function detectChanges(
  source: string,
  currentContent: string,
  previousSnapshot: string | null,
): DiffResult {
  const newHash = sha256(currentContent);

  if (previousSnapshot === null) {
    return {
      source,
      hasChanges: false,
      oldHash: "",
      newHash,
      newContent: currentContent,
    };
  }

  const oldHash = sha256(previousSnapshot);

  if (oldHash === newHash) {
    return {
      source,
      hasChanges: false,
      oldHash,
      newHash,
      newContent: currentContent,
    };
  }

  const diffText = extractNewSections(currentContent, previousSnapshot);

  return {
    source,
    hasChanges: true,
    oldHash,
    newHash,
    diffText,
    newContent: currentContent,
  };
}

export async function writeDiff(
  result: DiffResult,
  diffsDir: string = DATA_DIR.diffs,
  sourceType: "raw_markdown" | "github_releases" = "raw_markdown",
): Promise<void> {
  if (!result.hasChanges || !result.diffText) {
    return;
  }

  const versions = splitIntoVersions(result.diffText, sourceType);
  if (versions.length === 0) {
    await writeFile(resolve(diffsDir, `${result.source}-_unversioned_.md`), result.diffText);
    return;
  }

  await Promise.all(
    versions.map(({ safeVersion, content }) =>
      writeFile(resolve(diffsDir, `${result.source}-${safeVersion}.md`), content),
    ),
  );
}
