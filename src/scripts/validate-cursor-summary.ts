import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateCursorSummary } from "../services/cursor-summary-schema.js";

const filePath = resolve("data/html-summaries/cursor.json");

try {
  const raw: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
  const result = validateCursorSummary(raw);

  if (result.success) {
    console.log(
      `Validation passed: version=${result.data.version}, blocks=${result.data.blocks.length}`,
    );
    process.exit(0);
  } else {
    console.error("Validation failed:");
    console.error(result.error);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed to read or parse ${filePath}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
