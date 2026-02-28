import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPatch } from "diff";
import { DATA_DIR } from "../config/sources.js";

export interface DiffResult {
  source: string;
  hasChanges: boolean;
  oldHash: string;
  newHash: string;
  diffText?: string;
  newContent: string;
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
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

  const patch = createPatch(source, previousSnapshot, currentContent, "", "", {
    context: 3,
  });

  // Remove the file header lines (first 4 lines) to keep only the diff hunks
  const lines = patch.split("\n");
  const diffText = lines.slice(4).join("\n").trimEnd();

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
): Promise<void> {
  if (!result.hasChanges || !result.diffText) {
    return;
  }
  writeFileSync(resolve(diffsDir, `${result.source}.md`), result.diffText);
}
